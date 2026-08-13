import { describe, expect, it } from 'vitest'
import { assignmentsEqual, validateAssignments, type KeyboardProfile } from '@/domain/keyboard'

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
})
