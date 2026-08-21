<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { KeyAssignment, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import type { KeyGeometryResolver } from '@/ui/keyboardGeometry'
import type { LightingModePresentation, LightingRangePresentation } from '@/ui/DevicePresentation'
import { cloneLightingSettings, type CustomKeyLighting, type LightingSettings } from '@/domain/lighting'
import KeyboardCanvas from '@/components/KeyboardCanvas.vue'
import { useFittedKeyboardUnit } from '@/ui/useFittedKeyboardUnit'
import { useHorizontalKeyboardScroll } from '@/ui/useHorizontalKeyboardScroll'

const props = defineProps<{
  settings?: LightingSettings
  customLighting: CustomKeyLighting[]
  customLightingLoading: boolean
  status: SessionStatus
  profile: KeyboardProfile
  assignments: KeyAssignment[]
  keyLabels: Record<number, string>
  keyGeometry?: KeyGeometryResolver
  lightingModes: readonly LightingModePresentation[]
  lightingRanges: { luminance: LightingRangePresentation; speed: LightingRangePresentation }
}>()
const emit = defineEmits<{ update: [settings: LightingSettings]; reload: []; 'load-custom': []; 'update-custom': [items: CustomKeyLighting[]] }>()
const busy = computed(() => ['connecting', 'reading', 'writing'].includes(props.status))
const luminanceDraft = ref(0)
const speedDraft = ref(0)
const colorFormat = ref<'hex' | 'rgb'>('rgb')
const selectedCustomPositionIds = ref<string[]>([])
const customDraft = ref<Record<number, string>>({})
const isCustomMode = computed(() => props.settings?.type === 'custom' || props.settings?.mode === 21)
const canEditColor = computed(() => !!props.settings?.open && (props.settings.type === 'static' || isCustomMode.value))
const selectionBox = ref<{ left: number; top: number; width: number; height: number }>()
let selectionDrag: { pointerId: number; mode: 'sweep' | 'box'; startX: number; startY: number } | undefined
// 直接观察预览容器，侧栏展开、窗口缩放和不同配列都会触发重新适配。
const { container: keyboardContainer, unit: keyboardUnit } = useFittedKeyboardUnit(() => props.profile.positions, () => props.keyGeometry, { minUnit: 28 })
// 自定义模式把空白拖动让给框选；其他模式仍保留横向拖动浏览。
useHorizontalKeyboardScroll(keyboardContainer, () => !isCustomMode.value)

// 拖动时只更新本地显示，松手后再写入设备，避免一次拖动产生多次 HID 写入。
watch(() => props.settings?.luminance, (value) => { if (value !== undefined) luminanceDraft.value = value }, { immediate: true })
watch(() => props.settings?.speed, (value) => { if (value !== undefined) speedDraft.value = value }, { immediate: true })
watch(() => props.customLighting, (items) => {
  customDraft.value = Object.fromEntries(items.map((item) => [item.sourceCode, item.color.toUpperCase()]))
}, { immediate: true, deep: true })
watch(isCustomMode, (custom) => {
  if (!custom || !props.profile.capabilities.customLighting) return
  if (!selectedCustomPositionIds.value.length && props.profile.positions[0]) selectedCustomPositionIds.value = [props.profile.positions[0].id]
  if (!props.customLighting.length) emit('load-custom')
}, { immediate: true })

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
  if (isCustomMode.value) {
    const selected = new Set(selectedCustomPositionIds.value)
    if (!selected.size) return
    const next = { ...customDraft.value }
    props.profile.positions.forEach((position) => { if (selected.has(position.id)) next[position.sourceCode] = color.toUpperCase() })
    customDraft.value = next
    return
  }
  const colors = [...props.settings.colors]
  colors[0] = color.toUpperCase()
  update({ colors, staticColor: 0 })
}

const selectedCustomPositions = computed(() => {
  const selected = new Set(selectedCustomPositionIds.value)
  return props.profile.positions.filter((item) => selected.has(item.id))
})
const activeColor = computed(() => {
  const first = selectedCustomPositions.value[0]
  if (isCustomMode.value && first) return customDraft.value[first.sourceCode] ?? '#000000'
  return props.settings?.colors[0] ?? '#FFFFFF'
})
const customKeyColors = computed(() => Object.fromEntries(props.profile.positions.map((position) => [position.id, customDraft.value[position.sourceCode] ?? '#000000'])))
const customDirty = computed(() => props.profile.positions.some((position) => {
  const original = props.customLighting.find((item) => item.sourceCode === position.sourceCode)?.color.toUpperCase() ?? '#000000'
  return (customDraft.value[position.sourceCode] ?? '#000000') !== original
}))
const addSelectedPosition = (positionId: string) => {
  if (!selectedCustomPositionIds.value.includes(positionId)) selectedCustomPositionIds.value = [...selectedCustomPositionIds.value, positionId]
}
const saveCustomLighting = () => emit('update-custom', props.profile.positions.map((position) => ({ sourceCode: position.sourceCode, color: customDraft.value[position.sourceCode] ?? '#000000' })))

