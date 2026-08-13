export const PACKET_HEAD = 0x5c

export interface ProtocolPacket {
  command: number
  data: Uint8Array
}

export type CrcStrategy = (bytes: Uint8Array) => number

// 协议文档未给出 CRC 算法。默认策略是常见的 8-bit 累加反码；真机联调时只需替换此函数。
export const checksum8: CrcStrategy = (bytes) => (-bytes.reduce((sum, byte) => (sum + byte) & 0xff, 0)) & 0xff

export function encodePacket(command: number, data: Uint8Array, crc: CrcStrategy = checksum8): Uint8Array {
  if (data.length > 60) throw new Error('协议数据超过 60 字节')
  const packet = new Uint8Array(4 + data.length)
  packet[0] = PACKET_HEAD
  packet[1] = data.length
  packet[2] = command
  packet.set(data, 4)
  packet[3] = crc(new Uint8Array([...packet.slice(0, 3), ...data]))
  return packet
}

export function decodePacket(report: Uint8Array, crc: CrcStrategy = checksum8): ProtocolPacket {
  if (report.length < 4 || report[0] !== PACKET_HEAD) throw new Error('无效协议包头')
  const length = report[1] ?? 0
  if (length > report.length - 4) throw new Error('协议包长度错误')
  const command = report[2] ?? 0
  const data = report.slice(4, 4 + length)
  const expected = crc(new Uint8Array([report[0]!, report[1]!, command, ...data]))
  if (report[3] !== expected) throw new Error('协议 CRC 校验失败')
  return { command, data }
}

export const uint16le = (value: number) => [value & 0xff, (value >> 8) & 0xff]
export const readUint16le = (data: Uint8Array, offset: number) => (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8)
