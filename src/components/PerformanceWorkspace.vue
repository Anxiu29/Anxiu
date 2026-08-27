<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { KeyPerformanceSettings, PerformanceMode, PollingRate, TravelMatrix } from '@/domain/performance'
import { clonePerformanceSettings, DEFAULT_PERFORMANCE_SETTINGS } from '@/domain/performance'
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
  settingsBySourceCode?: Record<number, KeyPerformanceSettings>
  loading?: boolean
  mapLoading?: boolean
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
  'load-all': []
  update: [settings: KeyPerformanceSettings]
  'update-many': [settings: KeyPerformanceSettings[]]
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
const selectedPerformancePositionIds = ref<string[]>([])
const selectedPosition = computed(() => props.profile.positions.find((item) => item.id === props.selectedPositionId))
const selectedPerformancePositions = computed(() => props.profile.positions.filter((position) => selectedPerformancePositionIds.value.includes(position.id)))
const busy = computed(() => props.loading || props.mapLoading || ['connecting', 'reading', 'writing'].includes(props.status))
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
const formatParameter = (value: number) => value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
const displayedPerformance = (positionId: string, sourceCode: number) => selectedPerformancePositionIds.value.includes(positionId) && draft.value
  ? draft.value
  : props.settingsBySourceCode?.[sourceCode]
/**
 * 键帽参数跟随当前分类：普通模式显示有效触发行程，RT 同时显示首次触发、
 * 按下和释放灵敏度，高级设置显示顶部/底部死区。所选键优先显示尚未保存的实时草稿。
 */
const performanceTopLabels = computed(() => {
  if (activePanel.value === 'calibration') return {}
  // 0x29 的全局触发行程对整把键盘生效，拖动滑杆时全部键帽应共享同一草稿值。
  if (activePanel.value === 'normal' && draft.value?.mode === 'global') {
    return Object.fromEntries(props.profile.positions.map((position) => [position.id, formatParameter(draft.value!.globalActuation)]))
  }
  return Object.fromEntries(props.profile.positions.flatMap((position) => {
  const settings = displayedPerformance(position.id, position.sourceCode)
  if (!settings) return []
  const value = activePanel.value === 'normal'
    ? settings.mode === 'global' ? settings.globalActuation : settings.actuation
    : activePanel.value === 'rt' ? settings.actuation : settings.pressDeadZone
  return [[position.id, formatParameter(value)]]
  }))
})
const performanceBottomLabels = computed(() => activePanel.value === 'rt' || activePanel.value === 'advanced' ? Object.fromEntries(props.profile.positions.flatMap((position) => {
  const settings = displayedPerformance(position.id, position.sourceCode)
  if (!settings) return []
  return [[position.id, formatParameter(activePanel.value === 'rt' ? settings.rapidPress : settings.releaseDeadZone)]]
})) : {})
// RT 的第三个角标放在右下角，避免首次触发、按下、释放三个值互相覆盖。
const performanceAuxiliaryLabels = computed(() => activePanel.value === 'rt' ? Object.fromEntries(props.profile.positions.flatMap((position) => {
  const settings = displayedPerformance(position.id, position.sourceCode)
  return settings ? [[position.id, formatParameter(settings.rapidRelease)]] : []
})) : {})
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
  // 设备回读的 mode 描述按键当前配置，不应反向改变用户正在浏览的性能标签页。
  // 当前页只负责把新按键的草稿转换为本页模式，真正写入仍由“保存设置”触发。
  if (activePanel.value === 'rt') draft.value.mode = 'rapid-trigger'
  else if (activePanel.value === 'normal' && draft.value.mode !== 'rapid-trigger') {
    lastNormalMode.value = draft.value.mode
  }
  else if (activePanel.value === 'normal') draft.value.mode = lastNormalMode.value
}, { immediate: true, deep: true })
watch(() => props.selectedPositionId, (positionId) => {
  if (positionId && !selectedPerformancePositionIds.value.length) selectedPerformancePositionIds.value = [positionId]
  if (positionId && props.settings?.sourceCode !== selectedPosition.value?.sourceCode) emit('load', positionId)
}, { immediate: true })
watch(() => props.profile.capabilities.pollingRates, (rates) => { if (rates?.length) emit('load-polling-rate') }, { immediate: true })
// 三个性能分类都需要完整矩阵参数；Store 会缓存结果，后续切页不会重复访问设备。
onMounted(() => emit('load-all'))

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
  if (panel !== 'calibration' && !selectedPerformancePositionIds.value.length && props.selectedPositionId) selectedPerformancePositionIds.value = [props.selectedPositionId]
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
function save() {
  if (!draft.value) return
  if (selectedPerformancePositions.value.length > 1) {
    emit('update-many', selectedPerformancePositions.value.map((position) => ({ ...clonePerformanceSettings(draft.value!), sourceCode: position.sourceCode })))
    return
  }
  emit('update', clonePerformanceSettings(draft.value))
}
function startCalibrationTracking() {
  calibrationMaxTravel.value = {}
  calibratedPositionIds.value = new Set()
  autoSaveCalibrationRequested.value = false
  emit('start-calibration')
}
function selectKeyboardPosition(positionId: string) {
  // 校准操作整个矩阵；其他分类都允许从上方选择要配置和测试的物理键。
  if (activePanel.value === 'calibration') return
  const selected = new Set(selectedPerformancePositionIds.value)
  if (selected.has(positionId)) selected.delete(positionId)
  else selected.add(positionId)
  selectedPerformancePositionIds.value = [...selected]
  if (selected.has(positionId)) emit('select-position', positionId)
  else if (props.selectedPositionId === positionId && selectedPerformancePositionIds.value[0]) emit('select-position', selectedPerformancePositionIds.value[0]!)
}

