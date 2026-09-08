import type { DeviceTransport } from '@/application/ports'
import { decodePacket } from '../codec'
import type { FirmwareDiagnostic } from '@/application/FirmwareUpdate'

/** 固件独占通道：逐片 await；只读响应，不重发任何擦除或写入命令。 */
export class FirmwareChannel {
  constructor(readonly transport: DeviceTransport, private readonly diagnostic?: (event: FirmwareDiagnostic) => void) {}

  private trace(event: FirmwareDiagnostic) {
    // 日志消费者失败不能改变刷写协议的执行结果。
    try { this.diagnostic?.(event) } catch { /* 诊断是旁路观察。 */ }
  }

  async sendRestart(report: Uint8Array) {
    const command = report[2]!, started = Date.now()
    this.trace({ kind: 'command', outcome: 'started', command, frames: 1 })
    try {
      await this.transport.send(report)
      this.trace({ kind: 'command', outcome: 'sent', command, durationMs: Date.now() - started })
    } catch (cause) {
      this.trace({ kind: 'command', outcome: 'failure', command, durationMs: Date.now() - started, message: cause instanceof Error ? cause.message : String(cause) })
      throw cause
    }
  }

  async request(reports: Uint8Array | Uint8Array[], done: (data: Uint8Array) => boolean = () => true, timeout = 5000): Promise<Uint8Array> {
    const frames = Array.isArray(reports) ? reports : [reports]
    const command = frames[0]![2]!
    const started = Date.now()
    const header = frames[0]!
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength)
    const location = command === 12 && header.length >= 10 ? { address: view.getUint32(4, true), size: view.getUint16(8, true) } : {}
    this.trace({ kind: 'command', outcome: 'started', command, frames: frames.length, ...location })
    let stop = () => {}, unreport = () => {}, undisconnect = () => {}
    let aborted = false
    let timer: ReturnType<typeof setTimeout>
    const response = new Promise<Uint8Array>((resolve, reject) => {
      stop = () => { aborted = true; clearTimeout(timer); unreport(); undisconnect() }
      timer = setTimeout(() => reject(new Error(`升级命令 0x${command.toString(16)} 响应超时，已停止写入`)), timeout)
      unreport = this.transport.onReport((report) => {
        if (report[2] !== (command | 0x80) && report[2] !== 0xff) return
        try {
          const packet = decodePacket(report)
          if (packet.command === 0xff || !packet.data.length || packet.data[0] !== 0) throw new Error(`升级命令 0x${command.toString(16)} 被设备拒绝（${packet.data[0]}）`)
          if (done(packet.data)) resolve(packet.data)
        } catch (error) { reject(error) }
      })
      undisconnect = this.transport.onDisconnect(() => reject(new Error('升级设备连接中断，已停止写入')))
    })
    void response.catch(() => { aborted = true })
    // 先注册接收器；响应和发送均需成功，快速 ACK 不会掩盖后续 sendReport 错误。
    try {
      const [, data] = await Promise.all([(async () => {
        for (const frame of frames) {
          if (aborted) throw new Error('升级请求已停止')
          await this.transport.send(frame)
        }
      })(), response])
      this.trace({ kind: 'command', outcome: 'success', command, durationMs: Date.now() - started, ...location })
      return data
    } catch (cause) {
      this.trace({ kind: 'command', outcome: 'failure', command, durationMs: Date.now() - started, ...location, message: cause instanceof Error ? cause.message : String(cause) })
      throw cause
    } finally { stop() }
  }
}
