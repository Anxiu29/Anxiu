import { computed, ref, shallowRef } from 'vue'
import type { DeviceSession } from '@/application/DeviceSession'
import type { SaveProgress } from '@/application/SaveConfiguration'
import type { KeyboardConfiguration, KeyboardMode, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import type { DriverErrorCode } from '@/application/DriverError'

/** Driver Store 的响应式状态与派生查询；不执行连接、协议或写入操作。 */
export const createDriverState = () => {
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
  // DeviceSession 是可变的类实例，用 shallowRef 只追踪“会话被替换”，避免 Vue 深度代理协议对象。
  const activeSession = shallowRef<DeviceSession>()

  const connected = computed(() => ['ready', 'writing', 'reading'].includes(status.value))
  // Session 内的 draft 不是 Vue 响应式对象；操作完成后递增 revision，显式通知这些查询重算。
  const dirty = computed(() => { revision.value; return activeSession.value?.dirty ?? false })
  const assignments = computed(() => { revision.value; return activeSession.value?.draft.filter((item) => item.layer === layer.value) ?? [] })
  const selectedAssignment = computed(() => assignments.value.find((item) => item.positionId === selectedPositionId.value))
  const keyOptions = computed(() => activeSession.value?.keyCatalog.list() ?? [])
  const keyLabels = computed(() => Object.fromEntries(keyOptions.value.map(({ code, label }) => [code, label])))

  return {
    status, profile, layer, mode, activeConfiguration, selectedPositionId, error, errorCode, message,
    demo, revision, saveProgress, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels,
    get session() { return activeSession.value },
    set session(value: DeviceSession | undefined) { activeSession.value = value },
  }
}
