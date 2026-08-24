import { DriverError } from '@/application/DriverError'
import type { DeviceTransport } from '@/application/ports'
import { decodePacket, encodePacket, PACKET_HEAD, type CrcStrategy, type ProtocolPacket } from '../codec'
import { XSYD_FAILURE_RESPONSE, type CommandDefinition } from './commands'

interface PendingRequest {
  definition: CommandDefinition
  expectedOrder?: number
  resolve: (packet: Uint8Array | Uint8Array[]) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
  expectedResponses: number
  responses: Uint8Array[]
  /** 长响应的协议帧会被 HID 拆成若干个无独立包头的 64 字节分片。 */
  fragmented?: { bytes: number[]; totalLength?: number }
}

export class XsydCommandClient {
  // 协议没有可确认的事务序号，因此任何时刻只允许一个 pending 请求。
  private pending?: PendingRequest
  // Promise 链把所有请求串行化；前一请求失败后仍从拒绝分支继续执行下一项。
  private queue: Promise<unknown> = Promise.resolve()
  private closed = false
  private readonly removeReportListener: () => void
  private readonly notificationListeners = new Set<(packet: ProtocolPacket) => void>()

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
      this.pending = { definition, expectedOrder: definition.responseEchoesOrder ? data[0] : undefined, resolve: resolve as PendingRequest['resolve'], reject, timer, expectedResponses: 1, responses: [] }
      try {
        await this.transport.send(encodePacket(definition.code, data, this.crc))
      } catch (error) {
        clearTimeout(timer)
        this.pending = undefined
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
    const result = this.queue.then(operation, operation)
    // queue 自身吞掉错误只为保持队列可继续；调用者拿到的 result 仍会正常 reject。
    this.queue = result.catch(() => undefined)
    return result
  }

