import { DriverError } from '@/application/DriverError'
import type { DeviceTransport } from '@/application/ports'
import { decodePacket, encodePacket, type CrcStrategy } from '../codec'
import { XSYD_FAILURE_RESPONSE, type CommandDefinition } from './commands'

interface PendingRequest {
  definition: CommandDefinition
  resolve: (packet: Uint8Array) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class XsydCommandClient {
  private pending?: PendingRequest
  private queue: Promise<unknown> = Promise.resolve()
  private closed = false
  private readonly removeReportListener: () => void

  constructor(private readonly transport: DeviceTransport, private readonly crc?: CrcStrategy) {
    this.removeReportListener = transport.onReport((report) => this.handleReport(report))
  }

  request(definition: CommandDefinition, data: Uint8Array, timeoutMs = definition.timeoutMs): Promise<Uint8Array> {
    if (this.closed) return Promise.reject(new DriverError('DEVICE_NOT_CONNECTED', '设备会话已关闭'))
    const operation = () => new Promise<Uint8Array>(async (resolve, reject) => {
      if (this.closed) {
        reject(new DriverError('DEVICE_NOT_CONNECTED', '设备会话已关闭'))
        return
      }
      const timer = setTimeout(() => {
        this.pending = undefined
        reject(new DriverError('PROTOCOL_TIMEOUT', `设备响应超时（${definition.name}: 0x${definition.code.toString(16)}）`, true, { details: { command: definition.code, commandName: definition.name } }))
      }, timeoutMs)
      this.pending = { definition, resolve, reject, timer }
      try {
        await this.transport.send(encodePacket(definition.code, data, this.crc))
      } catch (error) {
        clearTimeout(timer)
        this.pending = undefined
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
    const result = this.queue.then(operation, operation)
    this.queue = result.catch(() => undefined)
    return result
  }

  close() {
    if (this.closed) return
    this.closed = true
    this.removeReportListener()
    if (!this.pending) return
    clearTimeout(this.pending.timer)
    this.pending.reject(new DriverError('DEVICE_NOT_CONNECTED', '设备会话已关闭'))
    this.pending = undefined
  }

  private handleReport(report: Uint8Array) {
    if (!this.pending) return
    const pending = this.pending
    try {
      const packet = decodePacket(report, this.crc)
      if (packet.command === XSYD_FAILURE_RESPONSE) {
        const errorCode = packet.data[0] ?? 0xff
        throw new DriverError('PROTOCOL_REJECTED', `键盘拒绝命令，错误码 0x${errorCode.toString(16).padStart(2, '0')}`, true, { details: { errorCode } })
      }
      if (packet.command !== pending.definition.responseCode) return
      const { definition, resolve, timer } = pending
      if (definition.responseStatus === 'zero' && (packet.data[0] ?? 0) !== 0) {
        const errorCode = packet.data[0]!
        throw new DriverError('PROTOCOL_REJECTED', `设备返回错误码 0x${errorCode.toString(16)}`, true, { details: { errorCode, commandName: definition.name } })
      }
      clearTimeout(timer)
      this.pending = undefined
      resolve(packet.data)
    } catch (error) {
      clearTimeout(pending.timer)
      if (this.pending === pending) this.pending = undefined
      pending.reject(error instanceof Error ? error : new Error(String(error)))
    }
  }
}
