import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DeviceSession } from '@/application/DeviceSession'
import { keyboardDriverService } from '@/composition/root'
import type { KeyboardConfiguration, KeyboardMode, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import { toDriverError, type DriverErrorCode } from '@/application/DriverError'
import type { SaveProgress } from '@/application/SaveConfiguration'

export const useDriverStore = defineStore('driver', () => {
  const status = ref<SessionStatus>('idle')
  const profile = ref<KeyboardProfile>()
  const layer = ref(0)
  const mode = ref<KeyboardMode>('win')
  const activeConfiguration = ref<KeyboardConfiguration>(1)
  const selectedPositionId = ref<string>()
  const error = ref('')
  const errorCode = ref<DriverErrorCode>()
  const message = ref('')
  const demo = ref(false)
  const revision = ref(0)
  const saveProgress = ref<SaveProgress>()
  let session: DeviceSession | undefined

  const connected = computed(() => ['ready', 'writing', 'reading'].includes(status.value))
  const dirty = computed(() => { revision.value; return session?.dirty ?? false })
  const assignments = computed(() => { revision.value; return session?.draft.filter((item) => item.layer === layer.value) ?? [] })
  const selectedAssignment = computed(() => assignments.value.find((item) => item.positionId === selectedPositionId.value))
  const keyOptions = computed(() => session?.keyCatalog.list() ?? [])
  const keyLabels = computed(() => Object.fromEntries(keyOptions.value.map(({ code, label }) => [code, label])))

  async function connect(useDemo = false) {
    clearFeedback(); status.value = 'connecting'; demo.value = useDemo; mode.value = 'win'; layer.value = 0; activeConfiguration.value = 1
    try {
      session = await keyboardDriverService.connect({ demo: useDemo, onDisconnect: handleDisconnect })
      await readProfile()
      message.value = useDemo ? '已进入演示模式' : '键盘连接成功'
    } catch (cause) { fail(cause) }
  }

  async function reconnectAuthorized() {
    clearFeedback(); status.value = 'connecting'; mode.value = 'win'; layer.value = 0; activeConfiguration.value = 1
    try {
      session = await keyboardDriverService.reconnectAuthorized({ onDisconnect: handleDisconnect })
      if (!session) { status.value = 'idle'; return }
      await readProfile()
    } catch (cause) { fail(cause) }
  }

  async function readProfile() {
    if (!session) return
    status.value = 'reading'
    profile.value = await session.load()
    revision.value++
    status.value = 'ready'
    selectedPositionId.value = profile.value.positions[0]?.id
  }

  async function assignKey(keyCode: number) {
    if (!session || !selectedPositionId.value || !['ready', 'error'].includes(status.value)) return
    const positionId = selectedPositionId.value
    const targetLayer = layer.value
    const key = session.keyCatalog.get(keyCode)
    clearFeedback(); status.value = 'writing'; saveProgress.value = undefined
    try {
      const pending = session.updateAndSave(positionId, targetLayer, key.code, key.category, (progress) => { saveProgress.value = progress })
      revision.value++
      const result = await pending
      profile.value = result.profile
      revision.value++
      status.value = 'ready'
      message.value = result.changedAssignments === 0 ? `当前按键已经是“${key.label}”` : `已改为“${key.label}”并通过回读验证`
    } catch (cause) { revision.value++; fail(cause) }
  }

  async function reload() {
    if (!session) return
    clearFeedback(); status.value = 'reading'
    try { profile.value = await session.reload(); revision.value++; status.value = 'ready'; message.value = '已重新读取设备配置' }
    catch (cause) { fail(cause) }
  }

  async function restoreAllKeyDefaults() {
    if (!session) return
    clearFeedback(); status.value = 'writing'; saveProgress.value = undefined
    try {
      const result = await session.restoreAllKeyDefaults((progress) => { saveProgress.value = progress })
      profile.value = result.profile; revision.value++; status.value = 'ready'
      message.value = result.changedAssignments === 0 ? '全部按键已经是默认映射' : `已恢复 ${result.changedAssignments} 个按键映射并通过回读验证`
    } catch (cause) { fail(cause) }
  }

  async function restoreFactory() {
    if (!session || !profile.value || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'
    try {
      await session.restoreFactory()
      await keyboardDriverService.disconnect()
      session = undefined
      profile.value = undefined
      selectedPositionId.value = undefined
      revision.value++
      status.value = 'idle'
      message.value = '已恢复出厂设置，请重新连接键盘'
    } catch (cause) { fail(cause) }
  }

  function selectLayer(targetLayer: number) {
    if (!session || !profile.value || targetLayer < 0 || targetLayer >= profile.value.capabilities.layers || ['connecting', 'reading', 'writing'].includes(status.value)) return
    layer.value = targetLayer
  }

  async function selectMode(targetMode: KeyboardMode) {
    if (!session || !profile.value || ['connecting', 'reading', 'writing'].includes(status.value)) return
    if (mode.value === targetMode) { layer.value = 0; return }
    clearFeedback(); status.value = 'reading'
    try {
      profile.value = await session.switchMode(targetMode)
      revision.value++
      mode.value = targetMode
      layer.value = 0
      selectedPositionId.value = profile.value.positions[0]?.id
      status.value = 'ready'
      message.value = targetMode === 'mac' ? '已切换至 Mac 模式并读取 Mac 四层映射' : '已切换至 Windows 模式并重新读取四层映射'
    } catch (cause) { fail(cause) }
  }

  async function selectConfiguration(configuration: KeyboardConfiguration) {
    if (!session || !profile.value || activeConfiguration.value === configuration || ['connecting', 'reading', 'writing'].includes(status.value)) return
    clearFeedback(); status.value = 'reading'
    try {
      profile.value = await session.switchConfiguration(configuration)
      revision.value++
      activeConfiguration.value = configuration
      layer.value = 0
      selectedPositionId.value = profile.value.positions[0]?.id
      status.value = 'ready'
      message.value = `已切换到配置 ${configuration} 并重新读取键位映射`
    } catch (cause) { fail(cause) }
  }

  async function restoreKeyDefault(positionId: string, targetLayer: number) {
    if (!session || !['ready', 'error'].includes(status.value)) return
    clearFeedback(); status.value = 'writing'; saveProgress.value = undefined
    try {
      const pending = session.restoreKeyDefaultAndSave(positionId, targetLayer, (progress) => { saveProgress.value = progress })
      revision.value++
      const result = await pending
      profile.value = result.profile; revision.value++; status.value = 'ready'
      message.value = result.changedAssignments === 0 ? '该按键已经是默认映射' : '已恢复当前按键默认映射并通过回读验证'
    } catch (cause) { revision.value++; fail(cause) }
  }

  function handleDisconnect() {
    status.value = 'disconnected'
    error.value = '键盘已断开连接，未保存的草稿仍保留在页面中'
  }
  function clearFeedback() { error.value = ''; errorCode.value = undefined; message.value = '' }
  function fail(cause: unknown) {
    const driverError = toDriverError(cause)
    status.value = 'error'; error.value = driverError.message; errorCode.value = driverError.code
  }

  return { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message, demo, saveProgress, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels, connect, reconnectAuthorized, assignKey, selectLayer, selectMode, selectConfiguration, reload, restoreAllKeyDefaults, restoreKeyDefault, restoreFactory }
})
