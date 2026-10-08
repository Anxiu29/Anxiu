<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppShell from '../AppShell.vue'
import MouseKeymap from './MouseKeymap.vue'
import MousePerformance from './MousePerformance.vue'
import MouseLighting from './MouseLighting.vue'
import MouseMacros from './MouseMacros.vue'
import MouseSettings from './MouseSettings.vue'
import MouseProfileSwitcher from './MouseProfileSwitcher.vue'
import MouseProfiles from './MouseProfiles.vue'
import type { MousePresentation } from '@/ui/MousePresentation'
import type { AppTheme } from '@/ui/theme'
import { mouseLabel } from '@/ui/mouseLabels'
import { useDeviceStore } from '@/stores/mouse/deviceStore'
import { useProfileStore } from '@/stores/mouse/profileStore'
import { useMacroStore } from '@/stores/mouse/macroStore'
import './mouse.css'
const props = defineProps<{
  presentation: MousePresentation
  theme: AppTheme
  connecting: boolean
}>()
const shell = ref<InstanceType<typeof AppShell>>()
async function resetPageScroll() {
  await nextTick()
  const content = shell.value?.$el.querySelector('.app-content') as HTMLElement | undefined
  if (content) content.scrollTop = 0
}
const emit = defineEmits<{ disconnect: []; 'update:theme': [theme: AppTheme] }>()
const device = useDeviceStore(),
  profiles = useProfileStore(),
  macros = useMacroStore()
const summary = computed(() => ({
  device: { productName: device.identity?.name ?? '鼠标' },
  capabilities: {
    lighting: device.identity?.capabilities.includes('lighting'),
    performance: device.identity?.capabilities.includes('performance'),
    macro: device.identity?.capabilities.includes('macro'),
  },
}))
const message = computed(() =>
  device.saved
    ? mouseLabel('operationCompleted', { operation: mouseLabel(device.completedOperation) })
    : '',
)

function beforeNavigate() {
  if (device.busy || props.connecting) return false
  return !device.dirty || window.confirm('宏有未保存修改，确定放弃并离开吗？')
}
watch(
  () => [profiles.error, macros.error],
  ([profileError, macroError]) => {
    if (profileError || macroError) device.error = mouseLabel(profileError || macroError!)
  },
)
watch(
  () => device.identity?.storage.profiles && device.config,
  (ready) => {
    if (!ready) return
    macros.ensureDefault('默认宏')
    profiles.ensureDefault('默认配置')
  },
  { immediate: true },
)
</script>
<template>
  <AppShell
    ref="shell"
    @navigate="resetPageScroll"
    class="mouse-shell"
    :profile="summary"
    device-kind="mouse"
    :sidebar-image-url="presentation.image"
    :navigation-disabled="device.busy || connecting"
    :before-navigate="beforeNavigate"
    :error="device.error"
    :message="message"
    :theme="theme"
    @update:theme="emit('update:theme', $event)"
  >
    <template #configurations="{ collapsed, openProfiles }">
      <MouseProfileSwitcher
        :collapsed="collapsed"
        :disabled="connecting || device.busy"
        @manage="openProfiles"
      />
    </template>
    <template #device="{ openKeymap }">
      <section class="mouse-workspace mouse-overview">
        <div>
          <span class="eyebrow">
            {{ presentation.solutionName }} ·
            {{
              device.identity?.demo
                ? '演示模式'
                : device.identity?.connection === 'wireless'
                  ? '2.4 GHz'
                  : 'USB'
            }}
          </span>
          <h1>{{ device.identity?.name }}</h1>
          <p>按你的习惯，调整每一次点击与移动。</p>
          <div class="mouse-overview-stats">
            <div>
              <small>{{ device.config?.battery.charging === 1 ? '充电中' : '当前电量' }}</small>
              <strong>{{ device.config?.battery.percent }}%</strong>
            </div>
            <div>
              <small>当前 DPI 档位</small>
              <strong>{{ (device.config?.functions[12] ?? 0) + 1 }}</strong>
            </div>
            <div>
              <small>连接状态</small>
              <strong>{{ device.firmwareNeedsReconnect ? '需重新连接' : device.identity?.demo ? '模拟设备' : '已就绪' }}</strong>
            </div>
          </div>
          <p v-if="device.firmwareNeedsReconnect" role="status">固件传输已结束，请断开并重新连接鼠标后继续设置。</p>
          <div class="mouse-toolbar">
            <button class="primary" :disabled="device.busy || device.firmwareNeedsReconnect" @click="openKeymap">开始设置</button>
            <button class="ghost" :disabled="device.busy || device.firmwareNeedsReconnect" @click="device.refresh(true)">
              重新读取
            </button>
          </div>
        </div>
        <button
          class="mouse-overview-image"
          type="button"
          title="进入改键设置"
          aria-label="进入改键设置"
          :disabled="device.busy || connecting || device.firmwareNeedsReconnect"
          @click="openKeymap"
        >
          <img :src="presentation.image" :alt="device.identity?.name" />
        </button>
      </section>
    </template>
    <template #keymap><MouseKeymap :presentation="presentation" /></template>
    <template #performance><MousePerformance /></template>
    <template #lighting><MouseLighting /></template>
    <template #macro><MouseMacros /></template>
    <template #profiles><MouseProfiles /></template>
    <template #settings>
      <MouseSettings
        :firmware="presentation.firmware"
        @disconnect="emit('disconnect')"
      />
    </template>
  </AppShell>
</template>
