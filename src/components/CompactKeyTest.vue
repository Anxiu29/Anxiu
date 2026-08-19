<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { keyboardEventCodeToHidUsage } from '@/ui/keyboardEventCode'

const props = defineProps<{ keyLabels: Record<number, string> }>()
const pressed = ref(new Map<string, string>())
const lastPressed = ref('')
const displayLabel = computed(() => [...pressed.value.values()].join(' + ') || lastPressed.value || '等待按键…')

function updatePressed(mutator: (next: Map<string, string>) => void) {
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
  lastPressed.value = label
  updatePressed((next) => next.set(event.code, label))
}
function handleKeyUp(event: KeyboardEvent) {
  if (!pressed.value.has(event.code)) return
  updatePressed((next) => next.delete(event.code))
}
function releaseAll() { pressed.value = new Map() }

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown, true)
  window.addEventListener('keyup', handleKeyUp, true)
  window.addEventListener('blur', releaseAll)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown, true)
  window.removeEventListener('keyup', handleKeyUp, true)
  window.removeEventListener('blur', releaseAll)
})
</script>

<template>
  <aside class="compact-key-test" :class="{ active: pressed.size > 0 }">
    <span><i></i>按键测试</span>
    <strong>{{ displayLabel }}</strong>
  </aside>
</template>
