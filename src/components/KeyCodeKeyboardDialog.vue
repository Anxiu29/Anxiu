<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { KeyAssignment, KeyDefinition, KeyboardProfile } from '@/domain/keyboard'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import { useFittedKeyboardUnit } from '@/ui/useFittedKeyboardUnit'
import { useHorizontalKeyboardScroll } from '@/ui/useHorizontalKeyboardScroll'
import KeyboardCanvas from './KeyboardCanvas.vue'

const props = defineProps<{
  open: boolean
  profile: KeyboardProfile
  modelValue: number
  keyOptions: readonly KeyDefinition[]
  keyLabels: Record<number, string>
  keyGeometry?: KeyGeometryResolver
}>()
const emit = defineEmits<{ close: []; confirm: [keyCode: number] }>()
const pendingCode = ref(props.modelValue)
const { container: keyboardContainer, unit: keyboardUnit } = useFittedKeyboardUnit(() => props.profile.positions, () => props.keyGeometry, { maxUnit: 44, minUnit: 28, horizontalPadding: 34, verticalPadding: 28 })
useHorizontalKeyboardScroll(keyboardContainer)

watch(() => [props.open, props.modelValue] as const, ([open, value]) => { if (open) pendingCode.value = value }, { immediate: true })

// 弹窗展示的是可选择的标准键值，因此键帽使用物理 sourceCode，不受当前改键层影响。
const keyboardAssignments = computed<KeyAssignment[]>(() => props.profile.positions.map((position) => ({
  positionId: position.id,
  sourceCode: position.sourceCode,
  layer: 0,
  keyCode: position.sourceCode,
  category: props.keyOptions.find((item) => item.code === position.sourceCode)?.category ?? 'basic',
})))
const selectedPositionId = computed(() => props.profile.positions.find((position) => position.sourceCode === pendingCode.value)?.id)
const physicalCodes = computed(() => new Set(props.profile.positions.map((position) => position.sourceCode)))
const extraOptions = computed(() => props.keyOptions.filter((item) => !physicalCodes.value.has(item.code) && item.label !== '-'))
const choosePosition = (positionId: string) => {
  const position = props.profile.positions.find((item) => item.id === positionId)
  if (position) pendingCode.value = position.sourceCode
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="key-code-dialog-backdrop" @click.self="emit('close')">
      <section class="key-code-dialog panel" role="dialog" aria-modal="true" aria-labelledby="key-code-dialog-title">
        <header><div><h3 id="key-code-dialog-title">选择按键</h3><p>点击键盘中的键帽，然后确认</p></div><button type="button" aria-label="关闭" @click="emit('close')">×</button></header>
        <div ref="keyboardContainer" class="key-code-dialog-keyboard">
          <KeyboardCanvas :positions="profile.positions" :assignments="keyboardAssignments" :key-labels="keyLabels" :selected="selectedPositionId" :unit="keyboardUnit" :geometry="keyGeometry" @select="choosePosition" />
        </div>
        <footer>
          <label>更多键值<select v-model.number="pendingCode"><option v-for="key in extraOptions" :key="key.code" :value="key.code">{{ key.label }}</option></select></label>
          <div class="key-code-dialog-current"><span>当前选择</span><strong>{{ keyLabels[pendingCode] ?? `0x${pendingCode.toString(16).toUpperCase()}` }}</strong></div>
          <button class="ghost" type="button" @click="emit('close')">取消</button>
          <button class="primary" type="button" @click="emit('confirm', pendingCode)">确认</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
