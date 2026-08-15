<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDriverStore } from '@/stores/driver'
import KeyboardCanvas from '@/components/KeyboardCanvas.vue'
import KeyPicker from '@/components/KeyPicker.vue'
import keyboardImageUrl from '@/assets/c98-keyboard-transparent.png'

const store = useDriverStore()
const { status, profile, layer, selectedPositionId, error, message, dirty, assignments, selectedAssignment, keyOptions, keyLabels, demo } = storeToRefs(store)
const imageOpen = ref(false)
const labels: Record<string, string> = { idle: '待连接', connecting: '连接中', reading: '读取中', ready: '已就绪', writing: '写入中', disconnected: '已断开', error: '发生错误', unsupported: '不支持' }
const busy = () => ['connecting', 'reading', 'writing'].includes(status.value)
const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
const closeImageByEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') imageOpen.value = false }
onMounted(() => { window.addEventListener('beforeunload', beforeUnload); window.addEventListener('keydown', closeImageByEscape); store.reconnectAuthorized() })
onBeforeUnmount(() => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('keydown', closeImageByEscape) })
</script>

<template>
  <main>
    <header class="topbar">
      <div class="brand"><span class="brand-mark">A</span><div><strong>ANXIU</strong><small>KEYBOARD STUDIO</small></div></div>
      <div class="top-actions">
        <span class="status-pill" :class="status"><i></i>{{ labels[status] }}</span>
        <button class="ghost" :disabled="busy()" @click="store.connect(true)">演示模式</button>
        <button class="primary" :disabled="busy()" @click="store.connect(false)">{{ profile && !demo ? '重新连接' : '连接键盘' }}</button>
      </div>
    </header>

    <section v-if="!profile" class="hero">
      <div class="hero-orb"></div>
      <span class="eyebrow">WEBHID · C98</span>
      <h1>把每一次触发，<br /><em>调成你的手感。</em></h1>
      <p>连接 RK-C98，读取键盘配置并直接在浏览器中完成键位映射。配置写入后会自动回读验证。</p>
      <div class="hero-actions"><button class="primary large" :disabled="busy()" @click="store.connect(false)">连接我的键盘</button><button class="text-button" :disabled="busy()" @click="store.connect(true)">没有设备？体验演示</button></div>
      <div class="requirements"><span>● Chrome 89+</span><span>● Edge 89+</span><span>● USB HID</span><span>● HTTPS</span></div>
      <div v-if="error || message" class="notice" :class="{ error }">{{ error || message }}</div>
    </section>

    <section v-else class="workspace">
      <div class="device-summary panel">
        <button class="device-image-button" title="点击查看键盘大图" aria-label="查看 C98 键盘图片" @click="imageOpen = true">
          <img :src="keyboardImageUrl" alt="C98 键盘" />
        </button>
        <div><span class="eyebrow">CONNECTED DEVICE</span><h2>{{ profile.device.productName }}</h2><p>FW {{ profile.device.firmwareVersion }} · Protocol {{ profile.device.protocolVersion }} · VID {{ profile.device.vendorId.toString(16).toUpperCase() }} / PID {{ profile.device.productId.toString(16).toUpperCase() }}</p><small class="image-tip">点击左侧图片查看大图</small></div>
        <div class="summary-actions"><button class="ghost" :disabled="busy()" @click="store.reload">重新读取</button><button class="ghost danger" :disabled="busy()" @click="store.restoreFactory">恢复默认</button></div>
      </div>

      <div v-if="error || message" class="notice" :class="{ error }">{{ error || message }}</div>

      <div class="editor-stack">
        <section class="editor panel">
          <div class="panel-heading"><div><span class="eyebrow">KEYMAP EDITOR</span><h2>当前键位矩阵</h2></div><div class="layer-tabs"><button v-for="index in profile.capabilities.layers" :key="index" :class="{ active: layer === index - 1 }" @click="layer = index - 1">FN {{ index }}</button></div></div>
          <p class="hint">先在上方矩阵选择一个物理按键，再从下方键盘矩阵或扩展按键中选择新功能。</p>
          <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :selected="selectedPositionId" @select="selectedPositionId = $event" />
          <div class="editor-footer"><div><i :class="{ dirty }"></i><span>{{ dirty ? '存在未保存的修改' : '配置与设备一致' }}</span></div><button class="primary save" :disabled="!dirty || busy()" @click="store.save"><span v-if="status === 'writing'" class="spinner"></span>{{ status === 'writing' ? '正在写入并验证…' : '写入键盘' }}</button></div>
        </section>

        <KeyPicker :current="selectedAssignment?.keyCode" :keys="keyOptions" @select="store.assignKey" />
      </div>
    </section>

    <footer><span>ANXIU STUDIO · v0.1.0</span><span>配置仅在本地与设备间传输</span></footer>

    <div v-if="imageOpen" class="image-lightbox" role="dialog" aria-modal="true" aria-label="C98 键盘图片" @click.self="imageOpen = false">
      <button class="image-lightbox-close" aria-label="关闭图片" @click="imageOpen = false">×</button>
      <img :src="keyboardImageUrl" alt="C98(739) 单模 US 带旋钮键盘大图" />
    </div>
  </main>
</template>
