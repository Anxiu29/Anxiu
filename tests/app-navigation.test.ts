// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { expect, it, vi } from 'vitest'
import App from '@/App.vue'
import { keyboardDriverService, useDriverStore } from '@/composition/root'

it('loads every lazy workspace and returns to the overview with the same session', async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useDriverStore()
  await store.connect(true)
  const session = keyboardDriverService.session
  // This test exercises navigation and lazy rendering; device reads have separate integration tests.
  const mocks = [
    vi.spyOn(store, 'reconnectAuthorized').mockResolvedValue(undefined),
    vi.spyOn(store, 'loadAdvancedKeyTypes').mockResolvedValue(undefined),
    vi.spyOn(store, 'loadPerformanceMap').mockResolvedValue(undefined),
    vi.spyOn(store, 'loadPollingRate').mockResolvedValue(undefined),
    vi.spyOn(store, 'loadMacrosFromDevice').mockResolvedValue(undefined),
  ]
  const wrapper = mount(App, { global: { plugins: [pinia] } })
  try {
    for (const [title, selector] of [
      ['改键设置', '.keymap-workspace'], ['灯光设置', '.lighting-workspace'],
      ['高级键设置', '.advanced-workspace'], ['性能设置', '.performance-workspace'],
      ['宏设置', '.macro-workspace'], ['按键测试', '.key-test-workspace'],
    ]) {
      await wrapper.get(`.sidebar-nav button[title="${title}"]`).trigger('click')
      await vi.waitFor(() => expect(wrapper.find(selector!).exists()).toBe(true), { timeout: 3000 })
      expect(keyboardDriverService.session).toBe(session)
    }
    await wrapper.get('.sidebar-nav button[title="设备首页"]').trigger('click')
    expect(wrapper.find('.overview-image').exists()).toBe(true)
    expect(wrapper.find('.key-test-workspace').exists()).toBe(false)
  } finally {
    wrapper.unmount()
    mocks.forEach((mock) => mock.mockRestore())
    await keyboardDriverService.disconnect()
  }
}, 10000)
