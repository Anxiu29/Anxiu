<script setup lang="ts">
import { computed } from 'vue'
import type { KeyAssignment, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import type { LightingModePresentation } from '@/ui/DevicePresentation'
import { cloneLightingSettings, type LightingSettings } from '@/domain/lighting'
import KeyboardCanvas from '@/components/KeyboardCanvas.vue'

const props = defineProps<{
  settings?: LightingSettings
  status: SessionStatus
  profile: KeyboardProfile
  assignments: KeyAssignment[]
  keyLabels: Record<number, string>
  keyGeometry?: KeyGeometryResolver
  lightingModes: readonly LightingModePresentation[]
}>()
const emit = defineEmits<{ update: [settings: LightingSettings]; reload: [] }>()
const busy = computed(() => ['connecting', 'reading', 'writing'].includes(props.status))

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
    <header class="lighting-header">
      <div>
        <h2>灯光设置</h2>
        <p>设备灯效预览与主灯参数设置</p>
      </div>
      <div class="lighting-actions">
        <span class="lighting-status">{{ status === 'writing' ? '正在写入并回读…' : '修改后即时写入并回读' }}</span>
        <button class="lighting-refresh" type="button" :disabled="busy" @click="emit('reload')">重新读取</button>
      </div>
    </header>

    <template v-if="settings">
      <section class="panel lighting-keyboard-preview" :style="{ '--light-color': settings.colors[0] ?? '#FFFFFF', '--light-strength': settings.open ? Math.max(.2, Math.min(1, settings.luminance / 100)) : 0 }">
        <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :geometry="keyGeometry" :unit="36" />
      </section>

      <section class="panel lighting-dashboard">
        <div class="lighting-panel-section lighting-modes">
          <div class="lighting-section-title"><h3>灯效模式</h3><small>{{ settings.open ? '主灯开启' : '主灯关闭' }}</small></div>
          <div class="lighting-mode-grid">
            <button v-for="item in lightingModes" :key="item.value" class="lighting-mode-button" type="button" :class="{ active: settings.mode === item.value }" :disabled="busy || !settings.open" @click="update({ mode: item.value })">{{ item.label }}</button>
          </div>
        </div>

        <div class="lighting-panel-section lighting-tuning">
          <div class="lighting-section-title"><h3>灯效设置</h3></div>
          <div class="lighting-control-list">
            <div class="lighting-control">
              <div class="lighting-control-value"><label for="lighting-luminance">亮度</label><output>{{ settings.luminance }}</output></div>
              <input id="lighting-luminance" class="lighting-range" type="range" min="0" max="255" :value="settings.luminance" :disabled="busy || !settings.open" @change="update({ luminance: Number(($event.target as HTMLInputElement).value) })" />
            </div>
            <div class="lighting-control">
              <div class="lighting-control-value"><label for="lighting-speed">速度</label><output>{{ settings.speed }}</output></div>
              <input id="lighting-speed" class="lighting-range" type="range" min="0" max="255" :value="settings.speed" :disabled="busy || !settings.open || settings.mode === 0" @change="update({ speed: Number(($event.target as HTMLInputElement).value) })" />
            </div>
            <div class="lighting-inline-setting">
              <label class="lighting-toggle-label" for="lighting-direction">灯效方向 · {{ settings.direction ? '正向' : '反向' }}</label>
              <label class="lighting-switch"><input id="lighting-direction" type="checkbox" :checked="settings.direction" :disabled="busy || !settings.open || settings.mode === 0" @change="update({ direction: ($event.target as HTMLInputElement).checked })" /><span></span></label>
            </div>
            <div class="lighting-inline-setting">
              <label for="lighting-sleep">休眠参数</label>
              <input id="lighting-sleep" class="lighting-number" type="number" min="0" max="255" :value="settings.sleepDelay" :disabled="busy" @change="update({ sleepDelay: Number(($event.target as HTMLInputElement).value) })" />
            </div>
          </div>
        </div>

        <div class="lighting-panel-section lighting-colors">
          <div class="lighting-section-title">
            <h3>颜色设置</h3>
            <div class="lighting-inline-setting"><label for="lighting-master">主灯</label><label class="lighting-switch"><input id="lighting-master" type="checkbox" :checked="settings.open" :disabled="busy" @change="update({ open: ($event.target as HTMLInputElement).checked })" /><span></span></label></div>
          </div>
          <div class="lighting-color-body">
            <label class="lighting-color-wheel" :style="{ '--selected-color': settings.colors[0] ?? '#FFFFFF' }">
              <input type="color" :value="settings.colors[0] ?? '#FFFFFF'" :disabled="busy || !settings.open" @change="updatePrimaryColor(($event.target as HTMLInputElement).value)" />
              <span class="lighting-color-wheel-selection"></span>
            </label>
            <div class="lighting-palette">
              <button v-for="(color, index) in settings.colors" :key="`${color}-${index}`" class="lighting-swatch" type="button" :class="{ active: index === 0 }" :style="{ '--swatch-color': color }" :title="color" :disabled="busy || !settings.open" @click="updatePrimaryColor(color)"></button>
            </div>
          </div>
          <div class="lighting-hex-row"><span class="lighting-hex-label">HEX</span><code class="lighting-hex-value">{{ settings.colors[0] ?? '#FFFFFF' }}</code></div>
        </div>
      </section>
    </template>
    <div v-else class="panel lighting-empty"><span class="spinner"></span>正在读取灯光设置…</div>
  </section>
</template>
