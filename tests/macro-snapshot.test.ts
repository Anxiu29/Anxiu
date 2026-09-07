import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KeyboardProfile } from '@/domain/keyboard'
import { restoreMacroSnapshot, saveMacroSnapshot } from '@/stores/macroSnapshots'

const profile = {
  device: { productName: 'Test', vendorId: 1, productId: 2, serialNumber: 'SN-1', firmwareVersion: '1', protocolVersion: '1', runMode: 'app' },
  capabilities: { layers: 1, remap: true, restoreFactory: true, layoutRows: 1, layoutColumns: 1 },
  positions: [], defaultAssignments: [], assignments: [],
} satisfies KeyboardProfile
const context = { driverId: 'driver', profile, configuration: 1 as const, mode: 'win' as const }
const saved = { index: 2, sourceCode: 4, mode: 0 as const, repeatCount: 1, repeatDelay: 0, actions: [{ keyCode: 5, pressed: true, delay: 10 }] }

describe('宏动作本地快照', () => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
  beforeEach(() => values.clear())

  it('只在设备槽位和动作数量一致时补回动作正文', () => {
    saveMacroSnapshot(context, saved)
    const metadata = { ...saved, actions: [], storedActionCount: 1, actionsAvailable: false }
    expect(restoreMacroSnapshot(context, metadata)).toMatchObject({ actions: saved.actions, actionsAvailable: true })
    expect(restoreMacroSnapshot(context, { ...metadata, storedActionCount: 2 })).toMatchObject({ actions: [], actionsAvailable: false })
  })
})
