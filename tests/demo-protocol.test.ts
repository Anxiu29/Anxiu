import { describe, expect, it } from 'vitest'
import { DemoKeyboardProtocol } from '@/protocol/DemoKeyboardProtocol'
import { XSYD_KEY_CATALOG } from '@/protocol/xsyd/keyCatalog'
import { C98_CAPABILITIES } from '@/devices/c98/capabilities'
import { resolveC98DefaultKeymap } from '@/devices/c98/factoryKeymap'
import { C98_DEMO_KEYS } from '@/devices/c98/layout'
import { C98_DEMO_DEVICE } from '@/devices/c98/device'

describe('DemoKeyboardProtocol', () => {
  it('merges partial key writes without discarding the rest of the keymap', async () => {
    const device = new DemoKeyboardProtocol(XSYD_KEY_CATALOG, C98_DEMO_KEYS, C98_CAPABILITIES, resolveC98DefaultKeymap, C98_DEMO_DEVICE)
    const before = await device.profile.getProfile()
    const changed = { ...before.assignments[0]!, keyCode: 5 }

    await device.keymap.writeAssignments([changed])
    const after = await device.profile.getProfile()

    expect(after.assignments).toHaveLength(before.assignments.length)
    expect(after.assignments[0]?.keyCode).toBe(5)
    expect(after.assignments[1]).toEqual(before.assignments[1])
  })
})
