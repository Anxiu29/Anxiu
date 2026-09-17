import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createDriverStore } from '@/stores/driver'
import { DeviceSession } from '@/application/DeviceSession'
import { KeyboardDriverService } from '@/application/KeyboardDriverService'
import { DeviceDriverRegistry, type DeviceDriver } from '@/application/DeviceDriverRegistry'
import { HID_KEY_CATALOG } from '@/domain/keycodes'
import type { KeyboardProfile } from '@/domain/keyboard'

function setup() {
  const profile: KeyboardProfile = {
    device: { productName: 'Test', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1', runMode: 'app' },
    capabilities: { layers: 1, remap: false, restoreFactory: false, layoutRows: 0, layoutColumns: 0 },
    positions: [], assignments: [], defaultAssignments: [],
  }
  const close = vi.fn()
  const createSession = () => new DeviceSession({ profile: { getProfile: async () => profile }, close }, HID_KEY_CATALOG)
  const validateFirmware = vi.fn(async () => {})
  const upgradeFirmware = vi.fn<NonNullable<DeviceDriver['upgradeFirmware']>>(async () => {})
  const requestUpgradeDevice = vi.fn(async () => ({} as HIDDevice))
  const driver: DeviceDriver = {
    manifest: { id: 'test', displayName: 'Test', protocolId: 'test', transportId: 'test', capabilities: ['firmware-update'] },
    connect: async () => createSession(), reconnectAuthorized: async () => createSession(), createDemoSession: createSession,
    downloadFirmware: vi.fn(async () => new Uint8Array(512)),
    validateFirmware, upgradeFirmware, requestUpgradeDevice,
  }
  const service = new KeyboardDriverService(new DeviceDriverRegistry().register(driver))
  const store = createDriverStore(service)()
  return { service, store, close, validateFirmware, upgradeFirmware, requestUpgradeDevice }
}
const file = () => new File([new Uint8Array(512)], 'firmware.bin')

describe('firmware session ownership', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('rejects demo upgrades without closing the demo session', async () => {
    const { store, close, upgradeFirmware } = setup()
    await store.connect(true)
    await store.upgradeFirmware(file())
    expect(close).not.toHaveBeenCalled()
    expect(upgradeFirmware).not.toHaveBeenCalled()
    expect(store.canUpgradeFirmware).toBe(false)
  })

  it('validates before closing the active device and preserves it on invalid files', async () => {
    const { store, service, close, validateFirmware, upgradeFirmware } = setup()
    await store.connect()
    const original = service.session
    validateFirmware.mockRejectedValue(new Error('bad image'))
    await store.upgradeFirmware(file())
    expect(service.session).toBe(original)
    expect(close).not.toHaveBeenCalled()
    expect(upgradeFirmware).not.toHaveBeenCalled()
    expect(store.firmwareUpdating).toBe(false)
    expect(store.firmwareProgress?.message).toBe('bad image')
    expect(store.firmwareLogAvailable).toBe(true)
    expect(JSON.parse(store.exportFirmwareLog()).events.at(-1)).toMatchObject({ kind: 'result', outcome: 'failure', stage: 'validating', message: 'bad image' })
  })

  it('closes ordinary traffic before flashing, blocks duplicate upgrades and reconnects afterward', async () => {
    const { store, close, upgradeFirmware, service } = setup()
    await store.connect()
    const old = service.session
    upgradeFirmware.mockImplementation(async () => {
      expect(close).toHaveBeenCalledOnce()
      expect(service.session).toBeUndefined()
      expect(store.status).toBe('writing')
      await store.upgradeFirmware(file())
    })
    await store.upgradeFirmware(file())
    expect(upgradeFirmware).toHaveBeenCalledOnce()
    expect(service.session).not.toBe(old)
    expect(store.status).toBe('ready')
    expect(store.firmwareUpdating).toBe(false)
    expect(store.firmwareProgress?.stage).toBe('complete')
    expect(JSON.parse(store.exportFirmwareLog()).events.at(-1)).toMatchObject({ kind: 'result', outcome: 'success' })
  })

  it('upgrades online without a local file', async () => {
    const { store, upgradeFirmware } = setup()
    await store.connect()
    await store.upgradeFirmware()
    expect(upgradeFirmware).toHaveBeenCalledOnce()
    expect(store.firmwareProgress?.stage).toBe('complete')
  })
  it('preserves the session on network failure', async () => {
    const { store, service, close, upgradeFirmware } = setup()
    await store.connect()
    const original = service.session
    vi.spyOn(service, 'downloadFirmware').mockRejectedValue(new Error('network failed'))
    await store.upgradeFirmware()
    expect(service.session).toBe(original)
    expect(close).not.toHaveBeenCalled()
    expect(upgradeFirmware).not.toHaveBeenCalled()
    expect(store.firmwareUpdating).toBe(false)
    expect(store.firmwareProgress?.message).toBe('network failed')
  })
  it('waits for an explicit authorization click, then passes the selected device to the updater', async () => {
    const { store, upgradeFirmware, requestUpgradeDevice } = setup()
    await store.connect()
    upgradeFirmware.mockImplementation(async (_, options) => {
      options.onProgress({ stage: 'authorizing', current: 0, total: 512, message: 'authorize' })
      const waiting = options.authorizeDevice()
      expect(requestUpgradeDevice).not.toHaveBeenCalled()
      await store.authorizeFirmwareDevice()
      expect(await waiting).toEqual({})
    })
    await store.upgradeFirmware(file())
    expect(requestUpgradeDevice).toHaveBeenCalledOnce()
    expect(store.status).toBe('ready')
  })
})
