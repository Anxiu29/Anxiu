<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { KeyAssignment, KeyDefinition, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import { cloneMacroSettings, createEmptyMacro, EMPTY_MACRO_SOURCE, type MacroMode, type MacroSettings } from '@/domain/macro'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import { keyboardEventCodeToHidUsage } from '@/ui/keyboardEventCode'
import { useFittedKeyboardUnit } from '@/ui/useFittedKeyboardUnit'
import { useHorizontalKeyboardScroll } from '@/ui/useHorizontalKeyboardScroll'
import KeyboardCanvas from './KeyboardCanvas.vue'
import MacroBindingDialog from './MacroBindingDialog.vue'
import KeyCodeKeyboardDialog from './KeyCodeKeyboardDialog.vue'

const props = defineProps<{
  profile: KeyboardProfile
  status: SessionStatus
  selectedSlot: number
  macroSlots?: Record<number, MacroSettings>
  loading?: boolean
  assignments: KeyAssignment[]
  keyOptions: readonly KeyDefinition[]
  keyLabels: Record<number, string>
  keyGeometry?: KeyGeometryResolver
}>()
const emit = defineEmits<{ 'select-slot': [index: number]; update: [settings: MacroSettings]; load: [] }>()

const draft = ref<MacroSettings>()
const recording = ref(false)
const keyPickerIndex = ref<number>()
const bindingDialogOpen = ref(false)
const macroSequence = ref<HTMLElement>()
// 宏槽位较多时允许收起列表，把横向空间让给设置和录制区域。
const SLOT_LIST_COLLAPSED_KEY = 'anxiu:macro-slot-list-collapsed'
const slotListCollapsed = ref(readSlotListCollapsed())
const draggedActionIndex = ref<number>()
// 数组下标会在拖动时变化，稳定键值才能让 TransitionGroup 正确计算位移动画。
const actionRenderKeys = new WeakMap<object, number>()
let nextActionRenderKey = 0
let previousEventTime = 0

const busy = computed(() => props.loading || ['connecting', 'reading', 'writing'].includes(props.status))
const macroSlotCount = computed(() => props.profile.capabilities.macroSlots ?? 1)
const maxMacroActions = computed(() => props.profile.capabilities.macroMaxActions ?? 1)
const keyLabel = (code: number) => props.keyLabels[code] ?? `0x${code.toString(16).padStart(4, '0').toUpperCase()}`
const bindingCodes = computed(() => draft.value?.boundSourceCodes ?? [])
const boundPositionIds = computed(() => props.profile.positions.filter((position) => bindingCodes.value.includes(position.sourceCode)).map((position) => position.id))
const bindingBadges = computed(() => Object.fromEntries(boundPositionIds.value.map((id) => [id, '✓'])))
const actionsUnavailable = computed(() => draft.value?.actionsAvailable === false)
// 宏列表收缩和执行模式压缩后，允许矩阵继续利用新增空间放大，而不是停在原来的 30px 上限。
const { container: bindingKeyboardContainer, unit: bindingKeyboardUnit } = useFittedKeyboardUnit(() => props.profile.positions, () => props.keyGeometry, {
  maxUnit: 42,
  minUnit: 10,
  // 画布自身还有间距、内边距和边框；预留完整空间可避免刚好多出几像素而出现滚动条。
  horizontalPadding: 28,
  verticalPadding: 24,
})
useHorizontalKeyboardScroll(bindingKeyboardContainer)
const modeOptions: { value: MacroMode; title: string; description: string }[] = [
  { value: 0, title: '点击执行', description: '按下一次，执行一次宏序列' },
  { value: 1, title: '点击循环', description: '再次按下绑定键时停止循环' },
  { value: 2, title: '按住循环', description: '松开绑定键后立即停止' },
  { value: 3, title: '按住完成本轮', description: '松开后完成本轮再停止' },
]

watch([() => props.selectedSlot, () => props.macroSlots], ([index]) => {
  stopRecording()
  draft.value = cloneMacroSettings(props.macroSlots?.[Number(index)] ?? createEmptyMacro(Number(index), EMPTY_MACRO_SOURCE))
}, { immediate: true, deep: true })

function selectSlot(index: number) { emit('select-slot', index) }
function readSlotListCollapsed() {
  if (typeof localStorage === 'undefined') return true
  try {
    // 尚未保存过偏好时默认收缩；之后沿用用户最后一次手动选择。
    return localStorage.getItem(SLOT_LIST_COLLAPSED_KEY) !== 'false'
  } catch { return true }
}
function toggleSlotList() {
  slotListCollapsed.value = !slotListCollapsed.value
  try { localStorage.setItem(SLOT_LIST_COLLAPSED_KEY, String(slotListCollapsed.value)) } catch { /* 隐私模式下保持本次会话状态即可。 */ }
}
function applyBindings(sourceCodes: number[]) {
  if (!draft.value) return
  draft.value.boundSourceCodes = [...new Set(sourceCodes)]
  draft.value.sourceCode = draft.value.boundSourceCodes[0] ?? EMPTY_MACRO_SOURCE
  bindingDialogOpen.value = false
}
function toggleBindingPosition(positionId: string) {
  const sourceCode = props.profile.positions.find((position) => position.id === positionId)?.sourceCode
  if (sourceCode === undefined) return
  applyBindings(bindingCodes.value.includes(sourceCode) ? bindingCodes.value.filter((code) => code !== sourceCode) : [...bindingCodes.value, sourceCode])
}
function addKeyPair() {
  if (!draft.value || draft.value.actions.length + 2 > maxMacroActions.value) return
  const sourceCode = bindingCodes.value[0]
  const positionId = props.profile.positions.find((position) => position.sourceCode === sourceCode)?.id
  const fallback = props.assignments.find((item) => item.positionId === positionId)?.keyCode ?? 4
  draft.value.actions.push({ keyCode: fallback, pressed: true, delay: 0 }, { keyCode: fallback, pressed: false, delay: 50 })
}
function removeAction(index: number) { draft.value?.actions.splice(index, 1) }
function adjustActionDelay(index: number, delta: number) {
  const action = draft.value?.actions[index]
  if (action) action.delay = Math.min(0xffffff, Math.max(0, action.delay + delta))
}
function adjustRepeatDelay(delta: number) {
  if (!draft.value) return
  draft.value.repeatDelay = Math.min(0xffffff, Math.max(0, draft.value.repeatDelay + delta))
}
function clearActions() { stopRecording(); if (draft.value) draft.value.actions = [] }
function actionRenderKey(action: object) {
  if (!actionRenderKeys.has(action)) actionRenderKeys.set(action, nextActionRenderKey++)
  return actionRenderKeys.get(action)!
}
function startDraggingAction(index: number, event: DragEvent) {
  draggedActionIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function previewActionOrder(targetIndex: number) {
  if (!draft.value || draggedActionIndex.value === undefined || draggedActionIndex.value === targetIndex) return
  const [action] = draft.value.actions.splice(draggedActionIndex.value, 1)
  if (action) draft.value.actions.splice(targetIndex, 0, action)
  // 每经过一个动作就同步当前位置，因此拖动过程中能直接看到最终顺序。
  draggedActionIndex.value = targetIndex
}
function finishDraggingAction() { draggedActionIndex.value = undefined }
function startRecording() {
  if (!draft.value || busy.value) return
  recording.value = true
  previousEventTime = performance.now()
  window.addEventListener('keydown', captureKeyEvent, true)
  window.addEventListener('keyup', captureKeyEvent, true)
}
function revealLatestRecordedAction() {
  // 等待 v-for 生成最新动作行后再滚动；只由录制事件调用，不干扰手动编辑时的视角。
  void nextTick(() => requestAnimationFrame(() => {
    const list = macroSequence.value?.querySelector<HTMLElement>('.macro-action-list')
    list?.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }))
}
function stopRecording() {
  recording.value = false
  window.removeEventListener('keydown', captureKeyEvent, true)
  window.removeEventListener('keyup', captureKeyEvent, true)
}
function captureKeyEvent(event: KeyboardEvent) {
  if (!recording.value || event.repeat || !draft.value) return
  const keyCode = keyboardEventCodeToHidUsage(event.code)
  if (keyCode === undefined) return
  event.preventDefault(); event.stopPropagation()
  if (draft.value.actions.length >= maxMacroActions.value) { stopRecording(); return }
  const now = performance.now()
  draft.value.actions.push({ keyCode, pressed: event.type === 'keydown', delay: Math.max(0, Math.round(now - previousEventTime)) })
  previousEventTime = now
  revealLatestRecordedAction()
}
function confirmKeyPicker(keyCode: number) {
  if (draft.value && keyPickerIndex.value !== undefined && draft.value.actions[keyPickerIndex.value]) draft.value.actions[keyPickerIndex.value]!.keyCode = keyCode
  keyPickerIndex.value = undefined
}
function save() {
  if (!draft.value?.actions.length || !bindingCodes.value.length) return
  // 当前设备固件会回读 num 字段，但官方驱动同样不提供次数调节，实际执行也固定一次。
  // 统一写 1 可避免历史草稿中的无效数值继续误导用户或污染回读校验。
  emit('update', { ...cloneMacroSettings(draft.value), repeatCount: 1 })
}
onBeforeUnmount(stopRecording)
onMounted(() => emit('load'))
</script>

<template>
  <section class="macro-workspace panel" :class="{ 'slot-list-collapsed': slotListCollapsed }">
    <aside class="macro-slots" :class="{ collapsed: slotListCollapsed }">
      <header class="macro-slots-header">
        <div v-if="!slotListCollapsed"><span class="eyebrow">MACRO</span><h2>宏列表</h2></div>
        <button class="macro-slot-collapse" :title="slotListCollapsed ? '展开宏列表' : '折叠宏列表'" :aria-label="slotListCollapsed ? '展开宏列表' : '折叠宏列表'" @click="toggleSlotList">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="slotListCollapsed ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'" /></svg>
        </button>
      </header>
      <div class="macro-slot-list">
        <button v-for="index in macroSlotCount" :key="index" :class="{ active: selectedSlot === index - 1 }" @click="selectSlot(index - 1)">
          <b>M{{ index }}</b><small>{{ macroSlots?.[index - 1]?.actionsAvailable === false ? '设备宏' : `${macroSlots?.[index - 1]?.actions.length ?? macroSlots?.[index - 1]?.storedActionCount ?? 0} 个动作` }}</small>
        </button>
      </div>
    </aside>

    <section class="macro-options">
      <header><h2>宏设置</h2><p>设置完后记得点击保存。</p></header>
      <strong>执行模式</strong>
      <div class="macro-mode-grid">
        <button v-for="option in modeOptions" :key="option.value" class="macro-mode-card" :class="{ active: draft?.mode === option.value }" @click="draft && (draft.mode = option.value)"><i></i><span><b>{{ option.title }}</b><small>{{ option.description }}</small></span></button>
      </div>
      <div class="macro-repeat-settings">
        <label>重复间隔<div class="macro-number-control"><button @click="adjustRepeatDelay(-1)"><span class="macro-control-symbol">−</span></button><input v-if="draft" v-model.number="draft.repeatDelay" type="number" min="0" max="16777215" /><span class="macro-number-unit">ms</span><button @click="adjustRepeatDelay(1)"><span class="macro-control-symbol">+</span></button></div></label>
      </div>
      <section class="macro-bindings">
        <div><span><strong>当前绑定按键</strong><small>{{ bindingCodes.length ? `已选择 ${bindingCodes.length} 个按键；每个键只能绑定一个宏` : '直接点击下方键帽进行绑定' }}</small></span><button class="macro-binding-zoom" title="放大选择键盘" aria-label="放大选择键盘" @click="bindingDialogOpen = true"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 5 5M8 11h6m-3-3v6"/></svg></button></div>
        <div ref="bindingKeyboardContainer" class="macro-binding-keyboard">
          <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :pressed="boundPositionIds" :badges="bindingBadges" :unit="bindingKeyboardUnit" :geometry="keyGeometry" @select="toggleBindingPosition" />
        </div>
      </section>
    </section>

    <section ref="macroSequence" class="macro-sequence">
      <header class="macro-sequence-heading">
        <div><h2>宏录制</h2><small>{{ draft?.actions.length ?? 0 }} / {{ maxMacroActions }} 个动作</small></div>
      </header>
      <div class="macro-record-controls"><button class="macro-record-button" :class="{ recording }" :disabled="busy" @click="recording ? stopRecording() : startRecording()"><span>{{ recording ? '■' : '▶' }}</span>{{ recording ? '停止录制' : '开始录制' }}</button><div><button class="ghost" :disabled="busy || !draft?.actions.length" @click="clearActions">清除数据</button><button class="primary" :disabled="busy || !draft?.actions.length || !bindingCodes.length" @click="save">{{ status === 'writing' ? '正在保存…' : '保存' }}</button></div></div>
      <div v-if="actionsUnavailable" class="macro-placeholder macro-unavailable"><strong>已从键盘读取到该宏</strong><span>当前方案只能回读绑定、槽位和执行参数，不能还原动作正文；可重新录制覆盖 M{{ selectedSlot + 1 }}。</span></div>
      <div v-else-if="!draft?.actions.length" class="macro-placeholder">点击“开始录制”，依次记录按下、松开和动作间隔。</div>
      <TransitionGroup v-else tag="ol" name="macro-action" class="macro-action-list">
        <li v-for="(action, index) in draft.actions" :key="actionRenderKey(action)" :class="{ dragging: draggedActionIndex === index }" draggable="true" @dragstart="startDraggingAction(index, $event)" @dragenter.prevent="previewActionOrder(index)" @dragover.prevent @drop.prevent="finishDraggingAction" @dragend="finishDraggingAction">
          <span class="macro-drag" title="拖动排序">⠿</span><button class="macro-action-key" @click="keyPickerIndex = index">{{ keyLabel(action.keyCode) }}</button><div class="macro-action-states"><button :class="{ active: action.pressed }" @click="action.pressed = true">按下</button><button :class="{ active: !action.pressed }" @click="action.pressed = false">抬起</button></div><div class="macro-action-time"><button title="减少 1 ms" @click="adjustActionDelay(index, -1)"><span class="macro-control-symbol">−</span></button><input v-model.number="action.delay" type="number" min="0" max="16777215" step="1" /><span class="macro-number-unit">ms</span><button title="增加 1 ms" @click="adjustActionDelay(index, 1)"><span class="macro-control-symbol">+</span></button></div><button class="macro-remove" title="删除动作" aria-label="删除动作" @click="removeAction(index)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg></button>
        </li>
      </TransitionGroup>
      <footer class="macro-add-footer"><button class="ghost" :disabled="busy || (draft?.actions.length ?? 0) > maxMacroActions - 2" @click="addKeyPair"><span>＋</span>添加按键</button></footer>
    </section>

    <MacroBindingDialog :open="bindingDialogOpen" :profile="profile" :assignments="assignments" :model-value="bindingCodes" :key-labels="keyLabels" :key-geometry="keyGeometry" @close="bindingDialogOpen = false" @confirm="applyBindings" />
    <KeyCodeKeyboardDialog :open="keyPickerIndex !== undefined" :profile="profile" :model-value="keyPickerIndex === undefined ? 0 : draft?.actions[keyPickerIndex]?.keyCode ?? 0" :key-options="keyOptions" :key-labels="keyLabels" :key-geometry="keyGeometry" @close="keyPickerIndex = undefined" @confirm="confirmKeyPicker" />
  </section>
</template>
