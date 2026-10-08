// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { CB75Driver } from '@/devices/cb75/CB75Driver'
import { useDeviceStore } from '@/stores/mouse/deviceStore'
import { useProfileStore } from '@/stores/mouse/profileStore'
import { useMacroStore } from '@/stores/mouse/macroStore'
import MousePerformance from '@/components/mouse/MousePerformance.vue'
import MouseLighting from '@/components/mouse/MouseLighting.vue'
import MouseMacros from '@/components/mouse/MouseMacros.vue'
import MouseKeymap from '@/components/mouse/MouseKeymap.vue'
import { CB75_CONFIG } from '@/devices/cb75/config'
import MouseProfiles from '@/components/mouse/MouseProfiles.vue'
import MouseProfileSwitcher from '@/components/mouse/MouseProfileSwitcher.vue'
import { CapturedMouse, MouseHid } from './helpers/tlwDevice'

let pinia: ReturnType<typeof createPinia>
let device: ReturnType<typeof useDeviceStore>
let wrapper: VueWrapper | undefined
beforeEach(async () => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
  Object.defineProperty(navigator, 'hid', { configurable: true, value: new MouseHid() })
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  pinia = createPinia()
  device = useDeviceStore(pinia)
  await device.attach(await new CB75Driver().connect(vi.fn(), new CapturedMouse().asHid()))
  vi.spyOn(window, 'confirm').mockReturnValue(false)
})
afterEach(async () => {
  wrapper?.unmount()
  wrapper = undefined
  await device.session?.close()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
function changeByte(offset: number, value: number) {
  const functions = device.config!.functions.slice()
  functions[offset] = value
  device.config = { ...device.config!, functions }
}

it('refreshes a DPI value when the device stays on the same stage', async () => {
  wrapper = mount(MousePerformance, { global: { plugins: [pinia] } })
  const stage = device.config!.functions[12]
  const offset = 14 + stage * 9 + 2
  changeByte(offset, device.config!.functions[offset] + 1)
  await flushPromises()
  const expected =
    device.config!.basic.dpiStart + device.config!.functions[offset] * device.config!.basic.dpiStep
  expect((wrapper.get('input[aria-label="DPI 数值"]').element as HTMLInputElement).value).toBe(
    String(expected),
  )
})

it('rejects invalid DPI input without writing and restores the confirmed value', async () => {
  wrapper = mount(MousePerformance, { global: { plugins: [pinia] } })
  const write = vi.spyOn(device.session!.device, 'setDpi')
  const input = wrapper.get('input[aria-label="DPI 数值"]')
  const previous = (input.element as HTMLInputElement).value
  await input.setValue(-1)
  await flushPromises()
  expect(write).not.toHaveBeenCalled()
  expect((input.element as HTMLInputElement).value).toBe(previous)
  expect(device.error).toContain('步进')
})

it('restores the hardware stage after a failed stage switch', async () => {
  wrapper = mount(MousePerformance, { global: { plugins: [pinia] } })
  const previous = device.config!.functions[12]
  vi.spyOn(device.session!.device, 'selectDpi').mockRejectedValue(new Error('读取失败'))
  const next = previous === 0 ? 1 : 0
  await wrapper.findAll('.stage-button')[next]!.trigger('click')
  await flushPromises()
  expect(wrapper.findAll('.stage-button')[previous]!.attributes('aria-pressed')).toBe('true')
  expect(wrapper.findAll('.mouse-dpi-stage.in-use')).toHaveLength(1)
})

it('shows lighting selection and live draft values; off mode disables brightness', async () => {
  changeByte(1, 1)
  wrapper = mount(MouseLighting, { global: { plugins: [pinia] } })
  expect(wrapper.find('button[aria-pressed="true"]').text()).toContain('呼吸')
  const slider = wrapper.findAll('input[type="range"]')[0]!
  ;(slider.element as HTMLInputElement).value = '2'
  await slider.trigger('input')
  expect(wrapper.text()).toContain('亮度 · 2')
  changeByte(1, 6)
  await flushPromises()
  expect(wrapper.findAll('input[type="range"]')).toHaveLength(1)
  expect(wrapper.get('input[type="range"]').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('灯光已关闭')
})

it('does not discard a macro draft when its selected library item is clicked again', async () => {
  useMacroStore(pinia).ensureDefault('默认宏')
  wrapper = mount(MouseMacros, { global: { plugins: [pinia] } })
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '插入')!
    .trigger('click')
  await wrapper.get('.mouse-macro-name').trigger('click')
  expect(wrapper.findAll('.action-row')).toHaveLength(2)
  expect(device.dirty).toBe(true)
})

it('records modifier keys and offers them when inserting an action', async () => {
  const library = useMacroStore(pinia)
  library.ensureDefault('默认宏')
  wrapper = mount(MouseMacros, { global: { plugins: [pinia] } })
  expect(wrapper.text()).toContain('Left Ctrl')
  await wrapper.findAll('button').find((button) => button.text() === '开始录制')!.trigger('click')
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ControlLeft' }))
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ControlLeft' }))
  await wrapper.findAll('button').find((button) => button.text() === '停止录制')!.trigger('click')
  await flushPromises()
  expect(library.macros[0]!.actions.map((action) => action.code)).toEqual([0xe0, 0xe0])
})

it('shows the macro already bound to the selected button', async () => {
  useMacroStore(pinia).ensureDefault('默认宏')
  const keys = device.config!.keys.map((key) => [...key] as [number, number, number])
  keys[0] = [0x70, 0, 1]
  device.config = {
    ...device.config!,
    keys,
    macro: { name: '默认宏', actions: [{ delay: 0, typeAndStatus: 0x8a, code: 4 }] },
  }
  wrapper = mount(MouseKeymap, {
    props: {
      presentation: { image: CB75_CONFIG.image, buttonLayout: CB75_CONFIG.buttonLayout, solutionName: 'TLW' },
    },
    global: { plugins: [pinia] },
  })
  await wrapper.findAll('button').find((button) => button.text() === '鼠标按键')!.trigger('click')
  const select = wrapper.get('select')
  expect((select.element as HTMLSelectElement).value).toBe('default')
})

it('automatically saves completed recordings locally and releases held keys without binding', async () => {
  const library = useMacroStore(pinia)
  library.ensureDefault('默认宏')
  wrapper = mount(MouseMacros, { global: { plugins: [pinia] } })
  const bind = vi.spyOn(device.session!.device, 'bindMacro')
  await wrapper.findAll('button').find(button => button.text() === '开始录制')!.trigger('click')
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))
  await wrapper.findAll('button').find(button => button.text() === '停止录制')!.trigger('click')
  await flushPromises()
  expect(library.macros[0]!.actions.map(a => a.typeAndStatus)).toEqual([0x8a, 0x0a])
  expect(JSON.parse(localStorage.getItem(device.identity!.storage.macros)!)[0].actions).toHaveLength(2)
  expect(device.dirty).toBe(false)
  expect(bind).not.toHaveBeenCalled()
  expect(wrapper.findAll('button').some(button => button.text() === '保存到本地')).toBe(false)
})

