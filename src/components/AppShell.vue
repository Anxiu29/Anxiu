<script setup lang="ts">
import { ref, watch } from 'vue'
import type { KeyboardConfiguration, KeyboardProfile } from '@/domain/keyboard'

type WorkspaceView = 'device' | 'keymap'

const props = withDefaults(defineProps<{
  profile: KeyboardProfile
  activeConfiguration?: KeyboardConfiguration
  navigationDisabled?: boolean
  error?: string
  message?: string
  sidebarImageUrl?: string
}>(), { activeConfiguration: 1 })

const emit = defineEmits<{
  'select-configuration': [configuration: KeyboardConfiguration]
  'restore-factory': []
}>()

const activeView = ref<WorkspaceView>('device')
const feedbackVisible = ref(true)
const sidebarCollapsed = ref(false)
const settingsOpen = ref(false)
const configurations: KeyboardConfiguration[] = [1, 2, 3, 4]
const navigate = (view: WorkspaceView) => { activeView.value = view }
const toggleSidebar = () => { sidebarCollapsed.value = !sidebarCollapsed.value }
const requestFactoryReset = () => {
  const confirmed = window.confirm('恢复出厂设置会清除全部改键、灯光和宏配置，键盘随后需要重新连接。是否继续？')
  if (!confirmed) return
  settingsOpen.value = false
  emit('restore-factory')
}
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
        <img :src="sidebarImageUrl" alt="" />
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

      <button class="sidebar-settings" type="button" :disabled="navigationDisabled" title="设置" @click="settingsOpen = true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.05V3h4v.05a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></svg>
        <span>设置</span>
      </button>
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

    <div v-if="settingsOpen" class="settings-backdrop" @click.self="settingsOpen = false">
      <section class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header><div><span class="eyebrow">DEVICE SETTINGS</span><h2 id="settings-title">设置</h2></div><button type="button" aria-label="关闭设置" title="关闭设置" @click="settingsOpen = false">×</button></header>
        <div v-if="profile.capabilities.restoreFactory" class="settings-danger-zone">
          <div><strong>恢复出厂设置</strong><p>清除全部改键、灯光、宏和配置数据，恢复后需重新连接键盘。</p></div>
          <button class="factory-reset-button" type="button" :disabled="navigationDisabled" @click="requestFactoryReset">恢复出厂设置</button>
        </div>
      </section>
    </div>
  </section>
</template>
