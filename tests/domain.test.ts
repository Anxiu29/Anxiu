import { describe, expect, it } from 'vitest'
import { assignmentsEqual, validateAssignments, type KeyboardProfile } from '@/domain/keyboard'
import { KEY_MAP, keyDefinition } from '@/domain/keycodes'

const profile: KeyboardProfile = { device: { productName: 'test', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1', runMode: 'app' }, capabilities: { layers: 1, remap: true, restoreFactory: true, layoutRows: 1, layoutColumns: 1 }, positions: [{ id: '0-0', sourceCode: 4, label: 'A', row: 0, column: 0 }], assignments: [{ positionId: '0-0', sourceCode: 4, layer: 0, keyCode: 4, category: 'basic' }] }

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
    expect(KEY_MAP[4]).toBe('A')
    expect(KEY_MAP[165]).toBe('Desktop Power Down')
    expect(KEY_MAP[173]).toBe('Play Pause')
    expect(KEY_MAP[199]).toBe('主灯亮度+')
    expect(KEY_MAP[224]).toBe('L-Ctrl')
    expect(KEY_MAP[232]).toBe('-')
    expect(keyDefinition(4329)).toMatchObject({ label: '声音+', category: 'media' })
    expect(keyDefinition(29441).label).toBe('鼠标左键')
    expect(keyDefinition(62231).label).toBe('主灯开关')
  })
})
