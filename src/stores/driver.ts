import { defineStore } from 'pinia'
import type { KeyboardDriverService } from '@/application/KeyboardDriverService'
import type { KeyboardConfiguration, KeyboardMode } from '@/domain/keyboard'
import { toDriverError } from '@/application/DriverError'
import { createDriverState } from './driverState'
import { createRequestScope } from './requestScope'
import { createLightingActions } from './lightingActions'
import { createAdvancedKeyActions } from './advancedKeyActions'
import type { MacroSettings } from '@/domain/macro'
import type { KeyPerformanceSettings, PollingRate } from '@/domain/performance'
import { clearDeviceMacroSnapshots, deleteMacroSnapshot, listMacroSnapshots, replaceMacroSnapshots, restoreMacroSnapshot, saveMacroSnapshot, type MacroSnapshotContext } from './macroSnapshots'

/** 由组合根注入应用服务，Store 不再知道具体设备和全局单例。 */
export const createDriverStore = (driverService: KeyboardDriverService) => defineStore('driver', () => {
  const state = createDriverState()
  const { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message, messageWarning, demo, driverId, revision, saveProgress, lighting, customLighting, customLightingLoading, advancedKey, advancedKeyLoading, advancedKeyTypes, macro, macroSlots, selectedMacroSlot, macroBindings, macroLoading, performanceSettings, performanceLoading, performanceBySourceCode, performanceMapLoading, pollingRate, travelMatrix, travelReading, calibrationActive, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels } = state
  let removeModeListener: () => void = () => undefined
  let removeConfigurationListener: () => void = () => undefined
  let macroReadRevision = 0
  const macroWrites = createRequestScope()
  let loadingMacroSourceCode: number | undefined
  let performanceReadRevision = 0
  let loadingPerformanceSourceCode: number | undefined
  const advancedKeyActions = createAdvancedKeyActions(state, { clearFeedback, fail })
  const { loadAdvancedKey, loadAdvancedKeyTypes, updateAdvancedKey, deleteAdvancedKey } = advancedKeyActions
  const lightingActions = createLightingActions(state, { clearFeedback, fail })
  const { updateLighting, reloadLighting, loadCustomLighting, updateCustomLighting } = lightingActions
  const pollingRateRequests = createRequestScope()
  const travelRequests = createRequestScope()
  const profileRequests = createRequestScope()
  let performanceMapReadRevision = 0
  let consecutiveTravelReadFailures = 0

  /** 建立新会话后统一读取 Profile；真机和演示模式共用后续状态流。 */
  async function connect(useDemo = false) {
    removeDeviceStateListeners()
    invalidateDeviceCaches()
    clearFeedback(); status.value = 'connecting'; demo.value = useDemo; mode.value = 'win'; layer.value = 0; activeConfiguration.value = 1
    try {
      state.session = await driverService.connect({ demo: useDemo, onDisconnect: handleDisconnect })
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
      const snapshotContext = macroSnapshotContext()
      await state.session.restoreFactory()
      clearDeviceMacroSnapshots(snapshotContext)
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

  async function loadPerformance(positionId = selectedPositionId.value, force = false) {
    if (!state.session || !profile.value?.capabilities.performance || !positionId || !['ready', 'error'].includes(status.value)) return
    const position = profile.value.positions.find((item) => item.id === positionId)
    if (!position || performanceLoading.value && loadingPerformanceSourceCode === position.sourceCode) return
    // 即使命中缓存，也要使之前另一按键的读取失效。
    const readRevision = ++performanceReadRevision
    performanceLoading.value = false
    loadingPerformanceSourceCode = undefined
    if (!force && performanceSettings.value?.sourceCode === position.sourceCode) return
    const cached = performanceBySourceCode.value[position.sourceCode]
    if (!force && cached) { performanceSettings.value = { ...cached }; return }
    const observedSession = state.session
    loadingPerformanceSourceCode = position.sourceCode
    performanceLoading.value = true
    clearFeedback()
    try {
      const result = await observedSession.getPerformance(position.sourceCode)
      if (state.session === observedSession && readRevision === performanceReadRevision) {
        performanceSettings.value = result
        performanceBySourceCode.value = { ...performanceBySourceCode.value, [result.sourceCode]: result }
      }
    } catch (cause) { if (state.session === observedSession && readRevision === performanceReadRevision) fail(cause) }
    finally {
      if (readRevision === performanceReadRevision) {
        performanceLoading.value = false
        loadingPerformanceSourceCode = undefined
      }
    }
  }

  async function updatePerformance(settings: KeyPerformanceSettings) {
    if (!state.session || !profile.value?.capabilities.performance || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try {
      performanceSettings.value = await state.session.updatePerformance(settings)
      performanceBySourceCode.value = { ...performanceBySourceCode.value, [performanceSettings.value.sourceCode]: performanceSettings.value }
      status.value = 'ready'
      message.value = '性能设置已写入并通过回读验证'
    } catch (cause) { fail(cause) }
  }

  /** 批量读取全部键位参数；协议适配器会把相同 Layout 合并成每包 14 键。 */
  async function loadPerformanceMap(force = false) {
    if (!state.session || !profile.value?.capabilities.performance || performanceMapLoading.value || ['connecting', 'writing'].includes(status.value)) return
    const positions = profile.value.positions
    if (!force && positions.every((position) => performanceBySourceCode.value[position.sourceCode])) return
    const observedSession = state.session
    const readRevision = ++performanceMapReadRevision
    performanceMapLoading.value = true
    try {
      const results = await observedSession.getPerformances(positions.map((position) => position.sourceCode))
      if (state.session !== observedSession || readRevision !== performanceMapReadRevision) return
      performanceBySourceCode.value = Object.fromEntries(results.map((settings) => [settings.sourceCode, settings]))
      const currentSourceCode = positions.find((position) => position.id === selectedPositionId.value)?.sourceCode
      if (currentSourceCode && performanceBySourceCode.value[currentSourceCode]) performanceSettings.value = { ...performanceBySourceCode.value[currentSourceCode]! }
    } catch (cause) { if (state.session === observedSession && readRevision === performanceMapReadRevision) fail(cause) }
    finally { if (readRevision === performanceMapReadRevision) performanceMapLoading.value = false }
  }

  /** 批量写入仍逐键执行设备回读验证，任何键失败都会停止并显示真实错误。 */
  async function updatePerformances(settingsList: KeyPerformanceSettings[]) {
    if (!state.session || !profile.value?.capabilities.performance || !settingsList.length || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try {
      const next = { ...performanceBySourceCode.value }
      const verifiedSettings = await state.session.updatePerformances(settingsList)
      for (const verified of verifiedSettings) {
        next[verified.sourceCode] = verified
        if (verified.sourceCode === performanceSettings.value?.sourceCode) performanceSettings.value = verified
      }
      // 整批回读验证成功后一次替换缓存，避免界面在写入期间呈现半套全局状态。
      performanceBySourceCode.value = next
      status.value = 'ready'
      message.value = `已写入并验证 ${settingsList.length} 个按键的性能设置`
    } catch (cause) { fail(cause) }
  }

  async function loadPollingRate() {
    if (!state.session || !profile.value?.capabilities.pollingRates?.length) return
    const observedSession = state.session
    const isCurrent = pollingRateRequests.begin()
    try {
      const result = await observedSession.getPollingRate()
      if (isCurrent() && state.session === observedSession) pollingRate.value = result
    } catch (cause) { if (isCurrent() && state.session === observedSession) fail(cause) }
  }

  async function updatePollingRate(rate: PollingRate) {
    if (!state.session || !profile.value?.capabilities.pollingRates?.includes(rate) || !['ready', 'error'].includes(status.value)) return
    pollingRateRequests.invalidate()
    clearFeedback(); status.value = 'writing'
    try { pollingRate.value = await state.session.updatePollingRate(rate); status.value = 'ready'; message.value = `回报率已设置为 ${rate} Hz` }
    catch (cause) { fail(cause) }
  }

  async function readTravelMatrix() {
    // 性能参数读取会连续访问布局字段；此时不再追加矩阵轮询，避免无意义排队和页面切键延迟。
    if (!state.session || !profile.value?.capabilities.travelTest || status.value !== 'ready' || performanceLoading.value || travelReading.value) return
    const observedSession = state.session
    const isCurrent = travelRequests.begin()
    travelReading.value = true
    try {
      const result = await observedSession.getTravelMatrix()
      if (!isCurrent() || state.session !== observedSession) return
      travelMatrix.value = result
      consecutiveTravelReadFailures = 0
      // 行程采样曾短暂失败但随后恢复时，清掉仅由采样产生的协议提示。
      if (['PROTOCOL_CRC_ERROR', 'PROTOCOL_REJECTED', 'PROTOCOL_TIMEOUT'].includes(errorCode.value ?? '')) {
        error.value = ''
        errorCode.value = undefined
      }
    } catch (cause) {
      if (!isCurrent() || state.session !== observedSession) return
      const driverError = toDriverError(cause)
      const recoverableSamplingError = driverError.recoverable
        && ['PROTOCOL_CRC_ERROR', 'PROTOCOL_REJECTED', 'PROTOCOL_TIMEOUT'].includes(driverError.code)
      if (!recoverableSamplingError) fail(driverError)
      else if (++consecutiveTravelReadFailures >= 3) {
        // 实时采样失败不改变会话 ready 状态，否则轮询自身会被永久停止；后续成功会自动清除。
        error.value = `行程采样暂时异常，正在自动重试：${driverError.message}`
        errorCode.value = driverError.code
      }
    }
    finally { if (isCurrent()) travelReading.value = false }
  }

  async function startCalibration() {
    if (!state.session || !profile.value?.capabilities.calibration || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try { await state.session.startCalibration(); calibrationActive.value = true; status.value = 'ready'; message.value = '校准已开始，请依次将所有按键按到底' }
    catch (cause) { fail(cause) }
  }

  async function finishCalibration() {
    if (!state.session || !profile.value?.capabilities.calibration || !calibrationActive.value) return
    clearFeedback(); status.value = 'writing'
    try { await state.session.finishCalibration(); calibrationActive.value = false; status.value = 'ready'; message.value = '键盘校准已完成' }
    catch (cause) { fail(cause) }
  }

  async function loadMacro(positionId = selectedPositionId.value, force = false) {
    if (!state.session || !profile.value?.capabilities.macro || !positionId || ['connecting', 'writing'].includes(status.value)) return
    const position = profile.value.positions.find((item) => item.id === positionId)
    if (!position) return
    if (!force && (macro.value?.sourceCode === position.sourceCode || macroLoading.value && loadingMacroSourceCode === position.sourceCode)) return
    const observedSession = state.session
    const readRevision = ++macroReadRevision
    loadingMacroSourceCode = position.sourceCode
    macroLoading.value = true
    clearFeedback()
    try {
      const result = await observedSession.getMacro(position.sourceCode)
      if (state.session === observedSession && readRevision === macroReadRevision) {
        macro.value = restoreMacroSnapshot(macroSnapshotContext(), result)
        if (macro.value.sourceCode !== 0xff) macroSlots.value = { ...macroSlots.value, [macro.value.index]: macro.value }
        rememberMacroBinding(macro.value)
      }
    } catch (cause) {
      if (state.session === observedSession && readRevision === macroReadRevision) fail(cause)
    } finally {
      if (readRevision === macroReadRevision) { macroLoading.value = false; loadingMacroSourceCode = undefined }
    }
  }

  async function updateMacro(settings: MacroSettings) {
    if (!state.session || !profile.value?.capabilities.macro || !['ready', 'error'].includes(status.value)) return
    const session = state.session
    const context = macroSnapshotContext()
    const isCurrent = macroWrites.begin()
    macroReadRevision++
    macroLoading.value = false
    loadingMacroSourceCode = undefined
    clearFeedback(); status.value = 'writing'
    try {
      const bindings = [...new Set(settings.boundSourceCodes ?? [])]
      const previous = macroSlots.value[settings.index]
      const removedBindings = (previous?.boundSourceCodes ?? []).filter((sourceCode) => !bindings.includes(sourceCode))
      for (const sourceCode of removedBindings) {
        await session.deleteMacroBinding(sourceCode)
        if (!isCurrent() || state.session !== session) return
      }
      let verified: MacroSettings | undefined
      // 同一 index 是同一套宏正文；逐键发送 0x21 只是建立多份“物理键 → 槽位”绑定。
      for (const sourceCode of bindings) {
        verified = await session.updateMacro({ ...settings, sourceCode, boundSourceCodes: bindings })
        if (!isCurrent() || state.session !== session) return
      }
      // 没有绑定键时固件没有可寻址入口，先保存为网页草稿；首次绑定时再写入设备。
      const saved = { ...(verified ?? settings), sourceCode: bindings[0] ?? 0xff, boundSourceCodes: bindings, actions: settings.actions, storedActionCount: settings.actions.length, actionsAvailable: true }
      saveMacroSnapshot(context, saved)
      // 一个物理键只能指向一个宏槽位，从其他槽位的本地绑定索引中移除它。
      const nextSlots = { ...macroSlots.value, [settings.index]: saved }
      for (const [slotIndex, slot] of Object.entries(nextSlots)) {
        if (Number(slotIndex) === settings.index) continue
        const remaining = (slot.boundSourceCodes ?? []).filter((sourceCode) => !bindings.includes(sourceCode))
        if (remaining.length === (slot.boundSourceCodes ?? []).length) continue
        nextSlots[Number(slotIndex)] = { ...slot, sourceCode: remaining[0] ?? 0xff, boundSourceCodes: remaining }
        saveMacroSnapshot(context, nextSlots[Number(slotIndex)]!)
      }
      macroSlots.value = nextSlots
      macro.value = saved
      rebuildMacroBindings()
      status.value = 'ready'
      messageWarning.value = !bindings.length
      message.value = bindings.length ? '宏已写入，槽位和执行参数已通过设备回读验证' : '宏已保存为未绑定草稿，绑定按键并保存后可写入键盘'
    }
    catch (cause) { if (isCurrent() && state.session === session) fail(cause) }
  }

  /** 清除当前槽位：先解除真机上的全部入口，再删除网页保存的动作正文。 */
  async function deleteMacro(index: number) {
    if (!state.session || !profile.value?.capabilities.macro || !['ready', 'error'].includes(status.value)) return
    const session = state.session
    const context = macroSnapshotContext()
    const isCurrent = macroWrites.begin()
    macroReadRevision++
    macroLoading.value = false
    loadingMacroSourceCode = undefined
    clearFeedback(); status.value = 'writing'
    try {
      const settings = macroSlots.value[index]
      for (const sourceCode of settings?.boundSourceCodes ?? []) {
        await session.deleteMacroBinding(sourceCode)
        if (!isCurrent() || state.session !== session) return
      }
      deleteMacroSnapshot(context, index)
      const nextSlots = { ...macroSlots.value }
      delete nextSlots[index]
      macroSlots.value = nextSlots
      if (selectedMacroSlot.value === index) macro.value = undefined
      rebuildMacroBindings()
      status.value = 'ready'; message.value = `已清除 M${index + 1} 的动作和全部按键绑定`
    } catch (cause) { if (isCurrent() && state.session === session) fail(cause) }
  }

  function handleDisconnect() {
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
    pollingRateRequests.invalidate()
    travelRequests.invalidate()
    customLighting.value = []
    customLightingLoading.value = false
    consecutiveTravelReadFailures = 0
    loadingPerformanceSourceCode = undefined
    advancedKeyActions.invalidate()
    performanceReadRevision++
    performanceMapReadRevision++
    performanceSettings.value = undefined
    performanceLoading.value = false
    performanceBySourceCode.value = {}
    performanceMapLoading.value = false
    pollingRate.value = undefined
    travelMatrix.value = []
    travelReading.value = false
    calibrationActive.value = false
    invalidateMacroCache()
  }
  function invalidateMacroCache() {
    macroWrites.invalidate()
    macroReadRevision++
    macro.value = undefined
    macroSlots.value = {}
    macroLoading.value = false
    loadingMacroSourceCode = undefined
    macroBindings.value = {}
  }
  function macroSnapshotContext(): MacroSnapshotContext {
    if (!profile.value) throw new Error('尚未读取设备配置')
    return { driverId: driverId.value, profile: profile.value, configuration: activeConfiguration.value, mode: mode.value }
  }
  /**
   * 进入宏页面或切换设备配置后扫描每个物理键的 0x21 元数据。
   * 本地快照只能补足协议无法回读的动作正文，绝不能凭自己创建宏槽和绑定。
   */
  async function loadMacrosFromDevice() {
    // 模式/配置同步会在 reading 期间调用；writing、disconnected 不得启动新扫描。
    if (!state.session || !profile.value?.capabilities.macro || macroLoading.value || !['ready', 'error', 'reading'].includes(status.value)) return
    const observedSession = state.session
    const observedProfile = profile.value
    const context = macroSnapshotContext()
    // 未绑定宏在固件中没有物理键入口，只能作为网页草稿保留；有绑定的旧快照必须由设备确认。
    const localUnbound = listMacroSnapshots(context).filter((settings) => !(settings.boundSourceCodes?.length))
    const readRevision = ++macroReadRevision
    macroLoading.value = true
    try {
      const results: MacroSettings[] = []
      // 协议没有事务序号，同命令必须逐键串行读取，避免 0xA1 响应对应错物理键。
      for (const position of observedProfile.positions) {
        results.push(await observedSession.getMacro(position.sourceCode))
        // 不仅丢弃最终结果，也在当前响应结束后停止向旧上下文继续追加命令。
        if (state.session !== observedSession || readRevision !== macroReadRevision) return
      }
      if (state.session !== observedSession || readRevision !== macroReadRevision) return
      const nextSlots: Record<number, MacroSettings> = {}
      for (const deviceSettings of results) {
        if (deviceSettings.sourceCode === 0xff) continue
        const restored = restoreMacroSnapshot(context, deviceSettings)
        const existing = nextSlots[restored.index]
        if (!existing) nextSlots[restored.index] = restored
        else nextSlots[restored.index] = {
          // 一个槽位可由多个键触发，但本次扫描中的每个物理键只会落入一个槽位。
          ...(existing.actionsAvailable ? existing : restored),
          boundSourceCodes: [...new Set([...(existing.boundSourceCodes ?? []), restored.sourceCode])],
        }
      }
      for (const draft of localUnbound) if (!nextSlots[draft.index]) nextSlots[draft.index] = draft
      macroSlots.value = nextSlots
      replaceMacroSnapshots(context, Object.values(nextSlots))
      rebuildMacroBindings()
    } catch (cause) {
      if (state.session === observedSession && readRevision === macroReadRevision) fail(cause)
    } finally {
      if (readRevision === macroReadRevision) macroLoading.value = false
    }
  }
  function rebuildMacroBindings() {
    macroBindings.value = Object.fromEntries(Object.values(macroSlots.value).flatMap((settings) => (settings.boundSourceCodes ?? []).map((sourceCode) => [sourceCode, `M${settings.index + 1}`])))
  }
  function selectMacroSlot(index: number) {
    const slotCount = profile.value?.capabilities.macroSlots ?? 0
    if (Number.isInteger(index) && index >= 0 && index < slotCount) selectedMacroSlot.value = index
  }
  /** 设备回读为空时移除过期角标；绑定是否存在只看 0x21 的 sourceCode，不能依赖缺失的动作数。 */
  function rememberMacroBinding(settings: MacroSettings) {
    const nextSlots = { ...macroSlots.value }
    if (settings.sourceCode !== 0xff) {
      const slot = nextSlots[settings.index] ?? settings
      nextSlots[settings.index] = { ...slot, boundSourceCodes: [...new Set([...(slot.boundSourceCodes ?? []), settings.sourceCode])] }
    } else {
      for (const [index, slot] of Object.entries(nextSlots)) nextSlots[Number(index)] = { ...slot, boundSourceCodes: (slot.boundSourceCodes ?? []).filter((code) => code !== settings.sourceCode) }
    }
    macroSlots.value = nextSlots
    rebuildMacroBindings()
  }
  function fail(cause: unknown) {
    // 所有外层异常在这里收敛为稳定错误码，Vue 组件只处理展示，不解析底层异常。
    const driverError = toDriverError(cause)
    status.value = 'error'; error.value = driverError.message; errorCode.value = driverError.code
  }

  return { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message, messageWarning, demo, driverId, saveProgress, lighting, customLighting, customLightingLoading, advancedKey, advancedKeyLoading, advancedKeyTypes, macro, macroSlots, selectedMacroSlot, macroBindings, macroLoading, performanceSettings, performanceLoading, performanceBySourceCode, performanceMapLoading, pollingRate, travelMatrix, travelReading, calibrationActive, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels, connect, reconnectAuthorized, assignKey, selectLayer, selectMode, selectConfiguration, selectMacroSlot, updateLighting, reloadLighting, loadCustomLighting, updateCustomLighting, loadAdvancedKey, loadAdvancedKeyTypes, updateAdvancedKey, deleteAdvancedKey, loadPerformance, loadPerformanceMap, updatePerformance, updatePerformances, loadPollingRate, updatePollingRate, readTravelMatrix, startCalibration, finishCalibration, loadMacro, loadMacrosFromDevice, updateMacro, deleteMacro, reload, restoreAllKeyDefaults, restoreKeyDefault, restoreFactory }
})
