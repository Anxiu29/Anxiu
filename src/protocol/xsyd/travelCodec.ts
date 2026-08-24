import { readUint16le } from '@/protocol/codec'

/** 0x12：matrix=2 表示毫米行程，part=1/2 分别读取前三行和后三行。 */
export const encodeTravelRequest = (part: 1 | 2) => new Uint8Array([2, part, 0xff, 0xff])

export function decodeTravelHalf(packets: Uint8Array[]) {
  const bytes = Uint8Array.from(packets.flatMap((packet) => [...packet]))
  if (bytes[0] !== 2) throw new Error('行程矩阵响应类型不正确')
  const body = bytes.slice(2)
  return Array.from({ length: 3 }, (_, row) => Array.from({ length: 21 }, (_, column) => readUint16le(body, (row * 21 + column) * 2) / 1000))
}
