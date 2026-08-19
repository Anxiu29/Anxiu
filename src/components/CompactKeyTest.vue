<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { keyboardEventCodeToHidUsage } from '@/ui/keyboardEventCode'

const props = defineProps<{ keyLabels: Record<number, string> }>()
interface PressedKey { label: string; startedAt: number }

const longPressThreshold = 500
const pressed = ref(new Map<string, PressedKey>())
const lastPressed = ref('')
const clock = ref(Date.now())
let clockTimer: number | undefined
const displayLabel = computed(() => {
  const active = [...pressed.value.values()].map((item) => {
    const duration = clock.value - item.startedAt
    return `${duration >= longPressThreshold ? '长按' : '点击'} · ${item.label}${duration >= longPressThreshold ? ` · ${(duration / 1000).toFixed(1)}s` : ''}`
  })
  return active.join(' + ') || lastPressed.value || '等待按键…'
})

function updatePressed(mutator: (next: Map<string, PressedKey>) => void) {
  const next = new Map(pressed.value)
  mutator(next)
  pressed.value = next
}
function handleKeyDown(event: KeyboardEvent) {
  const usage = keyboardEventCodeToHidUsage(event.code)
  if (usage === undefined) return
  // 编辑输入框时只观察按键，不阻止用户输入；其他区域则拦截 F5、Tab 等浏览器默认动作。
  if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement)) event.preventDefault()
  const label = props.keyLabels[usage] ?? event.key
  if (pressed.value.has(event.code)) return
  updatePressed((next) => next.set(event.code, { label, startedAt: Date.now() }))
  startClock()
}
function handleKeyUp(event: KeyboardEvent) {
  const item = pressed.value.get(event.code)
  if (!item) return
  const duration = Date.now() - item.startedAt
  lastPressed.value = `${duration >= longPressThreshold ? '长按' : '点击'} · ${item.label}${duration >= longPressThreshold ? ` · ${(duration / 1000).toFixed(1)}s` : ''}`
  updatePressed((next) => next.delete(event.code))
  if (!pressed.value.size) stopClock()
}
function startClock() {
  if (clockTimer !== undefined) return
  clock.value = Date.now()
  clockTimer = window.setInterval(() => { clock.value = Date.now() }, 50)
}
function stopClock() {
  if (clockTimer !== undefined) window.clearInterval(clockTimer)
  clockTimer = undefined
}
function releaseAll() { pressed.value = new Map(); stopClock() }

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown, true)
  window.addEventListener('keyup', handleKeyUp, true)
  window.addEventListener('blur', releaseAll)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown, true)
  window.removeEventListener('keyup', handleKeyUp, true)
  window.removeEventListener('blur', releaseAll)
  stopClock()
})
</script>

<template>
  <aside class="compact-key-test" :class="{ active: pressed.size > 0 }">
    <span><i></i>按键测试</span>
    <strong>{{ displayLabel }}</strong>
  </aside>
</template>
