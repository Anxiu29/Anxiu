// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import {
  deviceService,
  keyboardDriverService,
  deviceDriverRegistry,
  useDriverStore,
} from '@/composition/root'
import { useDeviceStore } from '@/stores/mouse/deviceStore'
import { useMacroStore } from '@/stores/mouse/macroStore'
import { CapturedMouse, MouseHid } from './helpers/tlwDevice'

let wrapper: VueWrapper | undefined
let hid: MouseHid & { getDevices: ReturnType<typeof vi.fn> }
beforeEach(() => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  })
  hid = Object.assign(new MouseHid(), { getDevices: vi.fn(async () => []) })
  Object.defineProperty(navigator, 'hid', { configurable: true, value: hid })
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  Element.prototype.scrollIntoView = vi.fn()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(async () => {
  wrapper?.unmount()
  wrapper = undefined
  await deviceService.disconnect()
  await keyboardDriverService.disconnect()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})
async function openMouse(wireless = false) {
  const device = new CapturedMouse(wireless),
    pinia = createPinia()
  hid.requestDevice.mockResolvedValue([device.asHid()])
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
  await flushPromises()
  await wrapper.get('.hero-actions .primary').trigger('click')
  await vi.waitFor(() => expect(wrapper!.find('.mouse-overview').exists()).toBe(true), {
    timeout: 5000,
  })
  return { device, pinia }
}
async function navigate(title: string) {
  await wrapper!.get('.sidebar-nav button[title="' + title + '"]').trigger('click')
  await flushPromises()
}

it('uses the existing shell and exposes mouse capabilities without keyboard-only controls', async () => {
  await openMouse(true)
  expect(wrapper!.findAll('.topbar')).toHaveLength(1)
  expect(wrapper!.find('a[href*="tlw.html"]').exists()).toBe(false)
  expect(wrapper!.find('.sidebar-configurations').exists()).toBe(false)
  expect(wrapper!.find('[title="高级键设置"]').exists()).toBe(false)
  expect(wrapper!.find('[title="按键测试"]').exists()).toBe(false)
  await navigate('改键设置')
  expect(wrapper!.find('.mouse-keymap').exists()).toBe(true)
  await navigate('灯光设置')
  expect(wrapper!.text()).toContain('灯光效果')
  await wrapper!.get('.sidebar-settings').trigger('click')
  expect(wrapper!.text()).toContain('设备维护')
  await navigate('配置管理')
  expect(wrapper!.text()).toContain('本地配置')
  expect(wrapper!.find('.mouse-profile-card').exists()).toBe(true)
  expect(wrapper!.find('.firmware-download-card').exists()).toBe(false)
})

it('follows the hardware DPI stage, stops polling on navigation and returns home after unplugging', async () => {
  const { device, pinia } = await openMouse()
  device.blocks.get(5)![12] = 2
  await navigate('性能设置')
  await vi.waitFor(() =>
    expect(wrapper!.findAll('.stage-button')[2]?.attributes('aria-pressed')).toBe('true'),
  )
  const poll = vi.spyOn(useDeviceStore(pinia).session!.device, 'readDpiStage')
  await navigate('灯光设置')
  await new Promise((resolve) => setTimeout(resolve, 1100))
  expect(poll).not.toHaveBeenCalled()
  hid.disconnect(device.asHid())
  await vi.waitFor(() => expect(wrapper!.find('.hero').exists()).toBe(true))
})

it('reorders macro actions and protects the draft on navigation and device switch', async () => {
  const { device, pinia } = await openMouse()
  const macros = useMacroStore(pinia)
  macros.selectedId = macros.save({
    name: '拖动测试',
    actions: [
      { typeAndStatus: 0x8a, code: 4, delay: 10 },
      { typeAndStatus: 0x0a, code: 4, delay: 20 },
      { typeAndStatus: 0x8a, code: 5, delay: 30 },
    ],
  })!
  await navigate('宏设置')
  const rows = wrapper!.findAll('.action-row'),
    transfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' }
  await rows[0]!.get('.action-index').trigger('dragstart', { dataTransfer: transfer })
  await rows[2]!.trigger('drop', { dataTransfer: transfer, clientY: 1 })
  expect(
    wrapper!.findAll('.action-row input').map((input) => (input.element as HTMLInputElement).value),
  ).toEqual(['20', '30', '10'])
  expect(useDeviceStore(pinia).dirty).toBe(true)
  vi.mocked(window.confirm).mockReturnValue(false)
  await navigate('性能设置')
  expect(wrapper!.find('.mouse-macros').exists()).toBe(true)
  await wrapper!.get('.top-actions .primary').trigger('click')
  await flushPromises()
  expect(device.close).not.toHaveBeenCalled()
  expect(wrapper!.find('.mouse-macros').exists()).toBe(true)
})

