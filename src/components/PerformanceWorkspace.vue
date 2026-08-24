<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { KeyPerformanceSettings, PerformanceMode, PollingRate, TravelMatrix } from '@/domain/performance'
import { clonePerformanceSettings } from '@/domain/performance'
import type { KeyAssignment, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import { useFittedKeyboardUnit } from '@/ui/useFittedKeyboardUnit'
import { useHorizontalKeyboardScroll } from '@/ui/useHorizontalKeyboardScroll'
import KeyboardCanvas from './KeyboardCanvas.vue'

const props = defineProps<{
  profile: KeyboardProfile
  status: SessionStatus
  selectedPositionId?: string
  settings?: KeyPerformanceSettings
  loading?: boolean
  pollingRate?: PollingRate
  travelMatrix?: TravelMatrix
  travelReading?: boolean
  calibrationActive?: boolean
  assignments: KeyAssignment[]
  keyLabels: Record<number, string>
  keyGeometry?: KeyGeometryResolver
}>()
const emit = defineEmits<{
  'select-position': [positionId: string]
  load: [positionId: string]
  update: [settings: KeyPerformanceSettings]
  'load-polling-rate': []
  'update-polling-rate': [rate: PollingRate]
  'read-travel': []
  'start-calibration': []
  'finish-calibration': []
}>()

const draft = ref<KeyPerformanceSettings>()
type PerformancePanel = 'settings' | 'travel' | 'calibration'
const activePanel = ref<PerformancePanel>('settings')
const selectedPosition = computed(() => props.profile.positions.find((item) => item.id === props.selectedPositionId))
const busy = computed(() => props.loading || ['connecting', 'reading', 'writing'].includes(props.status))
const travelTestActive = ref(false)
const calibrationMaxTravel = ref<Record<string, number>>({})
const calibratedPositionIds = ref<Set<string>>(new Set())
let travelTimer: number | undefined
/** 把设备矩阵读数映射回 UI 物理位置，行程测试始终覆盖整把键盘。 */
const travelByPosition = computed(() => Object.fromEntries(props.profile.positions.map((position) => {
  const address = position.address
  const value = address.kind === 'matrix' ? props.travelMatrix?.[address.row]?.[address.column] ?? 0 : 0
  return [position.id, Math.max(0, Math.min(4, value))]
})))
const activeTravelPositionIds = computed(() => travelTestActive.value
  ? Object.entries(travelByPosition.value).filter(([, value]) => value > 0.02).map(([id]) => id)
  : [])
const travelBadges = computed(() => travelTestActive.value ? Object.fromEntries(activeTravelPositionIds.value.map((id) => [id, `${travelByPosition.value[id]!.toFixed(2)} mm`])) : {})
const travelKeyColors = computed(() => travelTestActive.value ? Object.fromEntries(activeTravelPositionIds.value.map((id) => {
  const ratio = travelByPosition.value[id]! / 4
  return [id, `rgba(69, 230, 208, ${0.18 + ratio * 0.62})`]
})) : {})
const deepestTravel = computed(() => Math.max(0, ...Object.values(travelByPosition.value)))
const deepestPosition = computed(() => deepestTravel.value > 0.02 ? props.profile.positions.find((position) => travelByPosition.value[position.id] === deepestTravel.value) : undefined)
const travelStatusText = computed(() => {
  if (!travelTestActive.value) return '尚未开始'
  if (props.travelReading) return '正在读取整把键盘…'
  return '全键盘实时测试中'
})
const calibrationBadges = computed(() => Object.fromEntries(props.profile.positions.map((position) => [position.id, `${(calibrationMaxTravel.value[position.id] ?? 0).toFixed(2)} mm`])))
const calibrationKeyColors = computed(() => Object.fromEntries([...calibratedPositionIds.value].map((id) => [id, '#39d98a'])))
const calibrationProgress = computed(() => props.profile.positions.length ? calibratedPositionIds.value.size / props.profile.positions.length * 100 : 0)
const { container: keyboardContainer, unit: keyboardUnit } = useFittedKeyboardUnit(() => props.profile.positions, () => props.keyGeometry, { minUnit: 28 })
useHorizontalKeyboardScroll(keyboardContainer)

const modes: { id: PerformanceMode; title: string; description: string }[] = [
  { id: 'global', title: '全局触发', description: '使用整把键盘统一的触发行程和死区' },
  { id: 'single', title: '单键触发', description: '为当前物理键设置独立触发行程' },
  { id: 'rapid-trigger', title: '快速触发', description: '根据移动方向动态触发与复位' },
]

watch([() => props.settings, () => props.selectedPositionId], ([settings]) => {
  draft.value = settings && settings.sourceCode === selectedPosition.value?.sourceCode ? clonePerformanceSettings(settings) : undefined
}, { immediate: true, deep: true })
watch(() => props.selectedPositionId, (positionId) => {
  if (positionId && props.settings?.sourceCode !== selectedPosition.value?.sourceCode) emit('load', positionId)
}, { immediate: true })
watch(() => props.profile.capabilities.pollingRates, (rates) => { if (rates?.length) emit('load-polling-rate') }, { immediate: true })

const shouldPollTravel = () => travelTestActive.value || (activePanel.value === 'calibration' && props.calibrationActive)
function scheduleTravelRead() {
  if (!shouldPollTravel()) return
  if (props.status === 'ready') emit('read-travel')
  travelTimer = window.setTimeout(scheduleTravelRead, 220)
}
function refreshTravelPolling() {
  if (travelTimer !== undefined) window.clearTimeout(travelTimer)
  travelTimer = undefined
  if (shouldPollTravel()) scheduleTravelRead()
}
function toggleTravelTest() { travelTestActive.value = !travelTestActive.value; refreshTravelPolling() }
/** 切走行程测试时停止轮询，避免隐藏页面继续占用 HID 通信。 */
function selectPanel(panel: PerformancePanel) {
  activePanel.value = panel
  if (panel !== 'travel') travelTestActive.value = false
  refreshTravelPolling()
}
onBeforeUnmount(() => { if (travelTimer !== undefined) window.clearTimeout(travelTimer) })

watch([() => props.calibrationActive, activePanel], refreshTravelPolling)
watch(() => props.travelMatrix, () => {
  if (!props.calibrationActive) return
  const nextMax = { ...calibrationMaxTravel.value }
  const nextCompleted = new Set(calibratedPositionIds.value)
  for (const position of props.profile.positions) {
    const current = travelByPosition.value[position.id] ?? 0
    nextMax[position.id] = Math.max(nextMax[position.id] ?? 0, current)
    // 完整校准动作包含“按到底”和“完全松开”；只按下不松开不算完成。
    if (nextMax[position.id]! >= 3 && current <= 0.1) nextCompleted.add(position.id)
  }
  calibrationMaxTravel.value = nextMax
  calibratedPositionIds.value = nextCompleted
}, { deep: true })

function setMode(mode: PerformanceMode) { if (draft.value) draft.value.mode = mode }
function save() { if (draft.value) emit('update', clonePerformanceSettings(draft.value)) }
function startCalibrationTracking() {
  calibrationMaxTravel.value = {}
  calibratedPositionIds.value = new Set()
  emit('start-calibration')
}
function selectKeyboardPosition(positionId: string) {
  // 行程测试和校准都操作整个矩阵，点击键帽不应切换成单键配置。
  if (activePanel.value === 'settings') emit('select-position', positionId)
}
</script>

<template>
  <section class="performance-workspace">
    <div ref="keyboardContainer" class="panel performance-keyboard-panel" :class="{ 'travel-active': activePanel === 'travel' && travelTestActive, 'calibration-tracking': activePanel === 'calibration' }">
      <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :selected="activePanel === 'travel' || activePanel === 'calibration' ? undefined : selectedPositionId" :pressed="activePanel === 'travel' ? activeTravelPositionIds : []" :badges="activePanel === 'travel' ? travelBadges : activePanel === 'calibration' ? calibrationBadges : {}" :key-colors="activePanel === 'travel' ? travelKeyColors : activePanel === 'calibration' ? calibrationKeyColors : {}" :unit="keyboardUnit" :geometry="keyGeometry" @select="selectKeyboardPosition" />
    </div>

    <section class="panel performance-editor">
      <header class="performance-heading">
        <div class="performance-title"><span class="eyebrow">PERFORMANCE</span><h2>性能设置</h2></div>
        <nav class="performance-tabs" aria-label="性能设置页面">
          <button type="button" :class="{ active: activePanel === 'settings' }" @click="selectPanel('settings')">性能参数</button>
          <button v-if="profile.capabilities.travelTest" type="button" :class="{ active: activePanel === 'travel' }" @click="selectPanel('travel')">行程测试</button>
          <button v-if="profile.capabilities.calibration" type="button" :class="{ active: activePanel === 'calibration' }" @click="selectPanel('calibration')">键盘校准</button>
        </nav>
        <div v-if="activePanel === 'settings'" class="performance-current"><span>当前物理按键</span><strong>{{ selectedPosition?.label ?? '未选择' }}</strong><code v-if="selectedPosition">0x{{ selectedPosition.sourceCode.toString(16).padStart(2, '0').toUpperCase() }}</code></div>
        <button v-if="activePanel === 'settings'" class="primary" type="button" :disabled="busy || !draft" @click="save">{{ status === 'writing' ? '正在保存…' : '保存设置' }}</button>
      </header>

      <div class="performance-editor-body">
        <template v-if="activePanel === 'settings'">
          <div v-if="loading && !draft" class="performance-placeholder">正在读取当前按键的性能参数…</div>
          <div v-else-if="!draft" class="performance-placeholder">请先在上方键盘选择一个物理键。</div>
          <div v-else class="performance-content">
            <section class="performance-mode-section">
              <div class="performance-section-title"><div><h3>触发模式</h3><p>单键参数优先于全局参数，只对当前选中的物理键生效。</p></div></div>
              <div class="performance-modes">
                <button v-for="mode in modes" :key="mode.id" type="button" :class="{ active: draft.mode === mode.id }" :disabled="busy" @click="setMode(mode.id)"><i></i><strong>{{ mode.title }}</strong><small>{{ mode.description }}</small></button>
              </div>
            </section>

            <div class="performance-controls">
              <div v-if="draft.mode === 'global'" class="performance-control-group">
                <h3>全局触发行程</h3>
                <label class="performance-slider"><span>触发行程</span><input v-model.number="draft.globalActuation" type="range" min="0.1" max="4" step="0.1" /><output>{{ draft.globalActuation.toFixed(1) }} mm</output></label>
              </div>
              <div v-else-if="draft.mode === 'single'" class="performance-control-group">
                <h3>单键触发行程</h3>
                <label class="performance-slider"><span>触发行程</span><input v-model.number="draft.actuation" type="range" min="0.1" max="4" step="0.1" /><output>{{ draft.actuation.toFixed(1) }} mm</output></label>
              </div>
              <div v-else class="performance-control-group">
                <h3>快速触发灵敏度</h3>
                <label class="performance-slider"><span>按下灵敏度</span><input v-model.number="draft.rapidPress" type="range" min="0.1" max="2" step="0.1" /><output>{{ draft.rapidPress.toFixed(1) }} mm</output></label>
                <label class="performance-slider"><span>释放灵敏度</span><input v-model.number="draft.rapidRelease" type="range" min="0.1" max="2" step="0.1" /><output>{{ draft.rapidRelease.toFixed(1) }} mm</output></label>
              </div>

              <div class="performance-control-group dead-zone">
                <h3>{{ draft.mode === 'global' ? '全局死区' : '当前按键死区' }}</h3>
                <label class="performance-slider"><span>顶部死区</span><input v-model.number="draft.pressDeadZone" type="range" min="0" max="1" step="0.05" /><output>{{ draft.pressDeadZone.toFixed(2) }} mm</output></label>
                <label class="performance-slider"><span>底部死区</span><input v-model.number="draft.releaseDeadZone" type="range" min="0" max="1" step="0.05" /><output>{{ draft.releaseDeadZone.toFixed(2) }} mm</output></label>
              </div>
            </div>

            <section v-if="profile.capabilities.pollingRates?.length" class="performance-polling-panel">
              <div><h3>USB 回报率</h3><p>设置键盘与电脑通信的频率。更高回报率可以降低延迟，但会增加 USB、CPU 与内存负载。</p></div>
              <output>{{ pollingRate ?? '—' }} Hz</output>
              <div class="polling-options"><button v-for="rate in profile.capabilities.pollingRates" :key="rate" type="button" :class="{ active: pollingRate === rate }" :disabled="busy" @click="emit('update-polling-rate', rate as PollingRate)">{{ rate >= 1000 ? `${rate / 1000}K` : rate }} Hz</button></div>
            </section>
          </div>
        </template>

        <section v-else-if="activePanel === 'travel'" class="travel-test-panel">
          <div class="travel-test-copy"><span class="eyebrow">MAGNETIC TRAVEL</span><h3>全键盘行程测试</h3><p>开始后可直接按下任意或多个按键。上方每个键帽会独立显示实时行程，不需要选择或绑定测试按键。</p><button class="primary" type="button" :disabled="busy" @click="toggleTravelTest">{{ travelTestActive ? '停止测试' : '开始测试' }}</button></div>
          <div class="travel-global-status"><i :class="{ active: travelTestActive }"></i><div><span>测试状态</span><strong>{{ travelStatusText }}</strong></div><div><span>当前按下</span><strong>{{ activeTravelPositionIds.length }} 个按键</strong></div></div>
          <div class="travel-test-value"><span>当前最大行程</span><strong>{{ deepestTravel.toFixed(2) }}</strong><em>mm</em><b>{{ deepestPosition?.label ?? '—' }}</b><div class="travel-meter"><div :style="{ width: `${Math.min(100, deepestTravel / 4 * 100)}%` }"></div><i :style="{ left: `${Math.min(100, deepestTravel / 4 * 100)}%` }"></i></div><small>每个按键的具体数值显示在上方对应键帽中，量程 0.00 – 4.00 mm</small></div>
        </section>

        <section v-else class="calibration-panel" :class="{ active: calibrationActive }">
          <div class="calibration-copy"><span class="eyebrow">SWITCH CALIBRATION</span><h3>轴体校准</h3><p>更换轴体、恢复出厂设置或发现按键行程异常时进行校准。校准过程中请勿断开键盘。</p></div>
          <div><ol class="calibration-steps"><li :class="{ active: !calibrationActive }"><b>1</b><div><strong>开始校准</strong><span>进入键盘的轴体校准状态</span></div></li><li :class="{ active: calibrationActive }"><b>2</b><div><strong>按压全部按键</strong><span>将每个按键按到底再完全松开，完成后键帽数字变绿</span></div></li><li :class="{ active: calibratedPositionIds.size === profile.positions.length }"><b>3</b><div><strong>保存校准</strong><span>全部按键完成后将新的行程范围写入键盘</span></div></li></ol><div class="calibration-progress"><div><span>校准进度</span><strong>{{ calibratedPositionIds.size }} / {{ profile.positions.length }}</strong></div><i><b :style="{ width: `${calibrationProgress}%` }"></b></i></div></div>
          <div class="calibration-action"><span>{{ calibrationActive ? '正在检测全部按键' : calibratedPositionIds.size ? '本轮校准已停止' : '等待开始' }}</span><button v-if="!calibrationActive" class="primary" type="button" :disabled="busy" @click="startCalibrationTracking">开始校准</button><button v-else class="primary" type="button" :disabled="busy" @click="emit('finish-calibration')">保存校准</button></div>
        </section>
      </div>
    </section>
  </section>
</template>
