<script setup lang="ts">
import { computed } from 'vue'
import type { KeyAssignment, KeyPosition } from '@/domain/keyboard'

const props = withDefaults(defineProps<{ positions: KeyPosition[]; assignments: KeyAssignment[]; keyLabels: Record<number, string>; selected?: string; unit?: number }>(), { unit: 58 })
const emit = defineEmits<{
  select: [id: string]
  contextmenu: [payload: { positionId: string; clientX: number; clientY: number }]
}>()
const assignment = (id: string) => props.assignments.find((item) => item.positionId === id)
const labelFor = (code: number) => props.keyLabels[code] ?? `0x${code.toString(16).padStart(4, '0').toUpperCase()}`
const gap = 6
const canvasStyle = computed(() => ({
  width: `${Math.max(...props.positions.map((key) => key.geometry.x + key.geometry.width), 1) * props.unit + gap}px`,
  height: `${Math.max(...props.positions.map((key) => key.geometry.y + key.geometry.height), 1) * props.unit + gap}px`,
}))
const keyStyle = (key: KeyPosition) => ({
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
      <button v-for="key in positions" :key="key.id" class="keycap" :class="{ selected: selected === key.id, changed: assignment(key.id)?.keyCode !== key.sourceCode }" :style="keyStyle(key)" @click="emit('select', key.id)" @contextmenu.stop.prevent="emit('contextmenu', { positionId: key.id, clientX: $event.clientX, clientY: $event.clientY })">
        <span>{{ labelFor(assignment(key.id)?.keyCode ?? key.sourceCode) }}</span>
        <small>{{ key.label }}</small>
      </button>
    </div>
  </div>
</template>
