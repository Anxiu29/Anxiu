import { describe, expect, it } from 'vitest'
import { C98_DEMO_KEYS, C98_PHYSICAL_KEY_ROWS } from '@/devices/c98/layout'
import { c98KeyGeometry } from '@/ui/c98KeyboardGeometry'

describe('C98 physical data and UI geometry', () => {
  it('keeps the device layout limited to the 101 captured matrix keys', () => {
    expect(C98_DEMO_KEYS).toHaveLength(101)
    expect(C98_PHYSICAL_KEY_ROWS).toHaveLength(6)
    expect(C98_DEMO_KEYS.find((key) => key.sourceCode === 0x04)?.address).toEqual({ kind: 'matrix', row: 3, column: 1 })
    expect(C98_DEMO_KEYS.every((key) => !('geometry' in key))).toBe(true)
  })

  it('applies non-uniform key sizes only in the UI geometry mapper', () => {
    const key = (sourceCode: number) => C98_DEMO_KEYS.find((item) => item.sourceCode === sourceCode)!

    expect(c98KeyGeometry(key(0x04))).toMatchObject({ x: 1.8, y: 3.5 })
    expect(c98KeyGeometry(key(0x2c)).width).toBe(6)
    expect(c98KeyGeometry(key(0x57))).toMatchObject({ x: 19.8, y: 2.5, height: 2 })
    expect(c98KeyGeometry(key(0x62))).toMatchObject({ x: 16.8, y: 5.5, width: 2 })
  })

  it('falls back to matrix coordinates for an unknown visual key', () => {
    expect(c98KeyGeometry({ id: '2-3', sourceCode: 0xffff, label: '', address: { kind: 'matrix', row: 2, column: 3 } })).toEqual({ x: 3, y: 2, width: 1, height: 1 })
  })
})
