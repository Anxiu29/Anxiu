// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LightingWorkspace from '@/components/LightingWorkspace.vue'
import type { KeyboardProfile } from '@/domain/keyboard'
import type { LightingSettings } from '@/domain/lighting'

const profile: KeyboardProfile = {
  device: { productName: 'Test', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1.0.7', runMode: 'app' },
  capabilities: { layers: 1, remap: true, restoreFactory: true, lighting: true, customLighting: true, layoutRows: 1, layoutColumns: 2 },
  positions: [
    { id: '0-0', sourceCode: 4, label: 'A', address: { kind: 'matrix', row: 0, column: 0 } },
    { id: '0-1', sourceCode: 5, label: 'B', address: { kind: 'matrix', row: 0, column: 1 } },
  ],
  defaultAssignments: [],
  assignments: [],
}
const settings = (mode: number, type: LightingSettings['type']): LightingSettings => ({ open: true, direction: true, superResponse: false, speed: 3, colors: ['#FF0000', '#00FF00'], mode, luminance: 4, sleepDelay: 0, staticColor: 0, type, dynamicColorId: 0 })
const mountWorkspace = (lighting: LightingSettings) => mount(LightingWorkspace, {
  props: {
    settings: lighting,
    customLighting: [{ sourceCode: 4, color: '#000000' }, { sourceCode: 5, color: '#000000' }],
    customLightingLoading: false,
    status: 'ready',
    profile,
    assignments: [],
    keyLabels: { 4: 'A', 5: 'B' },
    lightingModes: [],
    lightingRanges: { luminance: { min: 0, max: 4, step: 1 }, speed: { min: 0, max: 4, step: 1 } },
  },
})

describe('LightingWorkspace custom selection', () => {
  it('sweep-selects multiple keys and applies one color to all selected keys', async () => {
    const originalSetPointerCapture = HTMLElement.prototype.setPointerCapture
    const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
    const wrapper = mountWorkspace(settings(21, 'custom'))
    const keys = wrapper.findAll('.keycap')
    const originalElementFromPoint = document.elementFromPoint
    document.elementFromPoint = vi.fn(() => keys[1]!.element)

    await keys[0]!.trigger('pointerdown', { button: 0, pointerId: 7, clientX: 10, clientY: 10 })
    await wrapper.find('.lighting-keyboard-preview').trigger('pointermove', { pointerId: 7, clientX: 20, clientY: 10 })
    expect(wrapper.find('.lighting-colors').text()).toContain('已选择 2 个按键')

    await wrapper.find('.lighting-swatch').trigger('click')
    expect(wrapper.emitted('update-custom')?.[0]?.[0]).toEqual([
      { sourceCode: 4, color: '#FF0000' },
      { sourceCode: 5, color: '#FF0000' },
    ])
    vi.restoreAllMocks()
    if (originalSetPointerCapture) HTMLElement.prototype.setPointerCapture = originalSetPointerCapture
    else delete (HTMLElement.prototype as Partial<HTMLElement>).setPointerCapture
    if (originalHasPointerCapture) HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture
    else delete (HTMLElement.prototype as Partial<HTMLElement>).hasPointerCapture
    if (originalElementFromPoint) document.elementFromPoint = originalElementFromPoint
    else delete (document as Partial<Document>).elementFromPoint
  })

  it('disables color editing for dynamic effects', () => {
    const wrapper = mountWorkspace(settings(2, 'dynamic'))
    expect(wrapper.find('.lighting-colors').text()).toContain('当前动态灯效使用固件预设颜色，不能修改')
    expect(wrapper.find('.lighting-swatch').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.lighting-rgb-fields input').attributes('disabled')).toBeDefined()
  })

  it('selects static palette slots and exposes the firmware colorful mode', async () => {
    const wrapper = mountWorkspace({ ...settings(0, 'static'), staticColor: 1 })
    expect(wrapper.findAll('.lighting-swatch')[1]!.classes()).toContain('active')

    await wrapper.findAll('.lighting-swatch')[0]!.trigger('click')
    expect(wrapper.emitted('update')?.[0]?.[0]).toMatchObject({ staticColor: 0 })

    await wrapper.find('.lighting-rainbow-option').trigger('click')
    expect(wrapper.emitted('update')?.[1]?.[0]).toMatchObject({ staticColor: 7 })
  })

  it('applies the palette cyclically to the custom-lighting selection', async () => {
    const originalSetPointerCapture = HTMLElement.prototype.setPointerCapture
    const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
    const wrapper = mountWorkspace(settings(21, 'custom'))
    const keys = wrapper.findAll('.keycap')
    const originalElementFromPoint = document.elementFromPoint
    document.elementFromPoint = vi.fn(() => keys[1]!.element)
    await keys[0]!.trigger('pointerdown', { button: 0, pointerId: 8, clientX: 10, clientY: 10 })
    await wrapper.find('.lighting-keyboard-preview').trigger('pointermove', { pointerId: 8, clientX: 20, clientY: 10 })

    await wrapper.find('.lighting-rainbow-option').trigger('click')
    expect(wrapper.emitted('update-custom')?.[0]?.[0]).toEqual([
      { sourceCode: 4, color: '#FF0000' },
      { sourceCode: 5, color: '#00FF00' },
    ])
    vi.restoreAllMocks()
    if (originalSetPointerCapture) HTMLElement.prototype.setPointerCapture = originalSetPointerCapture
    else delete (HTMLElement.prototype as Partial<HTMLElement>).setPointerCapture
    if (originalHasPointerCapture) HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture
    else delete (HTMLElement.prototype as Partial<HTMLElement>).hasPointerCapture
    if (originalElementFromPoint) document.elementFromPoint = originalElementFromPoint
    else delete (document as Partial<Document>).elementFromPoint
  })
})
