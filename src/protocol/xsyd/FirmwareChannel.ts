import type { DeviceTransport } from '@/application/ports'
import { decodePacket } from '../codec'

/** 固件独占通道：逐片 await；只读响应，不重发任何擦除或写入命令。 */
export class FirmwareChannel {
  constructor(readonly transport: DeviceTransport) {}

  async request(reports: Uint8Array | Uint8Array[], done: (data: Uint8Array) => boolean = () => true, timeout = 5000): Promise<Uint8Array> {
    const frames = Array.isArray(reports) ? reports : [reports]
    const command = frames[0]![2]!
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
      return data
    } finally { stop() }
  }
}