it('offers a choice when multiple previously authorized devices match instead of opening the first', async () => {
  const first = new CapturedMouse(),
    second = new CapturedMouse(true)
  hid.getDevices.mockResolvedValue([first.asHid(), second.asHid()])
  wrapper = mount(App, { global: { plugins: [createPinia()] } })
  await flushPromises()
  expect(wrapper.findAll('.authorized-devices button')).toHaveLength(2)
  expect(first.open).not.toHaveBeenCalled()
  expect(second.open).not.toHaveBeenCalled()
  await wrapper.findAll('.authorized-devices button')[1]!.trigger('click')
  await vi.waitFor(() => expect(wrapper!.find('.mouse-overview').exists()).toBe(true))
  expect(second.open).toHaveBeenCalledOnce()
})

it('cancelled authorization keeps the current page and device', async () => {
  const { device } = await openMouse()
  hid.requestDevice.mockResolvedValue([])
  await wrapper!.get('.top-actions .primary').trigger('click')
  await flushPromises()
  expect(wrapper!.find('.mouse-overview').exists()).toBe(true)
  expect(device.close).not.toHaveBeenCalled()
})

it('shows reconnect state and blocks overview actions after firmware transfer', async () => {
  const { pinia } = await openMouse()
  useDeviceStore(pinia).firmwareNeedsReconnect = true
  await flushPromises()
  expect(wrapper!.get('.mouse-overview').text()).toContain('需重新连接')
  expect(wrapper!.get('.status-pill').text()).toContain('需重新连接')
  expect(wrapper!.findAll('.mouse-overview button').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
})

it('keeps an edited macro when removal is cancelled', async () => {
  const { pinia } = await openMouse()
  await navigate('宏设置')
  const library = useMacroStore(pinia)
  const before = library.macros.map((macro) => macro.id)
  const insert = wrapper!.findAll('button').find((button) => button.text() === '插入')!
  await insert.trigger('click')
  expect(useDeviceStore(pinia).dirty).toBe(true)
  vi.mocked(window.confirm).mockReturnValue(false)
  await wrapper!
    .findAll('button')
    .find((button) => button.attributes('title') === '删除')!
    .trigger('click')
  expect(library.macros.map((macro) => macro.id)).toEqual(before)
  expect(wrapper!.findAll('.action-row')).toHaveLength(2)
  expect(useDeviceStore(pinia).dirty).toBe(true)
})

it('preserves keyboard disconnect and firmware-update handling through the unified entry', async () => {
  const pinia = createPinia()
  const driver = deviceDriverRegistry.keyboard()
  const session = driver.createDemoSession()
  let disconnect: (() => void) | undefined
  vi.spyOn(driver, 'connect').mockImplementation(async (callback) => {
    disconnect = callback
    return session
  })
  hid.requestDevice.mockResolvedValue([
    {
      vendorId: 0x1ca2,
      productId: 0x1604,
      collections: [{ usagePage: 0xffa0, usage: 1 }],
    } as HIDDevice,
  ])
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
  await flushPromises()
  await wrapper.get('.hero-actions .primary').trigger('click')
  const store = useDriverStore(pinia)
  await vi.waitFor(() => expect(store.profile).toBeDefined())
  const profile = store.profile
  store.firmwareUpdating = true
  disconnect!()
  expect(store.profile).toBe(profile)
  expect(store.status).not.toBe('disconnected')
  store.firmwareUpdating = false
  // Firmware reconnection installs the same keyboard-owned disconnect handler.
  store.handleDeviceDisconnect()
  expect(store.profile).toBe(profile)
  expect(store.status).toBe('disconnected')
  expect(store.error).toContain('草稿仍保留')
})

it('starts a mouse page at the top after navigating from scrolled content', async () => {
  await openMouse()
  await navigate('宏设置')
  const content = wrapper!.get('.app-content').element as HTMLElement
  content.scrollTop = 420
  await navigate('性能设置')
  expect(content.scrollTop).toBe(0)
})

it('enters mouse demo without HID authorization and exits cleanly', async () => {
  const pinia = createPinia()
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
  await flushPromises()
  await wrapper.get('.hero-actions .text-button').trigger('click')
  await wrapper.get('button[aria-label="体验 CB75-Mouse"]').trigger('click')
  await vi.waitFor(() => expect(wrapper!.find('.mouse-overview').exists()).toBe(true))
  expect(hid.requestDevice).not.toHaveBeenCalled()
  expect(useDeviceStore(pinia).identity?.demo).toBe(true)
  expect(useDeviceStore(pinia).identity?.storage.profiles).toContain('.demo')
  await navigate('灯光设置')
  const mouse = useDeviceStore(pinia)
  await mouse.run((device) => device.setColor('#123456'))
  expect(Array.from(mouse.config!.functions.slice(6, 9))).toEqual([18, 52, 86])
  await navigate('配置管理')
  expect(wrapper!.find('.mouse-profiles').exists()).toBe(true)
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '退出演示')!
    .trigger('click')
  await flushPromises()
  expect(wrapper.find('.hero').exists()).toBe(true)
  expect(deviceService.session).toBeUndefined()
})
