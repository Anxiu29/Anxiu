import { defineStore } from 'pinia'
import type { KeyboardDriverService } from '@/application/KeyboardDriverService'
import type { KeyboardConfiguration, KeyboardMode } from '@/domain/keyboard'
import { toDriverError } from '@/application/DriverError'
import { createDriverState } from './driverState'
import type { LightingSettings } from '@/domain/lighting'
import type { AdvancedKeySettings } from '@/domain/advancedKey'
import type { MacroSettings } from '@/domain/macro'

/** 由组合根注入应用服务，Store 不再知道具体设备和全局单例。 */
export const createDriverStore = (driverService: KeyboardDriverService) => defineStore('driver', () => {
  const state = createDriverState()
  const { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message, demo, driverId, revision, saveProgress, lighting, advancedKey, advancedKeyLoading, advancedKeyTypes, macro, macroLoading, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels } = state
  let removeModeListener: () => void = () => undefined
  let removeConfigurationListener: () => void = () => undefined
  let advancedKeyReadRevision = 0
  let loadingAdvancedSourceCode: number | undefined
  let macroReadRevision = 0
  let loadingMacroSourceCode: number | undefined

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
    try { profile.value = await state.session.reload(); lighting.value = profile.value.capabilities.lighting ? await state.session.getLighting() : undefined; revision.value++; status.value = 'ready'; message.value = '已重新读取设备配置' }
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
      await state.session.restoreFactory()
      await driverService.disconnect()
      removeDeviceStateListeners()
      state.session = undefined
      driverId.value = undefined
      profile.value = undefined
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
      revision.value++
      mode.value = profile.value.mode ?? targetMode
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
      revision.value++
      activeConfiguration.value = configuration
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

  async function loadAdvancedKey(positionId = selectedPositionId.value) {
    if (!state.session || !profile.value?.capabilities.advancedKey || !positionId || ['connecting', 'writing'].includes(status.value)) return
    const position = profile.value.positions.find((item) => item.id === positionId)
    if (!position) return
    // 页面重新挂载或同一键被重复点击时复用已有数据/请求，不再向 HID 队列追加相同命令。
    if (advancedKey.value?.sourceCode === position.sourceCode || advancedKeyLoading.value && loadingAdvancedSourceCode === position.sourceCode) return
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

  async function updateAdvancedKey(settings: Exclude<AdvancedKeySettings, { type: 'none' }>) {
    if (!state.session || !profile.value?.capabilities.advancedKey || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try { advancedKey.value = await state.session.updateAdvancedKey(settings); rememberAdvancedKeyType(advancedKey.value); status.value = 'ready'; message.value = '高级键已写入并通过回读验证' }
    catch (cause) { fail(cause) }
  }

  async function deleteAdvancedKey(sourceCode: number) {
    if (!state.session || !profile.value?.capabilities.advancedKey || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try { advancedKey.value = await state.session.deleteAdvancedKey(sourceCode); rememberAdvancedKeyType(advancedKey.value); status.value = 'ready'; message.value = '已清除当前按键的高级键设置' }
    catch (cause) { fail(cause) }
  }

  async function loadMacro(positionId = selectedPositionId.value) {
    if (!state.session || !profile.value?.capabilities.macro || !positionId || ['connecting', 'writing'].includes(status.value)) return
    const position = profile.value.positions.find((item) => item.id === positionId)
    if (!position) return
    if (macro.value?.sourceCode === position.sourceCode || macroLoading.value && loadingMacroSourceCode === position.sourceCode) return
    const observedSession = state.session
    const readRevision = ++macroReadRevision
    loadingMacroSourceCode = position.sourceCode
    macroLoading.value = true
    clearFeedback()
    try {
      const result = await observedSession.getMacro(position.sourceCode)
      if (state.session === observedSession && readRevision === macroReadRevision) macro.value = result
    } catch (cause) {
      if (state.session === observedSession && readRevision === macroReadRevision) fail(cause)
    } finally {
      if (readRevision === macroReadRevision) { macroLoading.value = false; loadingMacroSourceCode = undefined }
    }
  }

  async function updateMacro(settings: MacroSettings) {
    if (!state.session || !profile.value?.capabilities.macro || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try { macro.value = await state.session.updateMacro(settings); status.value = 'ready'; message.value = '宏已写入并通过回读验证' }
    catch (cause) { fail(cause) }
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
      if (state.session !== observedSession) return
      mode.value = profile.value.mode ?? targetMode
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
      if (state.session !== observedSession) return
      layer.value = 0
      selectedPositionId.value = profile.value.positions[0]?.id
      revision.value++
      status.value = 'ready'
      message.value = `检测到键盘已切换到配置 ${configuration}，已同步四层映射`
    } catch (cause) { fail(cause) }
  }
  function clearFeedback() { error.value = ''; errorCode.value = undefined; message.value = '' }
  /** 模式、配置槽或设备会话改变后，上一上下文的单键缓存和在途结果都必须失效。 */
  function invalidateAdvancedKeyCache() {
    advancedKeyReadRevision++
    advancedKey.value = undefined
    advancedKeyLoading.value = false
    loadingAdvancedSourceCode = undefined
    advancedKeyTypes.value = {}
    invalidateMacroCache()
  }
  function invalidateMacroCache() {
    macroReadRevision++
    macro.value = undefined
    macroLoading.value = false
    loadingMacroSourceCode = undefined
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

  return { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message, demo, driverId, saveProgress, lighting, advancedKey, advancedKeyLoading, advancedKeyTypes, macro, macroLoading, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels, connect, reconnectAuthorized, assignKey, selectLayer, selectMode, selectConfiguration, updateLighting, reloadLighting, loadAdvancedKey, updateAdvancedKey, deleteAdvancedKey, loadMacro, updateMacro, reload, restoreAllKeyDefaults, restoreKeyDefault, restoreFactory }
})
