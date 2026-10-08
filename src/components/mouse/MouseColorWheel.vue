<script setup lang="ts">
import { computed, ref, watch } from 'vue'
const props = defineProps<{ color: string; disabled?: boolean }>()
const emit = defineEmits<{ change: [color: string] }>()
const hue = ref(0),
  saturation = ref(100),
  value = ref(100)
const wheel = ref<HTMLElement>()
const dragging = ref(false)
function sync() {
  const channels = props.color
    .slice(1)
    .match(/../g)
    ?.map((part) => parseInt(part, 16) / 255)
  if (!channels || channels.length !== 3 || channels.some(Number.isNaN)) return
  const [r, g, b] = channels
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min
  hue.value =
    delta === 0
      ? hue.value
      : ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) *
          60 +
          360) %
        360
  saturation.value = max === 0 ? 0 : (delta / max) * 100
  value.value = max * 100
}
watch(
  () => [props.color, props.disabled],
  () => {
    if (!dragging.value && !props.disabled) sync()
  },
  { immediate: true },
)
function toHex(h: number, s: number, v: number) {
  const c = ((v / 100) * s) / 100,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v / 100 - c
  const rgb =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return (
    '#' +
    rgb
      .map((channel) =>
        Math.round((channel + m) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}
const hex = computed(() => toHex(hue.value, saturation.value, value.value))
const fullColor = computed(() => toHex(hue.value, saturation.value, 100))
const cursor = computed(() => ({
  left: 50 + Math.sin((hue.value * Math.PI) / 180) * saturation.value * 0.48 + '%',
  top: 50 - Math.cos((hue.value * Math.PI) / 180) * saturation.value * 0.48 + '%',
  background: hex.value,
}))
function update(event: PointerEvent) {
  const rect = wheel.value!.getBoundingClientRect()
  const x = event.clientX - rect.left - rect.width / 2,
    y = event.clientY - rect.top - rect.height / 2
  hue.value = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360
  saturation.value = Math.min(100, (Math.hypot(x, y) / (rect.width / 2)) * 100)
}
function start(event: PointerEvent) {
  if (props.disabled || event.button !== 0) return
  dragging.value = true
  wheel.value!.setPointerCapture(event.pointerId)
  update(event)
}
function finish(event: PointerEvent) {
  if (!dragging.value) return
  update(event)
  dragging.value = false
  emit('change', hex.value)
}
function cancel() {
  if (dragging.value) {
    dragging.value = false
    sync()
  }
}
function keyboard(event: KeyboardEvent) {
  if (props.disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
    return
  event.preventDefault()
  if (event.key === 'ArrowLeft') hue.value = (hue.value + 355) % 360
  if (event.key === 'ArrowRight') hue.value = (hue.value + 5) % 360
  if (event.key === 'ArrowUp') saturation.value = Math.min(100, saturation.value + 5)
  if (event.key === 'ArrowDown') saturation.value = Math.max(0, saturation.value - 5)
  emit('change', hex.value)
}
function setHex(event: Event) {
  const input = event.target as HTMLInputElement
  if (/^#[0-9a-f]{6}$/i.test(input.value)) emit('change', input.value.toLowerCase())
  else input.value = hex.value.toUpperCase()
}
const presets = ['#ff4040', '#ffb830', '#55d66b', '#35cbd5', '#4e80ff', '#ca62e8', '#ffffff']
</script>
<template>
  <div class="mouse-color-picker" :class="{ disabled }">
    <div
      ref="wheel"
      class="mouse-color-wheel"
      role="slider"
      tabindex="0"
      aria-label="颜色圆盘，左右调整色相，上下调整饱和度"
      :aria-valuenow="Math.round(hue)"
      :aria-valuemin="0"
      :aria-valuemax="359"
      :aria-valuetext="hex"
      :aria-disabled="disabled"
      @pointerdown="start"
      @pointermove="dragging && update($event)"
      @pointerup="finish"
      @pointercancel="cancel"
      @lostpointercapture="cancel"
      @keydown="keyboard"
    >
      <span class="mouse-wheel-cursor" :style="cursor"></span>
    </div>
    <label class="mouse-color-value">
      <span :style="{ background: hex }"></span>
      <input
        aria-label="十六进制颜色"
        :value="hex.toUpperCase()"
        maxlength="7"
        :disabled="disabled"
        @change="setHex"
      />
    </label>
    <label class="mouse-color-intensity">
      色彩明度
      <input
        v-model.number="value"
        type="range"
        min="0"
        max="100"
        :disabled="disabled"
        :style="{ background: 'linear-gradient(to right, #000, ' + fullColor + ')' }"
        @change="emit('change', hex)"
      />
    </label>
    <div class="mouse-color-presets">
      <button
        v-for="color in presets"
        :key="color"
        :style="{ background: color }"
        :aria-label="'选择颜色 ' + color"
        :disabled="disabled"
        @click="emit('change', color)"
      ></button>
    </div>
  </div>
</template>
<style scoped>
.mouse-color-picker {
  display: grid;
  justify-items: center;
  gap: 18px;
  width: 100%;
}
.mouse-color-wheel {
  width: min(100%, 240px);
  aspect-ratio: 1;
  border-radius: 50%;
  position: relative;
  background:
    radial-gradient(circle, #fff 0%, transparent 70%),
    conic-gradient(red, #ff0, #0f0, #0ff, #00f, #f0f, red);
  box-shadow: 0 0 0 8px var(--surface-control, #1c2330);
  touch-action: none;
  cursor: crosshair;
}
.mouse-wheel-cursor {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 1px #0007;
  pointer-events: none;
}
.mouse-color-value {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mouse-color-value span {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle, #333);
}
.mouse-color-value input {
  width: 110px;
  text-align: center;
  font-family: monospace;
}
.mouse-color-intensity {
  width: min(100%, 240px);
  display: grid;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary, #909aaa);
}
.mouse-color-presets {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.mouse-color-presets button {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--panel);
  box-shadow: 0 0 0 1px var(--border-subtle, #333);
}
.disabled {
  opacity: 0.55;
}
</style>
