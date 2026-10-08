<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
const props = defineProps<{ name: string; disabled?: boolean }>()
const emit = defineEmits<{ rename: []; export: []; delete: [] }>()
const id = useId()
const trigger = ref<HTMLButtonElement>()
const panel = ref<HTMLDivElement>()
const expanded = ref(false)
const position = ref({ left: '0px', top: '0px' })
function close() {
  panel.value?.hidePopover?.()
  expanded.value = false
}
function toggle() {
  if (props.disabled) return
  if (expanded.value) {
    close()
    return
  }
  const rect = trigger.value!.getBoundingClientRect()
  position.value = {
    left: Math.max(8, Math.min(rect.right - 104, window.innerWidth - 112)) + 'px',
    top:
      Math.max(8, rect.bottom + 112 > window.innerHeight ? rect.top - 108 : rect.bottom + 4) + 'px',
  }
  panel.value?.showPopover?.()
  expanded.value = true
}
function sync(event: Event) {
  expanded.value = (event as ToggleEvent).newState === 'open'
}
function choose(action: 'rename' | 'export' | 'delete') {
  close()
  trigger.value?.focus()
  if (action === 'rename') emit('rename')
  else if (action === 'export') emit('export')
  else emit('delete')
}
function scroll(event: Event) {
  if (expanded.value && !panel.value?.contains(event.target as Node)) close()
}
onMounted(() => {
  window.addEventListener('resize', close)
  document.addEventListener('scroll', scroll, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', close)
  document.removeEventListener('scroll', scroll, true)
})
</script>
<template>
  <div class="macro-actions">
    <button
      ref="trigger"
      class="macro-actions-trigger"
      :disabled="disabled"
      :aria-label="'宏操作 ' + name"
      :aria-expanded="expanded"
      :aria-controls="id"
      @click.stop="toggle"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="5" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="19" cy="12" r="1.6" />
      </svg>
    </button>
    <div
      :id="id"
      ref="panel"
      popover="auto"
      class="macro-actions-popup"
      :style="position"
      :aria-label="name + ' 的操作'"
      @toggle="sync"
    >
      <button
        :disabled="disabled"
        title="重命名"
        :aria-label="'重命名 ' + name"
        @click="choose('rename')"
      >
        重命名
      </button>
      <button
        :disabled="disabled"
        title="导出"
        :aria-label="'导出 ' + name"
        @click="choose('export')"
      >
        导出
      </button>
      <button
        :disabled="disabled"
        class="danger"
        title="删除"
        :aria-label="'删除 ' + name"
        @click="choose('delete')"
      >
        删除
      </button>
    </div>
  </div>
</template>
<style scoped>
.macro-actions {
  flex-shrink: 0;
}
.macro-actions-trigger {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary, #8792a1);
  cursor: pointer;
}
.macro-actions-trigger svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}
.macro-actions-trigger:hover,
.macro-actions-trigger[aria-expanded='true'] {
  background: var(--surface-control, #252d3b);
  color: var(--cyan);
}
.macro-actions-popup {
  position: fixed;
  inset: auto;
  margin: 0;
  box-sizing: border-box;
  width: 104px;
  padding: 4px;
  border: 1px solid var(--border-subtle, #28303b);
  border-radius: 6px;
  background: var(--panel, #11151d);
  color: var(--text-primary, #eee);
  box-shadow: 0 4px 16px #0003;
}
.macro-actions-popup button {
  display: block;
  width: 100%;
  padding: 7px 10px;
  border: 0;
  border-radius: 3px;
  text-align: left;
  font-size: 12px;
  line-height: 16px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.macro-actions-popup button:hover {
  background: var(--surface-control, #252d3b);
}
.macro-actions-popup .danger {
  color: #d76666;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
