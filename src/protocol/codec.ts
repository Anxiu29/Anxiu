export const PACKET_HEAD = 0x5c

export interface ProtocolPacket {
  command: number
  data: Uint8Array
}

export type CrcStrategy = (bytes: Uint8Array) => number

/**
 * 星闪悦动协议的 1 字节包头校验。
 *
 * 参与字段：固定初值 0x35、Head、len、cmd，以及 data 的最后一个字节。
 * HID 报告剩余的 0x00 填充不参与计算。JavaScript 不会自动按 uint8
 * 溢出，因此返回前必须显式截断到低 8 位。
 */
export const computePacketCrc: CrcStrategy = (bytes) => {
  if (bytes.length < 3) throw new Error('CRC 输入缺少 head、len 或 cmd')
  const head = bytes[0] ?? 0
  const len = bytes[1] ?? 0
  const command = bytes[2] ?? 0
  const lastDataByte = len > 0 ? (bytes[bytes.length - 1] ?? 0) : 0
  return (0x35 + head + len + command + lastDataByte) & 0xff
}

export function encodePacket(command: number, data: Uint8Array, crc: CrcStrategy = computePacketCrc): Uint8Array {
  if (data.length > 60) throw new Error('协议数据超过 60 字节')
  const packet = new Uint8Array(4 + data.length)
  packet[0] = PACKET_HEAD
  packet[1] = data.length
  packet[2] = command
  packet.set(data, 4)
  packet[3] = crc(new Uint8Array([...packet.slice(0, 3), ...data]))
  return packet
}

export function decodePacket(report: Uint8Array, crc: CrcStrategy = computePacketCrc): ProtocolPacket {
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
