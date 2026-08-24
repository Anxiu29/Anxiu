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
function triggerBits(row: number, phase: number) {
  if (draft.value?.type !== 'dks') return 0
  // 每格 2 bit 是两个真实键盘事件：bit0=按下、bit1=抬起，11 才是同一区域完整单击。
  return (draft.value.triggers[row]! >> (phase * 2)) & 0x03
}
function cycleTrigger(row: number, phase: number) {
  if (draft.value?.type !== 'dks') return
  const current = triggerBits(row, phase)
  clearContinuousSegment(row, phase)
  setTriggerBits(row, phase, current === 3 ? 0 : 3)
}
function setTriggerBits(row: number, phase: number, state: 0 | 1 | 2 | 3) {
  if (draft.value?.type !== 'dks') return
  const shift = phase * 2
  draft.value.triggers[row] = (draft.value.triggers[row]! & ~(0x03 << shift)) | (state << shift)
}
function continuousSegments(row: number) {
  const segments: { start: number; end: number }[] = []
  let start: number | undefined
  for (let phase = 0; phase < 4; phase += 1) {
    const bits = triggerBits(row, phase)
    if (bits === 1) start = phase
    else if (bits === 2 && start !== undefined) {
      segments.push({ start, end: phase })
      start = undefined
    }
  }
  return segments
}
function isContinuousPhase(row: number, phase: number) {
  return continuousSegments(row).some(({ start, end }) => phase >= start && phase <= end)
}
function clearContinuousSegment(row: number, phase: number) {
  const segment = continuousSegments(row).find(({ start, end }) => phase >= start && phase <= end)
  if (!segment) return
  setTriggerBits(row, segment.start, 0)
  setTriggerBits(row, segment.end, 0)
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
  // 连续区域只在起点写按下(01)、终点写抬起(10)；中间保持按住，不能每格都写完整单击(11)。
  for (let phase = first; phase <= last; phase += 1) clearContinuousSegment(drag.row, phase)
  for (let phase = first; phase <= last; phase += 1) setTriggerBits(drag.row, phase, 0)
  if (first === last) setTriggerBits(drag.row, first, 3)
  else {
    setTriggerBits(drag.row, first, 1)
    setTriggerBits(drag.row, last, 2)
  }
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
                <div v-for="(phase, phaseIndex) in ['按下', '触底', '抬起', '复位']" :key="phase" class="dks-phase-heading">
                  <strong>{{ phase }}</strong>
                  <label v-if="phaseIndex === 0"><input type="number" min="0" max="4" step="0.1" :value="draft.travels[0]" @input="updateTravel(0, ($event.target as HTMLInputElement).value)" /> mm</label>
                  <label v-else-if="phaseIndex === 2"><input type="number" min="0" max="4" step="0.1" :value="draft.travels[1]" @input="updateTravel(1, ($event.target as HTMLInputElement).value)" /> mm</label>
                  <small v-else>{{ draft.travels[1].toFixed(2) }} mm</small>
                </div>
                <template v-for="(keyCode, row) in draft.keyCodes" :key="row">
                  <button class="advanced-key-value compact" type="button" @click="openKeyPicker({ kind: 'keyCodes', index: row })"><span>{{ keyLabel(keyCode) }}</span><small>键值 {{ row + 1 }}</small></button>
                  <div v-for="phase in 4" :key="phase" class="dks-trigger-slot" :class="{ continuous: isContinuousPhase(row, phase - 1), 'connected-next': phase < 4 && isContinuousPhase(row, phase - 1) && isContinuousPhase(row, phase) }">
                    <button class="dks-trigger-cell" :class="{ single: triggerBits(row, phase - 1) === 3, continuous: isContinuousPhase(row, phase - 1) }" type="button" :title="triggerBits(row, phase - 1) === 3 ? '完整按下并抬起' : isContinuousPhase(row, phase - 1) ? '连续按住区域' : '未触发'" @pointerdown.prevent="startTriggerDrag(row, phase - 1)" @pointerenter="extendTriggerDrag(row, phase - 1)" @click="handleTriggerClick(row, phase - 1)">{{ triggerBits(row, phase - 1) === 0 && !isContinuousPhase(row, phase - 1) ? '+' : triggerBits(row, phase - 1) === 3 ? '●' : '' }}</button>
                  </div>
                </template>
              </div>
              <aside class="dks-help"><strong>动态按键设置</strong><p>单击“+”：在该区域完整按下并抬起一次</p><p>再次单击：取消该区域触发</p><p>按住并横向拖动：起点按下、终点抬起</p><p>连续区域中间会保持按住，不重复触发</p></aside>
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
