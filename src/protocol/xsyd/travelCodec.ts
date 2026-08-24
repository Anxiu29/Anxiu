import { readUint16le } from '@/protocol/codec'

/** 0x12：matrix=2 表示毫米行程，part=1/2 分别读取前三行和后三行。 */
export const encodeTravelRequest = (part: 1 | 2) => new Uint8Array([2, part, 0xff, 0xff])
/** 完整抓包表明官方在每一页 matrix=2 行程之后固定读取 matrix=3 状态。 */
export const encodeTravelStateRequest = () => new Uint8Array([3, 1, 0xff, 0xff])

export function decodeTravelHalf(bytes: Uint8Array) {
  // 长响应 data 的前两字节依次是状态码和 matrix 类型，之后才是 3×21 个 uint16。
  if (bytes[0] !== 0) throw new Error(`行程矩阵读取失败（状态 ${bytes[0] ?? 0xff}）`)
  if (bytes[1] !== 2) throw new Error(`行程矩阵响应类型不正确（期望 0x02，收到 0x${(bytes[1] ?? 0xff).toString(16).padStart(2, '0')}）`)
  const body = bytes.slice(2)
  return Array.from({ length: 3 }, (_, row) => Array.from({ length: 21 }, (_, column) => readUint16le(body, (row * 21 + column) * 2) / 1000))
}

export function decodeTravelState(bytes: Uint8Array) {
  if (bytes[0] !== 0) throw new Error(`行程状态读取失败（状态 ${bytes[0] ?? 0xff}）`)
  if (bytes[1] !== 3) throw new Error(`行程状态响应类型不正确（期望 0x03，收到 0x${(bytes[1] ?? 0xff).toString(16).padStart(2, '0')}）`)
  const body = bytes.slice(2)
  // 状态页有 128 字节；当前设备矩阵使用前 6×21 个位置，末尾两个保留字节忽略。
  return Array.from({ length: 6 }, (_, row) => Array.from({ length: 21 }, (_, column) => body[row * 21 + column] ?? 0))
}
