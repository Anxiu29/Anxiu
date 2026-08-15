import { describe, expect, it } from 'vitest'
import { MatrixGridLayout } from '@/domain/layout'
import { C98_DEMO_KEYS, C98_LAYOUT } from '@/devices/c98/layout'

describe('layout descriptors', () => {
  it('keeps protocol addresses independent from visual geometry', () => {
    const a = C98_LAYOUT.describe(C98_DEMO_KEYS).find((key) => key.sourceCode === 0x04)

    expect(a?.address).toEqual({ kind: 'matrix', row: 3, column: 1 })
    expect(a?.geometry).toMatchObject({ x: 1.8, y: 3 })
  })

  it('describes non-uniform physical key widths', () => {
    const space = C98_LAYOUT.describe(C98_DEMO_KEYS).find((key) => key.sourceCode === 0x2c)

    expect(space?.geometry.width).toBe(6)
  })

  it('offers a generic matrix layout without device-specific UI code', () => {
    const layout = new MatrixGridLayout()
    const [key] = layout.describe([
      { id: '2-3', sourceCode: 4, label: 'A', address: { kind: 'matrix', row: 2, column: 3 } },
    ])

    expect(key?.geometry).toEqual({ x: 3, y: 2, width: 1, height: 1 })
  })
})
