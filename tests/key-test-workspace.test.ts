// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import KeyTestWorkspace from '@/components/KeyTestWorkspace.vue'
import type { KeyboardProfile } from '@/domain/keyboard'

const profile: KeyboardProfile = {
  device: { productName: 'Test', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1', runMode: 'app' },
  capabilities: { layers: 1, remap: true, restoreFactory: true, layoutRows: 1, layoutColumns: 1 },
  positions: [{ id: '0-0', sourceCode: 4, label: 'A', address: { kind: 'matrix', row: 0, column: 0 } }],
  defaultAssignments: [],
  assignments: [{ positionId: '0-0', sourceCode: 4, layer: 0, keyCode: 4, category: 'basic' }],
}

describe('KeyTestWorkspace', () => {
  afterEach(() => vi.useRealTimers())

  it('records down/up time, duration and independent counts', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-24T12:34:56.100'))
    const wrapper = mount(KeyTestWorkspace, { props: { profile, assignments: profile.assignments, keyLabels: { 4: 'A' } } })

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }))
    vi.advanceTimersByTime(125)
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.key-test-stats').text()).toContain('1 按下次数')
    expect(wrapper.find('.key-test-stats').text()).toContain('1 抬起次数')
    expect(wrapper.find('.key-test-stats').text()).toContain('2 总触发次数')
    expect(wrapper.find('.keycap-badge').text()).toBe('1/1')
    const records = wrapper.findAll('.key-test-records article')
    expect(records[0]!.text()).toContain('抬起')
    expect(records[0]!.text()).toContain('12:34:56.225')
    expect(records[0]!.text()).toContain('持续 125 ms')
    expect(records[1]!.text()).toContain('按下')
    expect(records[1]!.text()).toContain('12:34:56.100')

    await wrapper.get('.key-test-history-actions button').trigger('click')
    expect(wrapper.find('.key-test-stats').text()).toContain('0 总触发次数')
    expect(wrapper.find('.key-test-records').exists()).toBe(false)
    expect(wrapper.find('.keycap-badge').exists()).toBe(false)
    wrapper.unmount()
  })

  it('records the interval from the first press to the second press and then to the first release', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-24T12:00:00.100'))
    const wrapper = mount(KeyTestWorkspace, { props: { profile, assignments: profile.assignments, keyLabels: { 4: 'A', 5: 'B' } } })

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }))
    vi.advanceTimersByTime(30)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', key: 'b' }))
    vi.advanceTimersByTime(20)
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a' }))
    await wrapper.vm.$nextTick()

    const records = wrapper.findAll('.key-test-records article')
    expect(records[0]!.text()).toContain('A抬起')
    expect(records[0]!.text()).not.toContain('距上一事件')
    expect(records[0]!.text()).toContain('持续 50 ms')
    expect(records[1]!.text()).toContain('B按下')
    expect(records[1]!.text()).toContain('距上一事件 30 ms')
    expect(records[2]!.text()).not.toContain('距上一事件')
    wrapper.unmount()
  })
})
