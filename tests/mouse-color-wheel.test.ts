// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import MouseColorWheel from '@/components/mouse/MouseColorWheel.vue'

it('previews pointer movement and commits once on release', async () => {
  const wrapper = mount(MouseColorWheel, { props: { color: '#ff0000' } })
  const wheel = wrapper.get('[role="slider"]')
  Object.defineProperty(wheel.element, 'setPointerCapture', { value: vi.fn() })
  vi.spyOn(wheel.element, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 200,
    height: 200,
  } as DOMRect)
  await wheel.trigger('pointerdown', { button: 0, pointerId: 1, clientX: 100, clientY: 0 })
  await wheel.trigger('pointermove', { pointerId: 1, clientX: 100, clientY: 200 })
  expect(wrapper.emitted('change')).toBeUndefined()
  await wheel.trigger('pointerup', { pointerId: 1, clientX: 100, clientY: 200 })
  expect(wrapper.emitted('change')).toEqual([['#00ffff']])
  wrapper.unmount()
})

it('syncs device colors and rejects invalid hex values', async () => {
  const wrapper = mount(MouseColorWheel, { props: { color: '#0080ff' } })
  const input = wrapper.get('input[aria-label="十六进制颜色"]')
  expect((input.element as HTMLInputElement).value).toBe('#0080FF')
  await input.setValue('invalid')
  expect(wrapper.emitted('change')).toBeUndefined()
  expect((input.element as HTMLInputElement).value).toBe('#0080FF')
  await wrapper.setProps({ color: '#ffffff' })
  expect((input.element as HTMLInputElement).value).toBe('#FFFFFF')
  wrapper.unmount()
})

it('blocks keyboard changes while the device is busy', async () => {
  const wrapper = mount(MouseColorWheel, { props: { color: '#ff0000', disabled: true } })
  await wrapper.get('[role="slider"]').trigger('keydown', { key: 'ArrowRight' })
  expect(wrapper.emitted('change')).toBeUndefined()
  await wrapper.setProps({ disabled: false })
  await wrapper.get('[role="slider"]').trigger('keydown', { key: 'ArrowRight' })
  expect(wrapper.emitted('change')).toEqual([['#ff1500']])
  wrapper.unmount()
})