const positionIdAt = (clientX: number, clientY: number) => document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-position-id]')?.dataset.positionId
const beginCustomSelection = (event: PointerEvent) => {
  if (!isCustomMode.value || busy.value || event.button !== 0) return
  const host = event.currentTarget as HTMLElement
  const key = (event.target as HTMLElement).closest<HTMLElement>('[data-position-id]')
  const bounds = host.getBoundingClientRect()
  selectionDrag = { pointerId: event.pointerId, mode: key ? 'sweep' : 'box', startX: event.clientX - bounds.left, startY: event.clientY - bounds.top }
  selectedCustomPositionIds.value = key?.dataset.positionId ? [key.dataset.positionId] : []
  if (!key) selectionBox.value = { left: selectionDrag.startX, top: selectionDrag.startY, width: 0, height: 0 }
  host.setPointerCapture(event.pointerId)
  // 阻止自定义框选与空白拖动滚动、浏览器文本选择同时发生。
  event.preventDefault()
  event.stopImmediatePropagation()
}
const moveCustomSelection = (event: PointerEvent) => {
  if (!selectionDrag || selectionDrag.pointerId !== event.pointerId) return
  if (selectionDrag.mode === 'sweep') {
    const positionId = positionIdAt(event.clientX, event.clientY)
    if (positionId) addSelectedPosition(positionId)
    return
  }
  const host = event.currentTarget as HTMLElement
  const bounds = host.getBoundingClientRect()
  const currentX = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left))
  const currentY = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top))
  const left = Math.min(selectionDrag.startX, currentX)
  const top = Math.min(selectionDrag.startY, currentY)
  const right = Math.max(selectionDrag.startX, currentX)
  const bottom = Math.max(selectionDrag.startY, currentY)
  selectionBox.value = { left, top, width: right - left, height: bottom - top }
  selectedCustomPositionIds.value = [...host.querySelectorAll<HTMLElement>('[data-position-id]')].filter((key) => {
    const rect = key.getBoundingClientRect()
    return rect.right >= bounds.left + left && rect.left <= bounds.left + right && rect.bottom >= bounds.top + top && rect.top <= bounds.top + bottom
  }).map((key) => key.dataset.positionId!).filter(Boolean)
}
const finishCustomSelection = (event: PointerEvent) => {
  if (!selectionDrag || selectionDrag.pointerId !== event.pointerId) return
  const host = event.currentTarget as HTMLElement
  if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId)
  selectionDrag = undefined
  selectionBox.value = undefined
}

