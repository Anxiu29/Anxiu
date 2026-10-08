// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { MouseSession } from '@/application/MouseSession'
import { CB75Driver } from '@/devices/cb75/CB75Driver'
import { useDeviceStore } from '@/stores/mouse/deviceStore'
import { useMacroStore } from '@/stores/mouse/macroStore'

it('accepts macro files for the connected model and rejects another model', async () => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
  try {
    const pinia = createPinia()
    const demo = new CB75Driver().createDemoSession()
    const device = useDeviceStore(pinia)
    device.session = new MouseSession(
      demo.device,
      { ...demo.identity, profileModel: 'Another-TLW', storage: { profiles: 'another.profiles', macros: 'another.macros' } },
      async () => undefined,
    )
    const macros = useMacroStore(pinia)
    const file = (model: string) => ({
      size: 100,
      text: async () => JSON.stringify({ version: 1, model, kind: 'macro', macro: { name: 'Test', actions: [] } }),
    }) as File
    expect(await macros.importFile(file('CB75-Mouse'))).toBeUndefined()
    expect(macros.macros).toHaveLength(0)
    expect(await macros.importFile(file('Another-TLW'))).toBeTruthy()
    expect(macros.macros).toHaveLength(1)
  } finally {
    vi.unstubAllGlobals()
  }
})
