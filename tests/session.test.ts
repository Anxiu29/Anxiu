import { describe, expect, it } from 'vitest'
import { DeviceSession } from '@/application/DeviceSession'
import type { KeyboardDevice } from '@/application/ports'
import type { KeyboardProfile, KeyAssignment } from '@/domain/keyboard'
import { HID_KEY_CATALOG } from '@/domain/keycodes'

const assignments: KeyAssignment[] = [
  { positionId: '0-0', sourceCode: 4, layer: 0, keyCode: 4, category: 'basic' },
  { positionId: '0-1', sourceCode: 5, layer: 0, keyCode: 5, category: 'basic' },
  { positionId: '0-0', sourceCode: 4, layer: 1, keyCode: 0, category: 'special' },
  { positionId: '0-1', sourceCode: 5, layer: 1, keyCode: 0, category: 'special' },
]
const profile = (): KeyboardProfile => ({
  device: { productName: 'test', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1', runMode: 'app' },
  capabilities: { layers: 2, remap: true, restoreFactory: true, layoutRows: 1, layoutColumns: 2 },
  positions: [
    { id: '0-0', sourceCode: 4, label: 'A', address: { kind: 'matrix', row: 0, column: 0 }, geometry: { x: 0, y: 0, width: 1, height: 1 } },
    { id: '0-1', sourceCode: 5, label: 'B', address: { kind: 'matrix', row: 0, column: 1 }, geometry: { x: 1, y: 0, width: 1, height: 1 } },
  ],
  defaultAssignments: assignments.map((item) => ({ ...item })),
  assignments: assignments.map((item) => ({ ...item })),
})

describe('DeviceSession', () => {
  it('updates one key and immediately writes and verifies the full profile', async () => {
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
    await session.updateAndSave('0-1', 0, 6, 'basic')
    expect(writes).toHaveLength(1)
    expect(writes[0]).toEqual([{ ...assignments[1], keyCode: 6 }])
    expect(session.dirty).toBe(false)
  })

  it('keeps the connection-time restore baseline after write verification', async () => {
    let current = profile()
    const writes: KeyAssignment[][] = []
    const device: KeyboardDevice = {
      profile: { getProfile: async () => ({ ...current, defaultAssignments: current.assignments.map((item) => ({ ...item })) }) },
      keymap: { writeAssignments: async (changes) => {
        writes.push(changes)
        current = { ...current, assignments: current.assignments.map((item) => changes.find((change) => change.positionId === item.positionId && change.layer === item.layer) ?? item) }
      } },
      configuration: { save: async () => undefined, reload: async () => undefined },
      close: () => undefined,
    }
    const session = new DeviceSession(device, HID_KEY_CATALOG)
    await session.load()

    await session.updateAndSave('0-1', 0, 6, 'basic')
    expect(session.profile?.defaultAssignments.find((item) => item.positionId === '0-1' && item.layer === 0)?.keyCode).toBe(5)

    await session.restoreKeyDefaultAndSave('0-1', 0)
    expect(current.assignments.find((item) => item.positionId === '0-1' && item.layer === 0)?.keyCode).toBe(5)
    expect(writes).toHaveLength(2)
  })

  it('restores every key layer through normal write, save and readback', async () => {
    let current = profile()
    current.assignments = current.assignments.map((item) => ({ ...item, keyCode: item.keyCode + 10 }))
    const writes: KeyAssignment[][] = []
    const device: KeyboardDevice = {
      profile: { getProfile: async () => current },
      keymap: { writeAssignments: async (changes) => {
        writes.push(changes)
        current = { ...current, assignments: current.assignments.map((item) => changes.find((change) => change.positionId === item.positionId && change.layer === item.layer) ?? item) }
      } },
      configuration: { save: async () => undefined, reload: async () => undefined },
      close: () => undefined,
    }
    const session = new DeviceSession(device, HID_KEY_CATALOG)

    await session.load()
    const result = await session.restoreAllKeyDefaults()

    expect(result.changedAssignments).toBe(4)
    expect(writes.flat().map(({ positionId, layer, keyCode }) => ({ positionId, layer, keyCode }))).toEqual([
      { positionId: '0-0', layer: 0, keyCode: 4 },
      { positionId: '0-1', layer: 0, keyCode: 5 },
      { positionId: '0-0', layer: 1, keyCode: 0 },
      { positionId: '0-1', layer: 1, keyCode: 0 },
    ])
    expect(session.dirty).toBe(false)
  })

  it('can restore one draft key without touching other keys', async () => {
    const session = new DeviceSession({
      profile: { getProfile: async () => profile() },
      keymap: { writeAssignments: async () => undefined },
      configuration: { save: async () => undefined, reload: async () => undefined },
      close: () => undefined,
    }, HID_KEY_CATALOG)

    await session.load()
    session.update('0-1', 0, 6, 'basic')
    session.update('0-0', 1, 7, 'basic')
    session.restoreKeyToDefault('0-1', 0)

    expect(session.draft.find((item) => item.positionId === '0-1' && item.layer === 0)?.keyCode).toBe(5)
    expect(session.draft.find((item) => item.positionId === '0-0' && item.layer === 1)?.keyCode).toBe(7)
  })

  it('restores and saves only the right-clicked key on the selected layer', async () => {
    let current = profile()
    current.assignments = current.assignments.map((item) => item.positionId === '0-1' && item.layer === 0
      ? { ...item, keyCode: 6 }
      : item.positionId === '0-0' && item.layer === 1
        ? { ...item, keyCode: 7, category: 'basic' }
        : item)
    const writes: KeyAssignment[][] = []
    const device: KeyboardDevice = {
      profile: { getProfile: async () => current },
      keymap: { writeAssignments: async (changes) => {
        writes.push(changes)
        current = { ...current, assignments: current.assignments.map((item) => changes.find((change) => change.positionId === item.positionId && change.layer === item.layer) ?? item) }
      } },
      configuration: { save: async () => undefined, reload: async () => undefined },
      close: () => undefined,
    }
    const session = new DeviceSession(device, HID_KEY_CATALOG)

    await session.load()
    const result = await session.restoreKeyDefaultAndSave('0-1', 0)

    expect(result.changedAssignments).toBe(1)
    expect(writes).toEqual([[{ ...assignments[1] }]])
    expect(current.assignments.find((item) => item.positionId === '0-0' && item.layer === 1)?.keyCode).toBe(7)
    expect(session.dirty).toBe(false)
  })

  it('switches system mode and reloads all layer mappings for that mode', async () => {
    let current = profile()
    let switchedTo: string | undefined
    const device: KeyboardDevice = {
      profile: { getProfile: async () => current },
      systemMode: { switchMode: async (mode) => {
        switchedTo = mode
        current = { ...current, assignments: current.assignments.map((item) => item.layer === 1 ? { ...item, keyCode: 58, category: 'function' } : item) }
      } },
      close: () => undefined,
    }
    const session = new DeviceSession(device, HID_KEY_CATALOG)
    await session.load()

    const macProfile = await session.switchMode('mac')

    expect(switchedTo).toBe('mac')
    expect(macProfile.assignments.filter((item) => item.layer === 1).every((item) => item.keyCode === 58)).toBe(true)
    expect(session.draft.filter((item) => item.layer === 1).every((item) => item.keyCode === 58)).toBe(true)
  })

  it('switches configuration and reloads its key mappings', async () => {
    let current = profile()
    let switchedTo: number | undefined
    const device: KeyboardDevice = {
      profile: { getProfile: async () => current },
      configurationSwitch: { switchConfiguration: async (configuration) => {
        switchedTo = configuration
        current = { ...current, assignments: current.assignments.map((item) => ({ ...item, keyCode: configuration + item.layer })) }
      } },
      close: () => undefined,
    }
    const session = new DeviceSession(device, HID_KEY_CATALOG)
    await session.load()

    const configuration = await session.switchConfiguration(3)

    expect(switchedTo).toBe(3)
    expect(configuration.assignments[0]?.keyCode).toBe(3)
    expect(session.draft[2]?.keyCode).toBe(4)
  })
})
