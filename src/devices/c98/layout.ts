import type { ControlGeometry, LayoutDescriptor, MatrixKeyInput } from '@/domain/layout'
import type { KeyPosition } from '@/domain/keyboard'

/**
 * C98 默认矩阵，严格按照真机三次 DEFAULT_KEY 响应排列。
 * 每行固定 21 个槽位；0 表示该矩阵位置没有按键。
 */
export const C98_CAPTURED_DEFAULT_MATRIX: readonly (readonly number[])[] = [
  [0x29, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x00, 0x46, 0x49, 0x4d, 0x4a, 0x00, 0x00, 0x00],
  [0x35, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x2d, 0x2e, 0x2a, 0x4c, 0x00, 0x00, 0x53, 0x54, 0x55, 0x56],
  [0x2b, 0x14, 0x1a, 0x08, 0x15, 0x17, 0x1c, 0x18, 0x0c, 0x12, 0x13, 0x2f, 0x30, 0x31, 0x4b, 0x00, 0x00, 0x5f, 0x60, 0x61, 0x57],
  [0x39, 0x04, 0x16, 0x07, 0x09, 0x0a, 0x0b, 0x0d, 0x0e, 0x0f, 0x33, 0x34, 0x00, 0x28, 0x4e, 0x00, 0x00, 0x5c, 0x5d, 0x5e, 0x00],
  [0xe1, 0x00, 0x1d, 0x1b, 0x06, 0x19, 0x05, 0x11, 0x10, 0x36, 0x37, 0x38, 0x00, 0xe5, 0x00, 0x52, 0x00, 0x59, 0x5a, 0x5b, 0x58],
  [0xe0, 0xe3, 0xe2, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0xe6, 0x01, 0x00, 0xe4, 0x50, 0x51, 0x4f, 0x62, 0x00, 0x63, 0x00],
]

type GeometryEntry = readonly [row: number, column: number, x: number, y: number, width?: number, height?: number]

/**
 * 根据 C98(739) 单模 US 带旋钮图片整理的物理几何表。
 *
 * 表的身份只能使用矩阵 row/column，绝不能使用 sourceCode：
 * sourceCode 是该位置读取到的默认功能，将来可能变化；row/column 才是物理位置。
 * 坐标单位约等于一个标准 1U 键帽，组间空隙通过非整数 x/y 表示。
 */
const geometryEntries: readonly GeometryEntry[] = [
  // 顶部功能区：Esc、F1-F12、导航键。Del 来自矩阵 row 1 column 14。
  [0,0,0,0], [0,1,2,0], [0,2,3,0], [0,3,4,0], [0,4,5,0],
  [0,5,6.5,0], [0,6,7.5,0], [0,7,8.5,0], [0,8,9.5,0],
  [0,9,11,0], [0,10,12,0], [0,11,13,0], [0,12,14,0],
  [1,14,15.5,0], [0,14,17,0], [0,15,18,0], [0,16,19,0], [0,17,20,0],

  // 主键区数字行、独立 Del 下方导航键和数字键盘首行。
  [1,0,0,1.5], [1,1,1,1.5], [1,2,2,1.5], [1,3,3,1.5], [1,4,4,1.5], [1,5,5,1.5],
  [1,6,6,1.5], [1,7,7,1.5], [1,8,8,1.5], [1,9,9,1.5], [1,10,10,1.5], [1,11,11,1.5],
  [1,12,12,1.5], [1,13,13,1.5,2], [2,14,15.5,1.5],
  [1,17,17,1.5], [1,18,18,1.5], [1,19,19,1.5], [1,20,20,1.5],

  // QWERTY 行。
  [2,0,0,2.5,1.5], [2,1,1.5,2.5], [2,2,2.5,2.5], [2,3,3.5,2.5], [2,4,4.5,2.5],
  [2,5,5.5,2.5], [2,6,6.5,2.5], [2,7,7.5,2.5], [2,8,8.5,2.5], [2,9,9.5,2.5],
  [2,10,10.5,2.5], [2,11,11.5,2.5], [2,12,12.5,2.5], [2,13,13.5,2.5,1.5],
  [2,17,17,2.5], [2,18,18,2.5], [2,19,19,2.5], [2,20,20,2.5,1,2],

  // ASDF 行。
  [3,0,0,3.5,1.8], [3,1,1.8,3.5], [3,2,2.8,3.5], [3,3,3.8,3.5], [3,4,4.8,3.5],
  [3,5,5.8,3.5], [3,6,6.8,3.5], [3,7,7.8,3.5], [3,8,8.8,3.5], [3,9,9.8,3.5],
  [3,10,10.8,3.5], [3,11,11.8,3.5], [3,13,12.8,3.5,2.2], [3,14,15.5,2.5],
  [3,17,17,3.5], [3,18,18,3.5], [3,19,19,3.5],

  // ZXCV 行、右 Shift、上方向键和数字区。
  [4,0,0,4.5,2.2], [4,2,2.2,4.5], [4,3,3.2,4.5], [4,4,4.2,4.5], [4,5,5.2,4.5],
  [4,6,6.2,4.5], [4,7,7.2,4.5], [4,8,8.2,4.5], [4,9,9.2,4.5], [4,10,10.2,4.5],
  [4,11,11.2,4.5], [4,13,12.2,4.5,2.8], [4,15,15.5,4.5],
  [4,17,17,4.5], [4,18,18,4.5], [4,19,19,4.5], [4,20,20,4.5,1,2],

  // 底行、方向键和数字区 0/小数点。
  [5,0,0,5.5,1.3], [5,1,1.3,5.5,1.3], [5,2,2.6,5.5,1.3], [5,6,3.9,5.5,6],
  [5,10,9.9,5.5,1.3], [5,11,11.2,5.5,1.3], [5,13,12.5,5.5,1.3],
  [5,14,14.5,5.5], [5,15,15.5,5.5], [5,16,16.5,5.5],
  [5,17,17,5.5,2], [5,19,19,5.5],
]

const geometryByAddress = new Map<string, ControlGeometry>(
  geometryEntries.map(([row, column, x, y, width = 1, height = 1]) => [`${row}-${column}`, { x, y, width, height }]),
)

class C98PhysicalLayoutDescriptor implements LayoutDescriptor<MatrixKeyInput> {
  readonly id = 'rk-c98-739-us-knob'

  describe(keys: readonly MatrixKeyInput[]): KeyPosition[] {
    return keys.map((key) => ({
      ...key,
      geometry: geometryByAddress.get(`${key.address.row}-${key.address.column}`)
        ?? { x: key.address.column, y: key.address.row, width: 1, height: 1 },
    }))
  }
}

export const C98_LAYOUT: LayoutDescriptor<MatrixKeyInput> = new C98PhysicalLayoutDescriptor()

export const C98_DEMO_KEYS: MatrixKeyInput[] = C98_CAPTURED_DEFAULT_MATRIX.flatMap((row, rowIndex) =>
  row.map((sourceCode, column) => ({
    id: `${rowIndex}-${column}`,
    sourceCode,
    present: sourceCode !== 0,
    label: '',
    address: { kind: 'matrix' as const, row: rowIndex, column },
  })),
)
