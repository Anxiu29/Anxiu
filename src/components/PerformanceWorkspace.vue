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
/** 切走行程测试时停止轮询，避免隐藏页面继续占用 HID 通信。 */
function selectPanel(panel: PerformancePanel) {
  activePanel.value = panel
  if (panel !== 'travel' && travelTestActive.value) toggleTravelTest()
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
        <div class="performance-title"><span class="eyebrow">PERFORMANCE</span><h2>性能设置</h2></div>
        <nav class="performance-tabs" aria-label="性能设置页面">
          <button type="button" :class="{ active: activePanel === 'settings' }" @click="selectPanel('settings')">性能参数</button>
          <button v-if="profile.capabilities.travelTest" type="button" :class="{ active: activePanel === 'travel' }" @click="selectPanel('travel')">行程测试</button>
          <button v-if="profile.capabilities.calibration" type="button" :class="{ active: activePanel === 'calibration' }" @click="selectPanel('calibration')">键盘校准</button>
        </nav>
        <div class="performance-current"><span>当前物理按键</span><strong>{{ selectedPosition?.label ?? '未选择' }}</strong><code v-if="selectedPosition">0x{{ selectedPosition.sourceCode.toString(16).padStart(2, '0').toUpperCase() }}</code></div>
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
          <div class="travel-test-copy"><span class="eyebrow">MAGNETIC TRAVEL</span><h3>磁轴行程测试</h3><p>在上方键盘选择按键，再开始读取实时行程。切换页面或停止测试后不会继续占用 HID 通信。</p><button class="primary" type="button" :disabled="busy || !selectedPosition" @click="toggleTravelTest">{{ travelTestActive ? '停止测试' : '开始测试' }}</button></div>
          <div class="travel-test-visual">
            <div class="travel-key-preview" :class="{ active: travelTestActive }" :style="{ transform: `translateY(${Math.min(4, selectedTravel) * 7}px)` }"><span>{{ selectedPosition?.label ?? 'KEY' }}</span></div>
            <div class="travel-scale"><i v-for="mark in 5" :key="mark"><span>{{ mark - 1 }} mm</span></i></div>
          </div>
          <div class="travel-test-value"><span>{{ travelReading ? '正在读取' : travelTestActive ? '实时行程' : '当前行程' }}</span><strong>{{ selectedTravel.toFixed(2) }}</strong><em>mm</em><div class="travel-meter"><div :style="{ width: `${Math.min(100, selectedTravel / 4 * 100)}%` }"></div><i :style="{ left: `${Math.min(100, selectedTravel / 4 * 100)}%` }"></i></div><small>量程 0.00 – 4.00 mm</small></div>
        </section>

        <section v-else class="calibration-panel" :class="{ active: calibrationActive }">
          <div class="calibration-copy"><span class="eyebrow">SWITCH CALIBRATION</span><h3>轴体校准</h3><p>更换轴体、恢复出厂设置或发现按键行程异常时进行校准。校准过程中请勿断开键盘。</p></div>
          <ol class="calibration-steps"><li :class="{ active: !calibrationActive }"><b>1</b><div><strong>开始校准</strong><span>进入键盘的轴体校准状态</span></div></li><li :class="{ active: calibrationActive }"><b>2</b><div><strong>按压全部按键</strong><span>将每个按键依次按到底并完全松开，建议重复两次</span></div></li><li><b>3</b><div><strong>保存校准</strong><span>完成后将新的行程范围写入键盘</span></div></li></ol>
          <div class="calibration-action"><span>{{ calibrationActive ? '校准进行中' : '等待开始' }}</span><button v-if="!calibrationActive" class="primary" type="button" :disabled="busy" @click="emit('start-calibration')">开始校准</button><button v-else class="primary" type="button" :disabled="busy" @click="emit('finish-calibration')">保存校准</button></div>
        </section>
      </div>
    </section>
  </section>
</template>
