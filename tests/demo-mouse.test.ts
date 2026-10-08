import { expect, it } from 'vitest'
import { CB75Driver } from '@/devices/cb75/CB75Driver'
import { readDpi } from '@/domain/mouse/settings'

it('isolates demo snapshots, restores defaults and closes the session', async () => {
  const session = new CB75Driver().createDemoSession()
  const initial = await session.load()
  const edited = await session.device.setDpi(0, 800)
  expect(readDpi(edited.functions, 0, edited.basic)).toBe(800)
  edited.functions[2] = 0
  expect((await session.load()).functions[2]).toBe(initial.functions[2])
  await expect(session.device.setBrightness(5)).rejects.toThrow()
  expect((await session.device.restoreFactory()).functions).toEqual(initial.functions)
  await session.close()
  await expect(session.load()).rejects.toThrow('演示会话已结束')
})

it('binds a macro and reapplies a saved profile in demo memory', async () => {
  const session = new CB75Driver().createDemoSession()
  const macro = {
    name: '测试宏',
    actions: [
      { typeAndStatus: 138, code: 4, delay: 20 },
      { typeAndStatus: 10, code: 4, delay: 20 },
    ],
  }
  const bound = await session.device.bindMacro(2, macro)
  expect(bound.macro?.actions).toHaveLength(2)
  const profile = {
    version: 1 as const,
    model: 'CB75-Mouse' as const,
    name: '演示配置',
    functions: Array.from(bound.functions),
    keys: Array.from(bound.keysRaw),
    macro: bound.macro,
  }
  await session.device.setRate(0)
  const restored = await session.device.applyProfile(profile)
  expect(restored.functions[11]).toBe(bound.functions[11])
  expect(restored.keys).toEqual(bound.keys)
})
