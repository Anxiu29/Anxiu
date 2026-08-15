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
    expect(a?.geometry).toMatchObject({ x: 1, y: 3 })
  })

  it('keeps Del immediately after Backspace exactly as read from the device', () => {
    const positions = C98_LAYOUT.describe(C98_DEMO_KEYS)
    const backspace = positions.find((key) => key.address.kind === 'matrix' && key.address.row === 1 && key.address.column === 13)
    const del = positions.find((key) => key.address.kind === 'matrix' && key.address.row === 1 && key.address.column === 14)

    expect(backspace?.sourceCode).toBe(0x2a)
    expect(del?.sourceCode).toBe(0x4c)
    expect(del?.geometry.x).toBe((backspace?.geometry.x ?? 0) + 1)
  })

  it('offers a generic matrix layout without device-specific UI code', () => {
    const layout = new MatrixGridLayout()
    const [key] = layout.describe([
      { id: '2-3', sourceCode: 4, label: 'A', present: true, address: { kind: 'matrix', row: 2, column: 3 } },
    ])

    expect(key?.geometry).toEqual({ x: 3, y: 2, width: 1, height: 1 })
  })
})
