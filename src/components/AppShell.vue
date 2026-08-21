<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { KeyboardConfiguration, KeyboardProfile } from '@/domain/keyboard'

type WorkspaceView = 'device' | 'keymap' | 'lighting' | 'advanced' | 'macro' | 'key-test'

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
// 这些状态只影响应用壳外观，不进入全局 Store；切换工作区不会丢失设备会话和改键草稿。
const feedbackVisible = ref(true)
const sidebarCollapsed = ref(false)
let sidebarAutoCollapsed = false
let narrowScreen: MediaQueryList | undefined
const settingsOpen = ref(false)
const configurations: KeyboardConfiguration[] = [1, 2, 3, 4]
const navigate = (view: WorkspaceView) => { activeView.value = view }
const toggleSidebar = () => {
  // 用户手动操作后解除本轮自动状态，宽度恢复时不会擅自覆盖用户选择。
  sidebarAutoCollapsed = false
  sidebarCollapsed.value = !sidebarCollapsed.value
}
const syncSidebarWithScreen = () => {
  if (!narrowScreen) return
  if (narrowScreen.matches && !sidebarCollapsed.value) {
    sidebarCollapsed.value = true
    sidebarAutoCollapsed = true
  } else if (!narrowScreen.matches && sidebarAutoCollapsed) {
    sidebarCollapsed.value = false
    sidebarAutoCollapsed = false
  }
}
const requestFactoryReset = () => {
  // 恢复出厂是不可逆设备操作，确认留在最靠近用户交互的 UI 层。
  const confirmed = window.confirm('恢复出厂设置会清除全部改键、灯光和宏配置，键盘随后需要重新连接。是否继续？')
  if (!confirmed) return
  settingsOpen.value = false
  emit('restore-factory')
}
watch(() => [props.error, props.message], ([error, message], [previousError, previousMessage]) => {
  // 用户关闭旧提示后，新消息到来要重新显示；仅组件重渲染不应把旧提示弹回来。
  if ((error || message) && (error !== previousError || message !== previousMessage)) feedbackVisible.value = true
})
onMounted(() => {
  // 1320px 以下展开侧栏会明显压缩各工作区；matchMedia 只在阈值跨越时触发，不产生持续监听开销。
  if (typeof window.matchMedia !== 'function') return
  narrowScreen = window.matchMedia('(max-width: 1320px)')
  narrowScreen.addEventListener('change', syncSidebarWithScreen)
  syncSidebarWithScreen()
})
onBeforeUnmount(() => narrowScreen?.removeEventListener('change', syncSidebarWithScreen))
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
        <button v-if="profile.capabilities.lighting" :class="{ active: activeView === 'lighting' }" :disabled="navigationDisabled" title="灯光设置" @click="navigate('lighting')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6m-5 3h4M8.5 15.5a6 6 0 1 1 7 0c-.8.6-1.2 1.3-1.3 2h-4.4c-.1-.7-.5-1.4-1.3-2Z" /></svg>
          <span>灯光设置</span>
        </button>
        <button v-if="profile.capabilities.advancedKey" :class="{ active: activeView === 'advanced' }" :disabled="navigationDisabled" title="高级键设置" @click="navigate('advanced')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4.5 13H11l-1 9 8.5-11H12z" /></svg>
          <span>高级键设置</span>
        </button>
        <button v-if="profile.capabilities.macro" :class="{ active: activeView === 'macro' }" :disabled="navigationDisabled" title="宏设置" @click="navigate('macro')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="m7 8 4 4-4 4m6 0h4" /></svg>
          <span>宏设置</span>
        </button>
        <button :class="{ active: activeView === 'key-test' }" :disabled="navigationDisabled" title="按键测试" @click="navigate('key-test')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h2m2 0h2m2 0h2M7 13h3m2 0h5" /></svg>
          <span>按键测试</span>
        </button>
      </nav>

      <button class="sidebar-settings" type="button" :disabled="navigationDisabled" title="设置" @click="settingsOpen = true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.05V3h4v.05a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></svg>
        <span>设置</span>
      </button>
    </aside>

    <div class="app-content">
      <!-- 设备工作区通过插槽函数请求导航，不需要知道 AppShell 如何保存 activeView。 -->
      <slot v-if="activeView === 'device'" name="device" :open-keymap="() => navigate('keymap')" />
      <slot v-else-if="activeView === 'keymap'" name="keymap" />
      <slot v-else-if="activeView === 'lighting'" name="lighting" />
      <slot v-else-if="activeView === 'advanced'" name="advanced" />
      <slot v-else-if="activeView === 'macro'" name="macro" />
      <slot v-else name="key-test" />
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
