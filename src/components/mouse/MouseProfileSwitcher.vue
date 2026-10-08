<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useProfileStore } from '@/stores/mouse/profileStore'
const props = defineProps<{ collapsed: boolean; disabled: boolean }>()
const emit = defineEmits<{ manage: [] }>()
const profiles = useProfileStore()
const root = ref<HTMLElement>()
const open = ref(false)
const currentName = computed(
  () => profiles.profiles.find((p) => p.id === profiles.selected)?.name ?? '设备当前设置',
)
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    open.value = false
    root.value?.querySelector('button')?.focus()
  }
}
function manage() {
  open.value = false
  emit('manage')
}
async function choose(id: string) {
  await profiles.switchTo(id)
  if (profiles.selected === id) open.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', outside)
  document.addEventListener('keydown', escape)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', escape)
})
</script>
<template>
  <div ref="root" class="mouse-profile-switcher" :class="{ collapsed }">
    <button
      class="mouse-profile-trigger"
      :disabled="disabled"
      :aria-expanded="open"
      aria-label="切换配置文件"
      :title="currentName"
      @click="open = !open"
    >
      <span aria-hidden="true">▤</span>
      <span v-if="!collapsed" class="mouse-profile-trigger-name">{{ currentName }}</span>
      <span v-if="!collapsed" aria-hidden="true">›</span>
    </button>
    <section v-if="open" class="mouse-profile-flyout mouse-workspace" aria-label="配置文件快捷列表">
      <header>
        <strong>配置文件</strong>
        <button class="mouse-profile-link" :disabled="disabled" @click="manage">
          管理配置文件 ›
        </button>
      </header>
      <small>本地配置</small>
      <div class="mouse-profile-quick-list">
        <button
          v-for="profile in profiles.profiles"
          :key="profile.id"
          :class="{ active: profiles.selected === profile.id }"
          :aria-pressed="profiles.selected === profile.id"
          :disabled="disabled"
          @click="choose(profile.id)"
        >
          <span>{{ profile.name }}</span>
          <span v-if="profiles.selected === profile.id" class="mouse-profile-badge">当前</span>
          <span v-else aria-hidden="true">›</span>
        </button>
      </div>
      <p>点击即可切换配置文件。</p>
    </section>
  </div>
</template>
