<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AdvancedKeySettings, AdvancedKeyType } from '@/domain/advancedKey'
import { cloneAdvancedKeySettings, createAdvancedKeySettings } from '@/domain/advancedKey'
import type { KeyAssignment, KeyDefinition, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import { useFittedKeyboardUnit } from '@/ui/useFittedKeyboardUnit'
import { useHorizontalKeyboardScroll } from '@/ui/useHorizontalKeyboardScroll'
import KeyboardCanvas from './KeyboardCanvas.vue'
import KeyCodeKeyboardDialog from './KeyCodeKeyboardDialog.vue'
import CompactKeyTest from './CompactKeyTest.vue'

const props = defineProps<{
  profile: KeyboardProfile
  status: SessionStatus
  selectedPositionId?: string
  settings?: AdvancedKeySettings
  loading?: boolean
  advancedKeyTypes?: Record<number, string>
  assignments: KeyAssignment[]
  keyOptions: readonly KeyDefinition[]
  keyLabels: Record<number, string>
  keyGeometry?: KeyGeometryResolver
}>()
const emit = defineEmits<{
  'select-position': [positionId: string]
  load: [positionId: string]
  'load-all': []
  update: [settings: Exclude<AdvancedKeySettings, { type: 'none' }>]
  delete: [sourceCode: number]
}>()

const draft = ref<AdvancedKeySettings>()
const triggerDrag = ref<{ row: number; startPhase: number; endPhase: number; moved: boolean }>()
const ignoreTriggerClick = ref(false)
type KeyPickerTarget = { kind: 'keyCodes'; index: number } | { kind: 'keyCode' } | { kind: 'pairedSourceCode' }
const keyPickerTarget = ref<KeyPickerTarget>()
const types: { id: Exclude<AdvancedKeyType, 'none'>; label: string; summary: string }[] = [
  { id: 'dks', label: 'DKS', summary: '按键行程的多个阶段触发不同键值' },
  { id: 'mpt', label: 'MPT', summary: '在三个指定行程点依次触发键值' },
  { id: 'mt', label: 'MT', summary: '点按与长按分别输出不同键值' },
  { id: 'tgl', label: 'TGL', summary: '按一次保持，再按一次释放' },
  { id: 'end', label: 'END', summary: '抬起按键时输出指定键值' },
  { id: 'socd', label: 'SOCD', summary: '定义两个方向键同时按下时的优先规则' },
]
const selectedPosition = computed(() => props.profile.positions.find((item) => item.id === props.selectedPositionId))
const selectedAssignment = computed(() => props.assignments.find((item) => item.positionId === props.selectedPositionId))
const busy = computed(() => props.loading || ['connecting', 'reading', 'writing'].includes(props.status))
// 删除针对设备中已经保存的配置；刚选择类型但尚未确认的草稿不属于可删除数据。
const canDelete = computed(() => props.settings?.type !== 'none'
  && props.settings?.sourceCode === selectedPosition.value?.sourceCode)
const currentDescription = computed(() => types.find((item) => item.id === draft.value?.type)?.summary ?? '当前按键没有高级键设置')
const keyboardBadges = computed(() => Object.fromEntries(props.profile.positions
  .map((position) => [position.id, props.advancedKeyTypes?.[position.sourceCode]])
  .filter((entry): entry is [string, string] => Boolean(entry[1]))))
const keyLabel = (code: number) => props.keyLabels[code] ?? `0x${code.toString(16).padStart(4, '0').toUpperCase()}`
const keyPickerValue = computed(() => {
  if (!draft.value || !keyPickerTarget.value) return 0
  if (keyPickerTarget.value.kind === 'keyCode' && 'keyCode' in draft.value) return draft.value.keyCode
  if (keyPickerTarget.value.kind === 'pairedSourceCode' && draft.value.type === 'socd') return draft.value.pairedSourceCode
  if (keyPickerTarget.value.kind === 'keyCodes' && 'keyCodes' in draft.value) return draft.value.keyCodes[keyPickerTarget.value.index] ?? 0
  return 0
})
const { container: keyboardContainer, unit: keyboardUnit } = useFittedKeyboardUnit(() => props.profile.positions, () => props.keyGeometry, { minUnit: 28 })
useHorizontalKeyboardScroll(keyboardContainer)
// 固件只保存两个 DKS 行程；返回过程按相反方向经过同一组位置，因此四阶段采用 1、2、2、1 镜像显示。
const dksPhases = [
  { direction: 'down', symbol: '↓', travelIndex: 0, editable: true, label: '阶段 1' },
  { direction: 'down', symbol: '↓', travelIndex: 1, editable: true, label: '阶段 2' },
  { direction: 'up', symbol: '↑', travelIndex: 1, editable: false, label: '阶段 3' },
  { direction: 'up', symbol: '↑', travelIndex: 0, editable: false, label: '阶段 4' },
] as const
onMounted(() => {
  // 页面每次进入都请求 Store 同步设备 MODE；Store 会合并在途请求并批量读取，不会逐键重复查询。
  emit('load-all')
  window.addEventListener('pointerup', finishTriggerDrag)
  window.addEventListener('pointercancel', cancelTriggerDrag)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerup', finishTriggerDrag)
  window.removeEventListener('pointercancel', cancelTriggerDrag)
})

watch([() => props.settings, () => props.selectedPositionId], ([value]) => {
  // Store 只缓存最近读取的一键；切换物理键时绝不能短暂展示上一键的数据。
  draft.value = value && value.sourceCode === selectedPosition.value?.sourceCode ? cloneAdvancedKeySettings(value) : undefined
}, { immediate: true, deep: true })
watch(() => props.selectedPositionId, (positionId) => {
  // 无条件把新选择交给 Store；Store 会复用同键缓存/在途请求，并处理快速切键产生的旧结果。
  if (positionId && props.settings?.sourceCode !== selectedPosition.value?.sourceCode) emit('load', positionId)
}, { immediate: true })

function selectType(type: Exclude<AdvancedKeyType, 'none'>) {
  if (!selectedPosition.value) return
  draft.value = createAdvancedKeySettings(type, selectedPosition.value.sourceCode, selectedAssignment.value?.keyCode ?? selectedPosition.value.sourceCode)
}
function updateTravel(index: number, value: string) {
  if (!draft.value || !('travels' in draft.value)) return
  draft.value.travels[index] = Number(value)
}
// 官方驱动把一次完整行程划成 7 个状态点。中间点在协议中占 bit3、bit4，
// 因此不能把一个可见阶段误当成相邻的 2 bit；四个大阶段对应状态点 0、2、4、6。
const DKS_POINT_MASKS = [0x01, 0x02, 0x04, 0x18, 0x20, 0x40, 0x80] as const
const DKS_PHASE_POINTS = [0, 2, 4, 6] as const
function triggerPointSelected(row: number, point: number) {
  if (draft.value?.type !== 'dks') return 0
  const mask = DKS_POINT_MASKS[point]!
  return (draft.value.triggers[row]! & mask) === mask
}
function phaseSelected(row: number, phase: number) {
  return triggerPointSelected(row, DKS_PHASE_POINTS[phase]!)
}
function setTriggerPoint(row: number, point: number, selected: boolean) {
  if (draft.value?.type !== 'dks') return
  const mask = DKS_POINT_MASKS[point]!
  draft.value.triggers[row] = selected
    ? draft.value.triggers[row]! | mask
    : draft.value.triggers[row]! & ~mask
}
function selectedPointRuns(row: number) {
  const segments: { start: number; end: number }[] = []
  let start: number | undefined
  for (let point = 0; point < DKS_POINT_MASKS.length; point += 1) {
    if (triggerPointSelected(row, point)) start ??= point
    if (start !== undefined && (!triggerPointSelected(row, point + 1) || point === DKS_POINT_MASKS.length - 1)) {
      segments.push({ start, end: point })
      start = undefined
    }
  }
  return segments
}
function isContinuousPhase(row: number, phase: number) {
  const point = DKS_PHASE_POINTS[phase]!
  return selectedPointRuns(row).some(({ start, end }) => end > start && point >= start && point <= end)
}
function clearContinuousSegment(row: number, phase: number) {
  const point = DKS_PHASE_POINTS[phase]!
  const segment = selectedPointRuns(row).find(({ start, end }) => end > start && point >= start && point <= end)
  if (segment) for (let index = segment.start; index <= segment.end; index += 1) setTriggerPoint(row, index, false)
  return Boolean(segment)
}
function cycleTrigger(row: number, phase: number) {
  if (draft.value?.type !== 'dks') return
  // 单独选中一个状态点会在进入下一状态点时结束，形成一次完整单击。
  if (clearContinuousSegment(row, phase)) return
  const point = DKS_PHASE_POINTS[phase]!
  setTriggerPoint(row, point, !triggerPointSelected(row, point))
}
function startTriggerDrag(row: number, phase: number) {
  triggerDrag.value = { row, startPhase: phase, endPhase: phase, moved: false }
}
function extendTriggerDrag(row: number, phase: number) {
  if (!triggerDrag.value || triggerDrag.value.row !== row || triggerDrag.value.endPhase === phase) return
  triggerDrag.value.endPhase = phase
  triggerDrag.value.moved = phase !== triggerDrag.value.startPhase
}
function finishTriggerDrag() {
  const drag = triggerDrag.value
  triggerDrag.value = undefined
  if (!drag?.moved) return

  const first = Math.min(drag.startPhase, drag.endPhase)
  const last = Math.max(drag.startPhase, drag.endPhase)
  // 连续触发需要把两个可见阶段之间的隐藏状态点一并选中；状态连续为 1 时固件保持按住。
  for (let phase = first; phase <= last; phase += 1) clearContinuousSegment(drag.row, phase)
  for (let point = DKS_PHASE_POINTS[first]!; point <= DKS_PHASE_POINTS[last]!; point += 1) setTriggerPoint(drag.row, point, true)
  ignoreTriggerClick.value = true
  // pointerup 后浏览器会紧接着派发 click；下一轮事件循环再复位，也能覆盖在格外松手、没有 click 的情况。
  window.setTimeout(() => { ignoreTriggerClick.value = false }, 0)
}
function cancelTriggerDrag() { triggerDrag.value = undefined }
function handleTriggerClick(row: number, phase: number) {
  if (ignoreTriggerClick.value) {
    ignoreTriggerClick.value = false
    return
  }
  cycleTrigger(row, phase)
}
function openKeyPicker(target: KeyPickerTarget) { keyPickerTarget.value = target }
function confirmKeyPicker(keyCode: number) {
  if (!draft.value || !keyPickerTarget.value) return
  const target = keyPickerTarget.value
  if (target.kind === 'keyCode' && 'keyCode' in draft.value) draft.value.keyCode = keyCode
  else if (target.kind === 'pairedSourceCode' && draft.value.type === 'socd') draft.value.pairedSourceCode = keyCode
  else if (target.kind === 'keyCodes' && 'keyCodes' in draft.value) draft.value.keyCodes[target.index] = keyCode
  keyPickerTarget.value = undefined
}
function save() {
  if (draft.value && draft.value.type !== 'none') emit('update', cloneAdvancedKeySettings(draft.value) as Exclude<AdvancedKeySettings, { type: 'none' }>)
}

function deleteCurrentAdvancedKey() {
  if (!canDelete.value || !props.settings) return
  keyPickerTarget.value = undefined
  // Store 会发送删除命令并回读；回读到 none 后，表单和键盘上的高级键角标会一并清除。
  emit('delete', props.settings.sourceCode)
}
</script>

<template>
  <section class="advanced-workspace">
    <div ref="keyboardContainer" class="panel advanced-keyboard-panel">
      <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :selected="selectedPositionId" :unit="keyboardUnit" :geometry="keyGeometry" :badges="keyboardBadges" @select="emit('select-position', $event)" />
    </div>

    <div class="panel advanced-editor">
      <header class="advanced-editor-heading">
        <div class="advanced-heading-main">
          <div><span class="eyebrow">ADVANCED KEY</span><h2>{{ draft && draft.type !== 'none' ? '编辑高级键' : '添加高级键' }}</h2></div>
          <p>先在上方选择物理键，再选择高级键类型并配置触发逻辑</p>
        </div>
        <div class="advanced-heading-actions">
          <button class="ghost danger" type="button" :disabled="busy || !canDelete" @click="deleteCurrentAdvancedKey">删除</button>
          <button class="primary" type="button" :disabled="busy || !draft || draft.type === 'none'" @click="save">{{ status === 'writing' ? '正在确认…' : '确认' }}</button>
        </div>
      </header>
      <aside class="advanced-type-list">
        <button v-for="item in types" :key="item.id" :class="{ active: draft?.type === item.id }" :disabled="busy || !selectedPosition" @click="selectType(item.id)"><strong>{{ item.label }}</strong><small>{{ item.summary }}</small></button>
        <div class="advanced-current-physical">
          <span>当前物理按键</span>
          <strong>{{ selectedPosition?.label ?? '未选择' }}</strong>
          <code v-if="selectedPosition">0x{{ selectedPosition.sourceCode.toString(16).padStart(2, '0').toUpperCase() }}</code>
          <small>{{ currentDescription }}</small>
        </div>
      </aside>

      <section class="advanced-form">
        <div v-if="loading && !draft" class="advanced-placeholder">正在读取当前按键的高级键设置…</div>
        <div v-else-if="!draft || draft.type === 'none'" class="advanced-placeholder">此键尚未设置高级功能。请从左侧选择一种模式。</div>

        <div v-else class="advanced-fields">
          <template v-if="draft.type === 'dks'">
            <div class="dks-editor">
              <div class="dks-matrix">
                <span class="dks-corner">输出键值</span>
                <div v-for="(phase, phaseIndex) in dksPhases" :key="phase.label" class="dks-phase-heading" :class="phase.direction" :aria-label="phase.label">
                  <strong aria-hidden="true">{{ phase.symbol }}</strong>
                  <label v-if="phase.editable"><input type="number" min="0" max="4" step="0.1" :aria-label="`${phase.label}行程`" :value="draft.travels[phase.travelIndex]" @input="updateTravel(phase.travelIndex, ($event.target as HTMLInputElement).value)" /><span>mm</span></label>
                  <small v-else>{{ draft.travels[phase.travelIndex].toFixed(1) }} mm</small>
                </div>
                <template v-for="(keyCode, row) in draft.keyCodes" :key="row">
                  <button class="advanced-key-value compact" type="button" @click="openKeyPicker({ kind: 'keyCodes', index: row })"><span>{{ keyLabel(keyCode) }}</span><small>键值 {{ row + 1 }}</small></button>
                  <div v-for="phase in 4" :key="phase" class="dks-trigger-slot" :class="{ continuous: isContinuousPhase(row, phase - 1), 'connected-next': phase < 4 && isContinuousPhase(row, phase - 1) && isContinuousPhase(row, phase) }">
                    <button class="dks-trigger-cell" :class="{ single: phaseSelected(row, phase - 1) && !isContinuousPhase(row, phase - 1), continuous: isContinuousPhase(row, phase - 1) }" type="button" :title="phaseSelected(row, phase - 1) && !isContinuousPhase(row, phase - 1) ? '单次触发' : isContinuousPhase(row, phase - 1) ? '连续按住区域' : '未触发'" @pointerdown.prevent="startTriggerDrag(row, phase - 1)" @pointerenter="extendTriggerDrag(row, phase - 1)" @click="handleTriggerClick(row, phase - 1)">{{ !phaseSelected(row, phase - 1) && !isContinuousPhase(row, phase - 1) ? '+' : phaseSelected(row, phase - 1) && !isContinuousPhase(row, phase - 1) ? '●' : '' }}</button>
                  </div>
                </template>
              </div>
              <aside class="dks-help"><strong>动态按键设置</strong><p>单击“+”：选择一个独立触发点</p><p>再次单击：取消该触发点</p><p>按住并横向拖动：连接所经过的状态点</p><p>上方行程按 ↓↓↑↑ 镜像经过两个触发位置</p></aside>
            </div>
          </template>

          <template v-else-if="draft.type === 'mpt'">
            <div class="advanced-card-grid three">
              <article v-for="(keyCode, index) in draft.keyCodes" :key="index" class="advanced-setting-card"><span>触发点 {{ index + 1 }}</span><button class="advanced-key-value" type="button" @click="openKeyPicker({ kind: 'keyCodes', index })"><strong>{{ keyLabel(keyCode) }}</strong><small>点击选择按键</small></button><label>触发行程<input type="number" min="0" max="4" step="0.1" :value="draft.travels[index]" @input="updateTravel(index, ($event.target as HTMLInputElement).value)" /><i>mm</i></label></article>
            </div>
          </template>

          <template v-else-if="draft.type === 'mt'">
            <div class="advanced-card-grid two"><article v-for="(name, index) in ['短按', '长按']" :key="name" class="advanced-setting-card"><span>{{ name }}输出</span><button class="advanced-key-value large" type="button" @click="openKeyPicker({ kind: 'keyCodes', index })"><strong>{{ keyLabel(draft.keyCodes[index]!) }}</strong><small>点击选择按键</small></button></article></div>
            <label class="advanced-delay-field"><span>按住判定时间</span><input v-model.number="draft.delay" type="range" min="0" max="2550" step="10" /><output>{{ draft.delay }} ms</output></label>
          </template>

          <template v-else-if="draft.type === 'tgl' || draft.type === 'end'">
            <div class="advanced-single-key"><span>{{ draft.type === 'tgl' ? '切换输出键值' : '松开时输出键值' }}</span><button class="advanced-key-value large" type="button" @click="openKeyPicker({ kind: 'keyCode' })"><strong>{{ keyLabel(draft.keyCode) }}</strong><small>点击选择按键</small></button></div>
            <label class="advanced-delay-field"><span>触发延迟</span><input v-model.number="draft.delay" type="range" min="0" :max="draft.type === 'tgl' ? 2550 : 2000" :step="draft.type === 'tgl' ? 10 : 1" /><output>{{ draft.delay }} ms</output></label>
          </template>

          <template v-else-if="draft.type === 'socd'">
            <div class="advanced-card-grid three socd-cards"><article class="advanced-setting-card"><span>配对物理键</span><button class="advanced-key-value" type="button" @click="openKeyPicker({ kind: 'pairedSourceCode' })"><strong>{{ keyLabel(draft.pairedSourceCode) }}</strong><small>点击选择按键</small></button></article><article v-for="(name, index) in ['键 1 输出', '键 2 输出']" :key="name" class="advanced-setting-card"><span>{{ name }}</span><button class="advanced-key-value" type="button" @click="openKeyPicker({ kind: 'keyCodes', index })"><strong>{{ keyLabel(draft.keyCodes[index]!) }}</strong><small>点击选择按键</small></button></article></div>
            <div class="advanced-field-row"><label>冲突规则</label><select v-model.number="draft.mode"><option :value="0">后输入优先</option><option :value="1">键 1 优先</option><option :value="2">键 2 优先</option><option :value="3">中性（均不输出）</option></select></div>
            <label class="advanced-delay-field"><span>冲突延迟</span><input v-model.number="draft.delay" type="range" min="0" max="2000" step="1" /><output>{{ draft.delay }} ms</output></label>
          </template>
        </div>

      </section>
      <aside class="advanced-test-rail">
        <CompactKeyTest :key-labels="keyLabels" />
      </aside>
    </div>
    <KeyCodeKeyboardDialog :open="!!keyPickerTarget" :profile="profile" :model-value="keyPickerValue" :key-options="keyOptions" :key-labels="keyLabels" :key-geometry="keyGeometry" @close="keyPickerTarget = undefined" @confirm="confirmKeyPicker" />
  </section>
</template>
