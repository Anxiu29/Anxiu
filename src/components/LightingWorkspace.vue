<script setup lang="ts">
import { computed } from 'vue'
import type { SessionStatus } from '@/domain/keyboard'
import { cloneLightingSettings, type LightingSettings } from '@/domain/lighting'

const props = defineProps<{ settings?: LightingSettings; status: SessionStatus }>()
const emit = defineEmits<{ update: [settings: LightingSettings]; reload: [] }>()
const busy = computed(() => ['connecting', 'reading', 'writing'].includes(props.status))
const modes = Array.from({ length: 21 }, (_, mode) => ({ mode, label: mode === 0 ? '静态灯光' : `动态灯效 ${mode}` }))

const update = (patch: Partial<LightingSettings>) => {
  if (!props.settings || busy.value) return
  const next = { ...cloneLightingSettings(props.settings), ...patch }
  next.type = next.mode === 0 ? 'static' : next.mode <= 20 ? 'dynamic' : 'custom'
  emit('update', next)
}
const updatePrimaryColor = (color: string) => {
  if (!props.settings) return
  const colors = [...props.settings.colors]
  colors[0] = color.toUpperCase()
  update({ colors, staticColor: 0 })
}
</script>

<template>
  <section class="lighting-workspace">
    <header class="lighting-heading">
      <div><span class="eyebrow">LIGHTING</span><h1>灯光设置</h1><p>主灯参数即时写入，并自动回读确认设备实际值。</p></div>
      <button class="ghost" type="button" :disabled="busy" @click="emit('reload')">重新读取</button>
    </header>

    <div v-if="settings" class="lighting-grid">
      <section class="panel lighting-preview" :class="{ off: !settings.open }">
        <div class="lighting-glow" :style="{ '--light-color': settings.colors[0] ?? '#FFFFFF', opacity: settings.open ? settings.luminance / 100 : 0 }"></div>
        <span>MAIN LIGHT</span><strong>{{ settings.open ? '主灯已开启' : '主灯已关闭' }}</strong>
        <small>{{ settings.type === 'static' ? '静态' : settings.type === 'dynamic' ? `动态灯效 ${settings.mode}` : '自定义' }} · 亮度 {{ settings.luminance }}%</small>
      </section>

      <section class="panel lighting-controls">
        <label class="lighting-switch"><span><strong>主灯开关</strong><small>关闭后保留其他参数</small></span><input type="checkbox" :checked="settings.open" :disabled="busy" @change="update({ open: ($event.target as HTMLInputElement).checked })" /></label>
        <label><span>灯光模式</span><select :value="settings.mode" :disabled="busy || !settings.open" @change="update({ mode: Number(($event.target as HTMLSelectElement).value) })"><option v-for="item in modes" :key="item.mode" :value="item.mode">{{ item.label }}</option></select></label>
        <label><span>主颜色</span><div class="lighting-color"><input type="color" :value="settings.colors[0] ?? '#FFFFFF'" :disabled="busy || !settings.open" @change="updatePrimaryColor(($event.target as HTMLInputElement).value)" /><code>{{ settings.colors[0] ?? '#FFFFFF' }}</code></div></label>
        <label><span>亮度 <b>{{ settings.luminance }}%</b></span><input type="range" min="0" max="100" :value="settings.luminance" :disabled="busy || !settings.open" @change="update({ luminance: Number(($event.target as HTMLInputElement).value) })" /></label>
        <label><span>速度原始值 <b>{{ settings.speed }}</b></span><input type="number" min="0" max="255" :value="settings.speed" :disabled="busy || !settings.open || settings.mode === 0" @change="update({ speed: Number(($event.target as HTMLInputElement).value) })" /></label>
        <label class="lighting-switch"><span><strong>灯效方向</strong><small>{{ settings.direction ? '正向' : '反向' }}</small></span><input type="checkbox" :checked="settings.direction" :disabled="busy || !settings.open || settings.mode === 0" @change="update({ direction: ($event.target as HTMLInputElement).checked })" /></label>
        <label><span>休眠参数 <b>{{ settings.sleepDelay }}</b></span><input type="number" min="0" max="255" :value="settings.sleepDelay" :disabled="busy" @change="update({ sleepDelay: Number(($event.target as HTMLInputElement).value) })" /></label>
      </section>
    </div>
    <div v-else class="panel lighting-empty"><span class="spinner"></span>正在读取灯光设置…</div>
  </section>
</template>
