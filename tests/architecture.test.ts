import { describe, expect, it } from 'vitest'
import { DeviceSession } from '@/application/DeviceSession'
import { KeyboardDriverService } from '@/application/KeyboardDriverService'
import type { KeyboardDevice } from '@/application/ports'
import { DeviceDriverRegistry, type DeviceDriver } from '@/devices/DeviceDriver'

const device = (): KeyboardDevice => ({
  profile: { getProfile: async () => ({
    device: { productName: 'Fake', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1', runMode: 'app' },
    capabilities: { layers: 1, remap: true, restoreFactory: true, layoutRows: 0, layoutColumns: 0 },
    positions: [], assignments: [],
  }) },
  keymap: { writeAssignments: async () => undefined },
  configuration: { save: async () => undefined, reload: async () => undefined },
  factoryReset: { restoreFactory: async () => undefined },
  close: () => undefined,
})

const fakeDriver = (id: string): DeviceDriver => ({
  manifest: { id, displayName: id, protocolId: 'fake', transportId: 'fake', capabilities: ['device-profile'] },
  connect: async () => new DeviceSession(device()),
  reconnectAuthorized: async () => new DeviceSession(device()),
  createDemoSession: () => new DeviceSession(device()),
})

describe('replaceable architecture', () => {
  it('registers and selects independent keyboard drivers', () => {
    const registry = new DeviceDriverRegistry().register(fakeDriver('alpha')).register(fakeDriver('beta'))
    expect(registry.get('beta').manifest.displayName).toBe('beta')
    expect(registry.defaultDriver.manifest.id).toBe('alpha')
  })

  it('connects through the application facade without concrete UI dependencies', async () => {
    const service = new KeyboardDriverService(new DeviceDriverRegistry().register(fakeDriver('test')))
    const session = await service.connect({ demo: true })
    expect((await session.load()).device.productName).toBe('Fake')
    await service.disconnect()
    expect(service.session).toBeUndefined()
  })

  it('allows a read-only device to omit unsupported capabilities', async () => {
    const readOnly = new DeviceSession({ profile: device().profile, close: () => undefined })
    await readOnly.load()
    await expect(readOnly.reload()).rejects.toThrow('不支持重新加载配置')
    await expect(readOnly.restoreFactory()).rejects.toThrow('不支持恢复出厂设置')
  })
})
