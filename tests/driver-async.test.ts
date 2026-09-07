import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createDriverStore } from '@/stores/driver'
import { DeviceSession } from '@/application/DeviceSession'
import { KeyboardDriverService } from '@/application/KeyboardDriverService'
import { DeviceDriverRegistry, type DeviceDriver } from '@/application/DeviceDriverRegistry'
import type { KeyboardDevice } from '@/application/ports'
import type { KeyboardProfile, KeyboardMode } from '@/domain/keyboard'
import type { CustomKeyLighting } from '@/domain/lighting'
import { DEFAULT_LIGHTING_SETTINGS, type LightingSettings } from '@/domain/lighting'
import { DEFAULT_PERFORMANCE_SETTINGS, type KeyPerformanceSettings, type TravelMatrix } from '@/domain/performance'
import { HID_KEY_CATALOG } from '@/domain/keycodes'
import { createAdvancedKeySettings, type AdvancedKeySettings } from '@/domain/advancedKey'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

async function setup() {
  const profile: KeyboardProfile = {
    device: { productName: 'Test', vendorId: 1, productId: 2, firmwareVersion: '1', protocolVersion: '1', runMode: 'app' },
    capabilities: { layers: 1, remap: false, restoreFactory: false, layoutRows: 1, layoutColumns: 2, customLighting: true, performance: true, travelTest: true, pollingRates: [1000] },
    positions: [4, 5].map((sourceCode, column) => ({ id: String(sourceCode), sourceCode, label: String(sourceCode), address: { kind: 'matrix' as const, row: 0, column } })),
    assignments: [], defaultAssignments: [], mode: 'win',
  }
  let disconnect = () => {}
  let modeChanged = (_mode: KeyboardMode) => {}
  const device: KeyboardDevice = {
    profile: { getProfile: async () => profile },
    systemMode: { switchMode: async () => {}, onModeChange(listener) { modeChanged = listener; return () => {} } },
    close() {},
  }
  const session = new DeviceSession(device, HID_KEY_CATALOG)
  const driver: DeviceDriver = {
    manifest: { id: 'test', displayName: 'Test', protocolId: 'test', transportId: 'test', capabilities: ['device-profile'] },
    connect: async (onDisconnect) => { disconnect = onDisconnect; return session },
    reconnectAuthorized: async () => session,
    createDemoSession: () => session,
  }
  const service = new KeyboardDriverService(new DeviceDriverRegistry().register(driver))
  const store = createDriverStore(service)()
  await store.connect()
  return { store, session, profile, disconnect: () => disconnect(), modeChanged: (mode: KeyboardMode) => modeChanged(mode) }
}

