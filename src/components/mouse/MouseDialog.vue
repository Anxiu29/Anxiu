<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
let previous: HTMLElement | null = null
onMounted(() => {
  previous = document.activeElement as HTMLElement
  dialog.value?.showModal?.()
})
onBeforeUnmount(() => previous?.focus())
</script>
<template>
  <dialog ref="dialog" class="mouse-dialog" :aria-label="title" @cancel.prevent="emit('close')">
    <header>
      <h3>{{ title }}</h3>
      <button class="ghost" aria-label="关闭" @click="emit('close')">×</button>
    </header>
    <slot />
    <footer v-if="$slots.footer" class="mouse-dialog-footer"><slot name="footer" /></footer>
  </dialog>
</template>
<style scoped>
.mouse-dialog {
  color: var(--text-primary, #f3f5f7);
  background: var(--panel, #11151d);
  border: 1px solid var(--border-subtle, #2a313d);
  border-radius: 14px;
  padding: 24px;
  width: min(620px, 92vw);
  max-height: 86dvh;
  overflow: auto;
}
.mouse-dialog::backdrop {
  background: #0009;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
h3 {
  margin: 0;
}
.mouse-dialog-footer {
  height: auto;
  min-height: 44px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--border-subtle, #2a313d);
}
</style>
