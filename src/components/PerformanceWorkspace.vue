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
/** 页面分类属于表现层；设备协议仍使用 global、single 和 rapid-trigger 三种模式值。 */
type PerformancePanel = 'normal' | 'rt' | 'advanced' | 'calibration'
const activePanel = ref<PerformancePanel>('normal')
const lastNormalMode = ref<Extract<PerformanceMode, 'global' | 'single'>>('single')
const selectedPosition = computed(() => props.profile.positions.find((item) => item.id === props.selectedPositionId))
const busy = computed(() => props.loading || ['connecting', 'reading', 'writing'].includes(props.status))
const travelTestActive = ref(false)
const calibrationMaxTravel = ref<Record<string, number>>({})
const calibratedPositionIds = ref<Set<string>>(new Set())
const autoSaveCalibrationRequested = ref(false)
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
const latestTravelPositionId = ref<string>()
let previousTravelByPosition: Record<string, number> = {}
/** 右侧效果图跟随最近变化的键；同一帧多个键变化时采用变化幅度最大的按键。 */
watch(travelByPosition, (current) => {
  if (!travelTestActive.value) {
    previousTravelByPosition = { ...current }
    return
  }
  let latestId: string | undefined
  let largestDelta = 0.005
  for (const [positionId, travel] of Object.entries(current)) {
    const delta = Math.abs(travel - (previousTravelByPosition[positionId] ?? 0))
    if (delta > largestDelta) {
      latestId = positionId
      largestDelta = delta
    }
  }
  if (latestId) latestTravelPositionId.value = latestId
  previousTravelByPosition = { ...current }
}, { immediate: true })
const latestTravelPosition = computed(() => props.profile.positions.find((position) => position.id === latestTravelPositionId.value))
const displayedTravel = computed(() => travelTestActive.value && latestTravelPositionId.value ? travelByPosition.value[latestTravelPositionId.value] ?? 0 : 0)
const calibrationBadges = computed(() => Object.fromEntries(props.profile.positions.map((position) => [position.id, `${(calibrationMaxTravel.value[position.id] ?? 0).toFixed(2)} mm`])))
const calibrationKeyColors = computed(() => Object.fromEntries([...calibratedPositionIds.value].map((id) => [id, '#39d98a'])))
const calibrationProgress = computed(() => props.profile.positions.length ? calibratedPositionIds.value.size / props.profile.positions.length * 100 : 0)
const { container: keyboardContainer, unit: keyboardUnit } = useFittedKeyboardUnit(() => props.profile.positions, () => props.keyGeometry, { minUnit: 28 })
useHorizontalKeyboardScroll(keyboardContainer)

const normalModes: { id: Extract<PerformanceMode, 'global' | 'single'>; title: string; description: string }[] = [
  { id: 'global', title: '全局触发', description: '使用整把键盘统一的触发行程和死区' },
  { id: 'single', title: '单键触发', description: '为当前物理键设置独立触发行程' },
]

watch([() => props.settings, () => props.selectedPositionId], ([settings]) => {
  draft.value = settings && settings.sourceCode === selectedPosition.value?.sourceCode ? clonePerformanceSettings(settings) : undefined
  if (!draft.value) return
  if (draft.value.mode === 'rapid-trigger' && (activePanel.value === 'normal' || activePanel.value === 'rt')) activePanel.value = 'rt'
  else if (draft.value.mode !== 'rapid-trigger' && (activePanel.value === 'normal' || activePanel.value === 'rt')) {
    lastNormalMode.value = draft.value.mode
    activePanel.value = 'normal'
  }
}, { immediate: true, deep: true })
watch(() => props.selectedPositionId, (positionId) => {
  if (positionId && props.settings?.sourceCode !== selectedPosition.value?.sourceCode) emit('load', positionId)
}, { immediate: true })
watch(() => props.profile.capabilities.pollingRates, (rates) => { if (rates?.length) emit('load-polling-rate') }, { immediate: true })

