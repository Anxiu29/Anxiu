// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SettingsWorkspace from '@/components/SettingsWorkspace.vue'
import type { KeyboardProfile } from '@/domain/keyboard'
import type { FirmwareDownload } from '@/ui/DevicePresentation'

const profile: KeyboardProfile = {
  device: { productName: 'Test', vendorId: 1, productId: 2, firmwareVersion: '1.0.0', protocolVersion: '1', runMode: 'app' },
  capabilities: { layers: 1, remap: false, restoreFactory: false, layoutRows: 0, layoutColumns: 0 },
  positions: [], defaultAssignments: [], assignments: [],
}
const firmware: FirmwareDownload = {
  url: 'https://example.com/firmware.bin', fileName: 'firmware.bin', version: '1.0.1', target: 'Test board',
}

async function openFirmware(props = {}) {
  const wrapper = mount(SettingsWorkspace, { props: { profile, ...props } })
  await wrapper.findAll('.settings-navigation button')[2]!.trigger('click')
  return wrapper
}

describe('firmware settings', () => {
  it('exports available diagnostic logs even while an upgrade is busy', async () => {
    const wrapper = await openFirmware({ busy: true, firmwareLogAvailable: true })
    const button = wrapper.findAll('button').find((item) => item.text() === '导出升级诊断日志')!
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    expect(wrapper.emitted('export-firmware-log')).toHaveLength(1)
    wrapper.unmount()
  })
  it('downloads automatically without a file picker and requires confirmation', async () => {
    const wrapper = await openFirmware({ firmwareDownload: firmware, canUpgradeFirmware: true })
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    expect(wrapper.get('.firmware-download-card').text()).toContain('1.0.1')
    expect(wrapper.get('.firmware-footer button').attributes('disabled')).toBeDefined()
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('.firmware-footer button').trigger('click')
    expect(wrapper.emitted('upgrade-firmware')).toEqual([[undefined]])
    await wrapper.setProps({ busy: true })
    expect(wrapper.get('.firmware-footer button').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('requires a resource and driver capability', async () => {
    const wrapper = await openFirmware({ canUpgradeFirmware: true })
    await wrapper.get('input[type="checkbox"]').setValue(true)
    expect(wrapper.get('.firmware-footer button').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ firmwareDownload: firmware, canUpgradeFirmware: false })
    expect(wrapper.get('.firmware-footer button').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('selects local files, resets confirmation and forwards the file through the workspace', async () => {
    const wrapper = await openFirmware({ firmwareDownload: firmware, canUpgradeFirmware: true })
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('.fw-modes button:last-child').trigger('click')
    expect(wrapper.get('.firmware-footer button').attributes('disabled')).toBeDefined()
    const input = wrapper.get('input[type="file"]')
    const file = new File(['firmware'], 'official.bin')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('.firmware-footer button').trigger('click')
    expect(wrapper.emitted('upgrade-firmware')).toEqual([[file]])
    await wrapper.setProps({ busy: true })
    expect(input.attributes('disabled')).toBeDefined()
    expect(wrapper.get('.fw-modes button').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('rejects empty or non-bin files and retains selection across settings navigation', async () => {
    const wrapper = await openFirmware({ canUpgradeFirmware: true })
    await wrapper.get('.fw-modes button:last-child').trigger('click')
    const input = wrapper.get('input[type="file"]')
    for (const file of [new File([], 'empty.bin'), new File(['bad'], 'wrong.txt')]) {
      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
      await input.trigger('change')
      expect(wrapper.get('[role="alert"]').text()).toBeTruthy()
      expect(wrapper.get('.firmware-footer button').attributes('disabled')).toBeDefined()
    }
    const file = new File(['ok'], 'official.bin')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.findAll('.settings-navigation button')[0]!.trigger('click')
    await wrapper.findAll('.settings-navigation button')[2]!.trigger('click')
    expect(wrapper.get('.fw-file-picker').text()).toContain('official.bin')
    await wrapper.get('.firmware-footer button').trigger('click')
    expect(wrapper.emitted('upgrade-firmware')).toEqual([[file]])
    wrapper.unmount()
  })
  it('keeps the authorization action usable while firmware owns the device', async () => {
    const wrapper = await openFirmware({ busy: true, firmwareProgress: { stage: 'authorizing', current: 0, total: 512, message: '等待授权' } })
    await wrapper.findAll('button').find((button) => button.text() === '授权升级设备')!.trigger('click')
    expect(wrapper.emitted('authorize-firmware')).toHaveLength(1)
    wrapper.unmount()
  })

})
