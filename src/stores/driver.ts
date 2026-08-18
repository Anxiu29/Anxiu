import { defineStore } from 'pinia'
import type { KeyboardDriverService } from '@/application/KeyboardDriverService'
import type { KeyboardConfiguration, KeyboardMode } from '@/domain/keyboard'
import { toDriverError } from '@/application/DriverError'
import { createDriverState } from './driverState'

/** 由组合根注入应用服务，Store 不再知道具体设备和全局单例。 */
export const createDriverStore = (driverService: KeyboardDriverService) => defineStore('driver', () => {
  const state = createDriverState()
  const { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message, demo, driverId, revision, saveProgress, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels } = state

  /** 建立新会话后统一读取 Profile；真机和演示模式共用后续状态流。 */
  async function connect(useDemo = false) {
    clearFeedback(); status.value = 'connecting'; demo.value = useDemo; mode.value = 'win'; layer.value = 0; activeConfiguration.value = 1
    try {
      state.session = await driverService.connect({ demo: useDemo, onDisconnect: handleDisconnect })
      driverId.value = driverService.driverId
      await readProfile()
      message.value = useDemo ? '已进入演示模式' : '键盘连接成功'
    } catch (cause) { fail(cause) }
  }

  /** 浏览器只允许无提示重连已经授权过的 HID 设备；没有授权设备不是错误。 */
  async function reconnectAuthorized() {
    clearFeedback(); status.value = 'connecting'; mode.value = 'win'; layer.value = 0; activeConfiguration.value = 1
    try {
      state.session = await driverService.reconnectAuthorized({ onDisconnect: handleDisconnect })
      if (!state.session) { status.value = 'idle'; return }
      driverId.value = driverService.driverId
      await readProfile()
    } catch (cause) { fail(cause) }
  }

  async function readProfile() {
    if (!state.session) return
    status.value = 'reading'
    profile.value = await state.session.load()
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
    clearFeedback(); status.value = 'reading'
    try { profile.value = await state.session.reload(); revision.value++; status.value = 'ready'; message.value = '已重新读取设备配置' }
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
    clearFeedback(); status.value = 'reading'
    try {
      profile.value = await state.session.switchMode(targetMode)
      revision.value++
      mode.value = targetMode
      layer.value = 0
      selectedPositionId.value = profile.value.positions[0]?.id
      status.value = 'ready'
      message.value = targetMode === 'mac' ? '已切换至 Mac 模式并读取 Mac 四层映射' : '已切换至 Windows 模式并重新读取四层映射'
    } catch (cause) { fail(cause) }
  }

  /** 四个配置槽是设备端状态，切换成功后回到 FN1 并重建当前 Profile。 */
  async function selectConfiguration(configuration: KeyboardConfiguration) {
    if (!state.session || !profile.value || activeConfiguration.value === configuration || ['connecting', 'reading', 'writing'].includes(status.value)) return
    clearFeedback(); status.value = 'reading'
    try {
      profile.value = await state.session.switchConfiguration(configuration)
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

  function handleDisconnect() {
    // 保留 profile/draft 供用户查看；操作入口会根据 disconnected 状态被禁用。
    status.value = 'disconnected'
    error.value = '键盘已断开连接，未保存的草稿仍保留在页面中'
  }
  function clearFeedback() { error.value = ''; errorCode.value = undefined; message.value = '' }
  function fail(cause: unknown) {
    // 所有外层异常在这里收敛为稳定错误码，Vue 组件只处理展示，不解析底层异常。
    const driverError = toDriverError(cause)
    status.value = 'error'; error.value = driverError.message; errorCode.value = driverError.code
  }

  return { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message, demo, driverId, saveProgress, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels, connect, reconnectAuthorized, assignKey, selectLayer, selectMode, selectConfiguration, reload, restoreAllKeyDefaults, restoreKeyDefault, restoreFactory }
})
