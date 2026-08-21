<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getDevicePresentation, useDriverStore } from '@/composition/root'
import AppShell from '@/components/AppShell.vue'
import DeviceOverview from '@/components/DeviceOverview.vue'
import KeymapWorkspace from '@/components/KeymapWorkspace.vue'
import LightingWorkspace from '@/components/LightingWorkspace.vue'
import AdvancedKeyWorkspace from '@/components/AdvancedKeyWorkspace.vue'
import KeyTestWorkspace from '@/components/KeyTestWorkspace.vue'
import MacroWorkspace from '@/components/MacroWorkspace.vue'

const store = useDriverStore()
// storeToRefs 保留 Pinia 响应性；操作方法仍直接通过 store 调用。
const { status, profile, layer, mode, activeConfiguration, selectedPositionId, error, message, dirty, assignments, selectedAssignment, keyOptions, keyLabels, lighting, advancedKey, advancedKeyLoading, advancedKeyTypes, macroSlots, selectedMacroSlot, macroLoading, demo, driverId } = storeToRefs(store)
// 当前驱动决定设备表现；共享 App 不包含型号名称、图片或配列判断。
const devicePresentation = computed(() => getDevicePresentation(driverId.value))
// 切换真机/演示或重新连接时重建工作区壳，清理旧页面内部的导航与弹窗状态。
const shellRevision = ref(0)
const labels: Record<string, string> = { idle: '待连接', connecting: '连接中', reading: '读取中', ready: '已就绪', writing: '写入中', disconnected: '已断开', error: '发生错误', unsupported: '不支持' }
const busy = () => ['connecting', 'reading', 'writing'].includes(status.value)
const connect = async (useDemo: boolean) => { shellRevision.value++; await store.connect(useDemo) }
// 浏览器关闭保护只关心尚未确认写入的草稿，不阻止已经回读验证成功的配置离开页面。
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
      <span class="eyebrow">WEBHID · KEYBOARD</span>
      <h1>把每一次触发，<br /><em>调成你的手感。</em></h1>
      <p>连接键盘，读取设备配置并直接在浏览器中完成键位映射。配置写入后会自动回读验证。</p>
      <div class="hero-actions"><button class="primary large" :disabled="busy()" @click="connect(false)">连接我的键盘</button><button class="text-button" :disabled="busy()" @click="connect(true)">没有设备？体验演示</button></div>
      <div class="requirements"><span>● Chrome 89+</span><span>● Edge 89+</span><span>● USB HID</span><span>● HTTPS</span></div>
      <div v-if="error || message" class="notice" :class="{ error }">{{ error || message }}</div>
    </section>

    <AppShell v-else :key="shellRevision" :profile="profile" :active-configuration="activeConfiguration" :navigation-disabled="busy()" :error="error" :message="message" :sidebar-image-url="devicePresentation.sidebarImageUrl" @select-configuration="store.selectConfiguration" @restore-factory="store.restoreFactory">
      <template #device="{ openKeymap }"><DeviceOverview :profile="profile" :busy="busy()" :image-url="devicePresentation.overviewImageUrl" :image-alt="devicePresentation.overviewImageAlt" :solution-name="devicePresentation.solutionName" @reload="store.reload" @open-keymap="openKeymap" /></template>
      <template #keymap>
        <KeymapWorkspace :profile="profile" :status="status" :layer="layer" :mode="mode" :selected-position-id="selectedPositionId" :dirty="dirty" :assignments="assignments" :selected-assignment="selectedAssignment" :key-options="keyOptions" :extended-key-codes="devicePresentation.extendedKeyCodes" :key-labels="keyLabels" :key-geometry="devicePresentation.keyGeometry" @select-layer="store.selectLayer" @select-mode="store.selectMode" @select-position="selectedPositionId = $event" @assign-key="store.assignKey" @restore-defaults="store.restoreAllKeyDefaults" @restore-key="store.restoreKeyDefault" />
      </template>
      <template #lighting><LightingWorkspace :settings="lighting" :status="status" :profile="profile" :assignments="assignments" :key-labels="keyLabels" :key-geometry="devicePresentation.keyGeometry" :lighting-modes="devicePresentation.lightingModes" :lighting-ranges="devicePresentation.lightingRanges" @update="store.updateLighting" @reload="store.reloadLighting" /></template>
      <template #advanced><AdvancedKeyWorkspace :profile="profile" :status="status" :selected-position-id="selectedPositionId" :settings="advancedKey" :loading="advancedKeyLoading" :advanced-key-types="advancedKeyTypes" :assignments="assignments" :key-options="keyOptions" :key-labels="keyLabels" :key-geometry="devicePresentation.keyGeometry" @select-position="selectedPositionId = $event" @load="store.loadAdvancedKey" @update="store.updateAdvancedKey" /></template>
      <template #macro><MacroWorkspace :profile="profile" :status="status" :selected-slot="selectedMacroSlot" :macro-slots="macroSlots" :loading="macroLoading" :assignments="assignments" :key-options="keyOptions" :key-labels="keyLabels" :key-geometry="devicePresentation.keyGeometry" @select-slot="store.selectMacroSlot" @update="store.updateMacro" /></template>
      <template #key-test><KeyTestWorkspace :profile="profile" :assignments="assignments" :key-labels="keyLabels" :key-geometry="devicePresentation.keyGeometry" /></template>
    </AppShell>
  </main>
</template>
