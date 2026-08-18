import type { DeviceTransport, KeyboardDevice } from '@/application/ports'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import type { DeviceInfo, KeyboardConfiguration, KeyboardMode, KeyAssignment, KeyPosition, KeyboardProfile } from '@/domain/keyboard'
import type { MatrixKeyInput } from '@/domain/layout'
import { readUint16le, uint16le, type CrcStrategy } from './codec'
import { XSYD_ACTIONS, XSYD_COMMANDS } from './xsyd/commands'
import { XsydCommandClient } from './xsyd/XsydCommandClient'
import type { CapabilityDescriptor } from '@/domain/capabilities'
import type { DefaultKeymapResolver } from './DefaultKeymapResolver'

export class XsydKeyboardProtocol implements KeyboardDevice {
  private readonly commands: XsydCommandClient
  private currentMode: KeyboardMode = 'win'
  private readonly modeListeners = new Set<(mode: KeyboardMode) => void>()
  private readonly removeNotificationListener: () => void
  readonly profile = { getProfile: () => this.getProfile() }
  readonly keymap = { writeAssignments: (assignments: KeyAssignment[]) => this.writeAssignments(assignments) }
  readonly configuration = { save: () => this.save(), reload: () => this.reload() }
  readonly factoryReset = { restoreFactory: () => this.restoreFactory() }
  readonly systemMode = {
    switchMode: (mode: KeyboardMode) => this.switchMode(mode),
    onModeChange: (listener: (mode: KeyboardMode) => void) => this.onModeChange(listener),
  }
  readonly configurationSwitch = { switchConfiguration: (configuration: KeyboardConfiguration) => this.switchConfiguration(configuration) }

  constructor(
    private readonly transport: DeviceTransport,
    private readonly keyCatalog: KeyCatalog,
    private readonly capabilityDescriptor: CapabilityDescriptor,
    private readonly resolveDefaultKeymap: DefaultKeymapResolver,
    crc?: CrcStrategy,
  ) {
    this.commands = new XsydCommandClient(transport, crc)
    this.removeNotificationListener = this.commands.onNotification((packet) => this.handleNotification(packet.command, packet.data))
  }

  async getProfile(): Promise<KeyboardProfile> {
    // 设备身份与协议版本互不依赖，可以并行查询；能力需要两者齐备后才能解析。
    const [device, protocolVersion, mode] = await Promise.all([this.sync(), this.queryProtocolVersion(), this.queryMode()])
    this.currentMode = mode
    const capabilities = this.capabilityDescriptor.resolve({ device: { ...device, protocolVersion }, protocolVersion })
    // 0x2B 只告诉我们有哪些物理键；每个 Fn 层的实际键值还要通过 0x23 单独读取。
    const positions = await this.readDefaultLayout(capabilities.layoutRows, capabilities.layoutColumns)
    const assignments: KeyAssignment[] = []
    for (let layer = 0; layer < capabilities.layers; layer++) assignments.push(...await this.readLayer(layer, positions))
    // 协议需要默认值来组装 Profile，但默认表由设备层注入，协议不知道任何具体型号。
    const defaultAssignments = this.resolveDefaultKeymap({
      mode: this.currentMode,
      positions,
      layers: capabilities.layers,
      keyCatalog: this.keyCatalog,
    })
    return {
      device: { ...device, protocolVersion },
      capabilities,
      positions,
      mode,
      defaultAssignments,
      assignments,
    }
  }

  async writeAssignments(assignments: KeyAssignment[]) {
    // 一个 HID 报告最多容纳 14 条四字节键位记录，超出部分必须按同样格式分批发送。
    for (let offset = 0; offset < assignments.length; offset += 14) {
      const batch = assignments.slice(offset, offset + 14)
      const data = [1]
      batch.forEach((item) => data.push(item.sourceCode, item.layer, ...uint16le(item.keyCode)))
      await this.commands.request(XSYD_COMMANDS.keymap, new Uint8Array(data))
    }
  }

  save() { return this.action(XSYD_ACTIONS.save, 1600) }
  reload() { return this.action(XSYD_ACTIONS.reload, 1600) }
  restoreFactory() { return this.action(XSYD_ACTIONS.restoreFactory, 2500) }
  async switchMode(mode: KeyboardMode) {
    await this.action(mode === 'mac' ? XSYD_ACTIONS.switchToMac : XSYD_ACTIONS.switchToWin, 1600)
    this.currentMode = mode
    await this.waitForStateSettled()
  }
  async switchConfiguration(configuration: KeyboardConfiguration) {
    await this.action(XSYD_ACTIONS.switchConfiguration, 1600, [configuration - 1])
    await this.waitForStateSettled()
  }
  close() {
    this.removeNotificationListener()
    this.modeListeners.clear()
    this.commands.close()
  }

