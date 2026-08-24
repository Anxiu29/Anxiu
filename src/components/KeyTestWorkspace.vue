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

interface ActivePress { positions: string[]; startedAt: number; label: string }
interface TestRecord { id: number; label: string; code: string; matched: number; action: 'down' | 'up'; time: string; duration?: number }

const pressedByCode = new Map<string, ActivePress>()
const pressedPositionIds = ref<string[]>([])
const downCounts = ref<Record<string, number>>({})
const upCounts = ref<Record<string, number>>({})
const history = ref<TestRecord[]>([])
const sequence = ref(0)
// 总触发次数按浏览器实际收到的事件累计：一次完整点击包含一次按下和一次抬起，共两次触发。
const totalTriggers = ref(0)
const { container: keyboardContainer, unit: keyboardUnit } = useFittedKeyboardUnit(() => props.profile.positions, () => props.keyGeometry, { maxUnit: 64, minUnit: 28 })
useHorizontalKeyboardScroll(keyboardContainer)
const totalPresses = computed(() => Object.values(downCounts.value).reduce((sum, count) => sum + count, 0))
const totalReleases = computed(() => Object.values(upCounts.value).reduce((sum, count) => sum + count, 0))
const testedKeys = computed(() => new Set([...Object.keys(downCounts.value), ...Object.keys(upCounts.value)]).size)
const badges = computed(() => Object.fromEntries([...new Set([...Object.keys(downCounts.value), ...Object.keys(upCounts.value)])].map((positionId) => [positionId, `${downCounts.value[positionId] ?? 0}/${upCounts.value[positionId] ?? 0}`])))

function matchingPositions(usage: number) {
  const mapped = props.assignments.filter((item) => item.keyCode === usage).map((item) => item.positionId)
  // 没有匹配当前层输出时，用物理 sourceCode 兜底，便于测试尚未出现在键值表中的键。
  return mapped.length ? mapped : props.profile.positions.filter((item) => item.sourceCode === usage).map((item) => item.id)
}
function refreshPressedPositions() {
  pressedPositionIds.value = [...new Set([...pressedByCode.values()].flatMap((item) => item.positions))]
}
function eventTime(value: number) {
  const date = new Date(value)
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => String(part).padStart(2, '0')).join(':')
  return `${time}.${String(date.getMilliseconds()).padStart(3, '0')}`
}
function handleKeyDown(event: KeyboardEvent) {
  const usage = keyboardEventCodeToHidUsage(event.code)
  if (usage === undefined) return
  event.preventDefault()
  if (event.repeat || pressedByCode.has(event.code)) return

  const now = Date.now()
  const positions = matchingPositions(usage)
  const label = props.keyLabels[usage] ?? event.key
  pressedByCode.set(event.code, { positions, startedAt: now, label })
  refreshPressedPositions()
  if (positions.length) {
    const next = { ...downCounts.value }
    positions.forEach((positionId) => { next[positionId] = (next[positionId] ?? 0) + 1 })
    downCounts.value = next
  }
  sequence.value += 1
  totalTriggers.value += 1
  const record: TestRecord = { id: sequence.value, label, code: event.code, matched: positions.length, action: 'down', time: eventTime(now) }
  history.value = [record, ...history.value].slice(0, 24)
}
function handleKeyUp(event: KeyboardEvent) {
  const pressed = pressedByCode.get(event.code)
  if (!pressed) return
  event.preventDefault()
  const now = Date.now()
  pressedByCode.delete(event.code)
  refreshPressedPositions()
  if (pressed.positions.length) {
    const next = { ...upCounts.value }
    pressed.positions.forEach((positionId) => { next[positionId] = (next[positionId] ?? 0) + 1 })
    upCounts.value = next
  }
  sequence.value += 1
  totalTriggers.value += 1
  const record: TestRecord = { id: sequence.value, label: pressed.label, code: event.code, matched: pressed.positions.length, action: 'up', time: eventTime(now), duration: now - pressed.startedAt }
  history.value = [record, ...history.value].slice(0, 24)
}
function releaseAll() { pressedByCode.clear(); refreshPressedPositions() }
function clearResults() {
  releaseAll()
  downCounts.value = {}
  upCounts.value = {}
  history.value = []
  totalTriggers.value = 0
  sequence.value = 0
}
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
      <div><span class="eyebrow">KEY TEST</span><h2>按键测试</h2><p>记录浏览器收到的按下、抬起时间以及两种事件的独立次数。</p></div>
      <div class="key-test-stats"><span><strong>{{ testedKeys }}</strong> 已测试按键</span><span><strong>{{ totalTriggers }}</strong> 总触发次数</span><span><strong>{{ totalPresses }}</strong> 按下次数</span><span><strong>{{ totalReleases }}</strong> 抬起次数</span></div>
    </header>

    <div ref="keyboardContainer" class="panel key-test-keyboard">
      <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :geometry="keyGeometry" :unit="keyboardUnit" :pressed="pressedPositionIds" :badges="badges" />
    </div>

    <section class="panel key-test-history">
      <header><div><strong>事件记录</strong><small>键帽角标为“按下次数/抬起次数”；Fn 本身可能不会单独上报。</small></div><div class="key-test-history-actions"><span v-if="pressedPositionIds.length">正在按下 {{ pressedPositionIds.length }} 个键</span><button class="ghost" type="button" :disabled="!history.length && !totalTriggers" @click="clearResults">清空记录</button></div></header>
      <div v-if="history.length" class="key-test-records"><article v-for="record in history" :key="record.id" :class="[record.action, { unmatched: record.matched === 0 }]"><div><strong>{{ record.label }}</strong><b>{{ record.action === 'down' ? '按下' : '抬起' }}</b></div><code>{{ record.time }}</code><small>{{ record.code }} · {{ record.matched ? `匹配 ${record.matched} 个键位` : '未匹配当前层键位' }}<template v-if="record.duration !== undefined"> · 持续 {{ record.duration }} ms</template></small></article></div>
      <div v-else class="key-test-empty">等待按键输入…</div>
    </section>
  </section>
</template>