const shouldPollTravel = () => Boolean(props.profile.capabilities.travelTest)
  && (travelTestActive.value || activePanel.value === 'calibration' && props.calibrationActive)
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
function toggleTravelTest() {
  travelTestActive.value = !travelTestActive.value
  latestTravelPositionId.value = undefined
  previousTravelByPosition = { ...travelByPosition.value }
  refreshTravelPolling()
}
/** 行程测试需要检测回车和空格本身，因此开关只响应真实鼠标点击。 */
function blockKeyboardToggle(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ' && event.code !== 'Space') return
  event.preventDefault()
  event.stopPropagation()
}
function handleTravelToggleClick(event: MouseEvent) {
  // 键盘为原生 button 合成的 click.detail 为 0；鼠标点击大于 0，在这里做最终兜底。
  if (event.detail === 0) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  toggleTravelTest()
  // 鼠标开启后立即失焦，随后测试回车或空格不会再次激活此按钮。
  ;(event.currentTarget as HTMLButtonElement | null)?.blur()
}
function selectPanel(panel: PerformancePanel) {
  activePanel.value = panel
  if (panel === 'calibration') travelTestActive.value = false
  if (draft.value && panel === 'normal') draft.value.mode = lastNormalMode.value
  if (draft.value && panel === 'rt') draft.value.mode = 'rapid-trigger'
  refreshTravelPolling()
}
onBeforeUnmount(() => { if (travelTimer !== undefined) window.clearTimeout(travelTimer) })

watch([() => props.calibrationActive, activePanel], refreshTravelPolling, { immediate: true })
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
  if (nextCompleted.size === props.profile.positions.length && !autoSaveCalibrationRequested.value) {
    autoSaveCalibrationRequested.value = true
    emit('finish-calibration')
  }
}, { deep: true })

function setMode(mode: PerformanceMode) { if (draft.value) draft.value.mode = mode }
/** 预览轨道统一使用 0–4 mm 比例，避免模板中重复边界处理。 */
function travelPercent(value: number) { return `${Math.max(0, Math.min(100, value / 4 * 100))}%` }
function setNormalMode(mode: Extract<PerformanceMode, 'global' | 'single'>) {
  lastNormalMode.value = mode
  setMode(mode)
}
function save() { if (draft.value) emit('update', clonePerformanceSettings(draft.value)) }
function startCalibrationTracking() {
  calibrationMaxTravel.value = {}
  calibratedPositionIds.value = new Set()
  autoSaveCalibrationRequested.value = false
  emit('start-calibration')
}
function selectKeyboardPosition(positionId: string) {
  // 校准操作整个矩阵；其他分类都允许从上方选择要配置和测试的物理键。
  if (activePanel.value !== 'calibration') emit('select-position', positionId)
}
</script>

