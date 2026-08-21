import type { DeviceTransport, KeyboardDevice } from '@/application/ports'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import type { DeviceInfo, KeyboardConfiguration, KeyboardMode, KeyAssignment, KeyPosition, KeyboardProfile } from '@/domain/keyboard'
import type { MatrixKeyInput } from '@/domain/layout'
import { readUint16le, uint16le, type CrcStrategy } from './codec'
import { XSYD_ACTIONS, XSYD_COMMANDS } from './xsyd/commands'
import { XsydCommandClient } from './xsyd/XsydCommandClient'
import type { CapabilityDescriptor } from '@/domain/capabilities'
import type { DefaultKeymapResolver } from './DefaultKeymapResolver'
import type { LightingSettings } from '@/domain/lighting'
import { DEFAULT_LIGHTING_SETTINGS } from '@/domain/lighting'
import { decodeMainLighting, encodeMainLighting } from './xsyd/lightingCodec'
import type { AdvancedKeySettings, DksAdvancedKey } from '@/domain/advancedKey'
import { advancedReadRequest, decodeEnd, decodeMpt, decodeSocd, decodeTgl, encodeDks, encodeEnd, encodeMpt, encodeMt, encodeSocd, encodeTgl } from './xsyd/advancedKeyCodec'
import { DriverError } from '@/application/DriverError'
import type { MacroSettings } from '@/domain/macro'
import { createEmptyMacro, validateMacroSettings } from '@/domain/macro'
import { decodeMacroMode, encodeMacroDataWrite, encodeMacroModeRead, encodeMacroModeWrite, MACRO_ACTIONS_PER_PACKET, XSYD_MACRO_BUFFER_OFFSET, XSYD_MAX_MACRO_ACTIONS, XSYD_MAX_MACRO_SLOTS } from './xsyd/macroCodec'

const ADVANCED_LAYOUT = {
  db1: 0x05, db3: 0x07, mode: 0x08,
  dks1: 0x09, dks2: 0x0a, dks3: 0x0b, dks4: 0x0c,
  trps1: 0x0d, trps2: 0x0e, trps3: 0x0f, trps4: 0x10,
  delay: 0x13,
} as const

// MODE=6 在 1.0.7 方案中保留给宏；7 为 RS，8 为 SOCD。
const ADVANCED_MODE = { dks: 1, mpt: 2, mt: 3, tgl: 4, end: 5, macro: 6, socd: 8 } as const

export class XsydKeyboardProtocol implements KeyboardDevice {
  private readonly commands: XsydCommandClient
  private currentMode: KeyboardMode = 'win'
  private protocolVersion = '1.0.7'
  private readonly modeListeners = new Set<(mode: KeyboardMode) => void>()
  private readonly configurationListeners = new Set<(configuration: KeyboardConfiguration) => void>()
  private readonly removeNotificationListener: () => void
  readonly profile = { getProfile: () => this.getProfile() }
  readonly keymap = { writeAssignments: (assignments: KeyAssignment[]) => this.writeAssignments(assignments) }
  readonly configuration = { save: () => this.save(), reload: () => this.reload() }
  readonly factoryReset = { restoreFactory: () => this.restoreFactory() }
  readonly systemMode = {
    switchMode: (mode: KeyboardMode) => this.switchMode(mode),
    onModeChange: (listener: (mode: KeyboardMode) => void) => this.onModeChange(listener),
  }
  readonly configurationSwitch = {
    switchConfiguration: (configuration: KeyboardConfiguration) => this.switchConfiguration(configuration),
    onConfigurationChange: (listener: (configuration: KeyboardConfiguration) => void) => this.onConfigurationChange(listener),
  }
  readonly lighting = {
    getLighting: () => this.getLighting(),
    setLighting: (settings: LightingSettings) => this.setLighting(settings),
  }
  readonly advancedKey = {
    getAdvancedKey: (sourceCode: number) => this.getAdvancedKey(sourceCode),
    setAdvancedKey: (settings: Exclude<AdvancedKeySettings, { type: 'none' }>) => this.setAdvancedKey(settings),
    deleteAdvancedKey: (sourceCode: number) => this.deleteAdvancedKey(sourceCode),
  }
  readonly macro = {
    getMacro: (sourceCode: number) => this.getMacro(sourceCode),
    setMacro: (settings: MacroSettings) => this.setMacro(settings),
  }

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
    this.protocolVersion = protocolVersion
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
  async getLighting() {
    // 官方 SDK 的读取也携带一份完整占位结构，不能只发送单独的 rw 字节。
    const request = encodeMainLighting({ ...DEFAULT_LIGHTING_SETTINGS, colors: [] }, false, this.supportsDynamicColorId())
    return decodeMainLighting(await this.commands.request(XSYD_COMMANDS.lighting, request))
  }
  async setLighting(settings: LightingSettings) {
    await this.commands.request(XSYD_COMMANDS.lighting, encodeMainLighting(settings, true, this.supportsDynamicColorId()))
  }

