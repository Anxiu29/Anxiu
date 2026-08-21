<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { KeyAssignment, KeyboardProfile } from '@/domain/keyboard'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import { useFittedKeyboardUnit } from '@/ui/useFittedKeyboardUnit'
import { useHorizontalKeyboardScroll } from '@/ui/useHorizontalKeyboardScroll'
import KeyboardCanvas from './KeyboardCanvas.vue'

const props = defineProps<{ open: boolean; profile: KeyboardProfile; assignments: KeyAssignment[]; modelValue: number[]; keyLabels: Record<number, string>; keyGeometry?: KeyGeometryResolver }>()
const emit = defineEmits<{ close: []; confirm: [sourceCodes: number[]] }>()
const pendingCodes = ref<number[]>([])
const { container, unit } = useFittedKeyboardUnit(() => props.profile.positions, () => props.keyGeometry, { maxUnit: 48, minUnit: 28, horizontalPadding: 36, verticalPadding: 30 })
useHorizontalKeyboardScroll(container)

watch(() => [props.open, props.modelValue] as const, ([open, value]) => { if (open) pendingCodes.value = [...value] }, { immediate: true, deep: true })
const selectedPositionIds = computed(() => props.profile.positions.filter((position) => pendingCodes.value.includes(position.sourceCode)).map((position) => position.id))
const badges = computed(() => Object.fromEntries(selectedPositionIds.value.map((id) => [id, '✓'])))
function toggle(positionId: string) {
  const sourceCode = props.profile.positions.find((position) => position.id === positionId)?.sourceCode
  if (sourceCode === undefined) return
  pendingCodes.value = pendingCodes.value.includes(sourceCode) ? pendingCodes.value.filter((code) => code !== sourceCode) : [...pendingCodes.value, sourceCode]
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="key-code-dialog-backdrop" @click.self="emit('close')">
      <section class="key-code-dialog macro-binding-dialog panel" role="dialog" aria-modal="true">
        <header><div><h3>选择宏绑定按键</h3><p>可以选择多个物理键，它们将触发同一个宏槽位</p></div><button type="button" aria-label="关闭" @click="emit('close')">×</button></header>
        <div ref="container" class="key-code-dialog-keyboard">
          <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :pressed="selectedPositionIds" :badges="badges" :unit="unit" :geometry="keyGeometry" @select="toggle" />
        </div>
        <footer><div class="key-code-dialog-current"><span>已选择</span><strong>{{ pendingCodes.length }} 个按键</strong></div><button class="ghost" @click="emit('close')">取消</button><button class="primary" @click="emit('confirm', pendingCodes)">确认</button></footer>
      </section>
    </div>
  </Teleport>
</template>
