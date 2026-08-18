<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { KeyAssignment, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import type { LightingModePresentation, LightingRangePresentation } from '@/ui/DevicePresentation'
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
  lightingRanges: { luminance: LightingRangePresentation; speed: LightingRangePresentation }
}>()
const emit = defineEmits<{ update: [settings: LightingSettings]; reload: [] }>()
const busy = computed(() => ['connecting', 'reading', 'writing'].includes(props.status))
const luminanceDraft = ref(0)
const speedDraft = ref(0)
const colorFormat = ref<'hex' | 'rgb'>('rgb')

// 拖动时只更新本地显示，松手后再写入设备，避免一次拖动产生多次 HID 写入。
watch(() => props.settings?.luminance, (value) => { if (value !== undefined) luminanceDraft.value = value }, { immediate: true })
watch(() => props.settings?.speed, (value) => { if (value !== undefined) speedDraft.value = value }, { immediate: true })

const rangeProgress = (value: number, range: LightingRangePresentation) => ({
  '--range-progress': `${Math.max(0, Math.min(100, ((value - range.min) / Math.max(1, range.max - range.min)) * 100))}%`,
})
const rangeValue = (event: Event) => Number((event.target as HTMLInputElement).value)

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

type RgbChannel = 'r' | 'g' | 'b'
const primaryRgb = computed(() => {
  const hex = (props.settings?.colors[0] ?? '#FFFFFF').replace('#', '')
  const normalized = /^[0-9A-Fa-f]{6}$/.test(hex) ? hex : 'FFFFFF'
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
})

const primaryHsv = computed(() => {
  const { r, g, b } = primaryRgb.value
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let hue = 0
  if (delta > 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6)
    else if (max === green) hue = 60 * ((blue - red) / delta + 2)
    else hue = 60 * ((red - green) / delta + 4)
  }
  return { hue: (hue + 360) % 360, saturation: max === 0 ? 0 : delta / max }
})

// CSS 圆盘以顶部红色为 0° 并顺时针旋转，选点位置必须使用相同坐标系。
const wheelSelectionStyle = computed(() => {
  const angle = primaryHsv.value.hue * Math.PI / 180
  const radius = primaryHsv.value.saturation * 47
  return {
    '--selected-color': props.settings?.colors[0] ?? '#FFFFFF',
    left: `${50 + Math.sin(angle) * radius}%`,
    top: `${50 - Math.cos(angle) * radius}%`,
  }
})

const hsvToHex = (hue: number, saturation: number) => {
  const chroma = saturation
  const segment = hue / 60
  const intermediate = chroma * (1 - Math.abs(segment % 2 - 1))
  const [red, green, blue] = segment < 1 ? [chroma, intermediate, 0]
    : segment < 2 ? [intermediate, chroma, 0]
      : segment < 3 ? [0, chroma, intermediate]
        : segment < 4 ? [0, intermediate, chroma]
          : segment < 5 ? [intermediate, 0, chroma]
            : [chroma, 0, intermediate]
  const match = 1 - chroma
  return `#${[red, green, blue].map((part) => Math.round((part + match) * 255).toString(16).padStart(2, '0')).join('')}`
}

const selectWheelColor = (event: MouseEvent) => {
  if (busy.value || !props.settings?.open) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const radius = Math.min(rect.width, rect.height) / 2
  const x = event.clientX - (rect.left + rect.width / 2)
  const y = event.clientY - (rect.top + rect.height / 2)
  const distance = Math.hypot(x, y)
  if (distance > radius) return
  const hue = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360
  updatePrimaryColor(hsvToHex(hue, Math.min(1, distance / radius)))
}

const updateRgbChannel = (channel: RgbChannel, value: number) => {
  const nextValue = Number.isFinite(value) ? Math.max(0, Math.min(255, Math.round(value))) : primaryRgb.value[channel]
  const rgb = { ...primaryRgb.value, [channel]: nextValue }
  updatePrimaryColor(`#${[rgb.r, rgb.g, rgb.b].map((part) => part.toString(16).padStart(2, '0')).join('')}`)
}
</script>