it('keeps a recording dirty if local persistence fails', async () => {
  const library = useMacroStore(pinia)
  library.ensureDefault('默认宏')
  wrapper = mount(MouseMacros, { global: { plugins: [pinia] } })
  await wrapper.findAll('button').find(button => button.text() === '开始录制')!.trigger('click')
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full') })
  window.dispatchEvent(new Event('blur'))
  await flushPromises()
  expect(library.macros[0]!.actions).toHaveLength(0)
  expect(wrapper.findAll('.action-row')).toHaveLength(2)
  expect(device.dirty).toBe(true)
  expect(library.error).toBe('macroError')
})

it('keeps edits on the current profile and copies the original default when creating another', () => {
  const profiles = useProfileStore(pinia)
  profiles.ensureDefault('默认配置')
  expect(profiles.selected).toBe('default')
  const original = device.config!.functions[11]
  const next = original === 3 ? 2 : 3
  changeByte(11, next)
  profiles.save('办公配置')
  expect(profiles.selected).toBe('default')
  expect(profiles.profiles.find((profile) => profile.isDefault)!.functions[11]).toBe(next)
  expect(profiles.profiles.find((profile) => profile.name === '办公配置')!.functions[11]).toBe(original)
})

it('keeps saved profile data but leaves hardware unchanged after reconnect', async () => {
  const profiles = useProfileStore(pinia)
  profiles.ensureDefault('默认配置')
  profiles.save('办公配置')
  const custom = profiles.profiles.find((profile) => profile.name === '办公配置')!
  vi.spyOn(device.session!.device, 'applyProfile').mockImplementation(async (profile) => ({
    ...device.config!,
    functions: Uint8Array.from(profile.functions),
  }))
  await profiles.switchTo(custom.id)
  expect(profiles.selected).toBe(custom.id)
  const originalRate = device.config!.functions[11]
  const editedRate = originalRate === 3 ? 2 : 3
  changeByte(11, editedRate)
  expect(profiles.profiles.find((profile) => profile.id === custom.id)!.functions[11]).toBe(editedRate)

  const freshPinia = createPinia()
  const freshDevice = useDeviceStore(freshPinia)
  await freshDevice.attach(await new CB75Driver().connect(vi.fn(), new CapturedMouse().asHid()))
  const restored = useProfileStore(freshPinia)
  expect(restored.selected).toBe(custom.id)
  expect(restored.profiles.find((profile) => profile.id === custom.id)!.functions[11]).toBe(editedRate)
  const currentRate = freshDevice.config!.functions[11]
  const freshApply = vi.spyOn(freshDevice.session!.device, 'applyProfile')
  restored.ensureDefault('默认配置')
  expect(freshDevice.config!.functions[11]).toBe(currentRate)
  expect(freshApply).not.toHaveBeenCalled()
  expect(restored.selected).toBe('')
  expect(restored.profiles.find((profile) => profile.id === custom.id)!.functions[11]).toBe(editedRate)
  await freshDevice.session?.close()

  await device.session?.close()
  await device.attach(await new CB75Driver().connect(vi.fn(), new CapturedMouse().asHid()))
  const reconnectRate = device.config!.functions[11]
  const reconnectApply = vi.spyOn(device.session!.device, 'applyProfile')
  profiles.ensureDefault('默认配置')
  expect(device.config!.functions[11]).toBe(reconnectRate)
  expect(reconnectApply).not.toHaveBeenCalled()
  expect(profiles.selected).toBe('')
  expect(profiles.profiles.find((profile) => profile.id === custom.id)!.functions[11]).toBe(editedRate)
  reconnectApply.mockImplementation(async (profile) => ({
    ...device.config!,
    functions: Uint8Array.from(profile.functions),
  }))
  await profiles.switchTo(custom.id)
  expect(device.config!.functions[11]).toBe(editedRate)
  expect(profiles.selected).toBe(custom.id)
})

