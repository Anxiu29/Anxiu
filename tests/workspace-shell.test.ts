import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import AppShell from '@/components/AppShell.vue'
import DeviceOverview from '@/components/DeviceOverview.vue'
import KeymapWorkspace from '@/components/KeymapWorkspace.vue'
import type { KeyboardProfile } from '@/domain/keyboard'
import { c98KeyGeometry } from '@/ui/c98KeyboardGeometry'

const profile: KeyboardProfile = {
  device: { productName: 'RK-C98 Test', vendorId: 0x1ca2, productId: 0x1604, firmwareVersion: '1.0.1', protocolVersion: '1.0.7', runMode: 'app' },
  capabilities: { layers: 1, remap: true, restoreFactory: true, layoutRows: 1, layoutColumns: 1 },
  positions: [{ id: '0-0', sourceCode: 4, label: 'A', address: { kind: 'matrix', row: 0, column: 0 } }],
  defaultAssignments: [{ positionId: '0-0', sourceCode: 4, layer: 0, keyCode: 4, category: 'basic' }],
  assignments: [{ positionId: '0-0', sourceCode: 4, layer: 0, keyCode: 4, category: 'basic' }],
}

describe('connected workspace navigation', () => {
  it('uses the product image directly as the device overview hero', () => {
    const wrapper = mount(DeviceOverview, { props: { profile } })

    expect(wrapper.find('.overview-image img').attributes('alt')).toContain('键盘大图')
    expect(wrapper.find('.overview-image').element.tagName).toBe('DIV')
    expect(wrapper.find('.image-lightbox').exists()).toBe(false)
    expect(wrapper.find('.device-specs').exists()).toBe(true)
  })

  it('starts on device overview and renders only the selected workspace', async () => {
    const wrapper = mount(AppShell, {
      props: { profile },
      slots: {
        device: '<div data-view="device">设备首页内容</div>',
        keymap: '<div data-view="keymap">改键内容</div>',
      },
    })

    expect(wrapper.find('[data-view="device"]').exists()).toBe(true)
    expect(wrapper.find('[data-view="keymap"]').exists()).toBe(false)

    await wrapper.findAll('.sidebar-nav button')[1]!.trigger('click')
    expect(wrapper.find('[data-view="device"]').exists()).toBe(false)
    expect(wrapper.find('[data-view="keymap"]').exists()).toBe(true)
  })

  it('shows configuration switching below the current device', async () => {
    const wrapper = mount(AppShell, { props: { profile, activeConfiguration: 2 }, slots: { device: '<div />' } })
    const configurationButtons = wrapper.findAll('.sidebar-configurations button')

    expect(wrapper.find('.sidebar-device').element.compareDocumentPosition(wrapper.find('.sidebar-configurations').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(configurationButtons.map((button) => button.text())).toEqual(['1', '2', '3', '4'])
    expect(configurationButtons[1]?.classes()).toContain('active')

    await configurationButtons[3]!.trigger('click')
    expect(wrapper.emitted('select-configuration')).toEqual([[4]])
  })

  it('collapses the sidebar to icon-only navigation and expands it again', async () => {
    const wrapper = mount(AppShell, { props: { profile }, slots: { device: '<div />' } })
    const toggle = wrapper.find('.sidebar-collapse-toggle')

    expect(wrapper.classes()).not.toContain('sidebar-collapsed')
    expect(toggle.attributes('aria-expanded')).toBe('true')

    await toggle.trigger('click')
    expect(wrapper.classes()).toContain('sidebar-collapsed')
    expect(toggle.attributes('aria-label')).toBe('展开侧边栏')
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')
    expect(wrapper.classes()).not.toContain('sidebar-collapsed')
  })

  it('opens settings from the lower-left corner and confirms factory reset', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(AppShell, { props: { profile }, slots: { device: '<div />' } })

    await wrapper.find('.sidebar-settings').trigger('click')
    expect(wrapper.find('.settings-panel').text()).toContain('恢复出厂设置')

    await wrapper.find('.factory-reset-button').trigger('click')
    expect(confirm).toHaveBeenCalledOnce()
    expect(wrapper.emitted('restore-factory')).toEqual([[]])
    expect(wrapper.find('.settings-panel').exists()).toBe(false)
    confirm.mockRestore()
  })

  it('locks navigation while a device operation is running', async () => {
    const wrapper = mount(AppShell, { props: { profile, navigationDisabled: true }, slots: { device: '<div data-view="device" />', keymap: '<div data-view="keymap" />' } })
    const keymapButton = wrapper.findAll('.sidebar-nav button')[1]!

    expect(keymapButton.attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('.sidebar-configurations button').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.find('.sidebar-settings').attributes('disabled')).toBeDefined()
    await keymapButton.trigger('click')
    expect(wrapper.find('[data-view="device"]').exists()).toBe(true)
  })

  it('shows feedback as a dismissible floating toast', async () => {
    const wrapper = mount(AppShell, { props: { profile, message: '键盘连接成功' }, slots: { device: '<div />' } })

    expect(wrapper.find('.feedback-toast').text()).toContain('键盘连接成功')
    await wrapper.find('.feedback-toast button').trigger('click')
    expect(wrapper.find('.feedback-toast').exists()).toBe(false)
  })

  it('keeps the keymap workspace focused on the two keyboard areas and disables remapping after disconnect', async () => {
    sessionStorage.clear()
    const wrapper = mount(KeymapWorkspace, {
      props: {
        profile,
        status: 'ready',
        layer: 0,
        mode: 'win',
        selectedPositionId: '0-0',
        dirty: false,
        assignments: profile.assignments,
        selectedAssignment: profile.assignments[0],
        keyOptions: [{ code: 4, label: 'A', category: 'basic' }],
        keyLabels: { 4: 'A' },
      },
    })

    expect(wrapper.find('.keyboard-shell').exists()).toBe(true)
    expect(wrapper.find('.picker-wide').exists()).toBe(true)
    expect(wrapper.find('.device-overview').exists()).toBe(false)
    expect(wrapper.find('.side-restore').text()).toBe('恢复默认')

    await wrapper.find('.keycap').trigger('contextmenu', { clientX: 120, clientY: 160 })
    expect(wrapper.find('.key-context-menu').text()).toBe('恢复此键默认')
    await wrapper.find('.key-context-menu button').trigger('click')
    expect(wrapper.emitted('select-position')).toContainEqual(['0-0'])
    expect(wrapper.emitted('restore-key')).toEqual([['0-0', 0]])
    expect(wrapper.find('.key-context-menu').exists()).toBe(false)

    await wrapper.setProps({ status: 'disconnected' })
    expect(wrapper.find('.side-restore').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.picker-key').attributes('disabled')).toBeDefined()
    await wrapper.find('.keycap').trigger('contextmenu', { clientX: 120, clientY: 160 })
    expect(wrapper.find('.key-context-menu').exists()).toBe(false)

    expect(wrapper.find('.picker-current').text()).toContain('当前键码')
    expect(wrapper.find('.picker-hint').text()).toContain('先选上方物理键')
    expect(wrapper.find('.keymap-tip').exists()).toBe(false)
  })

  it('compares key changes with the layer baseline instead of the physical source code', async () => {
    const fnAssignment = { positionId: '0-0', sourceCode: 1, layer: 0, keyCode: 0xf001, category: 'function' as const }
    const fnProfile: KeyboardProfile = {
      ...profile,
      positions: [{ ...profile.positions[0]!, sourceCode: 1, label: 'Fn' }],
      assignments: [fnAssignment],
      defaultAssignments: [{ ...fnAssignment }],
    }
    const wrapper = mount(KeymapWorkspace, { props: { profile: fnProfile, status: 'ready', layer: 0, mode: 'win', dirty: false, assignments: [fnAssignment], keyOptions: [], keyLabels: { 0xf001: 'Fn1' } } })

    expect(wrapper.find('.keycap').text()).toContain('Fn1')
    expect(wrapper.find('.keycap').classes()).not.toContain('changed')

    await wrapper.setProps({ assignments: [{ ...fnAssignment, keyCode: 4 }] })
    expect(wrapper.find('.keycap').classes()).toContain('changed')
  })

  it('keeps four Fn layers in both system modes and emits a Mac mode switch', async () => {
    const fourLayerProfile: KeyboardProfile = { ...profile, capabilities: { ...profile.capabilities, layers: 4 } }
    const wrapper = mount(KeymapWorkspace, { props: { profile: fourLayerProfile, status: 'ready', layer: 0, mode: 'win', dirty: false, assignments: profile.assignments, keyOptions: [], keyLabels: {} } })

    const groups = wrapper.findAll('.side-control-group')
    expect(groups[0]?.text()).toContain('WIN')
    expect(groups[0]?.text()).toContain('MAC')
    expect(groups[1]?.findAll('button').map((button) => button.text())).toEqual(['FN 1', 'FN 2', 'FN 3', 'FN 4'])

    await groups[0]!.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('select-mode')).toEqual([['mac']])
  })

  it('scales an injected device geometry with both fullscreen width and height', async () => {
    const originalWidth = window.innerWidth
    const originalHeight = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 880 })
    const wrapper = mount(KeymapWorkspace, { props: { profile, status: 'ready', layer: 0, mode: 'win', dirty: false, assignments: profile.assignments, keyOptions: [], keyLabels: { 4: 'A' }, keyGeometry: c98KeyGeometry } })

    expect(Number.parseFloat((wrapper.find('.keyboard-layout').element as HTMLElement).style.width)).toBeCloseTo(123.6)

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1080 })
    window.dispatchEvent(new Event('resize'))
    await wrapper.vm.$nextTick()
    expect(Number.parseFloat((wrapper.find('.keyboard-layout').element as HTMLElement).style.width)).toBeCloseTo(168.4)

    wrapper.unmount()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight })
  })
})
