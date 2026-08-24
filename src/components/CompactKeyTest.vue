<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { keyboardEventCodeToHidUsage } from '@/ui/keyboardEventCode'

const props = defineProps<{ keyLabels: Record<number, string> }>()
const pressedCodes = ref(new Set<string>())
const pressedKeys = ref(new Map<string, string>())
const releasedKeys = ref(new Map<string, string>())
const pressedTimers = new Map<string, number>()
const releasedTimers = new Map<string, number>()

function updatePressedCodes(mutator: (next: Set<string>) => void) {
  const next = new Set(pressedCodes.value)
  mutator(next)
  pressedCodes.value = next
}
function updateKeyMap(target: typeof pressedKeys, code: string, label: string) {
  const next = new Map(target.value)
  // 重新按下同一按键时移到队尾，使多个按键的显示顺序与最近一次操作一致。
  next.delete(code)
  next.set(code, label)
  target.value = next
}
function removeKeyAfter(target: typeof pressedKeys, timers: Map<string, number>, code: string, delay: number) {
  const previous = timers.get(code)
  if (previous !== undefined) window.clearTimeout(previous)
  timers.set(code, window.setTimeout(() => {
    const next = new Map(target.value)
    next.delete(code)
    target.value = next
    timers.delete(code)
  }, delay))
}
function clearTimers(timers: Map<string, number>) {
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.clear()
}
function handleKeyDown(event: KeyboardEvent) {
  const usage = keyboardEventCodeToHidUsage(event.code)
  if (usage === undefined) return
  // 编辑输入框时只观察按键，不阻止用户输入；其他区域则拦截 F5、Tab 等浏览器默认动作。
  if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement)) event.preventDefault()
  // 浏览器会为长按不断派发 repeat keydown；这里只记录第一次，避免再用时间阈值猜测点击/长按。
  if (pressedCodes.value.has(event.code)) return
  updateKeyMap(pressedKeys, event.code, props.keyLabels[usage] ?? event.key)
  removeKeyAfter(pressedKeys, pressedTimers, event.code, 500)
  updatePressedCodes((next) => next.add(event.code))
}
function handleKeyUp(event: KeyboardEvent) {
  const usage = keyboardEventCodeToHidUsage(event.code)
  if (usage === undefined || !pressedCodes.value.has(event.code)) return
  updateKeyMap(releasedKeys, event.code, props.keyLabels[usage] ?? event.key)
  removeKeyAfter(releasedKeys, releasedTimers, event.code, 2000)
  updatePressedCodes((next) => next.delete(event.code))
}
function releaseAll() {
  pressedCodes.value = new Set()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown, true)
  window.addEventListener('keyup', handleKeyUp, true)
  window.addEventListener('blur', releaseAll)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown, true)
  window.removeEventListener('keyup', handleKeyUp, true)
  window.removeEventListener('blur', releaseAll)
  clearTimers(pressedTimers)
  clearTimers(releasedTimers)
})
</script>

<template>
  <aside class="compact-key-test">
    <h3>按键测试</h3>
    <section class="compact-key-event pressed" :class="{ active: pressedCodes.size > 0 }">
      <span>按下的按键</span>
      <div v-if="pressedKeys.size" class="compact-key-values">
        <strong v-for="(label, code) in Object.fromEntries(pressedKeys)" :key="code">{{ label }}</strong>
      </div>
      <div v-else class="compact-key-test-empty">
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17 21v-8a3 3 0 0 1 6 0v7-11a3 3 0 0 1 6 0v11-8a3 3 0 0 1 6 0v12l2-2a3 3 0 0 1 4 4l-9 12a9 9 0 0 1-7 3h-3a10 10 0 0 1-8-4L8 29a3 3 0 0 1 5-4l4 5v-9Z"/><path d="m8 12-4-2m8-5-2-4m9 3V0"/></svg>
        <small>按下按键开始测试</small>
      </div>
    </section>
    <section class="compact-key-event released">
      <span>抬起的按键</span>
      <div v-if="releasedKeys.size" class="compact-key-values">
        <strong v-for="(label, code) in Object.fromEntries(releasedKeys)" :key="code">{{ label }}</strong>
      </div>
    </section>
  </aside>
</template>