it('switches profiles by selection and keeps later edits on the selected profile', async () => {
  const profiles = useProfileStore(pinia)
  profiles.ensureDefault('默认配置')
  const original = device.config!.functions[11]
  const edited = original === 3 ? 2 : 3
  changeByte(11, edited)
  profiles.save('办公配置')
  const saved = profiles.profiles.find((profile) => profile.name === '办公配置')!
  vi.spyOn(device.session!.device, 'applyProfile').mockImplementation(async (profile) => ({
    ...device.config!,
    functions: Uint8Array.from(profile.functions),
  }))
  await profiles.switchTo(saved.id)
  expect(profiles.selected).toBe(saved.id)
  expect(device.config!.functions[11]).toBe(original)
  expect(profiles.profiles.find((profile) => profile.isDefault)!.functions[11]).toBe(edited)
  const again = edited === 2 ? 1 : 2
  changeByte(11, again)
  expect(profiles.selected).toBe(saved.id)
  expect(profiles.profiles.find((profile) => profile.id === saved.id)!.functions[11]).toBe(again)
  expect(profiles.profiles.find((profile) => profile.isDefault)!.functions[11]).toBe(edited)
})

it('keeps row actions attached to their own macro without replacing the current draft', async () => {
  const library = useMacroStore(pinia)
  library.ensureDefault('默认宏')
  const other = library.save({ name: '另一个宏', actions: [], playbackMode: 0, playbackCount: 1 })!
  wrapper = mount(MouseMacros, { global: { plugins: [pinia] } })
  await wrapper.findAll('.mouse-macro-name')[0]!.trigger('click')
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '插入')!
    .trigger('click')
  const exportFile = vi.spyOn(library, 'exportFile').mockImplementation(() => {})
  const row = wrapper.findAll('.mouse-macro-item')[1]!
  await row.get('button[title="导出"]').trigger('click')
  expect(exportFile).toHaveBeenCalledWith(other)
  await row.get('button[title="删除"]').trigger('click')
  expect(library.macros.some((macro) => macro.id === other)).toBe(false)
  expect(wrapper.findAll('.action-row')).toHaveLength(2)
  expect(device.dirty).toBe(true)
})

