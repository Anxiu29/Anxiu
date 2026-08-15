import type { DeviceInfo, KeyAssignment, KeyPosition, KeyboardProfile } from '@/domain/keyboard'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import type { DeviceTransport, KeyboardDevice } from '@/application/ports'
import { decodePacket, encodePacket, readUint16le, uint16le, type CrcStrategy } from './codec'
import { DriverError } from '@/application/DriverError'
import type { LayoutDescriptor, MatrixKeyInput } from '@/domain/layout'

const COMMAND = { SYNC: 0x01, ACTION: 0x00, KEY: 0x23, DEFAULT_KEY: 0x2b, FAIL: 0xff } as const
const ORDER = { PROTOCOL_VERSION: 0x01, SAVE: 0x02, RELOAD: 0x03, RESTORE_FACTORY: 0x11 } as const

interface PendingRequest {
  command: number
  resolve: (packet: Uint8Array) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class XsydKeyboardProtocol implements KeyboardDevice {
  private pending?: PendingRequest
  private queue: Promise<unknown> = Promise.resolve()
  private readonly removeReportListener: () => void
  readonly profile = { getProfile: () => this.getProfile() }
  readonly keymap = { writeAssignments: (assignments: KeyAssignment[]) => this.writeAssignments(assignments) }
  readonly configuration = { save: () => this.save(), reload: () => this.reload() }
  readonly factoryReset = { restoreFactory: () => this.restoreFactory() }

  constructor(private readonly transport: DeviceTransport, private readonly keyCatalog: KeyCatalog, private readonly layout: LayoutDescriptor, private readonly crc?: CrcStrategy) {
    this.removeReportListener = transport.onReport((report) => this.handleReport(report))
  }

  async getProfile(): Promise<KeyboardProfile> {
    const [device, protocolVersion, positions] = await Promise.all([this.sync(), this.queryProtocolVersion(), this.readDefaultLayout()])
    const assignments: KeyAssignment[] = []
    for (let layer = 0; layer < 4; layer++) assignments.push(...await this.readLayer(layer, positions))
    return {
      device: { ...device, protocolVersion },
      capabilities: { layers: 4, remap: true, restoreFactory: true, layoutRows: 6, layoutColumns: 21 },
      positions,
      assignments,
    }
  }

  async writeAssignments(assignments: KeyAssignment[]) {
    for (let offset = 0; offset < assignments.length; offset += 14) {
      const batch = assignments.slice(offset, offset + 14)
      const data = [1]
      batch.forEach((item) => data.push(item.sourceCode, item.layer, ...uint16le(item.keyCode)))
      await this.request(COMMAND.KEY, new Uint8Array(data), 1200)
    }
  }

  save() { return this.action(ORDER.SAVE, 1600) }
  reload() { return this.action(ORDER.RELOAD, 1600) }
  restoreFactory() { return this.action(ORDER.RESTORE_FACTORY, 2500) }

  close() {
    this.removeReportListener()
    if (this.pending) {
      clearTimeout(this.pending.timer)
      this.pending.reject(new Error('设备会话已关闭'))
      this.pending = undefined
    }
  }

  private async sync(): Promise<DeviceInfo> {
    const random = crypto.getRandomValues(new Uint8Array(4))
    const syncPayload = new Uint8Array([...random, 0xff, 0xff])
    const data = await this.request(COMMAND.SYNC, syncPayload)
    const ascii = (start: number, length: number) => new TextDecoder().decode(data.slice(start + 1, start + length)).replace(/\0/g, '').trim()
    const hex = (start: number, length: number) => Array.from(data.slice(start, start + length), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
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
    const data = await this.request(COMMAND.ACTION, new Uint8Array([ORDER.PROTOCOL_VERSION]))
    return new TextDecoder().decode(data.slice(2)).replace(/\0/g, '').trim() || '1.0.x'
  }

  private async action(order: number, timeout: number) {
    await this.request(COMMAND.ACTION, new Uint8Array([order]), timeout)
  }

  private async readDefaultLayout(): Promise<KeyPosition[]> {
    const matrixKeys: MatrixKeyInput[] = []
    for (let row = 0; row < 6; row += 2) {
      const data = await this.request(COMMAND.DEFAULT_KEY, new Uint8Array([0, row, row + 1]))
      const blocks = [{ row: data[1] ?? row, start: 2 }, { row: data[23] ?? row + 1, start: 24 }]
      for (const block of blocks) {
        for (let column = 0; column < 21; column++) {
          const sourceCode = data[block.start + column] ?? 0xff
          if (sourceCode === 0xff || sourceCode === 0) continue
          matrixKeys.push({ id: `${block.row}-${column}`, sourceCode, label: this.keyCatalog.get(sourceCode).label, address: { kind: 'matrix', row: block.row, column } })
        }
      }
    }
    return this.layout.describe(matrixKeys)
  }

  private async readLayer(layer: number, positions: KeyPosition[]): Promise<KeyAssignment[]> {
    const assignments: KeyAssignment[] = []
    for (let offset = 0; offset < positions.length; offset += 14) {
      const batch = positions.slice(offset, offset + 14)
      const request = [0]
      batch.forEach((position) => request.push(position.sourceCode, layer, 0xff, 0xff))
      const data = await this.request(COMMAND.KEY, new Uint8Array(request))
      for (let index = 0; index < batch.length; index++) {
        const position = batch[index]!
        const base = 1 + index * 4
        const keyCode = readUint16le(data, base + 2)
        assignments.push({ positionId: position.id, sourceCode: position.sourceCode, layer, keyCode, category: this.keyCatalog.get(keyCode).category })
      }
    }
    return assignments
  }

  private request(command: number, data: Uint8Array, timeout = 1200): Promise<Uint8Array> {
    const operation = () => new Promise<Uint8Array>(async (resolve, reject) => {
      const responseCommand = command | 0x80
      const timer = setTimeout(() => {
        this.pending = undefined
        reject(new DriverError('PROTOCOL_TIMEOUT', `设备响应超时（命令 0x${command.toString(16)}）`, true, { details: { command } }))
      }, timeout)
      this.pending = { command: responseCommand, resolve, reject, timer }
      try { await this.transport.send(encodePacket(command, data, this.crc)) }
      catch (error) { clearTimeout(timer); this.pending = undefined; reject(error instanceof Error ? error : new Error(String(error))) }
    })
    const result = this.queue.then(operation, operation)
    this.queue = result.catch(() => undefined)
    return result
  }

  private handleReport(report: Uint8Array) {
    if (!this.pending) return
    try {
      const packet = decodePacket(report, this.crc)
      if (packet.command === COMMAND.FAIL) {
        const error = packet.data[0] ?? 0xff
        throw new DriverError('PROTOCOL_REJECTED', `键盘拒绝命令，错误码 0x${error.toString(16).padStart(2, '0')}`, true, { details: { errorCode: error } })
      }
      if (packet.command !== this.pending.command) return
      const { resolve, timer } = this.pending
      clearTimeout(timer)
      this.pending = undefined
      if ((packet.data[0] ?? 0) !== 0) throw new DriverError('PROTOCOL_REJECTED', `设备返回错误码 0x${packet.data[0]!.toString(16)}`, true, { details: { errorCode: packet.data[0] } })
      resolve(packet.data)
    } catch (error) {
      const pending = this.pending
      if (!pending) return
      clearTimeout(pending.timer)
      this.pending = undefined
      pending.reject(error instanceof Error ? error : new Error(String(error)))
    }
  }
}