describe('driver async context', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each(['resolve', 'reject'] as const)('keeps cached A selected when a pending B read %s', async (outcome) => {
    const { store, session, profile } = await setup()
    profile.capabilities.advancedKey = true
    const cached = createAdvancedKeySettings('tgl', 4, 4)
    store.advancedKey = cached
    const pending = deferred<AdvancedKeySettings>()
    vi.spyOn(session, 'getAdvancedKey').mockReturnValue(pending.promise)
    const reading = store.loadAdvancedKey('5')
    await store.loadAdvancedKey('4')
    if (outcome === 'resolve') pending.resolve(createAdvancedKeySettings('tgl', 5, 5))
    else pending.reject(new Error('stale B failed'))
    await reading
    expect(store.advancedKey).toEqual(cached)
    expect(store.advancedKeyLoading).toBe(false)
    expect(store.error).toBe('')
  })

  it('does not overwrite a verified advanced-key write with an earlier scan', async () => {
    const { store, session, profile } = await setup()
    profile.capabilities.advancedKey = true
    const pending = deferred<Awaited<ReturnType<DeviceSession['getAdvancedKeyTypes']>>>()
    vi.spyOn(session, 'getAdvancedKeyTypes').mockReturnValue(pending.promise)
    const selectedRead = vi.spyOn(session, 'getAdvancedKey')
    const verified = createAdvancedKeySettings('tgl', 4, 4)
    vi.spyOn(session, 'updateAdvancedKey').mockResolvedValue(verified)
    const scanning = store.loadAdvancedKeyTypes()
    await store.updateAdvancedKey(verified)
    pending.resolve({ 4: 'mt' })
    await scanning
    expect(store.advancedKeyTypes).toEqual({ 4: 'TGL' })
    expect(store.advancedKey).toEqual(verified)
    expect(selectedRead).not.toHaveBeenCalled()
  })

  it.each(['update', 'delete'] as const)('does not restore ready after advanced-key %s completes on a disconnected session', async (operation) => {
    const { store, session, profile, disconnect } = await setup()
    profile.capabilities.advancedKey = true
    const pending = deferred<AdvancedKeySettings>()
    vi.spyOn(session, 'updateAdvancedKey').mockReturnValue(pending.promise)
    vi.spyOn(session, 'deleteAdvancedKey').mockReturnValue(pending.promise)
    const writing = operation === 'update'
      ? store.updateAdvancedKey(createAdvancedKeySettings('tgl', 4, 4))
      : store.deleteAdvancedKey(4)
    disconnect()
    pending.resolve({ type: 'none', sourceCode: 4 })
    await writing
    expect(store.status).toBe('disconnected')
    expect(store.advancedKey).toBeUndefined()
    expect(store.advancedKeyTypes).toEqual({})
  })

  it.each(['resolve', 'reject'] as const)('does not revive a disconnected session when connection profile %s', async (outcome) => {
    const { store, session, profile, disconnect } = await setup()
    const pending = deferred<KeyboardProfile>()
    const load = vi.spyOn(session, 'load').mockReturnValue(pending.promise)
    const connecting = store.connect()
    await vi.waitFor(() => expect(load).toHaveBeenCalled())
    disconnect()
    if (outcome === 'resolve') pending.resolve({ ...profile, mode: 'mac' })
    else pending.reject(new Error('old profile failed'))
    await connecting
    expect(store.status).toBe('disconnected')
    expect(store.profile?.mode).toBe('win')
    expect(store.message).toBe('')
  })

  it.each(['resolve', 'reject'] as const)('keeps disconnect state when a lighting write later %s', async (outcome) => {
    const { store, session, profile, disconnect } = await setup()
    profile.capabilities.lighting = true
    const pending = deferred<LightingSettings>()
    vi.spyOn(session, 'updateLighting').mockReturnValue(pending.promise)
    const writing = store.updateLighting(DEFAULT_LIGHTING_SETTINGS)
    expect(store.status).toBe('writing')
    disconnect()
    if (outcome === 'resolve') pending.resolve(DEFAULT_LIGHTING_SETTINGS)
    else pending.reject(new Error('late write failure'))
    await writing
    expect(store.status).toBe('disconnected')
    expect(store.lighting).toBeUndefined()
    expect(store.error).toContain('断开')
  })

  it('merges a verified custom lighting write without losing untouched keys', async () => {
    const { store, session } = await setup()
    store.customLighting = [{ sourceCode: 4, color: '#000000' }, { sourceCode: 5, color: '#FFFFFF' }]
    vi.spyOn(session, 'updateCustomLighting').mockResolvedValue([{ sourceCode: 4, color: '#FF0000' }])
    await store.updateCustomLighting([{ sourceCode: 4, color: '#FF0000' }])
    expect(store.customLighting).toEqual([{ sourceCode: 4, color: '#FF0000' }, { sourceCode: 5, color: '#FFFFFF' }])
    expect(store.status).toBe('ready')
  })

  it.each(['resolve', 'reject'] as const)('ignores custom lighting %s after disconnect', async (outcome) => {
    const { store, session, disconnect } = await setup()
    const pending = deferred<CustomKeyLighting[]>()
    vi.spyOn(session, 'getCustomLighting').mockReturnValue(pending.promise)
    const reading = store.loadCustomLighting()
    disconnect()
    const disconnectMessage = store.error
    if (outcome === 'resolve') pending.resolve([{ sourceCode: 4, color: '#FFFFFF' }])
    else pending.reject(new Error('stale failure'))
    await reading
    expect(store.customLighting).toEqual([])
    expect(store.customLightingLoading).toBe(false)
    expect(store.status).toBe('disconnected')
    expect(store.error).toBe(disconnectMessage)
  })

  it('does not let an old finally clear a newer lighting request after reconnect', async () => {
    const { store, session } = await setup()
    const old = deferred<CustomKeyLighting[]>()
    const current = deferred<CustomKeyLighting[]>()
    vi.spyOn(session, 'getCustomLighting').mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const first = store.loadCustomLighting()
    await store.connect()
    const second = store.loadCustomLighting()
    old.resolve([{ sourceCode: 4, color: '#FF0000' }])
    await first
    expect(store.customLightingLoading).toBe(true)
    expect(store.customLighting).toEqual([])
    current.resolve([{ sourceCode: 4, color: '#00FF00' }])
    await second
    expect(store.customLighting).toEqual([{ sourceCode: 4, color: '#00FF00' }])
    expect(store.customLightingLoading).toBe(false)
  })

  it('loads the newly selected key while the previous key is pending', async () => {
    const { store, session } = await setup()
    const old = deferred<KeyPerformanceSettings>()
    const current = { ...DEFAULT_PERFORMANCE_SETTINGS, sourceCode: 5 }
    const read = vi.spyOn(session, 'getPerformance').mockReturnValueOnce(old.promise).mockResolvedValueOnce(current)
    const first = store.loadPerformance('4')
    await store.loadPerformance('5')
    expect(read).toHaveBeenCalledTimes(2)
    old.resolve({ ...DEFAULT_PERFORMANCE_SETTINGS, sourceCode: 4 })
    await first
    expect(store.performanceSettings).toEqual(current)
    expect(store.performanceLoading).toBe(false)
  })

  it('invalidates the pending key read even when the new key is cached', async () => {
    const { store, session } = await setup()
    const pending = deferred<KeyPerformanceSettings>()
    const cached = { ...DEFAULT_PERFORMANCE_SETTINGS, sourceCode: 5 }
    store.performanceBySourceCode = { 5: cached }
    vi.spyOn(session, 'getPerformance').mockReturnValue(pending.promise)
    const reading = store.loadPerformance('4')
    await store.loadPerformance('5')
    pending.resolve({ ...DEFAULT_PERFORMANCE_SETTINGS, sourceCode: 4 })
    await reading
    expect(store.performanceSettings).toEqual(cached)
  })

  it('discards travel and polling rate results after disconnect', async () => {
    const { store, session, disconnect } = await setup()
    const travel = deferred<TravelMatrix>()
    const rate = deferred<1000>()
    vi.spyOn(session, 'getTravelMatrix').mockReturnValue(travel.promise)
    vi.spyOn(session, 'getPollingRate').mockReturnValue(rate.promise)
    const reads = [store.readTravelMatrix(), store.loadPollingRate()]
    disconnect()
    travel.resolve([[1]])
    rate.resolve(1000)
    await Promise.all(reads)
    expect(store.travelMatrix).toEqual([])
    expect(store.pollingRate).toBeUndefined()
    expect(store.status).toBe('disconnected')
  })

  it('does not publish an external mode profile after disconnect', async () => {
    const { store, session, profile, disconnect, modeChanged } = await setup()
    const pending = deferred<KeyboardProfile>()
    vi.spyOn(session, 'load').mockReturnValue(pending.promise)
    modeChanged('mac')
    expect(store.status).toBe('reading')
    disconnect()
    pending.resolve({ ...profile, mode: 'mac' })
    await pending.promise
    await Promise.resolve()
    expect(store.profile?.mode).toBe('win')
    expect(store.status).toBe('disconnected')
  })
})
