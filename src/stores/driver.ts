import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DeviceSession } from '@/application/DeviceSession'
import { keyboardDriverService } from '@/composition/root'
import type { KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import { toDriverError, type DriverErrorCode } from '@/application/DriverError'
import type { SaveProgress } from '@/application/SaveConfiguration'

export const useDriverStore = defineStore('driver', () => {
  const status = ref<SessionStatus>('idle')
  const profile = ref<KeyboardProfile>()
  const layer = ref(0)
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
    clearFeedback(); status.value = 'connecting'; demo.value = useDemo
    try {
      session = await keyboardDriverService.connect({ demo: useDemo, onDisconnect: handleDisconnect })
      await readProfile()
      message.value = useDemo ? '已进入演示模式' : '键盘连接成功'
    } catch (cause) { fail(cause) }
  }

  async function reconnectAuthorized() {
    clearFeedback(); status.value = 'connecting'
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

  function assignKey(keyCode: number) {
    if (!session || !selectedPositionId.value) return
    const key = session.keyCatalog.get(keyCode)
    session.update(selectedPositionId.value, layer.value, key.code, key.category)
    revision.value++
  }

  async function save() {
    if (!session || !dirty.value) return
    clearFeedback(); status.value = 'writing'; saveProgress.value = undefined
    try {
      await session.save((progress) => { saveProgress.value = progress })
      revision.value++
      status.value = 'ready'
      message.value = '配置已写入并通过回读验证'
    } catch (cause) { fail(cause) }
  }

  async function reload() {
    if (!session) return
    clearFeedback(); status.value = 'reading'
    try { profile.value = await session.reload(); revision.value++; status.value = 'ready'; message.value = '已重新读取设备配置' }
    catch (cause) { fail(cause) }
  }

  async function restoreFactory() {
    if (!session) return
    clearFeedback(); status.value = 'writing'
    try {
      await session.restoreFactory(); revision.value++
      if (demo.value) {
        profile.value = await session.load(); status.value = 'ready'; message.value = '已恢复出厂配置'
      } else {
        profile.value = undefined; selectedPositionId.value = undefined; status.value = 'disconnected'
        message.value = '已恢复出厂配置，设备将重新枚举，请稍后重新连接'
      }
    } catch (cause) { fail(cause) }
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

  return { status, profile, layer, selectedPositionId, error, errorCode, message, demo, saveProgress, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels, connect, reconnectAuthorized, assignKey, save, reload, restoreFactory }
})
