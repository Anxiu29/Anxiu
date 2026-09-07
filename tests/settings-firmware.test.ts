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
  it('provides the device download independently of hardware busy state', async () => {
    const wrapper = await openFirmware({ firmwareDownload: firmware, busy: true })
    const link = wrapper.get('.firmware-download-link')
    expect(link.attributes('href')).toBe(firmware.url)
    expect(link.attributes('download')).toBe(firmware.fileName)
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
    expect(link.attributes('disabled')).toBeUndefined()
    expect(wrapper.get('.firmware-download-card').text()).toContain('1.0.1')
    wrapper.unmount()
  })

  it('does not invent a download when the device has no firmware resource', async () => {
    const wrapper = await openFirmware()
    expect(wrapper.find('.firmware-download-link').exists()).toBe(false)
    expect(wrapper.get('.firmware-status').text()).toContain('不支持刷写')
    wrapper.unmount()
  })

  it('requires an actual driver capability rather than only a profile flag', async () => {
    const wrapper = await openFirmware({ profile: { ...profile, capabilities: { ...profile.capabilities, firmwareUpdate: true } } })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['firmware'], 'firmware.bin')], configurable: true })
    await input.trigger('change')
    expect(wrapper.get('.firmware-upload-card').text()).toContain('尚未验证设备适配性')
    expect(wrapper.get('.firmware-footer button').attributes('disabled')).toBeDefined()
    Object.defineProperty(input.element, 'files', { value: [new File([], 'empty.bin')], configurable: true })
    await input.trigger('change')
    expect(wrapper.get('.firmware-error').text()).toContain('文件为空')
    wrapper.unmount()
  })

  it('requires file and explicit confirmation, emits selected file, and locks during update', async () => {
    const wrapper = await openFirmware({ canUpgradeFirmware: true })
    const file = new File(['firmware'], 'official.bin')
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(wrapper.get('.firmware-footer button').attributes('disabled')).toBeDefined()
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('.firmware-footer button').trigger('click')
    expect(wrapper.emitted('upgrade-firmware')).toEqual([[file]])
    await wrapper.setProps({ busy: true })
    expect(wrapper.get('.firmware-footer button').attributes('disabled')).toBeDefined()
    expect(input.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('keeps the authorization action usable while firmware owns the device', async () => {
    const wrapper = await openFirmware({ busy: true, firmwareProgress: { stage: 'authorizing', current: 0, total: 512, message: '等待授权' } })
    await wrapper.findAll('button').find((button) => button.text() === '授权升级设备')!.trigger('click')
    expect(wrapper.emitted('authorize-firmware')).toHaveLength(1)
    wrapper.unmount()
  })
})
