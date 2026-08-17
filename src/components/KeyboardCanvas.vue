<script setup lang="ts">
import { computed } from 'vue'
import type { KeyAssignment, KeyPosition } from '@/domain/keyboard'
import { c98KeyGeometry, type KeyGeometry } from '@/ui/c98KeyboardGeometry'

const props = withDefaults(defineProps<{ positions: KeyPosition[]; assignments: KeyAssignment[]; defaultAssignments?: KeyAssignment[]; keyLabels: Record<number, string>; selected?: string; unit?: number }>(), { unit: 58, defaultAssignments: () => [] })
const emit = defineEmits<{
  select: [id: string]
  contextmenu: [payload: { positionId: string; clientX: number; clientY: number }]
}>()
const assignment = (id: string) => props.assignments.find((item) => item.positionId === id)
const defaultAssignment = (id: string) => props.defaultAssignments.find((item) => item.positionId === id)
const isChanged = (id: string) => {
  const baseline = defaultAssignment(id)
  return baseline !== undefined && assignment(id)?.keyCode !== baseline.keyCode
}
const labelFor = (code: number) => props.keyLabels[code] ?? `0x${code.toString(16).padStart(4, '0').toUpperCase()}`
const gap = 6
type RenderedKey = KeyPosition & { geometry: KeyGeometry }
const renderedPositions = computed<RenderedKey[]>(() => props.positions
  .map((key) => ({ ...key, geometry: c98KeyGeometry(key) }))
  .sort((a, b) => a.geometry.y - b.geometry.y || a.geometry.x - b.geometry.x))
const canvasStyle = computed(() => ({
  width: `${Math.max(...renderedPositions.value.map((key) => key.geometry.x + key.geometry.width), 1) * props.unit + gap}px`,
  height: `${Math.max(...renderedPositions.value.map((key) => key.geometry.y + key.geometry.height), 1) * props.unit + gap}px`,
}))
const keyStyle = (key: RenderedKey) => ({
  left: `${key.geometry.x * props.unit + gap}px`,
  top: `${key.geometry.y * props.unit + gap}px`,
  width: `${key.geometry.width * props.unit - gap}px`,
  height: `${key.geometry.height * props.unit - 2}px`,
  transform: key.geometry.rotation ? `rotate(${key.geometry.rotation}deg)` : undefined,
})
</script>

<template>
  <div class="keyboard-shell">
    <div class="keyboard-layout" :style="canvasStyle">
      <button v-for="key in renderedPositions" :key="key.id" class="keycap" :class="{ selected: selected === key.id, changed: isChanged(key.id) }" :style="keyStyle(key)" @click="emit('select', key.id)" @contextmenu.stop.prevent="emit('contextmenu', { positionId: key.id, clientX: $event.clientX, clientY: $event.clientY })">
        <span>{{ labelFor(assignment(key.id)?.keyCode ?? key.sourceCode) }}</span>
        <small>{{ key.label }}</small>
      </button>
    </div>
  </div>
</template>
