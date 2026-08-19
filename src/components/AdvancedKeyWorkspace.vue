<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AdvancedKeySettings, AdvancedKeyType } from '@/domain/advancedKey'
import { createAdvancedKeySettings } from '@/domain/advancedKey'
import type { KeyAssignment, KeyDefinition, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import KeyboardCanvas from './KeyboardCanvas.vue'

const props = defineProps<{
  profile: KeyboardProfile
  status: SessionStatus
  selectedPositionId?: string
  settings?: AdvancedKeySettings
  assignments: KeyAssignment[]
  keyOptions: readonly KeyDefinition[]
  keyLabels: Record<number, string>
  keyGeometry?: KeyGeometryResolver
}>()
const emit = defineEmits<{
  'select-position': [positionId: string]
  load: [positionId: string]
  update: [settings: Exclude<AdvancedKeySettings, { type: 'none' }>]
  delete: [sourceCode: number]
}>()

const draft = ref<AdvancedKeySettings>()
const viewportWidth = ref(window.innerWidth)
const viewportHeight = ref(window.innerHeight)
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
const busy = computed(() => ['connecting', 'reading', 'writing'].includes(props.status))
const currentDescription = computed(() => types.find((item) => item.id === draft.value?.type)?.summary ?? '当前按键没有高级键设置')
const keyboardUnit = computed(() => {
  const widthUnit = viewportWidth.value <= 1250 ? 38 : viewportWidth.value <= 1450 ? 46 : viewportWidth.value <= 1650 ? 52 : viewportWidth.value <= 1850 ? 58 : 62
  const heightUnit = viewportHeight.value <= 800 ? 43 : viewportHeight.value <= 900 ? 50 : viewportHeight.value <= 1000 ? 57 : 62
  return Math.min(widthUnit, heightUnit)
})
const updateViewportSize = () => { viewportWidth.value = window.innerWidth; viewportHeight.value = window.innerHeight }
onMounted(() => window.addEventListener('resize', updateViewportSize))
onBeforeUnmount(() => window.removeEventListener('resize', updateViewportSize))

watch(() => props.settings, (value) => { draft.value = value ? structuredClone(value) : undefined }, { immediate: true, deep: true })
watch(() => props.selectedPositionId, (positionId) => { draft.value = undefined; if (positionId) emit('load', positionId) }, { immediate: true })

function selectType(type: Exclude<AdvancedKeyType, 'none'>) {
  if (!selectedPosition.value) return
  draft.value = createAdvancedKeySettings(type, selectedPosition.value.sourceCode, selectedAssignment.value?.keyCode ?? selectedPosition.value.sourceCode)
}
function updateKey(index: number, value: string) {
  if (!draft.value || !('keyCodes' in draft.value)) return
  draft.value.keyCodes[index] = Number(value)
}
function updateTravel(index: number, value: string) {
  if (!draft.value || !('travels' in draft.value)) return
  draft.value.travels[index] = Number(value)
}
function updateTrigger(index: number, value: string) {
  if (!draft.value || draft.value.type !== 'dks') return
  draft.value.triggers[index] = Math.max(0, Math.min(255, Number(value)))
}
function save() {
  if (draft.value && draft.value.type !== 'none') emit('update', structuredClone(draft.value))
}
function remove() {
  if (!selectedPosition.value || draft.value?.type === 'none') return
  if (window.confirm('清除当前物理键的高级键设置？普通键位映射不会改变。')) emit('delete', selectedPosition.value.sourceCode)
}
</script>

<template>
  <section class="advanced-workspace">
    <div class="panel advanced-keyboard-panel">
      <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :selected="selectedPositionId" :unit="keyboardUnit" :geometry="keyGeometry" @select="emit('select-position', $event)" />
    </div>

    <div class="panel advanced-editor">
      <header class="advanced-editor-heading">
        <div><span class="eyebrow">ADVANCED KEY</span><h2>{{ draft && draft.type !== 'none' ? '编辑高级键' : '添加高级键' }}</h2></div>
        <p>先在上方选择物理键，再选择高级键类型并配置触发逻辑</p>
      </header>
      <aside class="advanced-type-list">
        <button v-for="item in types" :key="item.id" :class="{ active: draft?.type === item.id }" :disabled="busy || !selectedPosition" @click="selectType(item.id)"><strong>{{ item.label }}</strong><small>{{ item.summary }}</small></button>
      </aside>

      <section class="advanced-form">
        <header><div><span>当前物理键</span><strong>{{ selectedPosition?.label ?? '未选择' }}</strong><code v-if="selectedPosition">0x{{ selectedPosition.sourceCode.toString(16).padStart(2, '0').toUpperCase() }}</code></div><p>{{ currentDescription }}</p></header>
        <div v-if="busy && !draft" class="advanced-placeholder">正在读取当前按键的高级键设置…</div>
        <div v-else-if="!draft || draft.type === 'none'" class="advanced-placeholder">此键尚未设置高级功能。请从左侧选择一种模式。</div>

        <div v-else class="advanced-fields">
          <template v-if="draft.type === 'dks'">
            <div v-for="(_, index) in draft.keyCodes" :key="index" class="advanced-field-row three-columns"><label>阶段 {{ index + 1 }} 键值</label><select :value="draft.keyCodes[index]" @change="updateKey(index, ($event.target as HTMLSelectElement).value)"><option v-for="key in keyOptions" :key="key.code" :value="key.code">{{ key.label }}</option></select><label class="inline-number">TRPS 掩码 <input type="number" min="0" max="255" :value="draft.triggers[index]" @input="updateTrigger(index, ($event.target as HTMLInputElement).value)" /></label></div>
            <p class="field-help">TRPS 是 8 位触发掩码；暂以原始数值显示，便于和官方协议及抓包逐位核对。</p>
            <div class="travel-grid"><label>按下行程（mm）<input type="number" min="0" max="4" step="0.1" :value="draft.travels[0]" @input="updateTravel(0, ($event.target as HTMLInputElement).value)" /></label><label>抬起行程（mm）<input type="number" min="0" max="4" step="0.1" :value="draft.travels[1]" @input="updateTravel(1, ($event.target as HTMLInputElement).value)" /></label></div>
          </template>

          <template v-else-if="draft.type === 'mpt'">
            <div v-for="(_, index) in draft.keyCodes" :key="index" class="advanced-field-row three-columns"><label>阶段 {{ index + 1 }}</label><select :value="draft.keyCodes[index]" @change="updateKey(index, ($event.target as HTMLSelectElement).value)"><option v-for="key in keyOptions" :key="key.code" :value="key.code">{{ key.label }}</option></select><label class="inline-number">行程 mm <input type="number" min="0" max="4" step="0.1" :value="draft.travels[index]" @input="updateTravel(index, ($event.target as HTMLInputElement).value)" /></label></div>
          </template>

          <template v-else-if="draft.type === 'mt'">
            <div v-for="(name, index) in ['点按键值', '长按键值']" :key="name" class="advanced-field-row"><label>{{ name }}</label><select :value="draft.keyCodes[index]" @change="updateKey(index, ($event.target as HTMLSelectElement).value)"><option v-for="key in keyOptions" :key="key.code" :value="key.code">{{ key.label }}</option></select></div>
            <label class="standalone-field">判定延迟（ms）<input v-model.number="draft.delay" type="number" min="0" max="2550" step="10" /></label>
          </template>

          <template v-else-if="draft.type === 'tgl' || draft.type === 'end'">
            <div class="advanced-field-row"><label>输出键值</label><select v-model.number="draft.keyCode"><option v-for="key in keyOptions" :key="key.code" :value="key.code">{{ key.label }}</option></select></div>
            <label class="standalone-field">延迟（ms）<input v-model.number="draft.delay" type="number" min="0" :max="draft.type === 'tgl' ? 2550 : 65535" :step="draft.type === 'tgl' ? 10 : 1" /></label>
          </template>

          <template v-else-if="draft.type === 'socd'">
            <div class="advanced-field-row"><label>配对物理键</label><select v-model.number="draft.pairedSourceCode"><option v-for="position in profile.positions" :key="position.id" :value="position.sourceCode">{{ position.label }}</option></select></div>
            <div v-for="(name, index) in ['键 1 输出', '键 2 输出']" :key="name" class="advanced-field-row"><label>{{ name }}</label><select :value="draft.keyCodes[index]" @change="updateKey(index, ($event.target as HTMLSelectElement).value)"><option v-for="key in keyOptions" :key="key.code" :value="key.code">{{ key.label }}</option></select></div>
            <div class="advanced-field-row"><label>冲突规则</label><select v-model.number="draft.mode"><option :value="0">后输入优先</option><option :value="1">键 1 优先</option><option :value="2">键 2 优先</option><option :value="3">中性（均不输出）</option></select></div>
            <label class="standalone-field">延迟（ms）<input v-model.number="draft.delay" type="number" min="0" max="65535" /></label>
          </template>
        </div>

        <footer><button class="ghost danger" :disabled="busy || !draft || draft.type === 'none'" @click="remove">清除高级键</button><button class="primary" :disabled="busy || !draft || draft.type === 'none'" @click="save">{{ status === 'writing' ? '正在写入…' : '写入并回读验证' }}</button></footer>
      </section>
    </div>
  </section>
</template>
