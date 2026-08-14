import { describe, expect, it } from 'vitest'
import { DeviceSession } from '@/application/DeviceSession'
import { KeyboardDriverService } from '@/application/KeyboardDriverService'
import type { KeyboardProtocol } from '@/application/ports'
import { DeviceDriverRegistry, type DeviceDriver } from '@/devices/DeviceDriver'

const protocol = (): KeyboardProtocol => ({
  getProfile: async () => ({
    device: { productName: 'Fake', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1', runMode: 'app' },
    capabilities: { layers: 1, remap: true, restoreFactory: true, layoutRows: 0, layoutColumns: 0 },
    positions: [], assignments: [],
  }),
  writeAssignments: async () => undefined,
  save: async () => undefined,
  reload: async () => undefined,
  restoreFactory: async () => undefined,
  close: () => undefined,
})

const fakeDriver = (id: string): DeviceDriver => ({
  id,
  displayName: id,
  connect: async () => new DeviceSession(protocol()),
  reconnectAuthorized: async () => new DeviceSession(protocol()),
  createDemoSession: () => new DeviceSession(protocol()),
})

describe('replaceable architecture', () => {
  it('registers and selects independent keyboard drivers', () => {
    const registry = new DeviceDriverRegistry().register(fakeDriver('alpha')).register(fakeDriver('beta'))
    expect(registry.get('beta').displayName).toBe('beta')
    expect(registry.defaultDriver.id).toBe('alpha')
  })

  it('connects through the application facade without concrete UI dependencies', async () => {
    const service = new KeyboardDriverService(new DeviceDriverRegistry().register(fakeDriver('test')))
    const session = await service.connect({ demo: true })
    expect((await session.load()).device.productName).toBe('Fake')
    await service.disconnect()
    expect(service.session).toBeUndefined()
  })
})
