<script setup lang="ts">
import { ref, watch } from 'vue'
import type { KeyboardConfiguration, KeyboardProfile } from '@/domain/keyboard'
import keyboardImageUrl from '@/assets/c98-keyboard-transparent.png'

type WorkspaceView = 'device' | 'keymap'

const props = withDefaults(defineProps<{
  profile: KeyboardProfile
  activeConfiguration?: KeyboardConfiguration
  navigationDisabled?: boolean
  error?: string
  message?: string
}>(), { activeConfiguration: 1 })

const emit = defineEmits<{
  'select-configuration': [configuration: KeyboardConfiguration]
}>()

const activeView = ref<WorkspaceView>('device')
const feedbackVisible = ref(true)
const sidebarCollapsed = ref(false)
const configurations: KeyboardConfiguration[] = [1, 2, 3, 4]
const navigate = (view: WorkspaceView) => { activeView.value = view }
const toggleSidebar = () => { sidebarCollapsed.value = !sidebarCollapsed.value }
watch(() => [props.error, props.message], ([error, message], [previousError, previousMessage]) => {
  if ((error || message) && (error !== previousError || message !== previousMessage)) feedbackVisible.value = true
})
</script>

<template>
  <section class="app-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <aside class="app-sidebar" aria-label="设备功能导航">
      <button class="sidebar-collapse-toggle" type="button" :aria-label="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'" :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'" :aria-expanded="!sidebarCollapsed" @click="toggleSidebar">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="sidebarCollapsed ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'" /></svg>
      </button>
      <div class="sidebar-device">
        <img :src="keyboardImageUrl" alt="" />
        <div><small>当前设备</small><strong>{{ profile.device.productName }}</strong></div>
      </div>

      <div class="sidebar-configurations">
        <small>当前配置</small>
        <div><button v-for="configuration in configurations" :key="configuration" :class="{ active: activeConfiguration === configuration }" :disabled="navigationDisabled" :title="`切换到配置 ${configuration}`" @click="emit('select-configuration', configuration)">{{ configuration }}</button></div>
      </div>

      <nav class="sidebar-nav">
        <button :class="{ active: activeView === 'device' }" :disabled="navigationDisabled" title="设备首页" @click="navigate('device')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H4zM8 20h8M12 16v4" /></svg>
          <span>设备首页</span>
        </button>
        <button :class="{ active: activeView === 'keymap' }" :disabled="navigationDisabled" title="改键设置" @click="navigate('keymap')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M6 10h2m2 0h2m2 0h2m2 0h1M6 14h3m2 0h7" /></svg>
          <span>改键设置</span>
        </button>
      </nav>

      <div class="sidebar-meta"><span>USB HID</span><small>本地安全连接</small></div>
    </aside>

    <div class="app-content">
      <slot v-if="activeView === 'device'" name="device" />
      <slot v-else name="keymap" />
    </div>

    <div v-if="feedbackVisible && (error || message)" class="feedback-toast" :class="{ error: !!error }" role="status">
      <span>{{ error || message }}</span>
      <button aria-label="关闭提示" title="关闭提示" @click="feedbackVisible = false">×</button>
    </div>
  </section>
</template>
