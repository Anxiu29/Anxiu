// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CompactKeyTest from '@/components/CompactKeyTest.vue'

describe('CompactKeyTest', () => {
  afterEach(() => vi.useRealTimers())

  it('shows raw keydown and keyup results without guessing click or long press', async () => {
    const wrapper = mount(CompactKeyTest, { props: { keyLabels: { 4: 'A' } } })

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }))
    await nextTick()
    expect(wrapper.find('.compact-key-event.pressed strong').text()).toBe('A')

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a' }))
    await nextTick()
    expect(wrapper.find('.compact-key-event.released strong').text()).toBe('A')
    expect(wrapper.text()).not.toContain('点击')
    expect(wrapper.text()).not.toContain('长按')

    wrapper.unmount()
  })

  it('shows multiple keys, keeps down for 0.5s and keyup for 2s', async () => {
    vi.useFakeTimers()
    const wrapper = mount(CompactKeyTest, { props: { keyLabels: { 4: 'A', 5: 'B' } } })

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', key: 'b' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyB', key: 'b' }))
    await nextTick()

    expect(wrapper.findAll('.compact-key-event.pressed .compact-key-values strong').map((item) => item.text())).toEqual(['A', 'B'])
    expect(wrapper.findAll('.compact-key-event.released .compact-key-values strong').map((item) => item.text())).toEqual(['A', 'B'])

    vi.advanceTimersByTime(500)
    await nextTick()
    expect(wrapper.find('.compact-key-test-empty').exists()).toBe(true)
    expect(wrapper.findAll('.compact-key-event.released .compact-key-values strong').map((item) => item.text())).toEqual(['A', 'B'])

    vi.advanceTimersByTime(1500)
    await nextTick()
    expect(wrapper.find('.compact-key-event.released .compact-key-values').exists()).toBe(false)
    wrapper.unmount()
  })
})
