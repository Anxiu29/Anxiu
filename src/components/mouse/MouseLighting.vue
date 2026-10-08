<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MouseColorWheel from './MouseColorWheel.vue'
import { useDeviceStore } from '@/stores/mouse/deviceStore'
import { usePropertyStore } from '@/stores/mouse/propertyStore'
const device = useDeviceStore(),
  lighting = usePropertyStore()
const effects = ['常亮', '呼吸', '流光', '霓虹', '追逐', '彩色呼吸', '关闭']
const mode = computed(() => device.config?.functions[1] ?? 6)
const brightness = ref(4)
const speed = ref(1)
watch(
  () => device.config,
  (config) => {
    if (!config) return
    brightness.value = config.functions[2]
    speed.value = 3 - config.functions[3]
  },
  { immediate: true },
)
async function saveBrightness() {
  await lighting.setBrightness(brightness.value)
  brightness.value = device.config?.functions[2] ?? 4
}
async function saveSpeed() {
  await lighting.setSpeed(3 - speed.value)
  speed.value = 3 - (device.config?.functions[3] ?? 2)
}
</script>
<template>
  <section v-if="device.config" class="mouse-workspace mouse-lighting">
    <header class="mouse-heading">
      <div>
        <span class="eyebrow">LIGHTING</span>
        <h2>灯光设置</h2>
        <p>灯效与参数写入后会自动回读确认。</p>
      </div>
    </header>
    <div class="mouse-lighting-layout">
      <section class="mouse-panel">
        <h3>灯光效果</h3>
        <p class="mouse-lighting-status">当前效果：{{ effects[mode] ?? '未知灯效' }}</p>
        <div class="mouse-effect-list">
          <button
            v-for="(effect, index) in effects"
            :key="effect"
            class="ghost"
            :class="{ active: mode === index }"
            :aria-pressed="mode === index"
            :disabled="device.busy"
            @click="lighting.setMode(index)"
          >
            <span class="mouse-effect-symbol" :class="'effect-' + index">
              {{ ['☀', '◉', '≋', '◎', '»', '◌', '○'][index] }}
            </span>
            <span>{{ effect }}</span>
            <span v-if="mode === index" class="mouse-effect-selected">✓</span>
          </button>
        </div>
      </section>
      <section class="mouse-panel mouse-lighting-controls">
        <h3>
          {{ effects[mode] }}
          <small>效果参数</small>
        </h3>
        <div class="mouse-lighting-editor">
          <div class="mouse-lighting-sliders">
            <p v-if="mode === 6">灯光已关闭，选择一种灯效后可调整参数。</p>
            <label class="mouse-field">
              亮度 · {{ brightness }}
              <input
                type="range"
                min="0"
                max="4"
                v-model.number="brightness"
                :disabled="device.busy || mode === 6"
                @change="saveBrightness"
              />
            </label>
            <label v-if="mode > 0 && mode < 6" class="mouse-field">
              速度 · {{ speed }}
              <input
                type="range"
                min="0"
                max="3"
                v-model.number="speed"
                :disabled="device.busy"
                @change="saveSpeed"
              />
            </label>
          </div>
        </div>
      </section>
      <section v-if="mode === 0" class="mouse-panel mouse-lighting-color-panel">
        <h3>颜色</h3>
        <MouseColorWheel
          :color="lighting.color"
          :disabled="device.busy"
          @change="lighting.setColor"
        />
      </section>
    </div>
  </section>
</template>
