<script setup lang="ts">
import { computed } from 'vue'
import type { KeyAssignment, KeyPosition } from '@/domain/keyboard'
import { keyDefinition } from '@/domain/keycodes'

const props = defineProps<{ positions: KeyPosition[]; assignments: KeyAssignment[]; selected?: string }>()
const emit = defineEmits<{ select: [id: string] }>()
const rows = computed(() => Array.from({ length: Math.max(...props.positions.map((p) => p.row), 0) + 1 }, (_, row) => props.positions.filter((p) => p.row === row)))
const assignment = (id: string) => props.assignments.find((item) => item.positionId === id)
</script>

<template>
  <div class="keyboard-shell">
    <div v-for="(row, index) in rows" :key="index" class="key-row">
      <button v-for="key in row" :key="key.id" class="keycap" :class="{ selected: selected === key.id, changed: assignment(key.id)?.keyCode !== key.sourceCode }" :style="{ '--key-width': key.width ?? 1 }" @click="emit('select', key.id)">
        <span>{{ keyDefinition(assignment(key.id)?.keyCode ?? key.sourceCode).label }}</span>
        <small>{{ key.label }}</small>
      </button>
    </div>
  </div>
</template>
