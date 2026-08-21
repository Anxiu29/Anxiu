<script setup lang="ts">
import { computed } from 'vue'
import type { KeyAssignment, KeyPosition } from '@/domain/keyboard'
import { matrixKeyGeometry, type KeyGeometry, type KeyGeometryResolver } from '@/ui/keyboardGeometry'

const props = withDefaults(defineProps<{ positions: KeyPosition[]; assignments: KeyAssignment[]; defaultAssignments?: KeyAssignment[]; keyLabels: Record<number, string>; selected?: string; pressed?: readonly string[]; unit?: number; geometry?: KeyGeometryResolver; badges?: Record<string, string>; keyColors?: Record<string, string> }>(), { unit: 58, defaultAssignments: () => [], pressed: () => [], geometry: matrixKeyGeometry, badges: () => ({}), keyColors: () => ({}) })
const emit = defineEmits<{
  select: [id: string]
  contextmenu: [payload: { positionId: string; clientX: number; clientY: number }]
}>()
const assignment = (id: string) => props.assignments.find((item) => item.positionId === id)
const defaultAssignment = (id: string) => props.defaultAssignments.find((item) => item.positionId === id)
// “已修改”必须与当前层默认值比较，不能拿物理 sourceCode 比较，否则 Fn 键会被误标。
const isChanged = (id: string) => {
  const baseline = defaultAssignment(id)
  return baseline !== undefined && assignment(id)?.keyCode !== baseline.keyCode
}
const labelFor = (code: number) => props.keyLabels[code] ?? `0x${code.toString(16).padStart(4, '0').toUpperCase()}`
const gap = 6
type RenderedKey = KeyPosition & { geometry: KeyGeometry }
// 协议位置保持纯矩阵地址；视觉坐标只在渲染前通过设备注入的 resolver 临时附加。
const renderedPositions = computed<RenderedKey[]>(() => props.positions
  .map((key) => ({ ...key, geometry: props.geometry(key) }))
  .sort((a, b) => a.geometry.y - b.geometry.y || a.geometry.x - b.geometry.x))
const canvasStyle = computed(() => ({
  // 画布尺寸由所有键帽的最右/最下边界决定，支持非规则配列和跨单位键帽。
  width: `${Math.max(...renderedPositions.value.map((key) => key.geometry.x + key.geometry.width), 1) * props.unit + gap}px`,
  height: `${Math.max(...renderedPositions.value.map((key) => key.geometry.y + key.geometry.height), 1) * props.unit + gap}px`,
}))
const keyStyle = (key: RenderedKey) => ({
  left: `${key.geometry.x * props.unit + gap}px`,
  top: `${key.geometry.y * props.unit + gap}px`,
  width: `${key.geometry.width * props.unit - gap}px`,
  height: `${key.geometry.height * props.unit - 2}px`,
  transform: key.geometry.rotation ? `rotate(${key.geometry.rotation}deg)` : undefined,
  '--key-light-color': props.keyColors[key.id],
})
</script>

<template>
  <div class="keyboard-shell">
    <div class="keyboard-layout" :style="canvasStyle">
      <button v-for="key in renderedPositions" :key="key.id" class="keycap" :data-position-id="key.id" :class="{ selected: selected === key.id, changed: isChanged(key.id), pressed: pressed.includes(key.id), 'custom-lit': !!keyColors[key.id] }" :style="keyStyle(key)" @click="emit('select', key.id)" @contextmenu.stop.prevent="emit('contextmenu', { positionId: key.id, clientX: $event.clientX, clientY: $event.clientY })">
        <b v-if="badges[key.id]" class="keycap-badge">{{ badges[key.id] }}</b>
        <span>{{ labelFor(assignment(key.id)?.keyCode ?? key.sourceCode) }}</span>
        <small>{{ key.label }}</small>
      </button>
    </div>
  </div>
</template>
