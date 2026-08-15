import { describe, expect, it } from 'vitest'
import { DeviceSession } from '@/application/DeviceSession'
import type { KeyboardDevice } from '@/application/ports'
import type { KeyboardProfile, KeyAssignment } from '@/domain/keyboard'
import { HID_KEY_CATALOG } from '@/domain/keycodes'

const assignments: KeyAssignment[] = [
  { positionId: '0-0', sourceCode: 4, layer: 0, keyCode: 4, category: 'basic' },
  { positionId: '0-1', sourceCode: 5, layer: 0, keyCode: 5, category: 'basic' },
]
const profile = (): KeyboardProfile => ({
  device: { productName: 'test', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1', runMode: 'app' },
  capabilities: { layers: 1, remap: true, restoreFactory: true, layoutRows: 1, layoutColumns: 2 },
  positions: [
    { id: '0-0', sourceCode: 4, label: 'A', present: true, address: { kind: 'matrix', row: 0, column: 0 }, geometry: { x: 0, y: 0, width: 1, height: 1 } },
    { id: '0-1', sourceCode: 5, label: 'B', present: true, address: { kind: 'matrix', row: 0, column: 1 }, geometry: { x: 1, y: 0, width: 1, height: 1 } },
  ],
  assignments: assignments.map((item) => ({ ...item })),
})

describe('DeviceSession', () => {
  it('writes only changed assignments and verifies the full profile', async () => {
    let current = profile()
    const writes: KeyAssignment[][] = []
    const device: KeyboardDevice = {
      profile: { getProfile: async () => current },
      keymap: { writeAssignments: async (changes) => {
        writes.push(changes)
        current = { ...current, assignments: current.assignments.map((item) => changes.find((change) => change.positionId === item.positionId && change.layer === item.layer) ?? item) }
      } },
      configuration: { save: async () => undefined, reload: async () => undefined },
      factoryReset: { restoreFactory: async () => undefined },
      close: () => undefined,
    }
    const session = new DeviceSession(device, HID_KEY_CATALOG)
    await session.load()
    session.update('0-1', 0, 6, 'basic')
    await session.save()
    expect(writes).toHaveLength(1)
    expect(writes[0]).toEqual([{ ...assignments[1], keyCode: 6 }])
    expect(session.dirty).toBe(false)
  })
})