  /** 0x12 的矩阵数据会拆成三个 HID 报告；仍进入同一串行队列，避免和普通请求抢响应。 */
  requestMultiple(definition: CommandDefinition, data: Uint8Array, expectedResponses: number, timeoutMs = definition.timeoutMs): Promise<Uint8Array[]> {
    if (this.closed) return Promise.reject(new DriverError('DEVICE_NOT_CONNECTED', '设备会话已关闭'))
    const operation = () => new Promise<Uint8Array[]>(async (resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = undefined
        reject(new DriverError('PROTOCOL_TIMEOUT', `设备多包响应超时（${definition.name}）`, true))
      }, timeoutMs)
      this.pending = { definition, resolve: resolve as PendingRequest['resolve'], reject, timer, expectedResponses, responses: [] }
      try { await this.transport.send(encodePacket(definition.code, data, this.crc)) }
      catch (error) { clearTimeout(timer); this.pending = undefined; reject(error instanceof Error ? error : new Error(String(error))) }
    })
    const result = this.queue.then(operation, operation)
    this.queue = result.catch(() => undefined)
    return result
  }

  /**
   * 读取一个跨多个 HID report 的长协议帧。
   *
   * 0x12 响应的 length 为 128/130；只有第一片带 5C/length/cmd/crc，后续片
   * 是原始数据续片，不能分别交给 decodePacket。这里先按 length 拼回完整帧，
   * 再统一做命令匹配和 CRC 校验。
   */
  requestFragmented(definition: CommandDefinition, data: Uint8Array, timeoutMs = definition.timeoutMs): Promise<Uint8Array> {
    if (this.closed) return Promise.reject(new DriverError('DEVICE_NOT_CONNECTED', '设备会话已关闭'))
    const operation = () => new Promise<Uint8Array>(async (resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = undefined
        reject(new DriverError('PROTOCOL_TIMEOUT', `设备分片响应超时（${definition.name}）`, true))
      }, timeoutMs)
      this.pending = { definition, resolve: resolve as PendingRequest['resolve'], reject, timer, expectedResponses: 1, responses: [], fragmented: { bytes: [] } }
      try { await this.transport.send(encodePacket(definition.code, data, this.crc)) }
      catch (error) { clearTimeout(timer); this.pending = undefined; reject(error instanceof Error ? error : new Error(String(error))) }
    })
    const result = this.queue.then(operation, operation)
    this.queue = result.catch(() => undefined)
    return result
  }

  /**
   * 命令响应由 request 消费；没有对应请求的主动上报从这里交给设备协议解释。
   * 命令客户端只负责分流，不在公共层解释某款键盘的主动包含义。
   */
  onNotification(listener: (packet: ProtocolPacket) => void) {
    this.notificationListeners.add(listener)
    return () => this.notificationListeners.delete(listener)
  }

  close() {
    if (this.closed) return
    this.closed = true
    this.removeReportListener()
    this.notificationListeners.clear()
    // 关闭时必须拒绝正在等待的 Promise，否则上层会一直停留在 reading/writing 状态。
    if (!this.pending) return
    clearTimeout(this.pending.timer)
    this.pending.reject(new DriverError('DEVICE_NOT_CONNECTED', '设备会话已关闭'))
    this.pending = undefined
  }

  private handleReport(report: Uint8Array) {
    const pending = this.pending
    try {
      if (pending?.fragmented) {
        this.handleFragment(report, pending)
        return
      }
      const packet = decodePacket(report, this.crc)
      // 空闲时收到的合法包是设备主动上报，不能丢弃，否则硬件侧状态变化无法同步到 UI。
      if (!pending) {
        this.emitNotification(packet)
        return
      }
      if (packet.command === XSYD_FAILURE_RESPONSE) {
        const errorCode = packet.data[0] ?? 0xff
        throw new DriverError('PROTOCOL_REJECTED', `键盘拒绝命令，错误码 0x${errorCode.toString(16).padStart(2, '0')}`, true, { details: { errorCode } })
      }
      if (packet.command !== pending.definition.responseCode) {
        this.emitNotification(packet)
        return
      }
      const { definition, resolve, timer } = pending
      if (definition.responseStatus === 'zero' && (packet.data[0] ?? 0) !== 0) {
        const errorCode = packet.data[0]!
        throw new DriverError('PROTOCOL_REJECTED', `设备返回错误码 0x${errorCode.toString(16)}`, true, { details: { errorCode, commandName: definition.name } })
      }
      // Action 都返回 0x80；成功包还要核对回显 order，不同 order 属于硬件主动上报。
      if (pending.expectedOrder !== undefined && packet.data[1] !== pending.expectedOrder) {
        this.emitNotification(packet)
        return
      }
      pending.responses.push(packet.data)
      if (pending.responses.length < pending.expectedResponses) return
      clearTimeout(timer)
      this.pending = undefined
      resolve(pending.expectedResponses === 1 ? packet.data : pending.responses)
    } catch (error) {
      // 空闲时的损坏上报不对应任何调用方，忽略即可；请求响应损坏仍应让请求失败。
      if (!pending) return
      clearTimeout(pending.timer)
      if (this.pending === pending) this.pending = undefined
      pending.reject(error instanceof Error ? error : new Error(String(error)))
    }
  }

  private handleFragment(report: Uint8Array, pending: PendingRequest) {
    const fragmented = pending.fragmented!
    if (fragmented.bytes.length === 0) {
      if (report[0] !== PACKET_HEAD) throw new DriverError('PROTOCOL_REJECTED', '分片响应缺少协议包头')
      // 等待目标命令时仍可能收到硬件主动上报；完整普通包应继续交给通知监听器。
      if (report[2] !== pending.definition.responseCode) {
        this.emitNotification(decodePacket(report, this.crc))
        return
      }
      fragmented.totalLength = 4 + (report[1] ?? 0)
    }
    fragmented.bytes.push(...report)
    if (fragmented.bytes.length < fragmented.totalLength!) return

    const packet = decodePacket(Uint8Array.from(fragmented.bytes.slice(0, fragmented.totalLength)), this.crc)
    clearTimeout(pending.timer)
    if (this.pending === pending) this.pending = undefined
    pending.resolve(packet.data)
  }

  private emitNotification(packet: ProtocolPacket) {
    for (const listener of this.notificationListeners) listener(packet)
  }
}
