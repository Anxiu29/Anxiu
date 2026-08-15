import type { ControlGeometry, LayoutDescriptor, MatrixKeyInput } from '@/domain/layout'
import type { KeyPosition } from '@/domain/keyboard'

type VisualKey = readonly [sourceCode: number, width?: number]
const rows: readonly VisualKey[][] = [
  [[0x29],[0x3a],[0x3b],[0x3c],[0x3d],[0x3e],[0x3f],[0x40],[0x41],[0x42],[0x43],[0x44],[0x45],[0x4c]],
  [[0x35],[0x1e],[0x1f],[0x20],[0x21],[0x22],[0x23],[0x24],[0x25],[0x26],[0x27],[0x2d],[0x2e],[0x2a,2],[0x4a]],
  [[0x2b,1.5],[0x14],[0x1a],[0x08],[0x15],[0x17],[0x1c],[0x18],[0x0c],[0x12],[0x13],[0x2f],[0x30],[0x31,1.5],[0x4b]],
  [[0x39,1.8],[0x04],[0x16],[0x07],[0x09],[0x0a],[0x0b],[0x0d],[0x0e],[0x0f],[0x33],[0x34],[0x28,2.2],[0x4e]],
  [[0xe1,2.2],[0x1d],[0x1b],[0x06],[0x19],[0x05],[0x11],[0x10],[0x36],[0x37],[0x38],[0xe5,2.5],[0x52]],
  [[0xe0,1.4],[0xe3,1.4],[0xe2,1.4],[0x2c,6],[0xe6,1.4],[0x01,1.4],[0xe4,1.4],[0x50],[0x51],[0x4f]],
]

const geometryBySourceCode = new Map<number, ControlGeometry>()
rows.forEach((row, y) => {
  let x = 0
  row.forEach(([sourceCode, width = 1]) => {
    geometryBySourceCode.set(sourceCode, { x, y, width, height: 1 })
    x += width
  })
})

class C98LayoutDescriptor implements LayoutDescriptor<MatrixKeyInput> {
  readonly id = 'rk-c98-ansi-us'
  describe(keys: readonly MatrixKeyInput[]): KeyPosition[] {
    return keys.map((key) => ({
      ...key,
      geometry: geometryBySourceCode.get(key.sourceCode) ?? { x: key.address.column, y: key.address.row, width: 1, height: 1 },
    })).sort((a, b) => a.geometry.y - b.geometry.y || a.geometry.x - b.geometry.x)
  }
}

export const C98_LAYOUT: LayoutDescriptor<MatrixKeyInput> = new C98LayoutDescriptor()
export const C98_DEMO_KEYS: MatrixKeyInput[] = Array.from({ length: 6 }, (_, rowIndex) =>
  Array.from({ length: 21 }, (_, column) => {
    const sourceCode = rows[rowIndex]?.[column]?.[0] ?? 0
    return { id: `demo-${rowIndex}-${column}`, sourceCode, present: sourceCode !== 0, label: '', address: { kind: 'matrix' as const, row: rowIndex, column } }
  }),
).flat()