type RgbChannel = 'r' | 'g' | 'b'
const primaryRgb = computed(() => {
  const hex = activeColor.value.replace('#', '')
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
    '--selected-color': activeColor.value,
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
  if (busy.value || !canEditColor.value) return
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
      <section ref="keyboardContainer" class="panel lighting-keyboard-preview" :class="{ 'custom-mode': isCustomMode }" :style="{ '--light-color': settings.colors[0] ?? '#FFFFFF', '--light-strength': settings.open ? Math.max(.2, Math.min(1, settings.luminance / lightingRanges.luminance.max)) : 0 }" @pointerdown="beginCustomSelection" @pointermove="moveCustomSelection" @pointerup="finishCustomSelection" @pointercancel="finishCustomSelection">
        <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :key-labels="keyLabels" :geometry="keyGeometry" :unit="keyboardUnit" :pressed="isCustomMode ? selectedCustomPositionIds : []" :key-colors="isCustomMode ? customKeyColors : {}" />
        <span v-if="selectionBox" class="custom-lighting-selection-box" :style="{ left: `${selectionBox.left}px`, top: `${selectionBox.top}px`, width: `${selectionBox.width}px`, height: `${selectionBox.height}px` }"></span>
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
              <input id="lighting-speed" class="lighting-range" type="range" :min="lightingRanges.speed.min" :max="lightingRanges.speed.max" :step="lightingRanges.speed.step" :value="speedDraft" :style="rangeProgress(speedDraft, lightingRanges.speed)" :disabled="busy || !settings.open || settings.type !== 'dynamic'" @input="speedDraft = rangeValue($event)" @change="update({ speed: speedDraft })" />
            </div>
            <div class="lighting-inline-setting">
              <label class="lighting-toggle-label" for="lighting-direction">灯效方向 · {{ settings.direction ? '正向' : '反向' }}</label>
              <label class="lighting-switch"><input id="lighting-direction" type="checkbox" :checked="settings.direction" :disabled="busy || !settings.open || settings.type !== 'dynamic'" @change="update({ direction: ($event.target as HTMLInputElement).checked })" /><span></span></label>
            </div>
            <div class="lighting-inline-setting">
              <label for="lighting-sleep">休眠参数</label>
              <input id="lighting-sleep" class="lighting-number" type="number" min="0" max="255" :value="settings.sleepDelay" :disabled="busy" @change="update({ sleepDelay: Number(($event.target as HTMLInputElement).value) })" />
            </div>
          </div>
        </div>

        <div class="lighting-panel-section lighting-colors">
          <div class="lighting-section-title">
            <div><h3>{{ isCustomMode ? '逐键颜色' : '颜色设置' }}</h3><small v-if="isCustomMode">{{ customLightingLoading ? '正在读取…' : `已选择 ${selectedCustomPositions.length} 个按键` }}</small><small v-else-if="settings.type === 'dynamic'">当前动态灯效使用固件预设颜色，不能修改</small></div>
            <div class="lighting-inline-setting"><label for="lighting-master">主灯</label><label class="lighting-switch"><input id="lighting-master" type="checkbox" :checked="settings.open" :disabled="busy" @change="update({ open: ($event.target as HTMLInputElement).checked })" /><span></span></label></div>
          </div>
          <div class="lighting-color-body">
            <div class="lighting-color-wheel" :class="{ disabled: busy || !canEditColor }" role="button" aria-label="点击调色盘选择颜色" :aria-disabled="busy || !canEditColor" @click="selectWheelColor">
              <span class="lighting-color-wheel-selection" :style="wheelSelectionStyle"></span>
            </div>
            <div class="lighting-palette">
              <button v-for="(color, index) in settings.colors" :key="`${color}-${index}`" class="lighting-swatch" type="button" :class="{ active: index === 0 }" :style="{ '--swatch-color': color }" :title="color" :disabled="busy || !canEditColor" @click="updatePrimaryColor(color)"></button>
            </div>
          </div>
          <div class="lighting-color-format">
            <div class="lighting-format-tabs">
              <button type="button" :class="{ active: colorFormat === 'hex' }" :aria-pressed="colorFormat === 'hex'" @click="colorFormat = 'hex'">HEX</button>
              <button type="button" :class="{ active: colorFormat === 'rgb' }" :aria-pressed="colorFormat === 'rgb'" @click="colorFormat = 'rgb'">RGB</button>
            </div>
            <code v-if="colorFormat === 'hex'" class="lighting-hex-value">{{ activeColor }}</code>
            <div v-else class="lighting-rgb-fields">
              <label>R <input type="number" min="0" max="255" :value="primaryRgb.r" :disabled="busy || !canEditColor" @change="updateRgbChannel('r', Number(($event.target as HTMLInputElement).value))" /></label>
              <label>G <input type="number" min="0" max="255" :value="primaryRgb.g" :disabled="busy || !canEditColor" @change="updateRgbChannel('g', Number(($event.target as HTMLInputElement).value))" /></label>
              <label>B <input type="number" min="0" max="255" :value="primaryRgb.b" :disabled="busy || !canEditColor" @change="updateRgbChannel('b', Number(($event.target as HTMLInputElement).value))" /></label>
            </div>
          </div>
          <p v-if="isCustomMode" class="custom-lighting-hint">左键点击选择；按住左键滑过键帽，或在键盘空白处拖框，可批量选择按键。</p>
          <button v-if="isCustomMode" class="custom-lighting-save" type="button" :disabled="busy || customLightingLoading || !customDirty" @click="saveCustomLighting">保存自定义灯光</button>
        </div>
      </section>
    </template>
    <div v-else class="panel lighting-empty"><span class="spinner"></span>正在读取灯光设置…</div>
  </section>
</template>
