<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { KeyAssignment, KeyboardProfile } from '@/domain/keyboard'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import { keyboardEventCodeToHidUsage } from '@/ui/keyboardEventCode'
import { useFittedKeyboardUnit } from '@/ui/useFittedKeyboardUnit'
import { useHorizontalKeyboardScroll } from '@/ui/useHorizontalKeyboardScroll'
import KeyboardCanvas from './KeyboardCanvas.vue'

const props = defineProps<{
  profile: KeyboardProfile
  assignments: KeyAssignment[]
  keyLabels: Record<number, string>
  keyGeometry?: KeyGeometryResolver
}>()

interface TestRecord { id: number; label: string; code: string; matched: number }

const pressedByCode = new Map<string, string[]>()
const pressedPositionIds = ref<string[]>([])
const counts = ref<Record<string, number>>({})
const history = ref<TestRecord[]>([])
const sequence = ref(0)
const { container: keyboardContainer, unit: keyboardUnit } = useFittedKeyboardUnit(() => props.profile.positions, () => props.keyGeometry, { maxUnit: 64, minUnit: 28 })
useHorizontalKeyboardScroll(keyboardContainer)
const totalPresses = computed(() => Object.values(counts.value).reduce((sum, count) => sum + count, 0))
const testedKeys = computed(() => Object.keys(counts.value).length)
const badges = computed(() => Object.fromEntries(Object.entries(counts.value).map(([positionId, count]) => [positionId, String(count)])))

function matchingPositions(usage: number) {
  const mapped = props.assignments.filter((item) => item.keyCode === usage).map((item) => item.positionId)
  // 没有匹配当前层输出时，用物理 sourceCode 兜底，便于测试尚未出现在键值表中的键。
  return mapped.length ? mapped : props.profile.positions.filter((item) => item.sourceCode === usage).map((item) => item.id)
}
function refreshPressedPositions() {
  pressedPositionIds.value = [...new Set([...pressedByCode.values()].flat())]
}
function handleKeyDown(event: KeyboardEvent) {
  const usage = keyboardEventCodeToHidUsage(event.code)
  if (usage === undefined) return
  event.preventDefault()
  if (event.repeat || pressedByCode.has(event.code)) return

  const positions = matchingPositions(usage)
  pressedByCode.set(event.code, positions)
  refreshPressedPositions()
  if (positions.length) {
    const next = { ...counts.value }
    positions.forEach((positionId) => { next[positionId] = (next[positionId] ?? 0) + 1 })
    counts.value = next
  }
  sequence.value += 1
  history.value = [{ id: sequence.value, label: props.keyLabels[usage] ?? event.key, code: event.code, matched: positions.length }, ...history.value].slice(0, 12)
}
function handleKeyUp(event: KeyboardEvent) {
  if (!pressedByCode.has(event.code)) return
  event.preventDefault()
  pressedByCode.delete(event.code)
  refreshPressedPositions()
}
function releaseAll() { pressedByCode.clear(); refreshPressedPositions() }
function clearResults() { releaseAll(); counts.value = {}; history.value = [] }
onMounted(() => {
  // 使用捕获阶段可阻止 F5、Tab 等测试按键触发浏览器默认动作；组件卸载后立即恢复正常行为。
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
  <section class="key-test-workspace">
    <header class="panel key-test-heading">
      <div><span class="eyebrow">KEY TEST</span><h2>按键测试</h2><p>直接按下键盘按键，键帽会实时高亮并累计触发次数。</p></div>
      <div class="key-test-stats"><span><strong>{{ testedKeys }}</strong> 已测试按键</span><span><strong>{{ totalPresses }}</strong> 总触发次数</span><button class="ghost" type="button" @click="clearResults">清空记录</button></div>
    </header>

    <div ref="keyboardContainer" class="panel key-test-keyboard">
      <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :geometry="keyGeometry" :unit="keyboardUnit" :pressed="pressedPositionIds" :badges="badges" />
    </div>

    <section class="panel key-test-history">
      <header><div><strong>最近触发</strong><small>浏览器显示的是键盘最终输出；Fn 本身可能不会单独上报。</small></div><span v-if="pressedPositionIds.length">正在按下 {{ pressedPositionIds.length }} 个键</span></header>
      <div v-if="history.length" class="key-test-records"><article v-for="record in history" :key="record.id" :class="{ unmatched: record.matched === 0 }"><strong>{{ record.label }}</strong><code>{{ record.code }}</code><small>{{ record.matched ? `匹配 ${record.matched} 个键位` : '未匹配当前层键位' }}</small></article></div>
      <div v-else class="key-test-empty">等待按键输入…</div>
    </section>
  </section>
</template>
