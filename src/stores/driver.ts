import { defineStore } from 'pinia'
import { watch, onScopeDispose } from 'vue'
import { createHardwareSync, type HardwareChange } from './hardwareSync'
import type { KeyboardDriverService } from '@/application/KeyboardDriverService'
import type { KeyAssignment, KeyboardConfiguration, KeyboardMode } from '@/domain/keyboard'
import type { RawKeyboardProfile } from '@/domain/rawKeyboardProfile'
import { toDriverError } from '@/application/DriverError'
import { createDriverState } from './driverState'
import { createRequestScope } from './requestScope'
import { createLightingActions } from './lightingActions'
import { createFirmwareActions } from './firmwareActions'
import { createAdvancedKeyActions } from './advancedKeyActions'
import { createPerformanceActions } from './performanceActions'
import { createMacroActions } from './macroActions'

/** 由组合根注入应用服务，Store 不再知道具体设备和全局单例。 */
export const createDriverStore = (driverService: KeyboardDriverService) =>
  defineStore('driver', () => {
    const state = createDriverState()
    const {
      status,
      profile,
      layer,
      mode,
      activeConfiguration,
      selectedPositionId,
      error,
      errorCode,
      message,
      messageWarning,
      demo,
      driverId,
      revision,
      saveProgress,
      lighting,
      customLighting,
      customLightingLoading,
      advancedKey,
      advancedKeyLoading,
      advancedKeyTypes,
      macro,
      macroSlots,
      selectedMacroSlot,
      macroBindings,
      macroLoading,
      performanceSettings,
      performanceLoading,
      performanceBySourceCode,
      performanceMapLoading,
      pollingRate,
      travelMatrix,
      travelReading,
      calibrationActive,
      connected,
      dirty,
      assignments,
      selectedAssignment,
      keyOptions,
      keyLabels,
    } = state
    let removeModeListener: () => void = () => undefined
    let removeConfigurationListener: () => void = () => undefined
    const advancedKeyActions = createAdvancedKeyActions(state, { clearFeedback, fail })
    const { loadAdvancedKey, loadAdvancedKeyTypes, updateAdvancedKey, deleteAdvancedKey } =
      advancedKeyActions
    const lightingActions = createLightingActions(state, { clearFeedback, fail })
    const { updateLighting, reloadLighting, loadCustomLighting, updateCustomLighting } =
      lightingActions
    const performanceActions = createPerformanceActions(state, { clearFeedback, fail })
    const {
      loadPerformance,
      updatePerformance,
      loadPerformanceMap,
      updatePerformances,
      loadPollingRate,
      updatePollingRate,
      readTravelMatrix,
      startCalibration,
      finishCalibration,
    } = performanceActions
    const macroActions = createMacroActions(state, { clearFeedback, fail })
    const { loadMacro, updateMacro, deleteMacro, loadMacrosFromDevice, selectMacroSlot } =
      macroActions
    const profileRequests = createRequestScope()
    const operationRequests = createRequestScope()
    const {
      firmwareLogAvailable,
      exportFirmwareLog,
      firmwareProgress,
      firmwareUpdating,
      canUpgradeFirmware,
      upgradeFirmware,
      authorizeFirmwareDevice,
      cancelFirmwareAuthorization,
    } = createFirmwareActions(state, driverService, {
      clearFeedback,
      removeDeviceStateListeners,
      invalidateDeviceCaches,
      handleDisconnect,
      observeDeviceStateChanges,
      readProfile,
      fail,
    })

    const hardwareSync = createHardwareSync(
      () => !firmwareUpdating.value && ['ready', 'error'].includes(status.value),
      synchronizeHardware,
    )
    watch(status, () => {
      void hardwareSync.flush()
    })
    onScopeDispose(removeDeviceStateListeners)

    /** 建立新会话后统一读取 Profile；真机和演示模式共用后续状态流。 */
    async function adoptSession(
      session: import('@/application/DeviceSession').DeviceSession,
      id: string,
    ) {
      removeDeviceStateListeners()
      invalidateDeviceCaches()
      clearFeedback()
      driverService.adopt(session, id)
      state.session = session
      driverId.value = id
      demo.value = false
      mode.value = 'win'
      layer.value = 0
      activeConfiguration.value = 1
      observeDeviceStateChanges()
      try {
        if (!(await readProfile())) throw new Error('设备连接已中断')
        message.value = '设备连接成功'
      } catch (cause) {
        fail(cause)
        throw cause
      }
    }

    function detachSession() {
      removeDeviceStateListeners()
      invalidateDeviceCaches()
      driverService.release()
      state.session = undefined
      profile.value = undefined
      driverId.value = undefined
      demo.value = false
      status.value = 'idle'
      clearFeedback()
    }

    async function connect(useDemo = false, targetDriverId?: string) {
      if (firmwareUpdating.value) return
      removeDeviceStateListeners()
      invalidateDeviceCaches()
      clearFeedback()
      status.value = 'connecting'
      demo.value = useDemo
      mode.value = 'win'
      layer.value = 0
      activeConfiguration.value = 1
      try {
        state.session = await driverService.connect({
          demo: useDemo,
          driverId: targetDriverId,
          onDisconnect: handleDisconnect,
        })
        observeDeviceStateChanges()
        driverId.value = driverService.driverId
        if (await readProfile()) message.value = useDemo ? '已进入演示模式' : '键盘连接成功'
      } catch (cause) {
        fail(cause)
      }
    }

    /** 浏览器只允许无提示重连已经授权过的 HID 设备；没有授权设备不是错误。 */
    async function reconnectAuthorized() {
      if (firmwareUpdating.value) return
      removeDeviceStateListeners()
      invalidateDeviceCaches()
      clearFeedback()
      status.value = 'connecting'
      mode.value = 'win'
      layer.value = 0
      activeConfiguration.value = 1
      try {
        state.session = await driverService.reconnectAuthorized({ onDisconnect: handleDisconnect })
        if (!state.session) {
          status.value = 'idle'
          return
        }
        observeDeviceStateChanges()
        driverId.value = driverService.driverId
        await readProfile()
      } catch (cause) {
        fail(cause)
      }
    }

    async function readProfile() {
      const session = state.session
      if (!session) return false
      const isCurrent = profileRequests.begin()
      status.value = 'reading'
      try {
        const nextProfile = await session.load()
        if (!isCurrent() || state.session !== session) return false
        const nextLighting = nextProfile.capabilities.lighting
          ? await session.getLighting()
          : undefined
        if (!isCurrent() || state.session !== session) return false
        profile.value = nextProfile
        lighting.value = nextLighting
        mode.value = nextProfile.mode ?? mode.value
        revision.value++
        status.value = 'ready'
        selectedPositionId.value = nextProfile.positions[0]?.id
        return true
      } catch (cause) {
        if (!isCurrent() || state.session !== session) return false
        throw cause
      }
    }

    /** 普通操作共享发布资格；断线或上下文变化后，成功、错误和进度都不能回写。 */
    function beginOperation(nextStatus: 'reading' | 'writing', resetCaches = false) {
      const session = state.session!
      if (resetCaches) invalidateDeviceCaches()
      const current = operationRequests.begin()
      clearFeedback()
      status.value = nextStatus
      return { session, isCurrent: () => current() && state.session === session }
    }

    /** 单键选择采用即时写入：更新草稿、保存、回读验证是同一个应用事务。 */
    async function assignKey(keyCode: number) {
      if (!state.session || !selectedPositionId.value || !['ready', 'error'].includes(status.value))
        return
      const positionId = selectedPositionId.value,
        targetLayer = layer.value
      const { session, isCurrent } = beginOperation('writing')
      saveProgress.value = undefined
      try {
        const key = session.keyCatalog.get(keyCode)
        const pending = session.updateAndSave(
          positionId,
          targetLayer,
          key.code,
          key.category,
          (progress) => {
            if (isCurrent()) saveProgress.value = progress
          },
        )
        revision.value++
        const result = await pending
        if (!isCurrent()) return
        profile.value = result.profile
        revision.value++
        status.value = 'ready'
        message.value =
          result.changedAssignments === 0
            ? `当前按键已经是“${key.label}”`
            : `已改为“${key.label}”并通过回读验证`
      } catch (cause) {
        if (isCurrent()) {
          revision.value++
          fail(cause)
        }
      }
    }

    async function applyKeymapSnapshot(items: readonly Pick<KeyAssignment, 'positionId' | 'layer' | 'keyCode'>[]) {
      if (!state.session || !profile.value || !['ready', 'error'].includes(status.value)) return false
      const { session, isCurrent } = beginOperation('writing')
      saveProgress.value = undefined
      try {
        const result = await session.replaceAssignmentsAndSave(items, (progress) => { if (isCurrent()) saveProgress.value = progress })
        if (!isCurrent()) return false
        profile.value = result.profile
        revision.value++
        status.value = 'ready'
        message.value = `配置文件已写入 ${result.changedAssignments} 个键位并通过回读验证`
        return true
      } catch (cause) {
        if (isCurrent()) fail(cause)
        return false
      }
    }

    async function readRawProfile(targetMode: KeyboardMode) {
      if (!state.session || !['ready', 'error'].includes(status.value)) return
      try { return await state.session.readRawProfile(targetMode) }
      catch (cause) { fail(cause); return }
    }

    async function applyRawProfile(raw: RawKeyboardProfile) {
      if (!state.session || !['ready', 'error'].includes(status.value)) return false
      const { session, isCurrent } = beginOperation('writing')
      try {
        const nextProfile = await session.writeRawProfile(raw)
        if (!isCurrent()) return false
        profile.value = nextProfile
        mode.value = raw.mode
        lighting.value = await session.getLighting()
        status.value = 'ready'
        await loadMacrosFromDevice()
        if (!isCurrent() || status.value !== 'ready') return false
        revision.value++
        message.value = 'RK 原始配置已写入并通过设备回读验证'
        return true
      } catch (cause) { if (isCurrent()) fail(cause); return false }
    }

    async function assignRawKey(positionId: string, targetLayer: number, rawCode: number) {
      if (!state.session || !['ready', 'error'].includes(status.value)) return false
      const { session, isCurrent } = beginOperation('writing')
      try {
        const nextProfile = await session.writeRawKey(positionId, targetLayer, rawCode)
        if (!isCurrent()) return false
        profile.value = nextProfile
        revision.value++
        status.value = 'ready'
        message.value = 'RK 组合键已写入并通过设备回读验证'
        return true
      } catch (cause) { if (isCurrent()) fail(cause); return false }
    }

    async function reload() {
      if (!state.session || !['ready', 'error'].includes(status.value)) return
      const { session, isCurrent } = beginOperation('reading', true)
      try {
        const nextProfile = await session.reload()
        if (!isCurrent()) return
        const nextLighting = nextProfile.capabilities.lighting
          ? await session.getLighting()
          : undefined
        if (!isCurrent()) return
        profile.value = nextProfile
        lighting.value = nextLighting
        revision.value++
        status.value = 'ready'
        message.value = '已重新读取设备配置'
      } catch (cause) {
        if (isCurrent()) fail(cause)
      }
    }

    /** 只恢复键位默认表，不执行会清除灯光、宏等数据的恢复出厂命令。 */
    async function restoreAllKeyDefaults() {
      if (!state.session || !['ready', 'error'].includes(status.value)) return
      const { session, isCurrent } = beginOperation('writing')
      saveProgress.value = undefined
      try {
        const result = await session.restoreAllKeyDefaults((progress) => {
          if (isCurrent()) saveProgress.value = progress
        })
        if (!isCurrent()) return
        profile.value = result.profile
        revision.value++
        status.value = 'ready'
        message.value =
          result.changedAssignments === 0
            ? '全部按键已经是默认映射'
            : `已恢复 ${result.changedAssignments} 个按键映射并通过回读验证`
      } catch (cause) {
        if (isCurrent()) fail(cause)
      }
    }

    /** 恢复出厂会导致设备状态整体失效，因此成功后主动结束会话并要求重新连接。 */
    async function restoreFactory() {
      if (!state.session || !profile.value || !['ready', 'error'].includes(status.value)) return
      const { session, isCurrent } = beginOperation('writing')
      let current = isCurrent
      try {
        const clearSnapshots = macroActions.prepareSnapshotCleanup()
        await session.restoreFactory()
        if (!isCurrent()) return
        clearSnapshots()
        invalidateDeviceCaches()
        const currentCleanup = operationRequests.begin()
        current = () => currentCleanup() && state.session === session
        await driverService.disconnect()
        if (!currentCleanup() || state.session !== session) return
        removeDeviceStateListeners()
        state.session = undefined
        driverId.value = undefined
        profile.value = undefined
        selectedPositionId.value = undefined
        revision.value++
        status.value = 'idle'
        message.value = '已恢复出厂设置，请重新连接键盘'
      } catch (cause) {
        if (current()) fail(cause)
      }
    }

    function selectLayer(targetLayer: number) {
      if (
        !state.session ||
        !profile.value ||
        targetLayer < 0 ||
        targetLayer >= profile.value.capabilities.layers ||
        ['connecting', 'reading', 'writing'].includes(status.value)
      )
        return
      layer.value = targetLayer
    }

    /** 模式切换由固件完成；切换后必须重新读取，不能复用上一模式的四层映射。 */
    async function selectMode(targetMode: KeyboardMode) {
      if (!state.session || !profile.value || !['ready', 'error'].includes(status.value)) return
      if (mode.value === targetMode) {
        layer.value = 0
        return
      }
      const { session, isCurrent } = beginOperation('reading', true)
      try {
        const nextProfile = await session.switchMode(targetMode)
        if (!isCurrent()) return
        const nextLighting = nextProfile.capabilities.lighting
          ? await session.getLighting()
          : undefined
        if (!isCurrent()) return
        profile.value = nextProfile
        lighting.value = nextLighting
        mode.value = nextProfile.mode ?? targetMode
        revision.value++
        await loadMacrosFromDevice()
        if (!isCurrent() || status.value !== 'reading') return
        layer.value = 0
        selectedPositionId.value = nextProfile.positions[0]?.id
        status.value = 'ready'
        message.value =
          targetMode === 'mac'
            ? '已切换至 Mac 模式并读取 Mac 四层映射'
            : '已切换至 Windows 模式并重新读取四层映射'
      } catch (cause) {
        if (isCurrent()) fail(cause)
      }
    }

    /** 四个配置槽是设备端状态，切换成功后回到 FN1 并重建当前 Profile。 */
    async function selectConfiguration(configuration: KeyboardConfiguration) {
      if (!state.session || !profile.value || !['ready', 'error'].includes(status.value)) return
      if (activeConfiguration.value === configuration) return
      const { session, isCurrent } = beginOperation('reading', true)
      try {
        const nextProfile = await session.switchConfiguration(configuration)
        if (!isCurrent()) return
        const nextLighting = nextProfile.capabilities.lighting
          ? await session.getLighting()
          : undefined
        if (!isCurrent()) return
        profile.value = nextProfile
        lighting.value = nextLighting
        activeConfiguration.value = configuration
        revision.value++
        await loadMacrosFromDevice()
        if (!isCurrent() || status.value !== 'reading') return
        layer.value = 0
        selectedPositionId.value = nextProfile.positions[0]?.id
        status.value = 'ready'
        message.value = `已切换到配置 ${configuration} 并重新读取键位映射`
      } catch (cause) {
        if (isCurrent()) fail(cause)
      }
    }

    async function restoreKeyDefault(positionId: string, targetLayer: number) {
      if (!state.session || !['ready', 'error'].includes(status.value)) return
      const { session, isCurrent } = beginOperation('writing')
      saveProgress.value = undefined
      try {
        const pending = session.restoreKeyDefaultAndSave(positionId, targetLayer, (progress) => {
          if (isCurrent()) saveProgress.value = progress
        })
        revision.value++
        const result = await pending
        if (!isCurrent()) return
        profile.value = result.profile
        revision.value++
        status.value = 'ready'
        message.value =
          result.changedAssignments === 0
            ? '该按键已经是默认映射'
            : '已恢复当前按键默认映射并通过回读验证'
      } catch (cause) {
        if (isCurrent()) {
          revision.value++
          fail(cause)
        }
      }
    }

    function handleDisconnect() {
      if (firmwareUpdating.value) return
      removeDeviceStateListeners()
      invalidateDeviceCaches()
      // 保留 profile/draft 供用户查看；操作入口会根据 disconnected 状态被禁用。
      status.value = 'disconnected'
      error.value = '键盘已断开连接，未保存的草稿仍保留在页面中'
    }

    function observeDeviceStateChanges() {
      const observedSession = state.session
      if (!observedSession) return
      removeModeListener = observedSession.onModeChange((targetMode) => {
        if (state.session === observedSession)
          hardwareSync.enqueue({ session: observedSession, mode: targetMode })
      })
      removeConfigurationListener = observedSession.onConfigurationChange((configuration) => {
        if (state.session !== observedSession) return
        hardwareSync.enqueue({ session: observedSession, configuration })
      })
    }

    function removeDeviceStateListeners() {
      hardwareSync.clear()
      removeModeListener()
      removeConfigurationListener()
      removeModeListener = () => undefined
      removeConfigurationListener = () => undefined
    }

    /** 模式和配置事件共用一次 Profile/灯光/宏同步；旧事件只允许结束，不允许发布。 */
    async function synchronizeHardware(change: HardwareChange, latestEvent: () => boolean) {
      const session = change.session
      if (state.session !== session) return
      clearFeedback()
      invalidateDeviceCaches()
      status.value = 'reading'
      const current = profileRequests.begin()
      const ownsSession = () => current() && state.session === session
      const isCurrent = () => ownsSession() && latestEvent()
      try {
        const nextProfile = await session.load()
        if (!isCurrent()) return
        const nextLighting = nextProfile.capabilities.lighting
          ? await session.getLighting()
          : undefined
        if (!isCurrent()) return
        profile.value = nextProfile
        lighting.value = nextLighting
        mode.value = nextProfile.mode ?? change.mode ?? mode.value
        if (change.configuration !== undefined) activeConfiguration.value = change.configuration
        await loadMacrosFromDevice()
        if (!isCurrent() || status.value !== 'reading') return
        layer.value = 0
        selectedPositionId.value = nextProfile.positions[0]?.id
        revision.value++
        status.value = 'ready'
        message.value = '已同步键盘当前模式、配置和键位映射'
      } catch (cause) {
        if (isCurrent()) fail(cause)
      } finally {
        // 被更新事件替代的读取让出 busy，随后队列同步最新状态；断线不能被改回 ready。
        if (ownsSession() && !latestEvent() && status.value === 'reading') status.value = 'ready'
      }
    }
    function clearFeedback() {
      error.value = ''
      errorCode.value = undefined
      message.value = ''
      messageWarning.value = false
    }
    /** 模式、配置槽或设备会话改变后，上一上下文的单键缓存和在途结果都必须失效。 */
    function invalidateDeviceCaches() {
      operationRequests.invalidate()
      profileRequests.invalidate()
      lightingActions.invalidate()
      performanceActions.invalidate()
      customLighting.value = []
      customLightingLoading.value = false
      advancedKeyActions.invalidate()
      macroActions.invalidate()
    }
    function fail(cause: unknown) {
      // 所有外层异常在这里收敛为稳定错误码，Vue 组件只处理展示，不解析底层异常。
      const driverError = toDriverError(cause)
      status.value = 'error'
      error.value = driverError.message
      errorCode.value = driverError.code
    }

    return {
      adoptSession,
      handleDeviceDisconnect: handleDisconnect,
      detachSession,
      firmwareLogAvailable,
      exportFirmwareLog,
      firmwareProgress,
      firmwareUpdating,
      canUpgradeFirmware,
      upgradeFirmware,
      authorizeFirmwareDevice,
      cancelFirmwareAuthorization,
      status,
      profile,
      layer,
      mode,
      activeConfiguration,
      selectedPositionId,
      error,
      errorCode,
      message,
      messageWarning,
      demo,
      driverId,
      saveProgress,
      lighting,
      customLighting,
      customLightingLoading,
      advancedKey,
      advancedKeyLoading,
      advancedKeyTypes,
      macro,
      macroSlots,
      selectedMacroSlot,
      macroBindings,
      macroLoading,
      performanceSettings,
      performanceLoading,
      performanceBySourceCode,
      performanceMapLoading,
      pollingRate,
      travelMatrix,
      travelReading,
      calibrationActive,
      connected,
      dirty,
      assignments,
      selectedAssignment,
      keyOptions,
      keyLabels,
      connect,
      reconnectAuthorized,
      assignKey,
      applyKeymapSnapshot,
      readRawProfile,
      applyRawProfile,
      assignRawKey,
      selectLayer,
      selectMode,
      selectConfiguration,
      selectMacroSlot,
      updateLighting,
      reloadLighting,
      loadCustomLighting,
      updateCustomLighting,
      loadAdvancedKey,
      loadAdvancedKeyTypes,
      updateAdvancedKey,
      deleteAdvancedKey,
      loadPerformance,
      loadPerformanceMap,
      updatePerformance,
      updatePerformances,
      loadPollingRate,
      updatePollingRate,
      readTravelMatrix,
      startCalibration,
      finishCalibration,
      loadMacro,
      loadMacrosFromDevice,
      updateMacro,
      deleteMacro,
      reload,
      restoreAllKeyDefaults,
      restoreKeyDefault,
      restoreFactory,
    }
  })
