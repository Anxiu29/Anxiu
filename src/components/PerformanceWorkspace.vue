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
const selectedPosition = computed(() => props.profile.positions.find((item) => item.id === props.selectedPositionId))
const busy = computed(() => props.loading || ['connecting', 'reading', 'writing'].includes(props.status))
const travelTestActive = ref(false)
let travelTimer: number | undefined
const selectedTravel = computed(() => {
  const address = selectedPosition.value?.address
  if (address?.kind !== 'matrix') return 0
  return props.travelMatrix?.[address.row]?.[address.column] ?? 0
})
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

function scheduleTravelRead() {
  if (!travelTestActive.value) return
  if (props.status === 'ready') emit('read-travel')
  travelTimer = window.setTimeout(scheduleTravelRead, 220)
}
function toggleTravelTest() {
  travelTestActive.value = !travelTestActive.value
  if (travelTimer !== undefined) window.clearTimeout(travelTimer)
  travelTimer = undefined
  if (travelTestActive.value) scheduleTravelRead()
}
onBeforeUnmount(() => { if (travelTimer !== undefined) window.clearTimeout(travelTimer) })

function setMode(mode: PerformanceMode) { if (draft.value) draft.value.mode = mode }
function save() { if (draft.value) emit('update', clonePerformanceSettings(draft.value)) }
</script>

<template>
  <section class="performance-workspace">
    <div ref="keyboardContainer" class="panel performance-keyboard-panel">
      <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :selected="selectedPositionId" :unit="keyboardUnit" :geometry="keyGeometry" @select="emit('select-position', $event)" />
    </div>

    <section class="panel performance-editor">
      <header class="performance-heading">
        <div><span class="eyebrow">PERFORMANCE</span><h2>性能设置</h2><p>选择物理键后设置触发模式与磁轴行程</p></div>
        <div class="performance-current"><span>当前物理按键</span><strong>{{ selectedPosition?.label ?? '未选择' }}</strong><code v-if="selectedPosition">0x{{ selectedPosition.sourceCode.toString(16).padStart(2, '0').toUpperCase() }}</code></div>
        <button class="primary" type="button" :disabled="busy || !draft" @click="save">{{ status === 'writing' ? '正在确认…' : '确认' }}</button>
      </header>

      <div class="performance-editor-body">
      <div v-if="loading && !draft" class="performance-placeholder">正在读取当前按键的性能参数…</div>
      <div v-else-if="!draft" class="performance-placeholder">请先在上方键盘选择一个物理键。</div>
      <div v-else class="performance-content">
        <div class="performance-modes">
          <button v-for="mode in modes" :key="mode.id" type="button" :class="{ active: draft.mode === mode.id }" :disabled="busy" @click="setMode(mode.id)"><i></i><strong>{{ mode.title }}</strong><small>{{ mode.description }}</small></button>
        </div>

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
      </div>

      <div class="performance-tools">
        <article v-if="profile.capabilities.travelTest" class="performance-tool-card travel-test-card">
          <header><div><strong>行程测试</strong><small>实时读取当前按键的磁轴行程</small></div><button type="button" :class="{ active: travelTestActive }" :disabled="busy || !selectedPosition" @click="toggleTravelTest">{{ travelTestActive ? '停止测试' : '开始测试' }}</button></header>
          <div class="travel-meter"><div :style="{ width: `${Math.min(100, selectedTravel / 4 * 100)}%` }"></div><i :style="{ left: `${Math.min(100, selectedTravel / 4 * 100)}%` }"></i></div>
          <div class="travel-reading"><strong>{{ selectedTravel.toFixed(2) }}</strong><span>mm / 4.00 mm</span><small>{{ travelReading ? '正在读取…' : travelTestActive ? '实时测试中' : '尚未开始' }}</small></div>
        </article>

        <article v-if="profile.capabilities.pollingRates?.length" class="performance-tool-card polling-card">
          <header><div><strong>回报率设置</strong><small>更高回报率需要更多 USB 与 CPU 资源</small></div><output>{{ pollingRate ?? '—' }} Hz</output></header>
          <div class="polling-options"><button v-for="rate in profile.capabilities.pollingRates" :key="rate" type="button" :class="{ active: pollingRate === rate }" :disabled="busy" @click="emit('update-polling-rate', rate as PollingRate)">{{ rate >= 1000 ? `${rate / 1000}K` : rate }} Hz</button></div>
        </article>

        <article v-if="profile.capabilities.calibration" class="performance-tool-card calibration-card" :class="{ active: calibrationActive }">
          <header><div><strong>键盘校准</strong><small>{{ calibrationActive ? '请将所有按键依次按到底并完全松开' : '轴体更换或行程异常时使用' }}</small></div><span>{{ calibrationActive ? '校准中' : '未开始' }}</span></header>
          <p>开始后依次按压全部按键数次，确认每个按键都到达底部，再完成校准。</p>
          <button v-if="!calibrationActive" class="primary" type="button" :disabled="busy" @click="emit('start-calibration')">开始校准</button>
          <button v-else class="primary" type="button" :disabled="busy" @click="emit('finish-calibration')">完成校准</button>
        </article>
      </div>
      </div>
    </section>
  </section>
</template>
