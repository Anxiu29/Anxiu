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

/**
 * 产品图只用于确认少数键帽的宽高，不用于改变矩阵行列或猜测键位。
 * Map 的键是稳定的矩阵地址 row-column，不是会变化或重复的 sourceCode。
 */
const sizeByAddress = new Map<string, Pick<ControlGeometry, 'width' | 'height'>>([
  ['1-13', { width: 2, height: 1 }],   // Backspace
  ['2-0', { width: 1.5, height: 1 }],  // Tab
  ['2-20', { width: 1, height: 2 }],   // 数字区 +
  ['3-0', { width: 1.8, height: 1 }],  // CapsLock
  ['3-13', { width: 2.2, height: 1 }], // Enter
  ['4-0', { width: 2.2, height: 1 }],  // 左 Shift
  ['4-13', { width: 2.8, height: 1 }], // 右 Shift
  ['4-20', { width: 1, height: 2 }],   // 数字区 Enter
  ['5-6', { width: 6, height: 1 }],    // Space
  ['5-17', { width: 2, height: 1 }],   // 数字区 0
])

/**
 * 严格矩阵顺序布局：
 * 1. y 永远等于设备读取的 row，不允许跨行移动；
 * 2. 同一行按 column 递增显示，空槽仍占据原始列；
 * 3. 宽键只把本行后续槽位向右推，不改变任何键的先后关系；
 * 4. 当前矩阵没有旋钮数据，顶部对应区域保持空白。
 */
class C98OrderedMatrixLayoutDescriptor implements LayoutDescriptor<MatrixKeyInput> {
  readonly id = 'rk-c98-ordered-matrix'

  describe(keys: readonly MatrixKeyInput[]): KeyPosition[] {
    const extraWidthByRow = new Map<number, number>()
    return keys.map((key) => {
      const row = key.address.row
      const size = sizeByAddress.get(`${row}-${key.address.column}`) ?? { width: 1, height: 1 }
      const x = key.address.column + (extraWidthByRow.get(row) ?? 0)
      extraWidthByRow.set(row, (extraWidthByRow.get(row) ?? 0) + size.width - 1)
      return { ...key, geometry: { x, y: row, ...size } }
    })
  }
}

export const C98_LAYOUT: LayoutDescriptor<MatrixKeyInput> = new C98OrderedMatrixLayoutDescriptor()

export const C98_DEMO_KEYS: MatrixKeyInput[] = C98_CAPTURED_DEFAULT_MATRIX.flatMap((row, rowIndex) =>
  row.map((sourceCode, column) => ({
    id: `${rowIndex}-${column}`,
    sourceCode,
    present: sourceCode !== 0,
    label: '',
    address: { kind: 'matrix' as const, row: rowIndex, column },
  })),
)
