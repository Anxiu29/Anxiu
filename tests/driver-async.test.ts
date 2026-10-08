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
import {
  DEFAULT_PERFORMANCE_SETTINGS,
  type KeyPerformanceSettings,
  type TravelMatrix,
} from '@/domain/performance'
import { HID_KEY_CATALOG } from '@/domain/keycodes'
import { createAdvancedKeySettings, type AdvancedKeySettings } from '@/domain/advancedKey'
import { createEmptyMacro, type MacroSettings } from '@/domain/macro'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

async function setup() {
  const profile: KeyboardProfile = {
    device: {
      productName: 'Test',
      vendorId: 1,
      productId: 2,
      firmwareVersion: '1',
      protocolVersion: '1',
      runMode: 'app',
    },
    capabilities: {
      layers: 1,
      remap: false,
      restoreFactory: false,
      layoutRows: 1,
      layoutColumns: 2,
      customLighting: true,
      performance: true,
      travelTest: true,
      pollingRates: [1000],
    },
    positions: [4, 5].map((sourceCode, column) => ({
      id: String(sourceCode),
      sourceCode,
      label: String(sourceCode),
      address: { kind: 'matrix' as const, row: 0, column },
    })),
    assignments: [],
    defaultAssignments: [],
    mode: 'win',
  }
  let disconnect = () => {}
  let modeChanged = (_mode: KeyboardMode) => {}
  const device: KeyboardDevice = {
    profile: { getProfile: async () => profile },
    systemMode: {
      switchMode: async () => {},
      onModeChange(listener) {
        modeChanged = listener
        return () => {}
      },
    },
    close() {},
  }
  const session = new DeviceSession(device, HID_KEY_CATALOG)
  const driver: DeviceDriver = {
    manifest: {
      kind: 'keyboard',
      protocolFamily: 'test',
      id: 'test',
      displayName: 'Test',
      protocolId: 'test',
      transportId: 'test',
      capabilities: ['device-profile'],
    },
    connect: async (onDisconnect) => {
      disconnect = onDisconnect
      return session
    },
    reconnectAuthorized: async () => session,
    createDemoSession: () => session,
  }
  const service = new KeyboardDriverService(new DeviceDriverRegistry().register(driver))
  const store = createDriverStore(service)()
  await store.connect()
  return {
    store,
    session,
    profile,
    disconnect: () => disconnect(),
    modeChanged: (mode: KeyboardMode) => modeChanged(mode),
  }
}

