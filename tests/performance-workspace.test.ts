// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PerformanceWorkspace from '@/components/PerformanceWorkspace.vue'
import type { KeyboardProfile } from '@/domain/keyboard'
import type { KeyPerformanceSettings } from '@/domain/performance'

const profile: KeyboardProfile = {
  device: { productName: 'Performance Test', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1', runMode: 'app' },
  capabilities: { layers: 1, remap: true, restoreFactory: true, layoutRows: 1, layoutColumns: 1, performance: true, travelTest: true, calibration: true, pollingRates: [1000, 8000] },
  positions: [{ id: '0-0', sourceCode: 4, label: 'A', address: { kind: 'matrix', row: 0, column: 0 } }],
  defaultAssignments: [{ positionId: '0-0', sourceCode: 4, layer: 0, keyCode: 4, category: 'basic' }],
  assignments: [{ positionId: '0-0', sourceCode: 4, layer: 0, keyCode: 4, category: 'basic' }],
}

const settings: KeyPerformanceSettings = {
  sourceCode: 4,
  mode: 'single',
  globalActuation: 2,
  actuation: 1.5,
  rapidPress: 0.2,
  rapidRelease: 0.3,
  pressDeadZone: 0.1,
  releaseDeadZone: 0.1,
}

describe('PerformanceWorkspace mode layout', () => {
  it('shares the latest-changing-key travel display across normal, RT and advanced settings', async () => {
    const wrapper = mount(PerformanceWorkspace, { props: { profile, status: 'ready', selectedPositionId: '0-0', settings, pollingRate: 1000, travelMatrix: [[1.25]], assignments: profile.assignments, keyLabels: { 4: 'A' } } })
    const tabs = wrapper.findAll('.performance-tabs button')

    expect(tabs.map((tab) => tab.text())).toEqual(['普通模式', 'RT 模式', '高级设置', '键盘校准'])
    expect(wrapper.find('.normal-preview').text()).toContain('固定触发点')
    expect(wrapper.find('.performance-keyboard-panel .performance-selection-tools').exists()).toBe(true)
    expect(wrapper.find('.keycap-top-label').text()).toBe('1.5')
    expect(wrapper.find('.keycap-bottom-label').exists()).toBe(false)
    const travelToggle = wrapper.find('.travel-test-toggle')
    expect(travelToggle.attributes('aria-checked')).toBe('false')
    await travelToggle.trigger('keydown', { key: 'Enter' })
    travelToggle.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }))
    await travelToggle.trigger('keyup', { key: 'Enter' })
    expect(travelToggle.attributes('aria-checked')).toBe('false')
    await travelToggle.trigger('keydown', { key: ' ', code: 'Space' })
    travelToggle.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }))
    await travelToggle.trigger('keyup', { key: ' ', code: 'Space' })
    expect(travelToggle.attributes('aria-checked')).toBe('false')
    travelToggle.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await wrapper.vm.$nextTick()
    expect(travelToggle.attributes('aria-checked')).toBe('true')
    expect(wrapper.find('.keycap-badge').text()).toContain('1.25 mm')

    await wrapper.setProps({ travelMatrix: [[2.5]] })
    expect(wrapper.find('.performance-live-travel').text()).toContain('最新：A')
    expect(wrapper.find('.performance-live-travel').text()).toContain('2.50 mm')

    await tabs[1]!.trigger('click')
    expect(wrapper.find('.rt-controls').text()).not.toContain('首次触发行程')
    expect(wrapper.find('.rt-preview').text()).toContain('动态触发与复位')
    expect(wrapper.find('.keycap-top-label').text()).toBe('0.2')
    expect(wrapper.find('.keycap-bottom-label').text()).toBe('0.3')
    expect(wrapper.find('.keycap-auxiliary-label').exists()).toBe(false)
    expect(wrapper.find('.performance-keyboard-panel .performance-selection-tools').exists()).toBe(true)
    expect(wrapper.find('.performance-live-travel').exists()).toBe(true)

    // 点击另一个普通模式按键会触发设备参数回读，但不能把用户从 RT 标签页赶回普通模式。
    await wrapper.setProps({ settings: { ...settings, mode: 'single', actuation: 1.8 } })
    expect(wrapper.findAll('.performance-tabs button')[1]!.classes()).toContain('active')
    expect(wrapper.find('.rt-controls').exists()).toBe(true)

    await tabs[2]!.trigger('click')
    expect(wrapper.find('.performance-settings-main').text()).toContain('当前按键死区')
    expect(wrapper.find('.performance-settings-main').text()).toContain('USB 回报率')
    expect(wrapper.find('.performance-live-travel').exists()).toBe(true)
    wrapper.unmount()
  })

  it('selects physical key groups and exposes device-read dead-zone values on keycaps', async () => {
    const positions = [
      { id: '0-0', sourceCode: 0x1a, label: 'W', address: { kind: 'matrix' as const, row: 0, column: 0 } },
      { id: '0-1', sourceCode: 0x04, label: 'A', address: { kind: 'matrix' as const, row: 0, column: 1 } },
      { id: '0-2', sourceCode: 0x1e, label: '1', address: { kind: 'matrix' as const, row: 0, column: 2 } },
    ]
    const bulkProfile: KeyboardProfile = {
      ...profile,
      capabilities: { ...profile.capabilities, layoutColumns: 3 },
      positions,
      assignments: positions.map((position) => ({ positionId: position.id, sourceCode: position.sourceCode, layer: 0, keyCode: position.sourceCode, category: 'basic' as const })),
      defaultAssignments: positions.map((position) => ({ positionId: position.id, sourceCode: position.sourceCode, layer: 0, keyCode: position.sourceCode, category: 'basic' as const })),
    }
    const settingsBySourceCode = Object.fromEntries(positions.map((position, index) => [position.sourceCode, { ...settings, sourceCode: position.sourceCode, pressDeadZone: 0.1 + index * 0.1, releaseDeadZone: 0.2 + index * 0.1 }]))
    const wrapper = mount(PerformanceWorkspace, { props: { profile: bulkProfile, status: 'ready', selectedPositionId: '0-0', settings: settingsBySourceCode[0x1a], settingsBySourceCode, assignments: bulkProfile.assignments, keyLabels: { 0x1a: 'W', 0x04: 'A', 0x1e: '1' } } })

    const singleMode = wrapper.findAll('.performance-modes button').find((button) => button.text().includes('单键触发'))!
    await singleMode.trigger('click')
    await wrapper.setProps({ settings: { ...settingsBySourceCode[0x1a]!, mode: 'global' } })
    expect(singleMode.classes()).toContain('active')

    const globalMode = wrapper.findAll('.performance-modes button').find((button) => button.text().includes('全局触发'))!
    await globalMode.trigger('click')
    await wrapper.find('.primary-control input').setValue(2.7)
    expect(wrapper.findAll('.keycap-top-label').map((label) => label.text())).toEqual(['2.7', '2.7', '2.7'])
    await wrapper.find('.performance-heading .primary').trigger('click')
    const globalUpdate = wrapper.emitted('update-many')?.[0]?.[0] as KeyPerformanceSettings[]
    expect(globalUpdate).toHaveLength(3)
    expect(globalUpdate.every((item) => item.mode === 'global' && item.globalActuation === 2.7)).toBe(true)

    await wrapper.findAll('.performance-tabs button')[2]!.trigger('click')
    expect(wrapper.emitted('load-all')?.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.findAll('.keycap-top-label').map((label) => label.text())).toEqual(['0.1', '0.2', '0.3'])
    expect(wrapper.findAll('.keycap-bottom-label').map((label) => label.text())).toEqual(['0.2', '0.3', '0.4'])

    const wasd = wrapper.findAll('.performance-selection-tools button').find((button) => button.text() === 'WASD')!
    await wasd.trigger('click')
    expect(wrapper.findAll('.keycap.selected')).toHaveLength(2)
    await wrapper.find('.dead-zone input').setValue(0.5)
    expect(wrapper.findAll('.keycap.selected .keycap-top-label').map((label) => label.text())).toEqual(['0.5', '0.5'])
    await wrapper.find('.performance-heading .primary').trigger('click')
    expect(wrapper.emitted('update-many')?.[1]?.[0]).toHaveLength(3)
    wrapper.unmount()
  })

  it('uses 0.01 mm precision for normal and RT travel controls', async () => {
    const wrapper = mount(PerformanceWorkspace, { props: { profile, status: 'ready', selectedPositionId: '0-0', settings, assignments: profile.assignments, keyLabels: { 4: 'A' } } })

    const normalRange = wrapper.find('.primary-control input[type="range"]')
    expect(normalRange.attributes('min')).toBe('0.01')
    expect(normalRange.attributes('step')).toBe('0.01')
    expect(wrapper.find('.primary-control output').text()).toBe('1.50 mm')

    await wrapper.findAll('.performance-tabs button')[1]!.trigger('click')
    const rtRanges = wrapper.findAll('.rt-controls input[type="range"]')
    expect(rtRanges).toHaveLength(2)
    expect(rtRanges.every((range) => range.attributes('min') === '0.01' && range.attributes('step') === '0.01')).toBe(true)
    expect(wrapper.findAll('.rt-controls output').map((output) => output.text())).toEqual(['0.20 mm', '0.30 mm'])

    await wrapper.findAll('.performance-tabs button')[2]!.trigger('click')
    const deadZoneRanges = wrapper.findAll('.dead-zone input[type="range"]')
    expect(deadZoneRanges).toHaveLength(2)
    expect(deadZoneRanges.every((range) => range.attributes('step') === '0.01')).toBe(true)
    wrapper.unmount()
  })
})
