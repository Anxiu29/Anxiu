import { defineStore } from 'pinia'
import type { KeyboardDriverService } from '@/application/KeyboardDriverService'
import type { KeyboardConfiguration, KeyboardMode } from '@/domain/keyboard'
import { toDriverError } from '@/application/DriverError'
import { createDriverState } from './driverState'
import { createRequestScope } from './requestScope'
import { createLightingActions } from './lightingActions'
import { createFirmwareActions } from './firmwareActions'
import { createAdvancedKeyActions } from './advancedKeyActions'
import { createPerformanceActions } from './performanceActions'
import { createMacroActions } from './macroActions'

/** 由组合根注入应用服务，Store 不再知道具体设备和全局单例。 */
export const createDriverStore = (driverService: KeyboardDriverService) => defineStore('driver', () => {
  const state = createDriverState()
  const { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message, messageWarning, demo, driverId, revision, saveProgress, lighting, customLighting, customLightingLoading, advancedKey, advancedKeyLoading, advancedKeyTypes, macro, macroSlots, selectedMacroSlot, macroBindings, macroLoading, performanceSettings, performanceLoading, performanceBySourceCode, performanceMapLoading, pollingRate, travelMatrix, travelReading, calibrationActive, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels } = state
  let removeModeListener: () => void = () => undefined
  let removeConfigurationListener: () => void = () => undefined
  const advancedKeyActions = createAdvancedKeyActions(state, { clearFeedback, fail })
  const { loadAdvancedKey, loadAdvancedKeyTypes, updateAdvancedKey, deleteAdvancedKey } = advancedKeyActions
  const lightingActions = createLightingActions(state, { clearFeedback, fail })
  const { updateLighting, reloadLighting, loadCustomLighting, updateCustomLighting } = lightingActions
  const performanceActions = createPerformanceActions(state, { clearFeedback, fail })
  const { loadPerformance, updatePerformance, loadPerformanceMap, updatePerformances, loadPollingRate, updatePollingRate, readTravelMatrix, startCalibration, finishCalibration } = performanceActions
  const macroActions = createMacroActions(state, { clearFeedback, fail })
  const { loadMacro, updateMacro, deleteMacro, loadMacrosFromDevice, selectMacroSlot } = macroActions
  const profileRequests = createRequestScope()
  const { firmwareProgress, firmwareUpdating, canUpgradeFirmware, upgradeFirmware, authorizeFirmwareDevice, cancelFirmwareAuthorization } = createFirmwareActions(state, driverService, {
    clearFeedback, removeDeviceStateListeners, invalidateDeviceCaches, handleDisconnect, observeDeviceStateChanges, readProfile, fail,
  })

  /** 建立新会话后统一读取 Profile；真机和演示模式共用后续状态流。 */
  async function connect(useDemo = false, firmwareRecovery = false) {
    if (firmwareUpdating.value) return
    removeDeviceStateListeners()
    invalidateDeviceCaches()
    clearFeedback(); status.value = 'connecting'; demo.value = useDemo; mode.value = 'win'; layer.value = 0; activeConfiguration.value = 1
    try {
      state.session = await driverService.connect({ demo: useDemo, firmwareRecovery, onDisconnect: handleDisconnect })
      observeDeviceStateChanges()
      driverId.value = driverService.driverId
      if (await readProfile()) message.value = useDemo ? '已进入演示模式' : '键盘连接成功'
    } catch (cause) { fail(cause) }
  }

  /** 浏览器只允许无提示重连已经授权过的 HID 设备；没有授权设备不是错误。 */
  async function reconnectAuthorized() {
    removeDeviceStateListeners()
    invalidateDeviceCaches()
    clearFeedback(); status.value = 'connecting'; mode.value = 'win'; layer.value = 0; activeConfiguration.value = 1
    try {
      state.session = await driverService.reconnectAuthorized({ onDisconnect: handleDisconnect })
      if (!state.session) { status.value = 'idle'; return }
      observeDeviceStateChanges()
      driverId.value = driverService.driverId
      await readProfile()
    } catch (cause) { fail(cause) }
  }

  async function readProfile() {
    const session = state.session
    if (!session) return false
    const isCurrent = profileRequests.begin()
    status.value = 'reading'
    try {
      const nextProfile = await session.load()
      if (!isCurrent() || state.session !== session) return false
      const nextLighting = nextProfile.capabilities.lighting ? await session.getLighting() : undefined
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

  /** 单键选择采用即时写入：更新草稿、保存、回读验证是同一个应用事务。 */
  async function assignKey(keyCode: number) {
    if (!state.session || !selectedPositionId.value || !['ready', 'error'].includes(status.value)) return
    const positionId = selectedPositionId.value
    const targetLayer = layer.value
    const key = state.session.keyCatalog.get(keyCode)
    clearFeedback(); status.value = 'writing'; saveProgress.value = undefined
    try {
      const pending = state.session.updateAndSave(positionId, targetLayer, key.code, key.category, (progress) => { saveProgress.value = progress })
      // updateAndSave 在 Promise 返回前已经同步修改 draft，先刷新一次让键帽立即反映选择。
      revision.value++
      const result = await pending
      profile.value = result.profile
      revision.value++
      status.value = 'ready'
      message.value = result.changedAssignments === 0 ? `当前按键已经是“${key.label}”` : `已改为“${key.label}”并通过回读验证`
    } catch (cause) { revision.value++; fail(cause) }
  }

  async function reload() {
    if (!state.session) return
    clearFeedback(); invalidateDeviceCaches(); status.value = 'reading'
    try { profile.value = await state.session.reload(); lighting.value = profile.value.capabilities.lighting ? await state.session.getLighting() : undefined; customLighting.value = []; revision.value++; status.value = 'ready'; message.value = '已重新读取设备配置' }
    catch (cause) { fail(cause) }
  }

  /** 只恢复键位默认表，不执行会清除灯光、宏等数据的恢复出厂命令。 */
  async function restoreAllKeyDefaults() {
    if (!state.session) return
    clearFeedback(); status.value = 'writing'; saveProgress.value = undefined
    try {
      const result = await state.session.restoreAllKeyDefaults((progress) => { saveProgress.value = progress })
      profile.value = result.profile; revision.value++; status.value = 'ready'
      message.value = result.changedAssignments === 0 ? '全部按键已经是默认映射' : `已恢复 ${result.changedAssignments} 个按键映射并通过回读验证`
    } catch (cause) { fail(cause) }
  }

  /** 恢复出厂会导致设备状态整体失效，因此成功后主动结束会话并要求重新连接。 */
  async function restoreFactory() {
    if (!state.session || !profile.value || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try {
      // restoreFactory 成功后 profile 会被释放，必须先保留设备身份用于清理全部配置的宏快照。
      const clearSnapshots = macroActions.prepareSnapshotCleanup()
      await state.session.restoreFactory()
      clearSnapshots()
      invalidateDeviceCaches()
      await driverService.disconnect()
      removeDeviceStateListeners()
      state.session = undefined
      driverId.value = undefined
      profile.value = undefined
      customLighting.value = []
      selectedPositionId.value = undefined
      revision.value++
      status.value = 'idle'
      message.value = '已恢复出厂设置，请重新连接键盘'
    } catch (cause) { fail(cause) }
  }

  function selectLayer(targetLayer: number) {
    if (!state.session || !profile.value || targetLayer < 0 || targetLayer >= profile.value.capabilities.layers || ['connecting', 'reading', 'writing'].includes(status.value)) return
    layer.value = targetLayer
  }

  /** 模式切换由固件完成；切换后必须重新读取，不能复用上一模式的四层映射。 */
  async function selectMode(targetMode: KeyboardMode) {
    if (!state.session || !profile.value || ['connecting', 'reading', 'writing'].includes(status.value)) return
    if (mode.value === targetMode) { layer.value = 0; return }
    clearFeedback(); invalidateDeviceCaches(); status.value = 'reading'
    try {
      profile.value = await state.session.switchMode(targetMode)
      lighting.value = profile.value.capabilities.lighting ? await state.session.getLighting() : undefined
      customLighting.value = []
      revision.value++
      mode.value = profile.value.mode ?? targetMode
      await loadMacrosFromDevice()
      layer.value = 0
      selectedPositionId.value = profile.value.positions[0]?.id
      status.value = 'ready'
      message.value = targetMode === 'mac' ? '已切换至 Mac 模式并读取 Mac 四层映射' : '已切换至 Windows 模式并重新读取四层映射'
    } catch (cause) { fail(cause) }
  }

  /** 四个配置槽是设备端状态，切换成功后回到 FN1 并重建当前 Profile。 */
  async function selectConfiguration(configuration: KeyboardConfiguration) {
    if (!state.session || !profile.value || activeConfiguration.value === configuration || ['connecting', 'reading', 'writing'].includes(status.value)) return
    clearFeedback(); invalidateDeviceCaches(); status.value = 'reading'
    try {
      profile.value = await state.session.switchConfiguration(configuration)
      lighting.value = profile.value.capabilities.lighting ? await state.session.getLighting() : undefined
      customLighting.value = []
      revision.value++
      activeConfiguration.value = configuration
      await loadMacrosFromDevice()
      layer.value = 0
      selectedPositionId.value = profile.value.positions[0]?.id
      status.value = 'ready'
      message.value = `已切换到配置 ${configuration} 并重新读取键位映射`
    } catch (cause) { fail(cause) }
  }

  async function restoreKeyDefault(positionId: string, targetLayer: number) {
    if (!state.session || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'; saveProgress.value = undefined
    try {
      const pending = state.session.restoreKeyDefaultAndSave(positionId, targetLayer, (progress) => { saveProgress.value = progress })
      revision.value++
      const result = await pending
      profile.value = result.profile; revision.value++; status.value = 'ready'
      message.value = result.changedAssignments === 0 ? '该按键已经是默认映射' : '已恢复当前按键默认映射并通过回读验证'
    } catch (cause) { revision.value++; fail(cause) }
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
      // 回调只通知状态层；真实回读仍通过 DeviceSession，避免协议事件直接修改 UI 数据。
      void syncExternalMode(observedSession, targetMode)
    })
    removeConfigurationListener = observedSession.onConfigurationChange((configuration) => {
      if (state.session !== observedSession || activeConfiguration.value === configuration) return
      // 主动包已经是键盘确认后的最终状态，先切换左侧高亮，不必等待四层键值全部回读。
      activeConfiguration.value = configuration
      void syncExternalConfiguration(observedSession, configuration)
    })
  }

  function removeDeviceStateListeners() {
    removeModeListener()
    removeConfigurationListener()
    removeModeListener = () => undefined
    removeConfigurationListener = () => undefined
  }

  /** 键盘本体切换模式后重读 Profile，让模式标签、默认表和四层键值一起更新。 */
  async function syncExternalMode(observedSession: NonNullable<typeof state.session>, targetMode: KeyboardMode) {
    if (state.session !== observedSession || mode.value === targetMode || status.value === 'disconnected') return
    if (['connecting', 'reading', 'writing'].includes(status.value)) {
      // 用户操作正在占用会话时稍后再同步，不能因为 UI 忙而永久丢掉硬件模式事件。
      setTimeout(() => void syncExternalMode(observedSession, targetMode), 100)
      return
    }
    clearFeedback(); invalidateDeviceCaches(); status.value = 'reading'
    const isCurrent = profileRequests.begin()
    try {
      const nextProfile = await observedSession.load()
      if (!isCurrent() || state.session !== observedSession) return
      const nextLighting = nextProfile.capabilities.lighting ? await observedSession.getLighting() : undefined
      if (!isCurrent() || state.session !== observedSession) return
      profile.value = nextProfile
      lighting.value = nextLighting
      mode.value = profile.value.mode ?? targetMode
      await loadMacrosFromDevice()
      if (!isCurrent() || state.session !== observedSession) return
      layer.value = 0
      selectedPositionId.value = profile.value.positions[0]?.id
      revision.value++
      status.value = 'ready'
      message.value = mode.value === 'mac' ? '检测到键盘已切换至 Mac 模式，已同步四层映射' : '检测到键盘已切换至 Windows 模式，已同步四层映射'
    } catch (cause) { if (isCurrent() && state.session === observedSession) fail(cause) }
  }

  /** 键盘快捷键切换配置槽后，重读该槽的四层映射并同步左侧配置按钮。 */
  async function syncExternalConfiguration(observedSession: NonNullable<typeof state.session>, configuration: KeyboardConfiguration) {
    if (state.session !== observedSession || status.value === 'disconnected') return
    if (['connecting', 'reading', 'writing'].includes(status.value)) {
      setTimeout(() => void syncExternalConfiguration(observedSession, configuration), 100)
      return
    }
    clearFeedback(); invalidateDeviceCaches(); status.value = 'reading'
    const isCurrent = profileRequests.begin()
    try {
      const nextProfile = await observedSession.load()
      if (!isCurrent() || state.session !== observedSession) return
      const nextLighting = nextProfile.capabilities.lighting ? await observedSession.getLighting() : undefined
      if (!isCurrent() || state.session !== observedSession) return
      profile.value = nextProfile
      lighting.value = nextLighting
      layer.value = 0
      await loadMacrosFromDevice()
      if (!isCurrent() || state.session !== observedSession) return
      selectedPositionId.value = profile.value.positions[0]?.id
      revision.value++
      status.value = 'ready'
      message.value = `检测到键盘已切换到配置 ${configuration}，已同步四层映射`
    } catch (cause) { if (isCurrent() && state.session === observedSession) fail(cause) }
  }
  function clearFeedback() { error.value = ''; errorCode.value = undefined; message.value = ''; messageWarning.value = false }
  /** 模式、配置槽或设备会话改变后，上一上下文的单键缓存和在途结果都必须失效。 */
  function invalidateDeviceCaches() {
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
    status.value = 'error'; error.value = driverError.message; errorCode.value = driverError.code
  }

  return { firmwareProgress, firmwareUpdating, canUpgradeFirmware, upgradeFirmware, authorizeFirmwareDevice, cancelFirmwareAuthorization, status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message, messageWarning, demo, driverId, saveProgress, lighting, customLighting, customLightingLoading, advancedKey, advancedKeyLoading, advancedKeyTypes, macro, macroSlots, selectedMacroSlot, macroBindings, macroLoading, performanceSettings, performanceLoading, performanceBySourceCode, performanceMapLoading, pollingRate, travelMatrix, travelReading, calibrationActive, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels, connect, reconnectAuthorized, assignKey, selectLayer, selectMode, selectConfiguration, selectMacroSlot, updateLighting, reloadLighting, loadCustomLighting, updateCustomLighting, loadAdvancedKey, loadAdvancedKeyTypes, updateAdvancedKey, deleteAdvancedKey, loadPerformance, loadPerformanceMap, updatePerformance, updatePerformances, loadPollingRate, updatePollingRate, readTravelMatrix, startCalibration, finishCalibration, loadMacro, loadMacrosFromDevice, updateMacro, deleteMacro, reload, restoreAllKeyDefaults, restoreKeyDefault, restoreFactory }
})
