<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { devicePresentation, useDriverStore } from '@/composition/root'
import AppShell from '@/components/AppShell.vue'
import DeviceOverview from '@/components/DeviceOverview.vue'
import KeymapWorkspace from '@/components/KeymapWorkspace.vue'

const store = useDriverStore()
const { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, message, dirty, assignments, selectedAssignment, keyOptions, keyLabels, demo } = storeToRefs(store)
const shellRevision = ref(0)
const labels: Record<string, string> = { idle: '待连接', connecting: '连接中', reading: '读取中', ready: '已就绪', writing: '写入中', disconnected: '已断开', error: '发生错误', unsupported: '不支持' }
const busy = () => ['connecting', 'reading', 'writing'].includes(status.value)
const connect = async (useDemo: boolean) => { shellRevision.value++; await store.connect(useDemo) }
const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
onMounted(() => { window.addEventListener('beforeunload', beforeUnload); store.reconnectAuthorized() })
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<template>
  <main>
    <header class="topbar">
      <div class="brand"><span class="brand-mark">A</span><div><strong>ANXIU</strong><small>KEYBOARD STUDIO</small></div></div>
      <div class="top-actions">
        <span class="status-pill" :class="status"><i></i>{{ labels[status] }}</span>
        <button class="ghost" :disabled="busy()" @click="connect(true)">演示模式</button>
        <button class="primary" :disabled="busy()" @click="connect(false)">{{ profile && !demo ? '重新连接' : '连接键盘' }}</button>
      </div>
    </header>

    <section v-if="!profile" class="hero">
      <div class="hero-orb"></div>
      <span class="eyebrow">WEBHID · C98</span>
      <h1>把每一次触发，<br /><em>调成你的手感。</em></h1>
      <p>连接 RK-C98，读取键盘配置并直接在浏览器中完成键位映射。配置写入后会自动回读验证。</p>
      <div class="hero-actions"><button class="primary large" :disabled="busy()" @click="connect(false)">连接我的键盘</button><button class="text-button" :disabled="busy()" @click="connect(true)">没有设备？体验演示</button></div>
      <div class="requirements"><span>● Chrome 89+</span><span>● Edge 89+</span><span>● USB HID</span><span>● HTTPS</span></div>
      <div v-if="error || message" class="notice" :class="{ error }">{{ error || message }}</div>
    </section>

    <AppShell v-else :key="shellRevision" :profile="profile" :active-configuration="activeConfiguration" :navigation-disabled="busy()" :error="error" :message="message" :sidebar-image-url="devicePresentation.sidebarImageUrl" @select-configuration="store.selectConfiguration" @restore-factory="store.restoreFactory">
      <template #device><DeviceOverview :profile="profile" :busy="busy()" :image-url="devicePresentation.overviewImageUrl" :image-alt="devicePresentation.overviewImageAlt" @reload="store.reload" /></template>
      <template #keymap>
        <KeymapWorkspace :profile="profile" :status="status" :layer="layer" :mode="mode" :selected-position-id="selectedPositionId" :dirty="dirty" :assignments="assignments" :selected-assignment="selectedAssignment" :key-options="keyOptions" :key-labels="keyLabels" :key-geometry="devicePresentation.keyGeometry" @select-layer="store.selectLayer" @select-mode="store.selectMode" @select-position="selectedPositionId = $event" @assign-key="store.assignKey" @restore-defaults="store.restoreAllKeyDefaults" @restore-key="store.restoreKeyDefault" />
      </template>
    </AppShell>

    <footer><span>ANXIU STUDIO · v0.1.0</span><span>配置仅在本地与设备间传输</span></footer>

  </main>
</template>
