import { describe, expect, it } from 'vitest'
import { assignmentsEqual, validateAssignments, type KeyboardProfile } from '@/domain/keyboard'
import { XSYD_KEY_CATALOG } from '@/protocol/xsyd/keyCatalog'
import { CompositeKeyCatalog, StaticKeyCatalog } from '@/domain/KeyCatalog'

const profile: KeyboardProfile = { device: { productName: 'test', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1', runMode: 'app' }, capabilities: { layers: 1, remap: true, restoreFactory: true, layoutRows: 1, layoutColumns: 1 }, positions: [{ id: '0-0', sourceCode: 4, label: 'A', address: { kind: 'matrix', row: 0, column: 0 }, geometry: { x: 0, y: 0, width: 1, height: 1 } }], assignments: [{ positionId: '0-0', sourceCode: 4, layer: 0, keyCode: 4, category: 'basic' }] }

describe('keyboard domain', () => {
  it('detects assignment changes', () => {
    expect(assignmentsEqual(profile.assignments, profile.assignments.map((x) => ({ ...x })))).toBe(true)
    expect(assignmentsEqual(profile.assignments, [{ ...profile.assignments[0]!, keyCode: 5 }])).toBe(false)
  })
  it('validates layer and key position', () => {
    expect(validateAssignments(profile, profile.assignments)).toEqual([])
    expect(validateAssignments(profile, [{ ...profile.assignments[0]!, layer: 2 }])[0]).toContain('层级')
  })
  it('resolves standard and vendor key codes', () => {
    expect(XSYD_KEY_CATALOG.get(4).label).toBe('A')
    expect(XSYD_KEY_CATALOG.get(165).label).toBe('Desktop Power Down')
    expect(XSYD_KEY_CATALOG.get(173).label).toBe('Play Pause')
    expect(XSYD_KEY_CATALOG.get(199).label).toBe('主灯亮度+')
    expect(XSYD_KEY_CATALOG.get(224).label).toBe('L-Ctrl')
    expect(XSYD_KEY_CATALOG.get(232).label).toBe('-')
    expect(XSYD_KEY_CATALOG.get(4329)).toMatchObject({ label: '声音+', category: 'media' })
    expect(XSYD_KEY_CATALOG.get(29441).label).toBe('鼠标左键')
    expect(XSYD_KEY_CATALOG.get(62231).label).toBe('主灯开关')
  })
  it('composes replaceable key catalogs with vendor overrides', () => {
    const base = new StaticKeyCatalog([{ code: 1, label: 'Base', category: 'basic' }])
    const vendor = new StaticKeyCatalog([{ code: 1, label: 'Vendor', category: 'special' }])
    const catalog = new CompositeKeyCatalog(base, vendor)
    expect(catalog.get(1).label).toBe('Vendor')
    expect(catalog.get(0xabcd).label).toBe('0xABCD')
  })
})
