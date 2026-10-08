import { expect, it } from 'vitest'
import { validateProfileCompatibility } from '@/domain/mouse/profileCompatibility'
import { mouseFailureMessage } from '@/ui/mouseLabels'
import { validateProfile } from '@/domain/mouse/profiles'
import { CB75Driver } from '@/devices/cb75/CB75Driver'
import { DemoMouseDevice } from '@/protocol/DemoMouseDevice'

it('does not count a left click outside the real physical matrix', () => {
  const functions = Array(128).fill(0); functions[14] = 1
  const keys = Array(128).fill(0); keys[120] = 0x10; keys[121] = 1
  expect(() => validateProfileCompatibility({ functions, keys }, {
    basic: { dpiStageCount: 1, dpiRank: 255 }, keysRaw: new Uint8Array(128), defaultKeys: [[0x10, 1, 0], [0x10, 2, 0]],
  })).toThrow('physical key')
})
it('rejects report rate, lighting and DPI ranks before a profile can be written', () => {
  const functions = Array(128).fill(0)
  functions[11] = 3
  functions[12] = 0
  functions[14] = 1
  const keys = Array(128).fill(0)
  keys[0] = 0x10
  keys[1] = 1
  const device = {
    basic: { dpiStageCount: 1, dpiRank: 40 },
    keysRaw: new Uint8Array(128),
    defaultKeys: [[0x10, 1, 0]],
  }
  const edited = (index: number, value: number) => {
    const next = functions.slice()
    next[index] = value
    return next
  }
  expect(() => validateProfileCompatibility({ functions: edited(11, 4), keys }, device)).toThrow('report rate')
  expect(() => validateProfileCompatibility({ functions: edited(1, 7), keys }, device)).toThrow('light mode')
  expect(() => validateProfileCompatibility({ functions: edited(16, 41), keys }, device)).toThrow('DPI rank')
  expect(() => validateProfileCompatibility(
    { functions: edited(1, 7), keys },
    device,
    { lighting: false },
  )).not.toThrow()
})
it('shows Chinese text for the guards a user can hit while editing', () => {
  expect(mouseFailureMessage(new Error('Keep at least one left mouse button'))).toBe('请至少保留一个鼠标左键。')
  expect(mouseFailureMessage(new Error('Keep at least one DPI stage'))).toBe('请至少保留一个启用的 DPI 档位。')
  expect(mouseFailureMessage(new Error('Unsupported report rate'))).toBe('回报率超出当前鼠标支持范围。')
})
it('supports injected model identity and keeps the CB75 default compatible', async () => {
  const current = await new CB75Driver().createDemoSession().load()
  const profile = { version: 1 as const, model: 'Another-TLW', name: 'Test', functions: [...current.functions], keys: [...current.keysRaw] }
  expect(() => validateProfile(profile)).toThrow()
  expect(validateProfile(profile, 'Another-TLW').model).toBe('Another-TLW')
  const demo = new DemoMouseDevice(current, 'Another-TLW')
  profile.functions[0] = 9
  expect((await demo.applyProfile(profile)).functions[0]).toBe(current.functions[0])
  profile.functions[14 + profile.functions[12] * 9] = 0
  await expect(demo.applyProfile(profile)).rejects.toThrow('disabled DPI')
  expect((await demo.readConfiguration()).functions).toEqual(current.functions)
})
