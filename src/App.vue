<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDriverStore } from '@/stores/driver'
import KeyboardCanvas from '@/components/KeyboardCanvas.vue'
import KeyPicker from '@/components/KeyPicker.vue'

const store = useDriverStore()
const { status, profile, layer, selectedPositionId, error, message, dirty, assignments, selectedAssignment, demo } = storeToRefs(store)
const labels: Record<string, string> = { idle: '待连接', connecting: '连接中', reading: '读取中', ready: '已就绪', writing: '写入中', disconnected: '已断开', error: '发生错误', unsupported: '不支持' }
const busy = () => ['connecting', 'reading', 'writing'].includes(status.value)
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
        <button class="ghost" :disabled="busy()" @click="store.connect(true)">演示模式</button>
        <button class="primary" :disabled="busy()" @click="store.connect(false)"><span>⌁</span>{{ profile && !demo ? '重新连接' : '连接键盘' }}</button>
      </div>
    </header>

    <section v-if="!profile" class="hero">
      <div class="hero-orb"></div>
      <span class="eyebrow">WEBHID · C98</span>
      <h1>把每一次触发，<br /><em>调成你的手感。</em></h1>
      <p>连接 RK-C98，读取键盘配置并直接在浏览器中完成键位映射。配置写入后自动回读验证。</p>
      <div class="hero-actions"><button class="primary large" :disabled="busy()" @click="store.connect(false)">连接我的键盘 <b>→</b></button><button class="text-button" :disabled="busy()" @click="store.connect(true)">没有设备？体验演示</button></div>
      <div class="requirements"><span>● Chrome 89+</span><span>● Edge 89+</span><span>● USB HID</span><span>● HTTPS</span></div>
      <div v-if="error" class="notice error">{{ error }}</div>
    </section>

    <section v-else class="workspace">
      <div class="device-summary panel">
        <div class="device-icon">⌨</div>
        <div><span class="eyebrow">CONNECTED DEVICE</span><h2>{{ profile.device.productName }}</h2><p>FW {{ profile.device.firmwareVersion }} · Protocol {{ profile.device.protocolVersion }} · VID {{ profile.device.vendorId.toString(16).toUpperCase() }} / PID {{ profile.device.productId.toString(16).toUpperCase() }}</p></div>
        <div class="summary-actions"><button class="ghost" :disabled="busy()" @click="store.reload">↻ 重新读取</button><button class="ghost danger" :disabled="busy()" @click="store.restoreFactory">恢复默认</button></div>
      </div>

      <div v-if="error || message" class="notice" :class="{ error }">{{ error || message }}</div>

      <div class="editor-grid">
        <section class="editor panel">
          <div class="panel-heading"><div><span class="eyebrow">KEYMAP EDITOR</span><h2>键位映射</h2></div><div class="layer-tabs"><button v-for="index in profile.capabilities.layers" :key="index" :class="{ active: layer === index - 1 }" @click="layer = index - 1">FN {{ index - 1 }}</button></div></div>
          <p class="hint">选择一个按键，再从右侧键库分配新功能。小字显示物理键位，青色标记表示已修改。</p>
          <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :selected="selectedPositionId" @select="selectedPositionId = $event" />
          <div class="editor-footer"><div><i :class="{ dirty }"></i><span>{{ dirty ? '存在未保存的修改' : '配置与设备一致' }}</span></div><button class="primary save" :disabled="!dirty || busy()" @click="store.save"><span v-if="status === 'writing'" class="spinner"></span>{{ status === 'writing' ? '正在写入并验证…' : '写入键盘' }}</button></div>
        </section>
        <KeyPicker :current="selectedAssignment?.keyCode" @select="store.assignKey" />
      </div>
    </section>
    <footer><span>ANXIU STUDIO · v0.1.0</span><span>配置仅在本地与设备间传输</span></footer>
  </main>
</template>
