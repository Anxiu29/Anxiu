// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import { createPinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import MouseFirmware from '@/components/mouse/MouseFirmware.vue'
import { MouseSession } from '@/application/MouseSession'
import { CB75Driver } from '@/devices/cb75/CB75Driver'
import { validateFirmware } from '@/devices/cb75/firmware'
import { CB75_FIRMWARE_RESOURCES } from '@/devices/cb75/firmwareResources'
import { useDeviceStore } from '@/stores/mouse/deviceStore'

let wrapper: VueWrapper | undefined
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
async function setup(demo = false) {
  const pinia = createPinia()
  const store = useDeviceStore(pinia)
  const original = new CB75Driver().createDemoSession()
  const request = vi.fn(async () => undefined)
  await store.attach(new MouseSession(original.device, { ...original.identity, demo, connection: 'wired' }, async () => undefined, {
    validate: validateFirmware,
    maxImageBytes: 0xff00 * 16,
    requestDevice: request,
    update: vi.fn(),
  }))
  wrapper = mount(MouseFirmware, { props: { resources: CB75_FIRMWARE_RESOURCES }, global: { plugins: [pinia] } })
  return { store, request }
}
function button(text: string) { return wrapper!.findAll('button').find((item) => item.text() === text)! }

it('downloads and verifies the bundled image before explicitly selecting a USB interface', async () => {
  const { request } = await setup()
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(readFileSync('public/firmware/cb75-mouse/cb75-mouse-20260922.bin'))))
  expect(button('开始网页更新').attributes('disabled')).toBeDefined()
  await button('获取在线固件').trigger('click')
  await vi.waitFor(() => expect(button('开始网页更新').attributes('disabled')).toBeUndefined())
  expect(wrapper!.text()).toContain('cb75-mouse-20260922.bin')
  expect(request).not.toHaveBeenCalled()
  await button('开始网页更新').trigger('click')
  await flushPromises()
  expect(request).toHaveBeenCalledOnce()
})
it('rejects a downloaded image whose hash differs and never authorizes USB', async () => {
  const { request } = await setup()
  vi.stubGlobal('crypto', webcrypto)
  const corrupted = readFileSync('public/firmware/cb75-mouse/cb75-mouse-20260922.bin')
  corrupted[100] ^= 1
  vi.stubGlobal('fetch', vi.fn(async () => new Response(corrupted)))
  await button('获取在线固件').trigger('click')
  await vi.waitFor(() => expect(wrapper!.text()).toContain('在线固件校验失败'))
  expect(button('开始网页更新').attributes('disabled')).toBeDefined()
  expect(request).not.toHaveBeenCalled()
})
it('offers the mouse EXE independently of browser flashing and disables demo flashing', async () => {
  await setup(true)
  expect(wrapper!.text()).toContain('当前固件 未报告')
  expect(wrapper!.text()).toContain('此安装包未声明版本号')
  expect(button('获取在线固件').attributes('disabled')).toBeDefined()
  await button('本地更新').trigger('click')
  expect(wrapper!.get('a').attributes('href')).toBe(CB75_FIRMWARE_RESOURCES.executable!.url)
  expect(wrapper!.text()).toContain('V0110')
  expect(wrapper!.text()).toContain('测试升级包')
  expect(wrapper!.text()).toContain('设备未报告固件版本')
})
