import { defineStore } from 'pinia'
import type { KeyboardDriverService } from '@/application/KeyboardDriverService'
import type { KeyboardConfiguration, KeyboardMode } from '@/domain/keyboard'
import { toDriverError } from '@/application/DriverError'
import { createDriverState } from './driverState'
import type { CustomKeyLighting, LightingSettings } from '@/domain/lighting'
import type { AdvancedKeySettings } from '@/domain/advancedKey'
import type { MacroSettings } from '@/domain/macro'
import type { KeyPerformanceSettings, PollingRate } from '@/domain/performance'
import { clearDeviceMacroSnapshots, deleteMacroSnapshot, listMacroSnapshots, replaceMacroSnapshots, restoreMacroSnapshot, saveMacroSnapshot, type MacroSnapshotContext } from './macroSnapshots'

/** 由组合根注入应用服务，Store 不再知道具体设备和全局单例。 */
export const createDriverStore = (driverService: KeyboardDriverService) => defineStore('driver', () => {
  const state = createDriverState()
  const { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message, messageWarning, demo, driverId, revision, saveProgress, lighting, customLighting, customLightingLoading, advancedKey, advancedKeyLoading, advancedKeyTypes, macro, macroSlots, selectedMacroSlot, macroBindings, macroLoading, performanceSettings, performanceLoading, pollingRate, travelMatrix, travelReading, calibrationActive, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels } = state
  let removeModeListener: () => void = () => undefined
  let removeConfigurationListener: () => void = () => undefined
  let advancedKeyReadRevision = 0
  let loadingAdvancedSourceCode: number | undefined
  let advancedKeyTypesReadRevision = 0
  let advancedKeyTypesLoading = false
  let macroReadRevision = 0
  let loadingMacroSourceCode: number | undefined
  let performanceReadRevision = 0

  /** 建立新会话后统一读取 Profile；真机和演示模式共用后续状态流。 */
  async function connect(useDemo = false) {
    removeDeviceStateListeners()
    clearFeedback(); status.value = 'connecting'; demo.value = useDemo; mode.value = 'win'; layer.value = 0; activeConfiguration.value = 1
    try {
      state.session = await driverService.connect({ demo: useDemo, onDisconnect: handleDisconnect })
      observeDeviceStateChanges()
      driverId.value = driverService.driverId
      await readProfile()
      message.value = useDemo ? '已进入演示模式' : '键盘连接成功'
    } catch (cause) { fail(cause) }
  }

  /** 浏览器只允许无提示重连已经授权过的 HID 设备；没有授权设备不是错误。 */
  async function reconnectAuthorized() {
    removeDeviceStateListeners()
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
    if (!state.session) return
    status.value = 'reading'
    profile.value = await state.session.load()
    lighting.value = profile.value.capabilities.lighting ? await state.session.getLighting() : undefined
    // 逐键颜色属于当前设备配置，Profile/模式/配置槽变化后必须按需重新读取。
    customLighting.value = []
    invalidateAdvancedKeyCache()
    mode.value = profile.value.mode ?? mode.value
    revision.value++
    status.value = 'ready'
    // 默认选中第一个真实物理键，避免 UI 初次进入时出现无键位上下文。
    selectedPositionId.value = profile.value.positions[0]?.id
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
    clearFeedback(); invalidateAdvancedKeyCache(); status.value = 'reading'
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
      invalidateMacroCache()
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
    clearFeedback(); invalidateAdvancedKeyCache(); status.value = 'reading'
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
    clearFeedback(); invalidateAdvancedKeyCache(); status.value = 'reading'
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

  async function updateLighting(settings: LightingSettings) {
    if (!state.session || !profile.value?.capabilities.lighting || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try {
      lighting.value = await state.session.updateLighting(settings)
      status.value = 'ready'
      message.value = '灯光设置已写入并通过回读验证'
    } catch (cause) { fail(cause) }
  }

  async function reloadLighting() {
    if (!state.session || !profile.value?.capabilities.lighting || ['connecting', 'reading', 'writing'].includes(status.value)) return
    clearFeedback(); status.value = 'reading'
    try { lighting.value = await state.session.getLighting(); status.value = 'ready'; message.value = '已重新读取灯光设置' }
    catch (cause) { fail(cause) }
  }

  async function loadCustomLighting() {
    if (!state.session || !profile.value?.capabilities.customLighting || customLightingLoading.value) return
    customLightingLoading.value = true
    clearFeedback()
    try {
      customLighting.value = await state.session.getCustomLighting(profile.value.positions.map((position) => position.sourceCode))
    } catch (cause) { fail(cause) }
    finally { customLightingLoading.value = false }
  }

  async function updateCustomLighting(items: CustomKeyLighting[]) {
    if (!state.session || !profile.value?.capabilities.customLighting || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try {
      const verified = await state.session.updateCustomLighting(items)
      // 自动保存只回读本次变化的键，必须合并进完整颜色表，不能用局部结果覆盖其余键。
      const merged = new Map(customLighting.value.map((item) => [item.sourceCode, item]))
      verified.forEach((item) => merged.set(item.sourceCode, item))
      customLighting.value = [...merged.values()]
      status.value = 'ready'
      message.value = `已自动保存并回读验证 ${items.length} 个按键的自定义颜色`
    } catch (cause) { fail(cause) }
  }

  async function loadAdvancedKey(positionId = selectedPositionId.value, force = false) {
    if (!state.session || !profile.value?.capabilities.advancedKey || !positionId || ['connecting', 'writing'].includes(status.value)) return
    const position = profile.value.positions.find((item) => item.id === positionId)
    if (!position) return
    // 页面重新挂载或同一键被重复点击时复用已有数据/请求，不再向 HID 队列追加相同命令。
    if ((!force && advancedKey.value?.sourceCode === position.sourceCode) || (advancedKeyLoading.value && loadingAdvancedSourceCode === position.sourceCode)) return
    const observedSession = state.session
    const readRevision = ++advancedKeyReadRevision
    loadingAdvancedSourceCode = position.sourceCode
    advancedKeyLoading.value = true
    clearFeedback()
    try {
      const result = await observedSession.getAdvancedKey(position.sourceCode)
      // 用户可能已经选择另一键或切换设备；过期结果不能覆盖当前页面。
      if (state.session === observedSession && readRevision === advancedKeyReadRevision) {
        advancedKey.value = result
        rememberAdvancedKeyType(result)
      }
    } catch (cause) {
      if (state.session === observedSession && readRevision === advancedKeyReadRevision) fail(cause)
    } finally {
      if (readRevision === advancedKeyReadRevision) {
        advancedKeyLoading.value = false
        loadingAdvancedSourceCode = undefined
      }
    }
  }

  async function loadAdvancedKeyTypes() {
    if (!state.session || !profile.value?.capabilities.advancedKey || advancedKeyTypesLoading) return
    const observedSession = state.session
    const readRevision = ++advancedKeyTypesReadRevision
    advancedKeyTypesLoading = true
    try {
      const types = await observedSession.getAdvancedKeyTypes(profile.value.positions.map((position) => position.sourceCode))
      if (state.session !== observedSession || readRevision !== advancedKeyTypesReadRevision) return
      advancedKeyTypes.value = Object.fromEntries(Object.entries(types).map(([sourceCode, type]) => [Number(sourceCode), type.toUpperCase()]))
      // 每次进入页面都重新扫描类型，并强制刷新当前键的完整参数，避免展示设备外部修改前的旧缓存。
      await loadAdvancedKey(selectedPositionId.value, true)
    } catch (cause) {
      if (state.session === observedSession && readRevision === advancedKeyTypesReadRevision) fail(cause)
    } finally {
      if (readRevision === advancedKeyTypesReadRevision) advancedKeyTypesLoading = false
    }
  }

  async function updateAdvancedKey(settings: Exclude<AdvancedKeySettings, { type: 'none' }>) {
    if (!state.session || !profile.value?.capabilities.advancedKey || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try { advancedKey.value = await state.session.updateAdvancedKey(settings); rememberAdvancedKeyType(advancedKey.value); status.value = 'ready'; message.value = '高级键已写入并通过回读验证' }
    catch (cause) { fail(cause) }
  }

  async function deleteAdvancedKey(sourceCode: number) {
    if (!state.session || !profile.value?.capabilities.advancedKey || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try { advancedKey.value = await state.session.deleteAdvancedKey(sourceCode); rememberAdvancedKeyType(advancedKey.value); status.value = 'ready'; message.value = '已删除当前按键的高级键设置' }
    catch (cause) { fail(cause) }
  }

  async function loadPerformance(positionId = selectedPositionId.value, force = false) {
    if (!state.session || !profile.value?.capabilities.performance || !positionId || performanceLoading.value || ['connecting', 'writing'].includes(status.value)) return
    const position = profile.value.positions.find((item) => item.id === positionId)
    if (!position || !force && performanceSettings.value?.sourceCode === position.sourceCode) return
    const observedSession = state.session
    const readRevision = ++performanceReadRevision
    performanceLoading.value = true
    clearFeedback()
    try {
      const result = await observedSession.getPerformance(position.sourceCode)
      if (state.session === observedSession && readRevision === performanceReadRevision) performanceSettings.value = result
    } catch (cause) { if (state.session === observedSession && readRevision === performanceReadRevision) fail(cause) }
    finally { if (readRevision === performanceReadRevision) performanceLoading.value = false }
  }

  async function updatePerformance(settings: KeyPerformanceSettings) {
    if (!state.session || !profile.value?.capabilities.performance || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try {
      performanceSettings.value = await state.session.updatePerformance(settings)
      status.value = 'ready'
      message.value = '性能设置已写入并通过回读验证'
    } catch (cause) { fail(cause) }
  }

  async function loadPollingRate() {
    if (!state.session || !profile.value?.capabilities.pollingRates?.length) return
    try { pollingRate.value = await state.session.getPollingRate() }
    catch (cause) { fail(cause) }
  }

  async function updatePollingRate(rate: PollingRate) {
    if (!state.session || !profile.value?.capabilities.pollingRates?.includes(rate) || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try { pollingRate.value = await state.session.updatePollingRate(rate); status.value = 'ready'; message.value = `回报率已设置为 ${rate} Hz` }
    catch (cause) { fail(cause) }
  }

  async function readTravelMatrix() {
    if (!state.session || !profile.value?.capabilities.travelTest || travelReading.value) return
    travelReading.value = true
    try { travelMatrix.value = await state.session.getTravelMatrix() }
    catch (cause) { fail(cause) }
    finally { travelReading.value = false }
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
    clearFeedback(); status.value = 'writing'
    try {
      const bindings = [...new Set(settings.boundSourceCodes ?? [])]
      const previous = macroSlots.value[settings.index]
      const removedBindings = (previous?.boundSourceCodes ?? []).filter((sourceCode) => !bindings.includes(sourceCode))
      for (const sourceCode of removedBindings) await state.session.deleteMacroBinding(sourceCode)
      let verified: MacroSettings | undefined
      // 同一 index 是同一套宏正文；逐键发送 0x21 只是建立多份“物理键 → 槽位”绑定。
      for (const sourceCode of bindings) verified = await state.session.updateMacro({ ...settings, sourceCode, boundSourceCodes: bindings })
      // 没有绑定键时固件没有可寻址入口，先保存为网页草稿；首次绑定时再写入设备。
      const saved = { ...(verified ?? settings), sourceCode: bindings[0] ?? 0xff, boundSourceCodes: bindings, actions: settings.actions, storedActionCount: settings.actions.length, actionsAvailable: true }
      saveMacroSnapshot(macroSnapshotContext(), saved)
      // 一个物理键只能指向一个宏槽位，从其他槽位的本地绑定索引中移除它。
      const nextSlots = { ...macroSlots.value, [settings.index]: saved }
      for (const [slotIndex, slot] of Object.entries(nextSlots)) {
        if (Number(slotIndex) === settings.index) continue
        const remaining = (slot.boundSourceCodes ?? []).filter((sourceCode) => !bindings.includes(sourceCode))
        if (remaining.length === (slot.boundSourceCodes ?? []).length) continue
        nextSlots[Number(slotIndex)] = { ...slot, sourceCode: remaining[0] ?? 0xff, boundSourceCodes: remaining }
        saveMacroSnapshot(macroSnapshotContext(), nextSlots[Number(slotIndex)]!)
      }
      macroSlots.value = nextSlots
      macro.value = saved
      rebuildMacroBindings()
      status.value = 'ready'
      messageWarning.value = !bindings.length
      message.value = bindings.length ? '宏已写入，槽位和执行参数已通过设备回读验证' : '宏已保存为未绑定草稿，绑定按键并保存后可写入键盘'
    }
    catch (cause) { fail(cause) }
  }

  /** 清除当前槽位：先解除真机上的全部入口，再删除网页保存的动作正文。 */
  async function deleteMacro(index: number) {
    if (!state.session || !profile.value?.capabilities.macro || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try {
      const settings = macroSlots.value[index]
      for (const sourceCode of settings?.boundSourceCodes ?? []) await state.session.deleteMacroBinding(sourceCode)
      deleteMacroSnapshot(macroSnapshotContext(), index)
      const nextSlots = { ...macroSlots.value }
      delete nextSlots[index]
      macroSlots.value = nextSlots
      if (selectedMacroSlot.value === index) macro.value = undefined
      rebuildMacroBindings()
      status.value = 'ready'; message.value = `已清除 M${index + 1} 的动作和全部按键绑定`
    } catch (cause) { fail(cause) }
  }

  function handleDisconnect() {
    removeDeviceStateListeners()
    invalidateAdvancedKeyCache()
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
    clearFeedback(); invalidateAdvancedKeyCache(); status.value = 'reading'
    try {
      profile.value = await observedSession.load()
      lighting.value = profile.value.capabilities.lighting ? await observedSession.getLighting() : undefined
      customLighting.value = []
      if (state.session !== observedSession) return
      mode.value = profile.value.mode ?? targetMode
      await loadMacrosFromDevice()
      layer.value = 0
      selectedPositionId.value = profile.value.positions[0]?.id
      revision.value++
      status.value = 'ready'
      message.value = mode.value === 'mac' ? '检测到键盘已切换至 Mac 模式，已同步四层映射' : '检测到键盘已切换至 Windows 模式，已同步四层映射'
    } catch (cause) { fail(cause) }
  }

  /** 键盘快捷键切换配置槽后，重读该槽的四层映射并同步左侧配置按钮。 */
  async function syncExternalConfiguration(observedSession: NonNullable<typeof state.session>, configuration: KeyboardConfiguration) {
    if (state.session !== observedSession || status.value === 'disconnected') return
    if (['connecting', 'reading', 'writing'].includes(status.value)) {
      setTimeout(() => void syncExternalConfiguration(observedSession, configuration), 100)
      return
    }
    clearFeedback(); invalidateAdvancedKeyCache(); status.value = 'reading'
    try {
      profile.value = await observedSession.load()
      lighting.value = profile.value.capabilities.lighting ? await observedSession.getLighting() : undefined
      customLighting.value = []
      if (state.session !== observedSession) return
      layer.value = 0
      await loadMacrosFromDevice()
      selectedPositionId.value = profile.value.positions[0]?.id
      revision.value++
      status.value = 'ready'
      message.value = `检测到键盘已切换到配置 ${configuration}，已同步四层映射`
    } catch (cause) { fail(cause) }
  }
  function clearFeedback() { error.value = ''; errorCode.value = undefined; message.value = ''; messageWarning.value = false }
  /** 模式、配置槽或设备会话改变后，上一上下文的单键缓存和在途结果都必须失效。 */
  function invalidateAdvancedKeyCache() {
    advancedKeyReadRevision++
    advancedKeyTypesReadRevision++
    advancedKey.value = undefined
    advancedKeyLoading.value = false
    loadingAdvancedSourceCode = undefined
    advancedKeyTypes.value = {}
    advancedKeyTypesLoading = false
    performanceReadRevision++
    performanceSettings.value = undefined
    performanceLoading.value = false
    pollingRate.value = undefined
    travelMatrix.value = []
    travelReading.value = false
    calibrationActive.value = false
    invalidateMacroCache()
  }
  function invalidateMacroCache() {
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
    if (!state.session || !profile.value?.capabilities.macro || macroLoading.value) return
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
      for (const position of observedProfile.positions) results.push(await observedSession.getMacro(position.sourceCode))
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
  /** 角标只依据设备回读结果更新，未保存的 UI 草稿不会污染键盘状态。 */
  function rememberAdvancedKeyType(settings: AdvancedKeySettings) {
    const next = { ...advancedKeyTypes.value }
    if (settings.type === 'none') delete next[settings.sourceCode]
    else next[settings.sourceCode] = settings.type.toUpperCase()
    advancedKeyTypes.value = next
  }
  function fail(cause: unknown) {
    // 所有外层异常在这里收敛为稳定错误码，Vue 组件只处理展示，不解析底层异常。
    const driverError = toDriverError(cause)
    status.value = 'error'; error.value = driverError.message; errorCode.value = driverError.code
  }

  return { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message, messageWarning, demo, driverId, saveProgress, lighting, customLighting, customLightingLoading, advancedKey, advancedKeyLoading, advancedKeyTypes, macro, macroSlots, selectedMacroSlot, macroBindings, macroLoading, performanceSettings, performanceLoading, pollingRate, travelMatrix, travelReading, calibrationActive, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels, connect, reconnectAuthorized, assignKey, selectLayer, selectMode, selectConfiguration, selectMacroSlot, updateLighting, reloadLighting, loadCustomLighting, updateCustomLighting, loadAdvancedKey, loadAdvancedKeyTypes, updateAdvancedKey, deleteAdvancedKey, loadPerformance, updatePerformance, loadPollingRate, updatePollingRate, readTravelMatrix, startCalibration, finishCalibration, loadMacro, loadMacrosFromDevice, updateMacro, deleteMacro, reload, restoreAllKeyDefaults, restoreKeyDefault, restoreFactory }
})