  async getAdvancedKey(sourceCode: number): Promise<AdvancedKeySettings> {
    const modeValue = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.mode)
    const type = modeValue & 0x0f
    if (type === ADVANCED_MODE.dks) {
      const layouts = [ADVANCED_LAYOUT.dks1, ADVANCED_LAYOUT.dks2, ADVANCED_LAYOUT.dks3, ADVANCED_LAYOUT.dks4, ADVANCED_LAYOUT.trps1, ADVANCED_LAYOUT.trps2, ADVANCED_LAYOUT.trps3, ADVANCED_LAYOUT.trps4, ADVANCED_LAYOUT.db1, ADVANCED_LAYOUT.db3]
      const values: number[] = []
      // HID 命令客户端按请求串行匹配响应；这里显式串行，避免同命令 0x23 的响应互相抢占。
      for (const layout of layouts) values.push(await this.readLayoutValue(sourceCode, layout))
      return { type: 'dks', sourceCode, keyCodes: values.slice(0, 4) as DksAdvancedKey['keyCodes'], triggers: values.slice(4, 8).map((value) => value & 0xff) as DksAdvancedKey['triggers'], travels: [(values[8] ?? 0) / 1000, (values[9] ?? 0) / 1000] }
    }
    if (type === ADVANCED_MODE.mpt) return decodeMpt(sourceCode, await this.commands.request(XSYD_COMMANDS.mpt, advancedReadRequest(sourceCode)))
    if (type === ADVANCED_MODE.mt) {
      const first = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.dks1)
      const second = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.dks2)
      const delay = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.delay)
      return { type: 'mt', sourceCode, keyCodes: [first, second], delay: delay * 10 }
    }
    if (type === ADVANCED_MODE.tgl) return decodeTgl(sourceCode, await this.commands.request(XSYD_COMMANDS.tgl, advancedReadRequest(sourceCode)))
    if (type === ADVANCED_MODE.end) return decodeEnd(sourceCode, await this.commands.request(XSYD_COMMANDS.end, advancedReadRequest(sourceCode)))
    if (type === ADVANCED_MODE.socd) return decodeSocd(sourceCode, await this.commands.request(XSYD_COMMANDS.socd, advancedReadRequest(sourceCode)))
    return { type: 'none', sourceCode }
  }

  async setAdvancedKey(settings: Exclude<AdvancedKeySettings, { type: 'none' }>) {
    // 这些专用命令会同时让固件更新 Layout_Mode；SDK 的 setX 也只发送对应命令。
    if (settings.type === 'dks') await this.commands.request(XSYD_COMMANDS.dks, encodeDks(settings))
    else if (settings.type === 'mpt') await this.commands.request(XSYD_COMMANDS.mpt, encodeMpt(settings))
    else if (settings.type === 'mt') await this.commands.request(XSYD_COMMANDS.mt, encodeMt(settings))
    else if (settings.type === 'tgl') await this.commands.request(XSYD_COMMANDS.tgl, encodeTgl(settings))
    else if (settings.type === 'end') await this.commands.request(XSYD_COMMANDS.end, encodeEnd(settings))
    else await this.commands.request(XSYD_COMMANDS.socd, encodeSocd(settings))
  }

  async deleteAdvancedKey(sourceCode: number) {
    const modeValue = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.mode)
    // 高四位属于性能触发方式，删除高级键只能清除低四位，不能把另一项设置一并破坏。
    await this.writeLayoutValue(sourceCode, ADVANCED_LAYOUT.mode, modeValue & 0xf0)
  }

  async getMacro(sourceCode: number): Promise<MacroSettings> {
    const modeData = await this.commands.request(XSYD_COMMANDS.macroMode, encodeMacroModeRead(sourceCode))
    const mode = decodeMacroMode(modeData)
    // 未绑定槽位用当前物理键构造可编辑空值，UI 不需要理解协议的 0xFF。
    if (mode.sourceCode === 0xff || mode.index >= XSYD_MAX_MACRO_SLOTS) return createEmptyMacro(0, sourceCode)

    const storedActionCount = modeData[4] ?? 0
    // 官方旧版 SDK 的 getMacro 也只读取 0x21 元数据；0x20 Slave 格式没有动作正文字段。
    return { ...mode, actions: [], storedActionCount, actionsAvailable: storedActionCount === 0 }
  }

  async setMacro(settings: MacroSettings) {
    const errors = validateMacroSettings(settings)
    if (settings.index >= XSYD_MAX_MACRO_SLOTS) errors.push(`当前方案最多支持 ${XSYD_MAX_MACRO_SLOTS} 个宏槽位`)
    if (settings.actions.length > XSYD_MAX_MACRO_ACTIONS) errors.push(`当前方案每个宏最多支持 ${XSYD_MAX_MACRO_ACTIONS} 个动作`)
    if (errors.length) throw new DriverError('INVALID_CONFIGURATION', errors.join('；'))

    // 已发布 SDK 从 0x0100 暂存区开始覆盖写入；没有额外发送 Action 0x10。
    for (let offset = 0; offset < settings.actions.length; offset += MACRO_ACTIONS_PER_PACKET) {
      await this.commands.request(XSYD_COMMANDS.macroData, encodeMacroDataWrite(XSYD_MACRO_BUFFER_OFFSET + offset, settings.actions.slice(offset, offset + MACRO_ACTIONS_PER_PACKET)))
    }
    // MODE 层负责声明“该物理键是宏键”，0x21 再保存槽位、动作数和执行方式。
    const currentMode = await this.readLayoutValue(settings.sourceCode, ADVANCED_LAYOUT.mode)
    await this.writeLayoutValue(settings.sourceCode, ADVANCED_LAYOUT.mode, currentMode & 0xf0 | ADVANCED_MODE.macro)
    await this.commands.request(XSYD_COMMANDS.macroMode, encodeMacroModeWrite(settings))
  }
  close() {
    this.removeNotificationListener()
    this.modeListeners.clear()
    this.configurationListeners.clear()
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
    // 官方响应为 [Err, order, minor|patch, major] 的压缩 BCD，不是 ASCII 字符串。
    if (data.length >= 4) return `${(data[3] ?? 0) & 0x0f}.${((data[2] ?? 0) >> 4) & 0x0f}.${(data[2] ?? 0) & 0x0f}`
    return '1.0.7'
  }

  private async action(order: number, timeoutMs: number, args: number[] = []) {
    await this.commands.request(XSYD_COMMANDS.action, new Uint8Array([order, ...args]), timeoutMs)
  }

  private supportsDynamicColorId() {
    const [major = 0, minor = 0, patch = 0] = this.protocolVersion.split('.').map(Number)
    return major > 1 || major === 1 && (minor > 0 || minor === 0 && patch >= 9)
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

  private onConfigurationChange(listener: (configuration: KeyboardConfiguration) => void) {
    this.configurationListeners.add(listener)
    return () => this.configurationListeners.delete(listener)
  }

  /**
   * 真机抓包确认：硬件切换后会主动发送 Action 返回包，
   * data 为 [Err Code, order, s_arg, ...]：0x21/0x22 表示 WIN/Mac，0x70 表示配置槽。
   */
  private handleNotification(command: number, data: Uint8Array) {
    if (command !== XSYD_COMMANDS.action.responseCode || data[0] !== 0) return
    const order = data[1]
    const value = data[2]
    if (value === 1 && (order === XSYD_ACTIONS.queryWinMode || order === XSYD_ACTIONS.queryMacMode)) {
      const mode: KeyboardMode = order === XSYD_ACTIONS.queryWinMode ? 'win' : 'mac'
      if (mode === this.currentMode) return
      this.currentMode = mode
      for (const listener of this.modeListeners) listener(mode)
      return
    }
    if (order === XSYD_ACTIONS.switchConfiguration && value !== undefined && value <= 3) {
      const configuration = (value + 1) as KeyboardConfiguration
      for (const listener of this.configurationListeners) listener(configuration)
    }
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

  /** 0x23 也承载高级键的细分 Layout；响应 value 与普通键码一样为小端 16 位。 */
  private async readLayoutValue(sourceCode: number, layout: number) {
    const data = await this.commands.request(XSYD_COMMANDS.keymap, new Uint8Array([0, sourceCode, layout, 0xff, 0xff]))
    return readUint16le(data, 3)
  }

  private async writeLayoutValue(sourceCode: number, layout: number, value: number) {
    await this.commands.request(XSYD_COMMANDS.keymap, new Uint8Array([1, sourceCode, layout, ...uint16le(value)]))
  }
}
