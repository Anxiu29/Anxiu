import { computed, ref, shallowRef } from 'vue'
import type { DeviceSession } from '@/application/DeviceSession'
import type { SaveProgress } from '@/application/SaveConfiguration'
import type { KeyboardConfiguration, KeyboardMode, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import type { DriverErrorCode } from '@/application/DriverError'
import type { LightingSettings } from '@/domain/lighting'
import type { AdvancedKeySettings } from '@/domain/advancedKey'
import type { MacroSettings } from '@/domain/macro'

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
  // 表现层通过驱动 id 选择对应图片、几何和方案名称，不根据 VID/PID 猜设备型号。
  const driverId = ref<string>()
  const revision = ref(0)
  const saveProgress = ref<SaveProgress>()
  const lighting = ref<LightingSettings>()
  const advancedKey = ref<AdvancedKeySettings>()
  /** 高级键是页面级按需读取，不占用全局 reading，避免读取期间锁死侧边导航。 */
  const advancedKeyLoading = ref(false)
  /** 只记录本会话已读取或成功写入的高级键类型，用于在键盘上显示角标。 */
  const advancedKeyTypes = ref<Record<number, string>>({})
  const macro = ref<MacroSettings>()
  /** 固定宏槽位的唯一正文；键位绑定不再复制一份宏内容。 */
  const macroSlots = ref<Record<number, MacroSettings>>({})
  /** 已确认或由本驱动保存的宏绑定，用于在键盘上显示 M1~M16 角标。 */
  const macroBindings = ref<Record<number, string>>({})
  /** 宏读取和高级键读取一样按页面按需执行，不占用全局 reading 状态。 */
  const macroLoading = ref(false)
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
    demo, driverId, revision, saveProgress, lighting, advancedKey, advancedKeyLoading, advancedKeyTypes, macro, macroSlots, macroBindings, macroLoading, connected, dirty, assignments, selectedAssignment, keyOptions, keyLabels,
    get session() { return activeSession.value },
    set session(value: DeviceSession | undefined) { activeSession.value = value },
  }
}
