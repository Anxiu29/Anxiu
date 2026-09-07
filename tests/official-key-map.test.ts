import { describe, expect, it } from 'vitest'
import { OFFICIAL_XSYD_KEY_MAP, officialKeyName } from '@/protocol/xsyd/officialKeyMap'
import { XSYD_KEY_CATALOG } from '@/protocol/xsyd/keyCatalog'

describe('official XSYD key map mirror', () => {
  it('contains the complete official table and supports direct code lookup', () => {
    expect(Object.keys(OFFICIAL_XSYD_KEY_MAP)).toHaveLength(288)
    expect(OFFICIAL_XSYD_KEY_MAP[1]).toBe('Fn')
    expect(OFFICIAL_XSYD_KEY_MAP[61442]).toBe('Fn2')
    expect(OFFICIAL_XSYD_KEY_MAP[62250]).toBe('氛围灯亮度+')
    expect(XSYD_KEY_CATALOG.get(4643).label).toBe('www')
  })

  it('keeps unknown captured values searchable by hexadecimal code', () => {
    expect(officialKeyName(0x6152)).toBe('未知(0x6152)')
  })
})