describe('driver async context', () => {
  beforeEach(() => setActivePinia(createPinia()))

  describe.each([
    'assign',
    'reset-key',
    'reset-all',
    'reload',
    'mode',
    'configuration',
    'factory',
  ] as const)('%s ordinary operation', (operation) => {
    it.each(['resolve', 'reject'] as const)(
      'ignores a late %s after disconnect',
      async (outcome) => {
        const { store, session, profile, disconnect } = await setup()
        const pending = deferred<void>()
        const nextProfile = { ...profile, mode: 'mac' as const }
        const result = { profile: nextProfile, changedAssignments: 1 }
        vi.spyOn(session, 'updateAndSave').mockImplementation(async () => {
          await pending.promise
          return result
        })
        vi.spyOn(session, 'restoreKeyDefaultAndSave').mockImplementation(async () => {
          await pending.promise
          return result
        })
        vi.spyOn(session, 'restoreAllKeyDefaults').mockImplementation(async () => {
          await pending.promise
          return result
        })
        vi.spyOn(session, 'reload').mockImplementation(async () => {
          await pending.promise
          return nextProfile
        })
        vi.spyOn(session, 'switchMode').mockImplementation(async () => {
          await pending.promise
          return nextProfile
        })
        vi.spyOn(session, 'switchConfiguration').mockImplementation(async () => {
          await pending.promise
          return nextProfile
        })
        vi.spyOn(session, 'restoreFactory').mockImplementation(() => pending.promise)
        const running =
          operation === 'assign'
            ? store.assignKey(4)
            : operation === 'reset-key'
              ? store.restoreKeyDefault('4', 0)
              : operation === 'reset-all'
                ? store.restoreAllKeyDefaults()
                : operation === 'reload'
                  ? store.reload()
                  : operation === 'mode'
                    ? store.selectMode('mac')
                    : operation === 'configuration'
                      ? store.selectConfiguration(2)
                      : store.restoreFactory()
        expect(['reading', 'writing']).toContain(store.status)
        disconnect()
        const error = store.error
        if (outcome === 'resolve') pending.resolve()
        else pending.reject(new Error('late failure'))
        await running
        expect(store.status).toBe('disconnected')
        expect(store.profile).toEqual(profile)
        expect(store.error).toBe(error)
        expect(store.message).toBe('')
        expect(store.activeConfiguration).toBe(1)
      },
    )
  })

  it('does not publish key-save progress after disconnect', async () => {
    const { store, session, profile, disconnect } = await setup()
    const pending = deferred<void>()
    let notify: import('@/application/SaveConfiguration').SaveProgressObserver = () => {}
    vi.spyOn(session, 'updateAndSave').mockImplementation(
      async (_position, _layer, _code, _category, onProgress) => {
        notify = onProgress!
        await pending.promise
        return { profile, changedAssignments: 1 }
      },
    )
    const writing = store.assignKey(4)
    disconnect()
    notify({ phase: 'completed', completed: 1, total: 1 })
    pending.resolve()
    await writing
    expect(store.saveProgress).toBeUndefined()
    expect(store.status).toBe('disconnected')
  })

  describe.each(['single', 'batch', 'rate', 'start', 'finish'] as const)(
    '%s performance write',
    (operation) => {
      it.each(['resolve', 'reject'] as const)(
        'ignores a late %s after disconnect',
        async (outcome) => {
          const { store, session, profile, disconnect } = await setup()
          profile.capabilities.calibration = true
          store.calibrationActive = true
          const pending = deferred<void>()
          vi.spyOn(session, 'updatePerformance').mockImplementation(async (settings) => {
            await pending.promise
            return settings
          })
          vi.spyOn(session, 'updatePerformances').mockImplementation(async (settings) => {
            await pending.promise
            return settings
          })
          vi.spyOn(session, 'updatePollingRate').mockImplementation(async (rate) => {
            await pending.promise
            return rate
          })
          vi.spyOn(session, 'startCalibration').mockImplementation(() => pending.promise)
          vi.spyOn(session, 'finishCalibration').mockImplementation(() => pending.promise)
          const settings = { ...DEFAULT_PERFORMANCE_SETTINGS, sourceCode: 4 }
          const writing =
            operation === 'single'
              ? store.updatePerformance(settings)
              : operation === 'batch'
                ? store.updatePerformances([settings])
                : operation === 'rate'
                  ? store.updatePollingRate(1000)
                  : operation === 'start'
                    ? store.startCalibration()
                    : store.finishCalibration()
          expect(store.status).toBe('writing')
          disconnect()
          const disconnectedError = store.error
          if (outcome === 'resolve') pending.resolve()
          else pending.reject(new Error('late device failure'))
          await writing
          expect(store.status).toBe('disconnected')
          expect(store.error).toBe(disconnectedError)
          expect(store.message).toBe('')
          expect(store.performanceSettings).toBeUndefined()
          expect(store.performanceBySourceCode).toEqual({})
          expect(store.pollingRate).toBeUndefined()
          expect(store.calibrationActive).toBe(false)
        },
      )
    },
  )

  it('does not let a pre-write performance read overwrite the verified write', async () => {
    const { store, session } = await setup()
    const pending = deferred<KeyPerformanceSettings>()
    vi.spyOn(session, 'getPerformance').mockReturnValue(pending.promise)
    const reading = store.loadPerformance('4')
    const verified = { ...DEFAULT_PERFORMANCE_SETTINGS, sourceCode: 4 }
    vi.spyOn(session, 'updatePerformance').mockResolvedValue(verified)
    await store.updatePerformance(verified)
    pending.resolve({ ...DEFAULT_PERFORMANCE_SETTINGS, sourceCode: 5 })
    await reading
    expect(store.performanceSettings).toEqual(verified)
    expect(store.performanceBySourceCode).toEqual({ 4: verified })
    expect(store.performanceLoading).toBe(false)
    expect(store.status).toBe('ready')
  })

  it('blocks a second calibration completion while the first request is pending', async () => {
    const { store, session, profile } = await setup()
    profile.capabilities.calibration = true
    store.calibrationActive = true
    const pending = deferred<void>()
    const finish = vi.spyOn(session, 'finishCalibration').mockReturnValue(pending.promise)
    const first = store.finishCalibration()
    await store.finishCalibration()
    expect(finish).toHaveBeenCalledOnce()
    pending.resolve()
    await first
    expect(store.calibrationActive).toBe(false)
    expect(store.status).toBe('ready')
  })

  it('stops a macro scan after the in-flight response when disconnected', async () => {
    const { store, session, profile, disconnect } = await setup()
    profile.capabilities.macro = true
    const pending = deferred<MacroSettings>()
    const read = vi.spyOn(session, 'getMacro').mockReturnValue(pending.promise)
    const scanning = store.loadMacrosFromDevice()
    disconnect()
    pending.resolve(createEmptyMacro())
    await scanning
    expect(read).toHaveBeenCalledTimes(1)
    expect(store.macroSlots).toEqual({})
    expect(store.macroLoading).toBe(false)
  })

  it('prevents an old macro scan from replacing a newly saved local draft', async () => {
    const { store, session, profile } = await setup()
    profile.capabilities.macro = true
    const pending = deferred<MacroSettings>()
    const read = vi.spyOn(session, 'getMacro').mockReturnValue(pending.promise)
    const scanning = store.loadMacrosFromDevice()
    const draft = { ...createEmptyMacro(), actions: [{ keyCode: 4, pressed: true, delay: 10 }] }
    await store.updateMacro(draft)
    pending.resolve(createEmptyMacro())
    await scanning
    expect(read).toHaveBeenCalledTimes(1)
    expect(store.macroSlots[0]?.actions).toEqual(draft.actions)
    expect(store.messageWarning).toBe(true)
  })

  it.each(['resolve', 'reject'] as const)(
    'stops multi-key macro writes when a disconnected request %s',
    async (outcome) => {
      const { store, session, profile, disconnect } = await setup()
      profile.capabilities.macro = true
      const pending = deferred<MacroSettings>()
      const write = vi.spyOn(session, 'updateMacro').mockReturnValue(pending.promise)
      const settings = { ...createEmptyMacro(0, 4), boundSourceCodes: [4, 5] }
      const writing = store.updateMacro(settings)
      disconnect()
      if (outcome === 'resolve') pending.resolve(settings)
      else pending.reject(new Error('stale write'))
      await writing
      expect(write).toHaveBeenCalledTimes(1)
      expect(store.status).toBe('disconnected')
      expect(store.error).toContain('断开')
      expect(store.macroSlots).toEqual({})
    },
  )

  it('stops removing macro bindings after disconnect', async () => {
    const { store, session, profile, disconnect } = await setup()
    profile.capabilities.macro = true
    store.macroSlots = { 0: { ...createEmptyMacro(0, 4), boundSourceCodes: [4, 5] } }
    const pending = deferred<void>()
    const remove = vi.spyOn(session, 'deleteMacroBinding').mockReturnValue(pending.promise)
    const deleting = store.deleteMacro(0)
    disconnect()
    pending.resolve()
    await deleting
    expect(remove).toHaveBeenCalledTimes(1)
    expect(store.status).toBe('disconnected')
    expect(store.message).toBe('')
  })

  it.each(['resolve', 'reject'] as const)(
    'keeps cached A selected when a pending B read %s',
    async (outcome) => {
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
    },
  )

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

  it.each(['update', 'delete'] as const)(
    'does not restore ready after advanced-key %s completes on a disconnected session',
    async (operation) => {
      const { store, session, profile, disconnect } = await setup()
      profile.capabilities.advancedKey = true
      const pending = deferred<AdvancedKeySettings>()
      vi.spyOn(session, 'updateAdvancedKey').mockReturnValue(pending.promise)
      vi.spyOn(session, 'deleteAdvancedKey').mockReturnValue(pending.promise)
      const writing =
        operation === 'update'
          ? store.updateAdvancedKey(createAdvancedKeySettings('tgl', 4, 4))
          : store.deleteAdvancedKey(4)
      disconnect()
      pending.resolve({ type: 'none', sourceCode: 4 })
      await writing
      expect(store.status).toBe('disconnected')
      expect(store.advancedKey).toBeUndefined()
      expect(store.advancedKeyTypes).toEqual({})
    },
  )

  it.each(['resolve', 'reject'] as const)(
    'does not revive a disconnected session when connection profile %s',
    async (outcome) => {
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
    },
  )

  it.each(['resolve', 'reject'] as const)(
    'keeps disconnect state when a lighting write later %s',
    async (outcome) => {
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
    },
  )

  it('merges a verified custom lighting write without losing untouched keys', async () => {
    const { store, session } = await setup()
    store.customLighting = [
      { sourceCode: 4, color: '#000000' },
      { sourceCode: 5, color: '#FFFFFF' },
    ]
    vi.spyOn(session, 'updateCustomLighting').mockResolvedValue([
      { sourceCode: 4, color: '#FF0000' },
    ])
    await store.updateCustomLighting([{ sourceCode: 4, color: '#FF0000' }])
    expect(store.customLighting).toEqual([
      { sourceCode: 4, color: '#FF0000' },
      { sourceCode: 5, color: '#FFFFFF' },
    ])
    expect(store.status).toBe('ready')
  })

  it.each(['resolve', 'reject'] as const)(
    'ignores custom lighting %s after disconnect',
    async (outcome) => {
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
    },
  )

  it('does not let an old finally clear a newer lighting request after reconnect', async () => {
    const { store, session } = await setup()
    const old = deferred<CustomKeyLighting[]>()
    const current = deferred<CustomKeyLighting[]>()
    vi.spyOn(session, 'getCustomLighting')
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise)
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
    const read = vi
      .spyOn(session, 'getPerformance')
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(current)
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