<template>
  <section class="performance-workspace">
    <div ref="keyboardContainer" class="panel performance-keyboard-panel" :class="{ 'travel-active': activePanel !== 'calibration' && travelTestActive, 'calibration-tracking': activePanel === 'calibration' }">
      <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :selected="activePanel === 'calibration' ? undefined : selectedPositionId" :pressed="activePanel !== 'calibration' ? activeTravelPositionIds : []" :badges="activePanel === 'calibration' ? calibrationBadges : travelBadges" :key-colors="activePanel === 'calibration' ? calibrationKeyColors : travelKeyColors" :unit="keyboardUnit" :geometry="keyGeometry" @select="selectKeyboardPosition" />
    </div>

    <section class="panel performance-editor">
      <header class="performance-heading">
        <div class="performance-title"><span class="eyebrow">PERFORMANCE</span><h2>性能设置</h2></div>
        <nav class="performance-tabs" aria-label="性能设置页面">
          <button type="button" :class="{ active: activePanel === 'normal' }" @click="selectPanel('normal')">普通模式</button>
          <button type="button" :class="{ active: activePanel === 'rt' }" @click="selectPanel('rt')">RT 模式</button>
          <button type="button" :class="{ active: activePanel === 'advanced' }" @click="selectPanel('advanced')">高级设置</button>
          <button v-if="profile.capabilities.calibration" type="button" :class="{ active: activePanel === 'calibration' }" @click="selectPanel('calibration')">键盘校准</button>
        </nav>
        <div v-if="activePanel !== 'calibration'" class="performance-current"><span>当前物理按键</span><strong>{{ selectedPosition?.label ?? '未选择' }}</strong><code v-if="selectedPosition">0x{{ selectedPosition.sourceCode.toString(16).padStart(2, '0').toUpperCase() }}</code></div>
        <button v-if="activePanel !== 'calibration'" class="primary" type="button" :disabled="busy || !draft" @click="save">{{ status === 'writing' ? '正在保存…' : '保存设置' }}</button>
      </header>

      <div class="performance-editor-body">
        <template v-if="activePanel !== 'calibration'">
          <div v-if="loading && !draft" class="performance-placeholder">正在读取当前按键的性能参数…</div>
          <div v-else-if="!draft" class="performance-placeholder">请先在上方键盘选择一个物理键。</div>
          <div v-else class="performance-settings-layout">
            <div class="performance-settings-main">
              <template v-if="activePanel === 'normal'">
                <section class="performance-mode-section">
                  <div class="performance-section-title"><h3>普通触发模式</h3><p>可使用整把键盘统一的行程，或为当前按键单独设置触发点。</p></div>
                  <div class="performance-modes horizontal">
                    <button v-for="mode in normalModes" :key="mode.id" type="button" :class="{ active: draft.mode === mode.id }" :disabled="busy" @click="setNormalMode(mode.id)"><i></i><strong>{{ mode.title }}</strong><small>{{ mode.description }}</small></button>
                  </div>
                </section>
                <div class="performance-control-group primary-control">
                  <h3>{{ draft.mode === 'global' ? '全局触发行程' : '单键触发行程' }}</h3>
                  <label v-if="draft.mode === 'global'" class="performance-slider"><span>触发行程</span><input v-model.number="draft.globalActuation" type="range" min="0.1" max="4" step="0.1" /><output>{{ draft.globalActuation.toFixed(1) }} mm</output></label>
                  <label v-else class="performance-slider"><span>触发行程</span><input v-model.number="draft.actuation" type="range" min="0.1" max="4" step="0.1" /><output>{{ draft.actuation.toFixed(1) }} mm</output></label>
                </div>
                <section class="performance-logic-preview normal-preview">
                  <header><div><span>触发逻辑预览</span><strong>固定触发点</strong></div><p>按键下压越过设定行程后输出按键</p></header>
                  <div class="logic-scale">
                    <div class="logic-track"><i :style="{ width: travelPercent(draft.mode === 'global' ? draft.globalActuation : draft.actuation) }"></i><b :style="{ left: travelPercent(draft.mode === 'global' ? draft.globalActuation : draft.actuation) }"></b><output :style="{ left: travelPercent(draft.mode === 'global' ? draft.globalActuation : draft.actuation) }">{{ (draft.mode === 'global' ? draft.globalActuation : draft.actuation).toFixed(1) }} mm</output></div>
                    <div class="logic-scale-labels"><span>0 mm<br /><small>未按下</small></span><span>2 mm</span><span>4 mm<br /><small>按到底</small></span></div>
                  </div>
                  <div class="logic-flow"><span><i></i>开始下压</span><b>→</b><span class="active"><i></i>越过触发点</span><b>→</b><span><i></i>发送按键</span></div>
                </section>
              </template>

              <template v-else-if="activePanel === 'rt'">
                <div class="performance-section-title"><h3>RT 快速触发</h3><p>首次按下到达触发行程后，根据按键移动方向动态触发和复位。</p></div>
                <div class="performance-control-group rt-controls">
                  <h3>触发行程与灵敏度</h3>
                  <label class="performance-slider"><span>首次触发行程</span><input v-model.number="draft.actuation" type="range" min="0.1" max="4" step="0.1" /><output>{{ draft.actuation.toFixed(1) }} mm</output></label>
                  <label class="performance-slider"><span>按下灵敏度</span><input v-model.number="draft.rapidPress" type="range" min="0.1" max="2" step="0.1" /><output>{{ draft.rapidPress.toFixed(1) }} mm</output></label>
                  <label class="performance-slider"><span>释放灵敏度</span><input v-model.number="draft.rapidRelease" type="range" min="0.1" max="2" step="0.1" /><output>{{ draft.rapidRelease.toFixed(1) }} mm</output></label>
                </div>
                <section class="performance-logic-preview rt-preview">
                  <header><div><span>触发逻辑预览</span><strong>动态触发与复位</strong></div><p>首次触发后，根据移动方向持续计算下一次触发位置</p></header>
                  <div class="rt-preview-grid">
                    <article><span>首次触发</span><div class="mini-travel-track"><i :style="{ width: travelPercent(draft.actuation) }"></i><b :style="{ left: travelPercent(draft.actuation) }"></b></div><strong>{{ draft.actuation.toFixed(1) }} mm</strong></article>
                    <article class="press"><span>继续下压</span><i>↓</i><strong>移动 {{ draft.rapidPress.toFixed(1) }} mm 再次触发</strong></article>
                    <article class="release"><span>向上抬起</span><i>↑</i><strong>移动 {{ draft.rapidRelease.toFixed(1) }} mm 动态复位</strong></article>
                  </div>
                </section>
              </template>

              <template v-else>
                <div class="performance-section-title"><h3>高级设置</h3><p>调整当前模式使用的顶部、底部死区，以及键盘的 USB 回报率。</p></div>
                <div class="performance-control-group dead-zone">
                  <h3>{{ draft.mode === 'global' ? '全局死区' : '当前按键死区' }}</h3>
                  <label class="performance-slider"><span>顶部死区</span><input v-model.number="draft.pressDeadZone" type="range" min="0" max="1" step="0.05" /><output>{{ draft.pressDeadZone.toFixed(2) }} mm</output></label>
                  <label class="performance-slider"><span>底部死区</span><input v-model.number="draft.releaseDeadZone" type="range" min="0" max="1" step="0.05" /><output>{{ draft.releaseDeadZone.toFixed(2) }} mm</output></label>
                </div>
                <section v-if="profile.capabilities.pollingRates?.length" class="performance-polling-panel">
                  <div><h3>USB 回报率</h3><p>更高回报率可以降低延迟，但会增加 USB、CPU 与内存负载。</p></div>
                  <output>{{ pollingRate ?? '—' }} Hz</output>
                  <div class="polling-options"><button v-for="rate in profile.capabilities.pollingRates" :key="rate" type="button" :class="{ active: pollingRate === rate }" :disabled="busy" @click="emit('update-polling-rate', rate as PollingRate)">{{ rate >= 1000 ? `${rate / 1000}K` : rate }} Hz</button></div>
                </section>
              </template>
            </div>

            <aside v-if="profile.capabilities.travelTest" class="performance-live-travel">
              <header><div><span>行程测试</span><strong>{{ travelTestActive ? latestTravelPosition ? `最新：${latestTravelPosition.label} · ${activeTravelPositionIds.length} 个按下` : '等待按键行程变化' : '开启后测试全部按键' }}</strong></div><button class="travel-test-toggle" type="button" role="switch" :aria-checked="travelTestActive" :class="{ active: travelTestActive }" title="请用鼠标点击开关" @keydown="blockKeyboardToggle" @keyup="blockKeyboardToggle" @click="handleTravelToggleClick"><i></i><span>{{ travelTestActive ? '关闭' : '开启' }}</span></button></header>
              <div class="travel-visual-body">
                <div class="travel-scale" aria-hidden="true"><span v-for="tick in [0, 1, 2, 3, 4]" :key="tick" :style="{ top: `${tick * 25}%` }">{{ tick.toFixed(1) }}</span></div>
                <div class="travel-rail"><i :style="{ height: `${displayedTravel / 4 * 100}%` }"></i><b :style="{ top: `${displayedTravel / 4 * 100}%` }"></b><output :style="{ top: `${displayedTravel / 4 * 100}%` }">{{ displayedTravel.toFixed(2) }} mm</output></div>
              </div>
              <div class="magnetic-switch" aria-hidden="true"><i></i><b></b><span></span></div>
              <p>{{ travelTestActive ? '所有按键的实时行程会显示在上方对应键帽中' : '打开测试后，可同时检测任意多个按键' }}</p>
            </aside>
          </div>
        </template>
        <section v-else class="calibration-panel" :class="{ active: calibrationActive }">
          <div class="calibration-copy"><span class="eyebrow">SWITCH CALIBRATION</span><h3>轴体校准</h3><p>更换轴体、恢复出厂设置或发现按键行程异常时进行校准。校准过程中请勿断开键盘。</p></div>
          <div><ol class="calibration-steps"><li :class="{ active: !calibrationActive }"><b>1</b><div><strong>开始校准</strong><span>进入键盘的轴体校准状态</span></div></li><li :class="{ active: calibrationActive }"><b>2</b><div><strong>按压全部按键</strong><span>将每个按键按到底再完全松开，完成后键帽数字变绿</span></div></li><li :class="{ active: calibratedPositionIds.size === profile.positions.length }"><b>3</b><div><strong>保存校准</strong><span>全部按键完成后将新的行程范围写入键盘</span></div></li></ol><div class="calibration-progress"><div><span>校准进度</span><strong>{{ calibratedPositionIds.size }} / {{ profile.positions.length }}</strong></div><i><b :style="{ width: `${calibrationProgress}%` }"></b></i></div></div>
          <div class="calibration-action"><span>{{ autoSaveCalibrationRequested ? '全部完成，正在自动保存…' : calibrationActive ? '正在检测全部按键' : calibratedPositionIds.size ? '本轮校准已停止' : '等待开始' }}</span><button v-if="!calibrationActive" class="primary" type="button" :disabled="busy" @click="startCalibrationTracking">开始校准</button><button v-else class="primary" type="button" :disabled="busy || autoSaveCalibrationRequested" @click="emit('finish-calibration')">{{ autoSaveCalibrationRequested ? '正在保存…' : '保存校准' }}</button></div>
        </section>
      </div>
    </section>
  </section>
</template>
