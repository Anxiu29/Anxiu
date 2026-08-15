<script setup lang="ts">
import { computed } from 'vue'
import type { KeyAssignment, KeyPosition } from '@/domain/keyboard'

const props = defineProps<{ positions: KeyPosition[]; assignments: KeyAssignment[]; keyLabels: Record<number, string>; selected?: string }>()
const emit = defineEmits<{ select: [id: string] }>()
const assignment = (id: string) => props.assignments.find((item) => item.positionId === id)
const labelFor = (code: number) => props.keyLabels[code] ?? `0x${code.toString(16).padStart(4, '0').toUpperCase()}`
const unit = 46
const gap = 6
const visiblePositions = computed(() => props.positions.filter((key) => key.present))
const canvasStyle = computed(() => ({
  width: `${Math.max(...visiblePositions.value.map((key) => key.geometry.x + key.geometry.width), 1) * unit + gap}px`,
  height: `${Math.max(...visiblePositions.value.map((key) => key.geometry.y + key.geometry.height), 1) * unit + gap}px`,
}))
const keyStyle = (key: KeyPosition) => ({
  left: `${key.geometry.x * unit + gap}px`,
  top: `${key.geometry.y * unit + gap}px`,
  width: `${key.geometry.width * unit - gap}px`,
  height: `${key.geometry.height * unit - 2}px`,
  transform: key.geometry.rotation ? `rotate(${key.geometry.rotation}deg)` : undefined,
})
</script>

<template>
  <div class="keyboard-shell">
    <div class="keyboard-layout" :style="canvasStyle">
      <button v-for="key in visiblePositions" :key="key.id" class="keycap" :class="{ selected: selected === key.id, changed: assignment(key.id)?.keyCode !== key.sourceCode }" :style="keyStyle(key)" @click="emit('select', key.id)">
        <span>{{ labelFor(assignment(key.id)?.keyCode ?? key.sourceCode) }}</span>
        <small>{{ key.label }}</small>
      </button>
    </div>
  </div>
</template>
