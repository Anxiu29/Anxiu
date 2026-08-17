import { describe, expect, it } from 'vitest'
import { c98FactoryAssignments } from '@/devices/c98/factoryKeymap'
import { XSYD_KEY_CATALOG } from '@/protocol/xsyd/keyCatalog'
import type { KeyPosition } from '@/domain/keyboard'

const position = (sourceCode: number): KeyPosition => ({
  id: `key-${sourceCode}`,
  sourceCode,
  label: `0x${sourceCode.toString(16)}`,
  address: { kind: 'matrix', row: 0, column: sourceCode },
  geometry: { x: 0, y: 0, width: 1, height: 1 },
})

describe('C98 captured factory keymap', () => {
  it('reconstructs all four WIN layers from physical defaults and captured overrides', () => {
    const assignments = c98FactoryAssignments('win', [position(0x01), position(0x3a), position(0x0f), position(0x04)], 4, XSYD_KEY_CATALOG)
    const code = (layer: number, sourceCode: number) => assignments.find((item) => item.layer === layer && item.sourceCode === sourceCode)?.keyCode

    expect(assignments).toHaveLength(16)
    expect(code(0, 0x01)).toBe(0xf001)
    expect(code(1, 0x3a)).toBe(0x1194)
    expect(code(1, 0x04)).toBe(0xf101)
    expect(code(2, 0x0f)).toBe(0xf32d)
    expect(code(3, 0x3a)).toBe(0x0001)
  })

  it('uses the separately captured MAC modifier and function defaults', () => {
    const assignments = c98FactoryAssignments('mac', [position(0xe3), position(0xe2), position(0xe6), position(0x01), position(0x3a)], 4, XSYD_KEY_CATALOG)
    const code = (layer: number, sourceCode: number) => assignments.find((item) => item.layer === layer && item.sourceCode === sourceCode)?.keyCode

    expect(code(0, 0xe3)).toBe(0x00e2)
    expect(code(0, 0xe2)).toBe(0x00e3)
    expect(code(0, 0xe6)).toBe(0x00e7)
    expect(code(0, 0x01)).toBe(0xf001)
    expect(code(1, 0x3a)).toBe(0x1070)
    expect(code(2, 0x3a)).toBe(0x0001)
  })
})
