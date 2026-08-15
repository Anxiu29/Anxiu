import { describe, expect, it } from 'vitest'
import { MatrixGridLayout } from '@/domain/layout'
import { C98_DEMO_KEYS, C98_LAYOUT } from '@/devices/c98/layout'

describe('layout descriptors', () => {
  it('keeps protocol addresses independent from visual geometry', () => {
    const a = C98_LAYOUT.describe(C98_DEMO_KEYS).find((key) => key.sourceCode === 0x04)

    expect(a?.address).toEqual({ kind: 'matrix', row: 3, column: 1 })
    expect(a?.geometry).toMatchObject({ x: 1.8, y: 3.5 })
  })

  it('describes non-uniform physical key widths', () => {
    const space = C98_LAYOUT.describe(C98_DEMO_KEYS).find((key) => key.sourceCode === 0x2c)

    expect(space?.geometry.width).toBe(6)
  })

  it('keeps a complete arrow cluster without extra downward offset', () => {
    const keys = C98_LAYOUT.describe(C98_DEMO_KEYS)
    const up = keys.find((key) => key.sourceCode === 0x52)
    const lowerArrows = keys.filter((key) => [0x50, 0x51, 0x4f].includes(key.sourceCode))

    expect(up?.geometry).toMatchObject({ x: 14.8, y: 4.5 })
    expect(lowerArrows).toHaveLength(3)
    expect(lowerArrows.every((key) => key.geometry.y === 5.5)).toBe(true)
  })

  it('represents the separated navigation and numpad areas', () => {
    const keys = C98_LAYOUT.describe(C98_DEMO_KEYS)
    const pageUp = keys.find((key) => key.sourceCode === 0x4b)
    const numpadPlus = keys.find((key) => key.sourceCode === 0x57)
    const numpadZero = keys.find((key) => key.sourceCode === 0x62)
    const insert = keys.find((key) => key.sourceCode === 0x49)

    expect(pageUp?.geometry.x).toBe(15.4)
    expect(numpadPlus?.geometry).toMatchObject({ x: 19.8, y: 2.5, height: 2 })
    expect(numpadZero?.geometry).toMatchObject({ x: 16.8, y: 5.5, width: 2 })
    expect(insert?.geometry).toMatchObject({ x: 17.8, y: 0 })
    expect(keys.find((key) => key.sourceCode === 0x53)?.geometry.x).toBe(16.8)
  })

  it('offers a generic matrix layout without device-specific UI code', () => {
    const layout = new MatrixGridLayout()
    const [key] = layout.describe([
      { id: '2-3', sourceCode: 4, label: 'A', address: { kind: 'matrix', row: 2, column: 3 } },
    ])

    expect(key?.geometry).toEqual({ x: 3, y: 2, width: 1, height: 1 })
  })
})
