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
  readonly profile = { getProfile: () => this.getProfile() }
  readonly keymap = { writeAssignments: (assignments: KeyAssignment[]) => this.writeAssignments(assignments) }
  readonly configuration = { save: () => this.save(), reload: () => this.reload() }
  readonly factoryReset = { restoreFactory: () => this.restoreFactory() }
  readonly systemMode = { switchMode: (mode: KeyboardMode) => this.switchMode(mode) }
  readonly configurationSwitch = { switchConfiguration: (configuration: KeyboardConfiguration) => this.switchConfiguration(configuration) }

  constructor(
    private readonly transport: DeviceTransport,
    private readonly keyCatalog: KeyCatalog,
    private readonly capabilityDescriptor: CapabilityDescriptor,
    private readonly resolveDefaultKeymap: DefaultKeymapResolver,
    crc?: CrcStrategy,
  ) {
    this.commands = new XsydCommandClient(transport, crc)
  }

  async getProfile(): Promise<KeyboardProfile> {
    const [device, protocolVersion] = await Promise.all([this.sync(), this.queryProtocolVersion()])
    const capabilities = this.capabilityDescriptor.resolve({ device: { ...device, protocolVersion }, protocolVersion })
    const positions = await this.readDefaultLayout(capabilities.layoutRows, capabilities.layoutColumns)
    const assignments: KeyAssignment[] = []
    for (let layer = 0; layer < capabilities.layers; layer++) assignments.push(...await this.readLayer(layer, positions))
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
      defaultAssignments,
      assignments,
    }
  }

  async writeAssignments(assignments: KeyAssignment[]) {
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
    await this.waitForModeReports()
  }
  async switchConfiguration(configuration: KeyboardConfiguration) {
    await this.action(XSYD_ACTIONS.switchConfiguration, 1600, [configuration - 1])
    await this.waitForModeReports()
  }
  close() { this.commands.close() }

  private async sync(): Promise<DeviceInfo> {
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

  /** 模式/配置切换后固件会连续主动上报 0xA3 通知；等待其结束再开始查询。 */
  private waitForModeReports() { return new Promise<void>((resolve) => setTimeout(resolve, 2000)) }

  private async readDefaultLayout(rows: number, columns: number): Promise<KeyPosition[]> {
    const matrixKeys: MatrixKeyInput[] = []
    for (let row = 0; row < rows; row += 2) {
      const data = await this.commands.request(XSYD_COMMANDS.defaultKeymap, new Uint8Array([0, row, row + 1]))
      const blocks = [{ row: data[1] ?? row, start: 2 }, { row: data[2 + columns] ?? row + 1, start: 3 + columns }]
      for (const block of blocks) {
        for (let column = 0; column < columns; column++) {
          const sourceCode = data[block.start + column] ?? 0xff
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
      batch.forEach((position) => request.push(position.sourceCode, layer, 0xff, 0xff))
      const data = await this.commands.request(XSYD_COMMANDS.keymap, new Uint8Array(request))
      for (let index = 0; index < batch.length; index++) {
        const position = batch[index]!
        const keyCode = readUint16le(data, 1 + index * 4 + 2)
        assignments.push({ positionId: position.id, sourceCode: position.sourceCode, layer, keyCode, category: this.keyCatalog.get(keyCode).category })
      }
    }
    return assignments
  }
}