<template>
  <section class="lighting-workspace">
    <template v-if="settings">
      <section class="panel lighting-keyboard-preview" :style="{ '--light-color': settings.colors[0] ?? '#FFFFFF', '--light-strength': settings.open ? Math.max(.2, Math.min(1, settings.luminance / lightingRanges.luminance.max)) : 0 }">
        <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :geometry="keyGeometry" :unit="44" />
      </section>

      <section class="panel lighting-dashboard">
        <div class="lighting-panel-section lighting-modes">
          <div class="lighting-section-title"><h3>灯效模式</h3><small>{{ settings.open ? '主灯开启' : '主灯关闭' }}</small></div>
          <div class="lighting-mode-grid">
            <button v-for="item in lightingModes" :key="item.value" class="lighting-mode-button" type="button" :class="{ active: settings.mode === item.value }" :disabled="busy" @click="update({ mode: item.value, open: true })">{{ item.label }}</button>
          </div>
        </div>

        <div class="lighting-panel-section lighting-tuning">
          <div class="lighting-section-title"><h3>灯效设置</h3></div>
          <div class="lighting-control-list">
            <div class="lighting-control">
              <div class="lighting-control-value"><label for="lighting-luminance">亮度</label><output>{{ luminanceDraft }} / {{ lightingRanges.luminance.max }}</output></div>
              <input id="lighting-luminance" class="lighting-range" type="range" :min="lightingRanges.luminance.min" :max="lightingRanges.luminance.max" :step="lightingRanges.luminance.step" :value="luminanceDraft" :style="rangeProgress(luminanceDraft, lightingRanges.luminance)" :disabled="busy || !settings.open" @input="luminanceDraft = rangeValue($event)" @change="update({ luminance: luminanceDraft })" />
            </div>
            <div class="lighting-control">
              <div class="lighting-control-value"><label for="lighting-speed">速度</label><output>{{ speedDraft }} / {{ lightingRanges.speed.max }}</output></div>
              <input id="lighting-speed" class="lighting-range" type="range" :min="lightingRanges.speed.min" :max="lightingRanges.speed.max" :step="lightingRanges.speed.step" :value="speedDraft" :style="rangeProgress(speedDraft, lightingRanges.speed)" :disabled="busy || !settings.open || settings.mode === 0" @input="speedDraft = rangeValue($event)" @change="update({ speed: speedDraft })" />
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
            <div class="lighting-color-wheel" :class="{ disabled: busy || !settings.open }" role="button" aria-label="点击调色盘选择颜色" :aria-disabled="busy || !settings.open" @click="selectWheelColor">
              <span class="lighting-color-wheel-selection" :style="wheelSelectionStyle"></span>
            </div>
            <div class="lighting-palette">
              <button v-for="(color, index) in settings.colors" :key="`${color}-${index}`" class="lighting-swatch" type="button" :class="{ active: index === 0 }" :style="{ '--swatch-color': color }" :title="color" :disabled="busy || !settings.open" @click="updatePrimaryColor(color)"></button>
            </div>
          </div>
          <div class="lighting-color-format">
            <div class="lighting-format-tabs">
              <button type="button" :class="{ active: colorFormat === 'hex' }" :aria-pressed="colorFormat === 'hex'" @click="colorFormat = 'hex'">HEX</button>
              <button type="button" :class="{ active: colorFormat === 'rgb' }" :aria-pressed="colorFormat === 'rgb'" @click="colorFormat = 'rgb'">RGB</button>
            </div>
            <code v-if="colorFormat === 'hex'" class="lighting-hex-value">{{ settings.colors[0] ?? '#FFFFFF' }}</code>
            <div v-else class="lighting-rgb-fields">
              <label>R <input type="number" min="0" max="255" :value="primaryRgb.r" :disabled="busy || !settings.open" @change="updateRgbChannel('r', Number(($event.target as HTMLInputElement).value))" /></label>
              <label>G <input type="number" min="0" max="255" :value="primaryRgb.g" :disabled="busy || !settings.open" @change="updateRgbChannel('g', Number(($event.target as HTMLInputElement).value))" /></label>
              <label>B <input type="number" min="0" max="255" :value="primaryRgb.b" :disabled="busy || !settings.open" @change="updateRgbChannel('b', Number(($event.target as HTMLInputElement).value))" /></label>
            </div>
          </div>
        </div>
      </section>
    </template>
    <div v-else class="panel lighting-empty"><span class="spinner"></span>正在读取灯光设置…</div>
  </section>
</template>
