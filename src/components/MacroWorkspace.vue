<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { KeyAssignment, KeyDefinition, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import { cloneMacroSettings, createEmptyMacro, EMPTY_MACRO_SOURCE, type MacroMode, type MacroSettings } from '@/domain/macro'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import { keyboardEventCodeToHidUsage } from '@/ui/keyboardEventCode'
import KeyCodeKeyboardDialog from './KeyCodeKeyboardDialog.vue'

const props = defineProps<{
  profile: KeyboardProfile
  status: SessionStatus
  macroSlots?: Record<number, MacroSettings>
  loading?: boolean
  assignments: KeyAssignment[]
  keyOptions: readonly KeyDefinition[]
  keyLabels: Record<number, string>
  keyGeometry?: KeyGeometryResolver
}>()
const emit = defineEmits<{ update: [settings: MacroSettings] }>()

const selectedSlot = ref(0)
const draft = ref<MacroSettings>()
const recording = ref(false)
const keyPickerIndex = ref<number>()
const bindingCandidate = ref<number | ''>('')
let previousEventTime = 0

const busy = computed(() => props.loading || ['connecting', 'reading', 'writing'].includes(props.status))
const macroSlotCount = computed(() => props.profile.capabilities.macroSlots ?? 1)
const maxMacroActions = computed(() => props.profile.capabilities.macroMaxActions ?? 1)
const keyLabel = (code: number) => props.keyLabels[code] ?? `0x${code.toString(16).padStart(4, '0').toUpperCase()}`
const bindingCodes = computed(() => draft.value?.boundSourceCodes ?? [])
const availablePositions = computed(() => props.profile.positions.filter((position) => !bindingCodes.value.includes(position.sourceCode)))
const unavailableActionCount = computed(() => !draft.value?.actionsAvailable ? draft.value?.storedActionCount ?? 0 : 0)
const modeOptions: { value: MacroMode; title: string; description: string }[] = [
  { value: 0, title: '点击执行', description: '按下一次，执行设定的重复次数' },
  { value: 1, title: '点击循环', description: '再次按下绑定键时停止循环' },
  { value: 2, title: '按住循环', description: '松开绑定键后立即停止' },
  { value: 3, title: '按住完成本轮', description: '松开后完成本轮再停止' },
]

watch([selectedSlot, () => props.macroSlots], ([index]) => {
  stopRecording()
  draft.value = cloneMacroSettings(props.macroSlots?.[Number(index)] ?? createEmptyMacro(Number(index), EMPTY_MACRO_SOURCE))
  bindingCandidate.value = ''
}, { immediate: true, deep: true })

function selectSlot(index: number) { selectedSlot.value = index }
function addBinding() {
  if (!draft.value || bindingCandidate.value === '') return
  draft.value.boundSourceCodes = [...new Set([...(draft.value.boundSourceCodes ?? []), bindingCandidate.value])]
  draft.value.sourceCode = draft.value.boundSourceCodes[0] ?? EMPTY_MACRO_SOURCE
  bindingCandidate.value = ''
}
function removeBinding(sourceCode: number) {
  if (!draft.value) return
  draft.value.boundSourceCodes = (draft.value.boundSourceCodes ?? []).filter((code) => code !== sourceCode)
  draft.value.sourceCode = draft.value.boundSourceCodes[0] ?? EMPTY_MACRO_SOURCE
}
function addKeyPair() {
  if (!draft.value || draft.value.actions.length + 2 > maxMacroActions.value) return
  const sourceCode = bindingCodes.value[0]
  const positionId = props.profile.positions.find((position) => position.sourceCode === sourceCode)?.id
  const fallback = props.assignments.find((item) => item.positionId === positionId)?.keyCode ?? 4
  draft.value.actions.push({ keyCode: fallback, pressed: true, delay: 0 }, { keyCode: fallback, pressed: false, delay: 50 })
}
function removeAction(index: number) { draft.value?.actions.splice(index, 1) }
function startRecording() {
  if (!draft.value || busy.value) return
  draft.value.actions = []
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
  event.preventDefault(); event.stopPropagation()
  if (draft.value.actions.length >= maxMacroActions.value) { stopRecording(); return }
  const now = performance.now()
  draft.value.actions.push({ keyCode, pressed: event.type === 'keydown', delay: Math.max(0, Math.round(now - previousEventTime)) })
  previousEventTime = now
}
function confirmKeyPicker(keyCode: number) {
  if (draft.value && keyPickerIndex.value !== undefined && draft.value.actions[keyPickerIndex.value]) draft.value.actions[keyPickerIndex.value]!.keyCode = keyCode
  keyPickerIndex.value = undefined
}
function save() {
  if (!draft.value?.actions.length || !bindingCodes.value.length) return
  emit('update', cloneMacroSettings(draft.value))
}
function cancelEditing() { draft.value = cloneMacroSettings(props.macroSlots?.[selectedSlot.value] ?? createEmptyMacro(selectedSlot.value, EMPTY_MACRO_SOURCE)) }
onBeforeUnmount(stopRecording)
</script>

<template>
  <section class="macro-workspace panel">
    <aside class="macro-slots">
      <header><span class="eyebrow">MACRO</span><h2>宏列表</h2></header>
      <div class="macro-slot-list">
        <button v-for="index in macroSlotCount" :key="index" :class="{ active: selectedSlot === index - 1 }" @click="selectSlot(index - 1)">
          <b>M{{ index }}</b><small>{{ macroSlots?.[index - 1]?.actions.length ?? macroSlots?.[index - 1]?.storedActionCount ?? 0 }} 个动作</small>
        </button>
      </div>
      <section class="macro-bindings">
        <strong>当前绑定按键</strong>
        <div v-if="bindingCodes.length" class="macro-binding-chips"><button v-for="sourceCode in bindingCodes" :key="sourceCode" title="点击解除绑定" @click="removeBinding(sourceCode)">{{ profile.positions.find((position) => position.sourceCode === sourceCode)?.label ?? sourceCode }}<span>×</span></button></div>
        <small v-else>尚未绑定物理按键</small>
        <div class="macro-binding-add"><select v-model="bindingCandidate"><option value="">选择按键</option><option v-for="position in availablePositions" :key="position.id" :value="position.sourceCode">{{ position.label }}</option></select><button class="ghost" :disabled="bindingCandidate === ''" @click="addBinding">添加</button></div>
      </section>
    </aside>

    <section class="macro-options">
      <header><h2>宏设置</h2><p>M{{ selectedSlot + 1 }} 的动作只保存一套，可同时绑定多个物理键。</p></header>
      <strong>执行模式</strong>
      <button v-for="option in modeOptions" :key="option.value" class="macro-mode-card" :class="{ active: draft?.mode === option.value }" @click="draft && (draft.mode = option.value)"><i></i><span><b>{{ option.title }}</b><small>{{ option.description }}</small></span></button>
      <div class="macro-repeat-settings">
        <label>重复次数<input v-if="draft" v-model.number="draft.repeatCount" type="number" min="0" max="65535" /></label>
        <label>重复间隔<span><input v-if="draft" v-model.number="draft.repeatDelay" type="number" min="0" max="16777215" /> ms</span></label>
      </div>
    </section>

    <section class="macro-sequence">
      <header class="macro-toolbar">
        <div><h2>宏录制</h2><small>{{ draft?.actions.length ?? 0 }} / {{ maxMacroActions }} 个动作</small></div>
        <button class="ghost" :class="{ recording }" :disabled="busy" @click="recording ? stopRecording() : startRecording()">{{ recording ? '停止录制' : '开始录制' }}</button>
        <button class="ghost" :disabled="busy || (draft?.actions.length ?? 0) > maxMacroActions - 2" @click="addKeyPair">添加按键</button>
        <button class="ghost" :disabled="busy" @click="cancelEditing">取消</button>
        <button class="primary" :disabled="busy || !draft?.actions.length || !bindingCodes.length" @click="save">{{ status === 'writing' ? '正在保存…' : '保存' }}</button>
      </header>
      <div v-if="unavailableActionCount" class="macro-placeholder macro-unavailable"><strong>设备中有 {{ unavailableActionCount }} 个动作</strong><span>当前方案只回读宏元数据；若宏不是由本网页保存，动作正文无法还原，可重新录制覆盖 M{{ selectedSlot + 1 }}。</span></div>
      <div v-else-if="!draft?.actions.length" class="macro-placeholder">点击“开始录制”，依次记录按下、松开和动作间隔。</div>
      <ol v-else class="macro-action-list">
        <li v-for="(action, index) in draft.actions" :key="index">
          <span class="macro-drag">⠿</span><button class="macro-action-key" @click="keyPickerIndex = index">{{ keyLabel(action.keyCode) }}</button><button class="macro-action-state" :class="{ pressed: action.pressed }" @click="action.pressed = !action.pressed">{{ action.pressed ? '按下' : '松开' }}</button><label><input v-model.number="action.delay" type="number" min="0" max="16777215" step="1" /> ms</label><button class="macro-remove" title="删除动作" @click="removeAction(index)">×</button>
        </li>
      </ol>
    </section>

    <KeyCodeKeyboardDialog :open="keyPickerIndex !== undefined" :profile="profile" :model-value="keyPickerIndex === undefined ? 0 : draft?.actions[keyPickerIndex]?.keyCode ?? 0" :key-options="keyOptions" :key-labels="keyLabels" :key-geometry="keyGeometry" @close="keyPickerIndex = undefined" @confirm="confirmKeyPicker" />
  </section>
</template>
