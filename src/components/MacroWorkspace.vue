<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { KeyAssignment, KeyDefinition, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import { cloneMacroSettings, createEmptyMacro, type MacroSettings } from '@/domain/macro'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import { keyboardEventCodeToHidUsage } from '@/ui/keyboardEventCode'
import { useFittedKeyboardUnit } from '@/ui/useFittedKeyboardUnit'
import { useHorizontalKeyboardScroll } from '@/ui/useHorizontalKeyboardScroll'
import KeyboardCanvas from './KeyboardCanvas.vue'
import KeyCodeKeyboardDialog from './KeyCodeKeyboardDialog.vue'

const props = defineProps<{
  profile: KeyboardProfile
  status: SessionStatus
  selectedPositionId?: string
  settings?: MacroSettings
  macroBindings?: Record<number, string>
  loading?: boolean
  assignments: KeyAssignment[]
  keyOptions: readonly KeyDefinition[]
  keyLabels: Record<number, string>
  keyGeometry?: KeyGeometryResolver
}>()
const emit = defineEmits<{
  'select-position': [positionId: string]
  load: [positionId: string]
  reload: [positionId: string]
  update: [settings: MacroSettings]
}>()

const draft = ref<MacroSettings>()
const recording = ref(false)
const keyPickerIndex = ref<number>()
let previousEventTime = 0
const selectedPosition = computed(() => props.profile.positions.find((item) => item.id === props.selectedPositionId))
const busy = computed(() => props.loading || ['connecting', 'reading', 'writing'].includes(props.status))
const macroSlotCount = computed(() => props.profile.capabilities.macroSlots ?? 1)
const maxMacroActions = computed(() => props.profile.capabilities.macroMaxActions ?? 1)
const keyLabel = (code: number) => props.keyLabels[code] ?? `0x${code.toString(16).padStart(4, '0').toUpperCase()}`
const unavailableActionCount = computed(() => !draft.value?.actionsAvailable ? draft.value?.storedActionCount ?? 0 : 0)
const keyboardBadges = computed(() => Object.fromEntries(props.profile.positions
  .map((position) => [position.id, props.macroBindings?.[position.sourceCode]])
  .filter((entry): entry is [string, string] => Boolean(entry[1]))))
const { container: keyboardContainer, unit: keyboardUnit } = useFittedKeyboardUnit(() => props.profile.positions, () => props.keyGeometry, { minUnit: 28 })
useHorizontalKeyboardScroll(keyboardContainer)

watch([() => props.settings, () => props.selectedPositionId], ([settings]) => {
  const sourceCode = selectedPosition.value?.sourceCode
  if (sourceCode === undefined) { draft.value = undefined; return }
  draft.value = settings?.sourceCode === sourceCode ? cloneMacroSettings(settings) : undefined
}, { immediate: true, deep: true })

watch(() => props.selectedPositionId, (positionId) => {
  stopRecording()
  if (positionId && props.settings?.sourceCode !== selectedPosition.value?.sourceCode) emit('load', positionId)
}, { immediate: true })

function ensureDraft() {
  if (!draft.value && selectedPosition.value) draft.value = createEmptyMacro(0, selectedPosition.value.sourceCode)
  return draft.value
}
function selectSlot(index: number) {
  const value = ensureDraft()
  if (value) value.index = index
}
function addKeyPair() {
  const value = ensureDraft()
  if (!value || value.actions.length + 2 > maxMacroActions.value) return
  const fallback = props.assignments.find((item) => item.positionId === props.selectedPositionId)?.keyCode ?? 4
  value.actions.push({ keyCode: fallback, pressed: true, delay: 0 }, { keyCode: fallback, pressed: false, delay: 50 })
}
function removeAction(index: number) { draft.value?.actions.splice(index, 1) }
function startRecording() {
  const value = ensureDraft()
  if (!value || busy.value) return
  value.actions = []
  recording.value = true
  previousEventTime = performance.now()
  window.addEventListener('keydown', captureKeyEvent, true)
  window.addEventListener('keyup', captureKeyEvent, true)
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
  event.preventDefault()
  event.stopPropagation()
  if (draft.value.actions.length >= maxMacroActions.value) { stopRecording(); return }
  const now = performance.now()
  draft.value.actions.push({ keyCode, pressed: event.type === 'keydown', delay: Math.max(0, Math.round(now - previousEventTime)) })
  previousEventTime = now
}
function confirmKeyPicker(keyCode: number) {
  if (draft.value && keyPickerIndex.value !== undefined && draft.value.actions[keyPickerIndex.value]) draft.value.actions[keyPickerIndex.value]!.keyCode = keyCode
  keyPickerIndex.value = undefined
}
function save() { if (draft.value && draft.value.actions.length) emit('update', cloneMacroSettings(draft.value)) }
function cancelEditing() {
  stopRecording()
  draft.value = props.settings && props.settings.sourceCode === selectedPosition.value?.sourceCode ? cloneMacroSettings(props.settings) : selectedPosition.value ? createEmptyMacro(0, selectedPosition.value.sourceCode) : undefined
}
onBeforeUnmount(stopRecording)
</script>

<template>
  <section class="macro-workspace">
    <div ref="keyboardContainer" class="panel macro-keyboard-panel">
      <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :selected="selectedPositionId" :unit="keyboardUnit" :geometry="keyGeometry" :badges="keyboardBadges" @select="emit('select-position', $event)" />
    </div>

    <div class="panel macro-editor">
      <header class="macro-heading">
        <div><span class="eyebrow">MACRO</span><h2>宏设置</h2><p>查看已保存宏：点击上方绑定的物理键；编辑后按“确认”写入</p></div>
        <div class="macro-heading-actions"><button class="ghost" :disabled="busy || !selectedPosition" @click="selectedPosition && emit('reload', selectedPosition.id)">重新读取当前键</button><button class="ghost" :disabled="busy || !draft" @click="cancelEditing">取消</button><button class="primary" :disabled="busy || !draft?.actions.length" @click="save">{{ status === 'writing' ? '正在确认…' : '确认' }}</button></div>
      </header>

      <aside class="macro-slots">
        <strong>宏槽位</strong>
        <div><button v-for="index in macroSlotCount" :key="index" :class="{ active: draft?.index === index - 1 }" :disabled="busy || !selectedPosition" @click="selectSlot(index - 1)">M{{ index }}</button></div>
        <small>当前触发键</small><b>{{ selectedPosition?.label ?? '未选择' }}</b>
      </aside>

      <section class="macro-sequence">
        <div class="macro-toolbar">
          <div><strong>动作序列</strong><small>{{ draft?.actions.length ?? 0 }} / {{ maxMacroActions }}</small></div>
          <button class="ghost" :class="{ recording }" :disabled="busy || !selectedPosition" @click="recording ? stopRecording() : startRecording()">{{ recording ? '停止录制' : '开始录制' }}</button>
          <button class="ghost" :disabled="busy || !selectedPosition || (draft?.actions.length ?? 0) > maxMacroActions - 2" @click="addKeyPair">添加按键</button>
        </div>
        <div v-if="loading && !draft" class="macro-placeholder">正在读取当前按键的宏设置…</div>
        <div v-else-if="unavailableActionCount" class="macro-placeholder macro-unavailable"><strong>检测到已保存 {{ unavailableActionCount }} 个动作</strong><span>当前固件只允许回读宏槽位和动作数量，无法取回由其他驱动写入的动作正文。重新录制并由本驱动保存后即可再次查看。</span></div>
        <div v-else-if="!draft?.actions.length" class="macro-placeholder">点击“开始录制”，网页会依次记录按下、松开和动作间隔。</div>
        <ol v-else class="macro-action-list">
          <li v-for="(action, index) in draft.actions" :key="index">
            <span>{{ index + 1 }}</span>
            <button class="macro-action-key" @click="keyPickerIndex = index">{{ keyLabel(action.keyCode) }}</button>
            <button class="macro-action-state" :class="{ pressed: action.pressed }" @click="action.pressed = !action.pressed">{{ action.pressed ? '按下' : '松开' }}</button>
            <label><input v-model.number="action.delay" type="number" min="0" max="16777215" step="1" /> ms</label>
            <button class="macro-remove" title="删除动作" @click="removeAction(index)">×</button>
          </li>
        </ol>
      </section>

      <aside class="macro-options">
        <strong>执行方式</strong>
        <label>触发模式<select v-if="draft" v-model.number="draft.mode"><option :value="0">点击执行一次</option><option :value="1">点击循环，再次点击停止</option><option :value="2">按住循环，松开立即停止</option><option :value="3">按住循环，完成本轮后停止</option></select></label>
        <label>重复次数<input v-if="draft" v-model.number="draft.repeatCount" type="number" min="0" max="65535" /></label>
        <label>重复间隔<input v-if="draft" v-model.number="draft.repeatDelay" type="number" min="0" max="16777215" /><span>ms</span></label>
        <p>宏会直接接管当前物理键；M1~M16 是设备槽位。循环模式由固件根据按下/松开状态停止。</p>
      </aside>
    </div>

    <KeyCodeKeyboardDialog :open="keyPickerIndex !== undefined" :profile="profile" :model-value="keyPickerIndex === undefined ? 0 : draft?.actions[keyPickerIndex]?.keyCode ?? 0" :key-options="keyOptions" :key-labels="keyLabels" :key-geometry="keyGeometry" @close="keyPickerIndex = undefined" @confirm="confirmKeyPicker" />
  </section>
</template>
