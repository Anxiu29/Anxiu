// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AdvancedKeyWorkspace from '@/components/AdvancedKeyWorkspace.vue'
import type { KeyboardProfile } from '@/domain/keyboard'

const profile: KeyboardProfile = {
  device: { productName: 'Test Keyboard', vendorId: 1, productId: 2, firmwareVersion: '1.0.0', protocolVersion: '1.0.7', runMode: 'app' },
  capabilities: { layers: 1, remap: true, restoreFactory: true, advancedKey: true, layoutRows: 1, layoutColumns: 2 },
  positions: [
    { id: '0-0', sourceCode: 4, label: 'A', address: { kind: 'matrix', row: 0, column: 0 } },
    { id: '0-1', sourceCode: 5, label: 'B', address: { kind: 'matrix', row: 0, column: 1 } },
  ],
  defaultAssignments: [],
  assignments: [
    { positionId: '0-0', sourceCode: 4, layer: 0, keyCode: 4, category: 'basic' },
    { positionId: '0-1', sourceCode: 5, layer: 0, keyCode: 5, category: 'basic' },
  ],
}

const common = {
  profile,
  status: 'ready' as const,
  assignments: profile.assignments,
  keyOptions: [{ code: 4, label: 'A', category: 'basic' as const }],
  keyLabels: { 4: 'A', 5: 'B' },
}

describe('AdvancedKeyWorkspace loading lifecycle', () => {
  it('reuses the matching cached key when the page is mounted again', () => {
    const wrapper = mount(AdvancedKeyWorkspace, { props: { ...common, selectedPositionId: '0-0', settings: { type: 'none', sourceCode: 4 } } })

    expect(wrapper.emitted('load')).toBeUndefined()
    expect(wrapper.text()).toContain('此键尚未设置高级功能')
  })

  it('requests a newly selected key exactly once and does not display stale settings', async () => {
    const wrapper = mount(AdvancedKeyWorkspace, { props: { ...common, selectedPositionId: '0-0', settings: { type: 'none', sourceCode: 4 } } })

    await wrapper.setProps({ selectedPositionId: '0-1', loading: true })

    expect(wrapper.emitted('load')).toEqual([['0-1']])
    expect(wrapper.text()).toContain('正在读取当前按键')
  })

  it('renders DKS as a four-by-four trigger matrix and shows confirmed badges', async () => {
    const wrapper = mount(AdvancedKeyWorkspace, {
      attachTo: document.body,
      props: {
        ...common,
        selectedPositionId: '0-0',
        advancedKeyTypes: { 4: 'DKS' },
        settings: { type: 'dks', sourceCode: 4, keyCodes: [4, 4, 4, 4], triggers: [0, 0, 0, 0], travels: [1, 3.2] },
      },
    })

    expect(wrapper.find('.keycap-badge').text()).toBe('DKS')
    expect(wrapper.findAll('.dks-trigger-cell')).toHaveLength(16)
    expect(wrapper.findAll('.dks-phase-heading strong').map((item) => item.text())).toEqual(['↓', '↓', '↑', '↑'])
    expect(wrapper.findAll('.dks-phase-heading input').map((item) => item.attributes('value'))).toEqual(['1', '3.2'])
    expect(wrapper.findAll('.dks-phase-heading small').map((item) => item.text())).toEqual(['3.2 mm', '1.0 mm'])
    const firstTrigger = wrapper.findAll('.dks-trigger-cell')[0]!
    await firstTrigger.trigger('click')
    expect(firstTrigger.classes()).toContain('single')
    expect(firstTrigger.text()).toBe('●')
    await wrapper.find('.advanced-heading-actions .primary').trigger('click')
    expect((wrapper.emitted('update')?.[0]?.[0] as { triggers: number[] }).triggers[0]).toBe(0b00000001)
    await firstTrigger.trigger('click')
    expect(firstTrigger.classes()).not.toContain('single')

    const secondTrigger = wrapper.findAll('.dks-trigger-cell')[1]!
    await firstTrigger.trigger('pointerdown')
    await secondTrigger.trigger('pointerenter')
    window.dispatchEvent(new Event('pointerup'))
    await wrapper.vm.$nextTick()
    expect(firstTrigger.classes()).toContain('continuous')
    expect(secondTrigger.classes()).toContain('continuous')
    await wrapper.find('.advanced-heading-actions .primary').trigger('click')
    expect((wrapper.emitted('update')?.[1]?.[0] as { triggers: number[] }).triggers[0]).toBe(0b00000111)

    await wrapper.find('.advanced-key-value').trigger('click')
    expect(document.querySelector('.key-code-dialog')).not.toBeNull()
    wrapper.unmount()
  })

  it('deletes only a saved advanced-key setting for the selected physical key', async () => {
    const wrapper = mount(AdvancedKeyWorkspace, {
      props: {
        ...common,
        selectedPositionId: '0-0',
        settings: { type: 'tgl', sourceCode: 4, keyCode: 4, delay: 200 },
      },
    })

    const deleteButton = wrapper.find('.advanced-heading-actions .danger')
    expect(deleteButton.text()).toBe('删除')
    expect(deleteButton.attributes('disabled')).toBeUndefined()
    await deleteButton.trigger('click')
    expect(wrapper.emitted('delete')).toEqual([[4]])

    // 切到尚未设置高级键的物理键后，不允许把新建草稿误当成已保存配置删除。
    await wrapper.setProps({ selectedPositionId: '0-1', settings: { type: 'none', sourceCode: 5 } })
    await wrapper.findAll('.advanced-type-list > button')[0]!.trigger('click')
    expect(deleteButton.attributes('disabled')).toBeDefined()
  })
})