/** 批量选择只操作物理位置，不受用户改键后的目标键值影响。 */
function selectPerformanceGroup(predicate: (label: string) => boolean) {
  selectedPerformancePositionIds.value = props.profile.positions.filter((position) => predicate(position.label)).map((position) => position.id)
  const nextCurrent = selectedPerformancePositionIds.value.includes(props.selectedPositionId ?? '') ? props.selectedPositionId : selectedPerformancePositionIds.value[0]
  if (nextCurrent) emit('select-position', nextCurrent)
}
function selectAllPerformanceKeys() { selectPerformanceGroup(() => true) }
function selectWasdKeys() { selectPerformanceGroup((label) => ['W', 'A', 'S', 'D'].includes(label.toUpperCase())) }
function selectNumberKeys() { selectPerformanceGroup((label) => /^(?:\d|PAD\d|NUM\d)$/i.test(label.replace(/\s/g, ''))) }
function selectLetterKeys() { selectPerformanceGroup((label) => /^[A-Z]$/i.test(label)) }
function clearPerformanceSelection() { selectedPerformancePositionIds.value = [] }
/** 重置先回到默认草稿；用户点击“保存设置”后才会写入所选物理键。 */
function resetSelectedTravel() {
  if (!draft.value) return
  draft.value = { sourceCode: draft.value.sourceCode, ...DEFAULT_PERFORMANCE_SETTINGS }
  lastNormalMode.value = 'global'
}
</script>

<template>
  <section class="performance-workspace">
    <div class="panel performance-keyboard-panel" :class="{ 'travel-active': activePanel !== 'calibration' && travelTestActive, 'calibration-tracking': activePanel === 'calibration', 'bulk-select': activePanel !== 'calibration', 'rt-parameters': activePanel === 'rt' }">
      <div ref="keyboardContainer" class="performance-keyboard-viewport">
        <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :selected-ids="activePanel !== 'calibration' ? selectedPerformancePositionIds : []" :pressed="activePanel !== 'calibration' ? activeTravelPositionIds : []" :badges="activePanel === 'calibration' ? calibrationBadges : travelBadges" :top-labels="performanceTopLabels" :bottom-labels="performanceBottomLabels" :auxiliary-labels="performanceAuxiliaryLabels" :key-colors="activePanel === 'calibration' ? calibrationKeyColors : travelKeyColors" :unit="keyboardUnit" :geometry="keyGeometry" @select="selectKeyboardPosition" />
      </div>
      <nav v-if="activePanel !== 'calibration'" class="performance-selection-tools keyboard-selection-tools" aria-label="批量选择性能按键">
        <small>{{ mapLoading ? '正在读取参数…' : `已选 ${selectedPerformancePositionIds.length} 个` }}</small>
        <button type="button" :disabled="busy" @click="selectAllPerformanceKeys">全选</button>
        <button type="button" :disabled="busy" @click="selectWasdKeys">WASD</button>
        <button type="button" :disabled="busy" @click="selectNumberKeys">数字键</button>
        <button type="button" :disabled="busy" @click="selectLetterKeys">字母键</button>
        <button type="button" :disabled="busy" @click="clearPerformanceSelection">取消选中</button>
        <button class="reset" type="button" :disabled="busy || !draft || !selectedPerformancePositionIds.length" title="恢复默认参数，点击保存设置后写入所选按键" @click="resetSelectedTravel">重置行程</button>
      </nav>
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
        <div v-if="activePanel !== 'calibration'" class="performance-current"><span>{{ selectedPerformancePositionIds.length > 1 ? '已选择物理按键' : '当前物理按键' }}</span><strong>{{ selectedPerformancePositionIds.length > 1 ? `${selectedPerformancePositionIds.length} 个` : selectedPosition?.label ?? '未选择' }}</strong><code v-if="selectedPosition && selectedPerformancePositionIds.length <= 1">0x{{ selectedPosition.sourceCode.toString(16).padStart(2, '0').toUpperCase() }}</code></div>
        <button v-if="activePanel !== 'calibration'" class="primary" type="button" :disabled="busy || !draft || !selectedPerformancePositionIds.length" @click="save">{{ status === 'writing' ? '正在保存…' : selectedPerformancePositionIds.length > 1 ? `保存 ${selectedPerformancePositionIds.length} 个按键` : '保存设置' }}</button>
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
              <div class="travel-test-stage">
                <div class="travel-visual-body">
                  <div class="travel-scale" aria-hidden="true"><span v-for="tick in [0, 1, 2, 3, 4]" :key="tick" :style="{ top: `${tick * 25}%` }">{{ tick.toFixed(1) }}</span></div>
                  <div class="travel-rail"><i :style="{ height: `${displayedTravel / 4 * 100}%` }"></i><b :style="{ top: `${displayedTravel / 4 * 100}%` }"></b><output :style="{ top: `${displayedTravel / 4 * 100}%` }">{{ displayedTravel.toFixed(2) }} mm</output></div>
                </div>
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