it('creates an unmodified default profile and switches by clicking the card', async () => {
  const profiles = useProfileStore(pinia)
  profiles.ensureDefault('默认配置')
  const original = device.config!.functions[11]
  const apply = vi.spyOn(device.session!.device, 'applyProfile')
  changeByte(11, original === 3 ? 2 : 3)
  wrapper = mount(MouseProfiles, { global: { plugins: [pinia] } })
  expect(wrapper.text()).not.toContain('应用')
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '新建配置')!
    .trigger('click')
  await wrapper.get('input[aria-label="配置名称"]').setValue('办公配置')
  await wrapper.get('form').trigger('submit')
  expect(profiles.profiles.find((p) => p.name === '办公配置')?.functions[11]).toBe(original)
  expect(profiles.selected).toBe('default')
  expect(apply).not.toHaveBeenCalled()
  expect(wrapper.find('dialog').exists()).toBe(false)
  const switchTo = vi.spyOn(profiles, 'switchTo').mockResolvedValue()
  await wrapper.findAll('.mouse-profile-card')[1]!.trigger('click')
  expect(switchTo).toHaveBeenCalledWith(profiles.profiles.find((p) => p.name === '办公配置')!.id)
})

it('opens profile management from the quick list without applying a profile', async () => {
  const profiles = useProfileStore(pinia)
  profiles.ensureDefault('默认配置')
  const apply = vi.spyOn(profiles, 'switchTo')
  wrapper = mount(MouseProfileSwitcher, {
    props: { collapsed: false, disabled: false },
    global: { plugins: [pinia] },
  })
  await wrapper.get('.mouse-profile-trigger').trigger('click')
  expect(wrapper.find('.mouse-profile-flyout').exists()).toBe(true)
  await wrapper.get('.mouse-profile-link').trigger('click')
  expect(wrapper.emitted('manage')).toHaveLength(1)
  expect(wrapper.find('.mouse-profile-flyout').exists()).toBe(false)
  expect(apply).not.toHaveBeenCalled()
})

it('only exposes the color wheel for steady lighting', async () => {
  changeByte(1, 0)
  wrapper = mount(MouseLighting, { global: { plugins: [pinia] } })
  expect(wrapper.find('.mouse-color-wheel').exists()).toBe(true)
  for (const mode of [1, 2, 3, 4, 5, 6]) {
    changeByte(1, mode)
    await flushPromises()
    expect(wrapper.find('.mouse-color-wheel').exists()).toBe(false)
    expect(wrapper.find('input[aria-label="十六进制颜色"]').exists()).toBe(false)
  }
})