  private async sync(): Promise<DeviceInfo> {
    // 随机挑战值用于建立本次同步请求；响应中的字段偏移来自 XSYD 设备信息报文。
    const random = crypto.getRandomValues(new Uint8Array(4))
    const data = await this.commands.request(XSYD_COMMANDS.sync, new Uint8Array([...random, 0xff, 0xff]))
    const ascii = (start: number, length: number) => new TextDecoder().decode(data.slice(start + 1, start + length)).replace(/\0/g, '').trim()
    const hex = (start: number, length: number) => Array.from(data.slice(start, start + length), (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
    return {
      productName: this.transport.productName,
      vendorId: this.transport.vendorId,
      productId: this.transport.productId,
      boardId: hex(1, 4),
      runMode: data[7] === 0 ? 'app' : data[7] === 0xff ? 'boot' : 'unknown',
      serialNumber: ascii(8, 17),
      firmwareVersion: ascii(25, 17) || 'Unknown',
      protocolVersion: 'Unknown',
    }
  }

  private async queryProtocolVersion() {
    const data = await this.commands.request(XSYD_COMMANDS.action, new Uint8Array([XSYD_ACTIONS.protocolVersion]))
    return new TextDecoder().decode(data.slice(2)).replace(/\0/g, '').trim() || '1.0.x'
  }

  private async action(order: number, timeoutMs: number, args: number[] = []) {
    await this.commands.request(XSYD_COMMANDS.action, new Uint8Array([order, ...args]), timeoutMs)
  }

  /** 按协议响应布局 [Err Code, order, s_arg...] 读取查询结果。 */
  private async queryMode(): Promise<KeyboardMode> {
    const mac = await this.queryActionFlag(XSYD_ACTIONS.queryMacMode)
    if (mac === 1) return 'mac'
    const win = await this.queryActionFlag(XSYD_ACTIONS.queryWinMode)
    if (win === 1) return 'win'
    // 0xFF 表示设备不支持该模式查询；兼容这种固件时保留最后一次已知模式。
    return this.currentMode
  }

  private async queryActionFlag(order: number) {
    const data = await this.commands.request(XSYD_COMMANDS.action, new Uint8Array([order]))
    return data[2] ?? 0xff
  }

  private onModeChange(listener: (mode: KeyboardMode) => void) {
    this.modeListeners.add(listener)
    return () => this.modeListeners.delete(listener)
  }

  /**
   * 真机抓包确认：硬件切换后会主动发送 Action 返回包，
   * data 为 [Err Code, order, s_arg, ...]，order 0x21/0x22 且 s_arg=1 表示 WIN/Mac。
   */
  private handleNotification(command: number, data: Uint8Array) {
    if (command !== XSYD_COMMANDS.action.responseCode || data[0] !== 0 || data[2] !== 1) return
    const mode = data[1] === XSYD_ACTIONS.queryWinMode ? 'win' : data[1] === XSYD_ACTIONS.queryMacMode ? 'mac' : undefined
    if (!mode || mode === this.currentMode) return
    this.currentMode = mode
    for (const listener of this.modeListeners) listener(mode)
  }

  /** 模式/配置切换后给固件留出完成内部状态切换的时间，再读取新配置。 */
  private waitForStateSettled() { return new Promise<void>((resolve) => setTimeout(resolve, 2000)) }

  private async readDefaultLayout(rows: number, columns: number): Promise<KeyPosition[]> {
    const matrixKeys: MatrixKeyInput[] = []
    // defaultKeymap 每次返回相邻两行，所以 row 按 2 递增。
    for (let row = 0; row < rows; row += 2) {
      const data = await this.commands.request(XSYD_COMMANDS.defaultKeymap, new Uint8Array([0, row, row + 1]))
      const blocks = [{ row: data[1] ?? row, start: 2 }, { row: data[2 + columns] ?? row + 1, start: 3 + columns }]
      for (const block of blocks) {
        for (let column = 0; column < columns; column++) {
          const sourceCode = data[block.start + column] ?? 0xff
          // 0xFF 和 0x00 都代表矩阵空位，不创建可改键的物理位置。
          if (sourceCode === 0xff || sourceCode === 0) continue
          matrixKeys.push({ id: `${block.row}-${column}`, sourceCode, label: this.keyCatalog.get(sourceCode).label, address: { kind: 'matrix', row: block.row, column } })
        }
      }
    }
    return matrixKeys
  }

  private async readLayer(layer: number, positions: KeyPosition[]): Promise<KeyAssignment[]> {
    const assignments: KeyAssignment[] = []
    for (let offset = 0; offset < positions.length; offset += 14) {
      const batch = positions.slice(offset, offset + 14)
      const request = [0]
      // 读取请求中每项是 sourceCode、layer 和两个占位字节；响应返回同样的四字节槽位。
      batch.forEach((position) => request.push(position.sourceCode, layer, 0xff, 0xff))
      const data = await this.commands.request(XSYD_COMMANDS.keymap, new Uint8Array(request))
      for (let index = 0; index < batch.length; index++) {
        const position = batch[index]!
        // 每项前两字节回显物理键与层，后两字节是小端序目标键码。
        const keyCode = readUint16le(data, 1 + index * 4 + 2)
        assignments.push({ positionId: position.id, sourceCode: position.sourceCode, layer, keyCode, category: this.keyCatalog.get(keyCode).category })
      }
    }
    return assignments
  }
}
