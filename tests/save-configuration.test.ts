import { describe, expect, it } from 'vitest'
import { saveConfiguration, type SavePhase } from '@/application/SaveConfiguration'
import type { KeyboardDevice } from '@/application/ports'
import type { KeyboardProfile } from '@/domain/keyboard'

const profile = (): KeyboardProfile => ({
  device: { productName: 'test', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1', runMode: 'app' },
  capabilities: { layers: 1, remap: true, restoreFactory: true, layoutRows: 1, layoutColumns: 2 },
  positions: [
    { id: 'a', sourceCode: 4, label: 'A', address: { kind: 'matrix', row: 0, column: 0 }, geometry: { x: 0, y: 0, width: 1, height: 1 } },
    { id: 'b', sourceCode: 5, label: 'B', address: { kind: 'matrix', row: 0, column: 1 }, geometry: { x: 1, y: 0, width: 1, height: 1 } },
  ],
  assignments: [
    { positionId: 'a', sourceCode: 4, layer: 0, keyCode: 4, category: 'basic' },
    { positionId: 'b', sourceCode: 5, layer: 0, keyCode: 5, category: 'basic' },
  ],
})

describe('save configuration transaction', () => {
  it('reports phases and accepts a differently ordered device readback', async () => {
    const original = profile()
    const draft = original.assignments.map((item) => item.positionId === 'b' ? { ...item, keyCode: 6 } : item)
    const phases: SavePhase[] = []
    const writes: unknown[] = []
    const device: KeyboardDevice = {
      profile: { getProfile: async () => ({ ...original, assignments: [...draft].reverse() }) },
      keymap: { writeAssignments: async (changes) => { writes.push(changes) } },
      configuration: { save: async () => undefined, reload: async () => undefined },
      close: () => undefined,
    }
    const result = await saveConfiguration(device, original, original.assignments, draft, ({ phase }) => phases.push(phase))
    expect(result.changedAssignments).toBe(1)
    expect(writes).toEqual([[draft[1]]])
    expect(phases).toEqual(['validating', 'writing', 'writing', 'committing', 'committing', 'verifying', 'completed'])
  })

  it('rejects an incomplete draft before touching the device', async () => {
    const original = profile()
    let wrote = false
    const device: KeyboardDevice = {
      profile: { getProfile: async () => original },
      keymap: { writeAssignments: async () => { wrote = true } },
      configuration: { save: async () => undefined, reload: async () => undefined },
      close: () => undefined,
    }
    await expect(saveConfiguration(device, original, original.assignments, original.assignments.slice(0, 1))).rejects.toMatchObject({ code: 'INVALID_CONFIGURATION' })
    expect(wrote).toBe(false)
  })
})
