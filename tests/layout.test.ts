import { describe, expect, it } from 'vitest'
import { C98_DEMO_KEYS, C98_PHYSICAL_KEY_ROWS, resolveC98PhysicalLayout } from '@/devices/c98/layout'
import { C98_LIGHTING_MODES } from '@/devices/c98/lightingModes'
import { c98KeyGeometry } from '@/devices/c98/presentation'

describe('C98 physical data and UI geometry', () => {
  it('keeps the device layout limited to the 101 captured matrix keys', () => {
    expect(C98_DEMO_KEYS).toHaveLength(101)
    expect(C98_PHYSICAL_KEY_ROWS).toHaveLength(6)
    expect(C98_DEMO_KEYS.find((key) => key.sourceCode === 0x04)?.address).toEqual({ kind: 'matrix', row: 3, column: 1 })
    expect(C98_DEMO_KEYS.every((key) => !('geometry' in key))).toBe(true)
  })

  it('repairs missing bottom rows after a factory-reset reconnect', () => {
    const firstFourRows = C98_DEMO_KEYS.filter((key) => key.address.row < 4)
    const repaired = resolveC98PhysicalLayout(firstFourRows)

    expect(repaired).toHaveLength(101)
    const expectedBottomRows = C98_DEMO_KEYS.filter((key) => key.address.row >= 4).length
    expect(repaired.filter((key) => key.address.kind === 'matrix' && key.address.row >= 4)).toHaveLength(expectedBottomRows)
    expect(new Set(repaired.map((key) => key.id)).size).toBe(101)
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

  it('keeps official lighting names aligned with protocol mode values', () => {
    expect(C98_LIGHTING_MODES).toHaveLength(22)
    expect(C98_LIGHTING_MODES.map(({ value }) => value)).toEqual(Array.from({ length: 22 }, (_, value) => value))
    expect(C98_LIGHTING_MODES[1]?.label).toBe('波纹荡漾')
    expect(C98_LIGHTING_MODES[20]?.label).toBe('水波荡漾')
    expect(C98_LIGHTING_MODES[21]?.label).toBe('自定义')
  })
})
