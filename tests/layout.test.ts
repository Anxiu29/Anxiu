import { describe, expect, it } from 'vitest'
import { MatrixGridLayout } from '@/domain/layout'
import { C98_DEMO_KEYS, C98_LAYOUT } from '@/devices/c98/layout'

describe('layout descriptors', () => {
  it('keeps all 6 x 21 matrix slots and marks empty slots as not present', () => {
    expect(C98_DEMO_KEYS).toHaveLength(126)
    expect(C98_DEMO_KEYS.filter((key) => !key.present).length).toBeGreaterThan(0)
    expect(C98_DEMO_KEYS.filter((key) => !key.present).every((key) => key.sourceCode === 0)).toBe(true)
  })

  it('keeps protocol addresses independent from visual geometry', () => {
    const a = C98_LAYOUT.describe(C98_DEMO_KEYS).find((key) => key.sourceCode === 0x04)

    expect(a?.address).toEqual({ kind: 'matrix', row: 3, column: 1 })
    expect(a?.geometry).toMatchObject({ x: 1.8, y: 3.5 })
  })

  it('keeps Del immediately after Backspace exactly as read from the device', () => {
    const positions = C98_LAYOUT.describe(C98_DEMO_KEYS)
    const backspace = positions.find((key) => key.address.kind === 'matrix' && key.address.row === 1 && key.address.column === 13)
    const del = positions.find((key) => key.address.kind === 'matrix' && key.address.row === 1 && key.address.column === 14)

    expect(backspace?.sourceCode).toBe(0x2a)
    expect(del?.sourceCode).toBe(0x4c)
    expect(C98_DEMO_KEYS.findIndex((key) => key.id === del?.id)).toBe(C98_DEMO_KEYS.findIndex((key) => key.id === backspace?.id) + 1)
    expect(backspace?.geometry).toMatchObject({ x: 13, y: 1.5, width: 2 })
    expect(del?.geometry).toMatchObject({ x: 15.5, y: 0 })
  })

  it('uses the key sizes shown in the C98 product image', () => {
    const positions = C98_LAYOUT.describe(C98_DEMO_KEYS)
    const at = (row: number, column: number) => positions.find((key) => key.address.kind === 'matrix' && key.address.row === row && key.address.column === column)

    expect(at(2, 0)?.geometry.width).toBe(1.5) // Tab
    expect(at(3, 13)?.geometry.width).toBe(2.2) // Enter
    expect(at(5, 6)?.geometry.width).toBe(6) // Space
    expect(at(2, 20)?.geometry.height).toBe(2) // 数字区 +
    expect(at(4, 20)?.geometry.height).toBe(2) // 数字区 Enter
    expect(at(5, 17)?.geometry.width).toBe(2) // 数字区 0
  })

  it('offers a generic matrix layout without device-specific UI code', () => {
    const layout = new MatrixGridLayout()
    const [key] = layout.describe([
      { id: '2-3', sourceCode: 4, label: 'A', present: true, address: { kind: 'matrix', row: 2, column: 3 } },
    ])

    expect(key?.geometry).toEqual({ x: 3, y: 2, width: 1, height: 1 })
  })
})
