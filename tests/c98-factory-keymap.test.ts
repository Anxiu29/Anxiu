import { describe, expect, it } from 'vitest'
import { C98_FACTORY_MAC_FN1, C98_FACTORY_MAC_FN2, C98_FACTORY_MAC_FN3, C98_FACTORY_MAC_FN4, C98_FACTORY_WIN_FN1, C98_FACTORY_WIN_FN2, C98_FACTORY_WIN_FN3, C98_FACTORY_WIN_FN4, c98FactoryAssignments } from '@/devices/c98/factoryKeymap'
import { XSYD_KEY_CATALOG } from '@/protocol/xsyd/keyCatalog'
import { C98_DEMO_KEYS } from '@/devices/c98/layout'

const positions = (...sourceCodes: number[]) => sourceCodes.map((sourceCode) => ({ ...C98_DEMO_KEYS.find((item) => item.sourceCode === sourceCode)!, label: XSYD_KEY_CATALOG.get(sourceCode).label }))

describe('C98 captured factory keymap', () => {
  it('reconstructs all four WIN layers from physical defaults and captured overrides', () => {
    const assignments = c98FactoryAssignments('win', positions(0x01, 0x3a, 0x0f, 0x04), 4, XSYD_KEY_CATALOG)
    const code = (layer: number, sourceCode: number) => assignments.find((item) => item.layer === layer && item.sourceCode === sourceCode)?.keyCode

    expect(assignments).toHaveLength(16)
    expect(code(0, 0x01)).toBe(0xf001)
    expect(code(1, 0x3a)).toBe(0x1194)
    expect(code(1, 0x04)).toBe(0xf101)
    expect(code(2, 0x0f)).toBe(0xf32d)
    expect(code(3, 0x3a)).toBe(0x0001)
  })

  it('uses the separately captured MAC modifier and function defaults', () => {
    const assignments = c98FactoryAssignments('mac', positions(0xe3, 0xe2, 0xe6, 0x01, 0x3a), 4, XSYD_KEY_CATALOG)
    const code = (layer: number, sourceCode: number) => assignments.find((item) => item.layer === layer && item.sourceCode === sourceCode)?.keyCode

    expect(code(0, 0xe3)).toBe(0x00e2)
    expect(code(0, 0xe2)).toBe(0x00e3)
    expect(code(0, 0xe6)).toBe(0x00e7)
    expect(code(0, 0x01)).toBe(0xf001)
    expect(code(1, 0x3a)).toBe(0x1070)
    expect(code(2, 0x3a)).toBe(0x0001)
  })

  it('keeps every captured key visible by position and name instead of compressing overrides', () => {
    expect([C98_FACTORY_WIN_FN1, C98_FACTORY_WIN_FN2, C98_FACTORY_WIN_FN3, C98_FACTORY_WIN_FN4, C98_FACTORY_MAC_FN1, C98_FACTORY_MAC_FN2, C98_FACTORY_MAC_FN3, C98_FACTORY_MAC_FN4].every((layer) => layer.length === 101)).toBe(true)
    expect(C98_FACTORY_WIN_FN2.find((item) => item.positionId === '0-1')).toMatchObject({ physicalKey: 'F1', assignedKey: 'File', keyCode: 0x1194 })
    expect(C98_FACTORY_WIN_FN4.filter((item) => item.assignedKey !== null)).toHaveLength(0)
  })
})
