<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MousePresentation } from '@/ui/MousePresentation'
import MouseDialog from './MouseDialog.vue'
import { MOUSE_BINDINGS, KEYBOARD_BINDINGS, MEDIA_BINDINGS } from '@/domain/mouse/settings'
import type { KeyCode } from '@/domain/mouse/model'
import { createFireMacro } from '@/domain/mouse/macros'
import { useKeyStore } from '@/stores/mouse/keyStore'
import { useDeviceStore } from '@/stores/mouse/deviceStore'
import { useMacroStore } from '@/stores/mouse/macroStore'
import { mouseLabel as globalT } from '@/ui/mouseLabels'
import { useMouseLabels } from '@/ui/mouseLabels'
const props = defineProps<{ presentation: MousePresentation }>()
const mouseImage = computed(() => props.presentation.image)
const buttonLayout = props.presentation.buttonLayout
const { t } = useMouseLabels(),
  keys = useKeyStore(),
  device = useDeviceStore(),
  macros = useMacroStore()
const tabs = [
  { id: 'basic', label: 'basicKeys' },
  { id: 'mouse', label: 'mouseKeys' },
  { id: 'media', label: 'mediaOffice' },
] as const
const specialDialog = ref(false),
  specialType = ref<'fire' | 'shortcut'>('shortcut'),
  specialTarget = ref(0)
const shortcutModifiers = ref<number[]>([]),
  shortcutCode = ref(4),
  fireCount = ref(3),
  fireInterval = ref(50)
const modifiers = [
  { label: 'Ctrl', value: 1 },
  { label: 'Shift', value: 2 },
  { label: 'Alt', value: 4 },
  { label: 'Win', value: 8 },
]
const validSpecial = computed(
  () =>
    keys.indices.includes(specialTarget.value) &&
    (specialType.value === 'shortcut'
      ? KEYBOARD_BINDINGS.some((key) => key.value[2] === shortcutCode.value)
      : Number.isInteger(fireCount.value) &&
        fireCount.value >= 1 &&
        fireCount.value <= 255 &&
        Number.isInteger(fireInterval.value) &&
        fireInterval.value >= 1 &&
        fireInterval.value <= 65535),
)
function openSpecial(type: 'fire' | 'shortcut') {
  specialType.value = type
  specialTarget.value = keys.selectedIndex
  const key = device.config?.keys[specialTarget.value]
  shortcutModifiers.value =
    key?.[0] === 0x20
      ? modifiers.filter((modifier) => key[1] & modifier.value).map((modifier) => modifier.value)
      : []
  shortcutCode.value =
    key?.[0] === 0x20 && KEYBOARD_BINDINGS.some((binding) => binding.value[2] === key[2])
      ? key[2]
      : 4
  specialDialog.value = true
}
async function saveSpecial() {
  if (device.busy || !validSpecial.value) return
  const target = specialTarget.value
  const fireMacro =
    specialType.value === 'fire'
      ? createFireMacro(t('fireKey'), fireCount.value, fireInterval.value)
      : undefined
  const saved =
    specialType.value === 'shortcut'
      ? await keys.assignShortcut(
          shortcutModifiers.value.reduce((mask, modifier) => mask | modifier, 0),
          shortcutCode.value,
          target,
        )
      : await device.run(
          (protocol) => protocol.bindMacro(target, fireMacro!),
          true,
          true,
          'tlw.fireKey',
        )
  if (saved) specialDialog.value = false
}
const mappedButtons = computed(() => buttonLayout.filter((b) => keys.indices.includes(b.index)))
const extraIndices = computed(() =>
  keys.indices.filter((i) => !buttonLayout.some((b) => b.index === i)),
)
const visibleBindings = computed<{ label: string; labelKey?: string; value: KeyCode }[]>(() =>
  keys.category === 'basic'
    ? KEYBOARD_BINDINGS
    : keys.category === 'media'
      ? MEDIA_BINDINGS
      : MOUSE_BINDINGS.map((b, i) => ({ ...b, label: t(`mouse${i}`) })),
)
function bindMacro(id: string) {
  return macros.bind(id, keys.selectedIndex)
}
const boundMacroId = computed(() => {
  const key = device.config?.keys[keys.selectedIndex]
  if (!key || (key[0] !== 0x70 && key[0] !== 0x71)) return ''
  const name = device.config?.macro?.name
  return macros.macros.find((macro) => macro.name === name)?.id ?? ''
})
function physicalName(index: number) {
  const code = device.config?.defaultKeys[index]?.join(',')
  const i = MOUSE_BINDINGS.findIndex((b) => b.value.join(',') === code)
  return i >= 0 ? t(`mouse${i}`) : `${t('key')} ${index + 1}`
}
function bindingName(index: number) {
  const key = device.config?.keys[index],
    code = key?.join(',')
  const mouseIndex = MOUSE_BINDINGS.findIndex((b) => b.value.join(',') === code)
  if (mouseIndex >= 0) return t(`mouse${mouseIndex}`)
  const media = MEDIA_BINDINGS.find((b) => b.value.join(',') === code)
  if (media) return media.labelKey ? globalT(media.labelKey) : media.label
  if (key && [0x70, 0x71].includes(key[0])) return device.config?.macro?.name ?? t('macros')
  if (key?.[0] === 0x20 && key[1]) {
    const base = KEYBOARD_BINDINGS.find((binding) => binding.value[2] === key[2])
    if (base)
      return [
        ...modifiers
          .filter((modifier) => key[1] & modifier.value)
          .map((modifier) => modifier.label),
        base.label,
      ].join(' + ')
  }
  return KEYBOARD_BINDINGS.find((b) => b.value.join(',') === code)?.label ?? t('existing')
}
</script>
<template>
  <section class="mouse-workspace mouse-keymap">
    <header class="mouse-heading">
      <div>
        <span class="eyebrow">BUTTON ASSIGNMENT</span>
        <h2>按键设置</h2>
        <p>选择鼠标上的按键，为它分配新的功能。</p>
      </div>
    </header>
    <div class="mouse-two-columns mouse-keymap-columns">
      <section class="mouse-panel mouse-map-panel">
        <div class="mouse-drawing-slot">
          <div class="mouse-drawing">
            <svg
              viewBox="0 0 600 500"
              preserveAspectRatio="xMidYMid meet"
              class="mouse-map"
              aria-hidden="true"
            >
              <image :href="mouseImage" x="190" y="40" width="217" height="420" />
              <g
                v-for="button in mappedButtons"
                :key="button.index"
                :class="{ selected: keys.selectedIndex === button.index }"
              >
                <path :d="button.line" class="mouse-leader" />
                <path
                  :d="button.path"
                  transform="translate(190 40)"
                  class="mouse-hotspot"
                  @click="keys.selectedIndex = button.index"
                />
              </g>
            </svg>
            <button
              v-for="button in mappedButtons"
              :key="button.index"
              class="mouse-key-marker"
              :class="{ active: keys.selectedIndex === button.index }"
              :style="{ left: button.x / 6 + '%', top: button.y / 5 + '%' }"
              :aria-pressed="keys.selectedIndex === button.index"
              :disabled="device.busy"
              @click="keys.selectedIndex = button.index"
            >
              <span>{{ physicalName(button.index) }}</span>
              <strong>{{ bindingName(button.index) }}</strong>
            </button>
          </div>
        </div>
        <div v-if="extraIndices.length" class="mouse-extra-keys">
          <button
            v-for="index in extraIndices"
            :key="index"
            class="ghost"
            :class="{ active: keys.selectedIndex === index }"
            :aria-pressed="keys.selectedIndex === index"
            :disabled="device.busy"
            @click="keys.selectedIndex = index"
          >
            <span>{{ physicalName(index) }}</span>
            <strong>{{ bindingName(index) }}</strong>
          </button>
        </div>
        <div class="mouse-reset-all">
          <button class="ghost" :disabled="device.busy" @click="keys.resetAll">恢复全部按键</button>
        </div>
        <p class="mouse-selected-summary">
          <strong>{{ physicalName(keys.selectedIndex) }}</strong>
          <span>→</span>
          <span>{{ bindingName(keys.selectedIndex) }}</span>
        </p>
      </section>
      <section class="mouse-panel mouse-key-editor">
        <div class="mouse-heading">
          <h3>{{ physicalName(keys.selectedIndex) }}</h3>
          <div class="mouse-key-heading-actions">
            <button class="ghost" :disabled="device.busy" @click="openSpecial('fire')">
              火力键
            </button>
            <button class="ghost" :disabled="device.busy" @click="openSpecial('shortcut')">
              快捷组合键
            </button>
            <button class="ghost" :disabled="device.busy" @click="keys.restore">恢复默认</button>
          </div>
        </div>
        <div class="mouse-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="ghost"
            :class="{ active: keys.category === tab.id }"
            :aria-pressed="keys.category === tab.id"
            @click="keys.category = tab.id"
          >
            {{ t(tab.label) }}
          </button>
        </div>
        <div class="mouse-bindings" :class="{ compact: keys.category === 'basic' }">
          <button
            v-for="binding in visibleBindings"
            :key="binding.value.join(',')"
            class="ghost"
            :class="{ active: keys.binding === binding.value.join(',') }"
            :aria-pressed="keys.binding === binding.value.join(',')"
            :title="binding.labelKey ? globalT(binding.labelKey) : binding.label"
            :disabled="device.busy"
            @click="keys.assign(binding.value.join(','))"
          >
            {{ binding.labelKey ? globalT(binding.labelKey) : binding.label }}
          </button>
        </div>
        <label v-if="keys.category === 'mouse'" class="mouse-field">
          绑定宏
          <select
            :disabled="device.busy"
            :value="boundMacroId"
            @change="bindMacro(($event.target as HTMLSelectElement).value)"
          >
            <option disabled value="">选择宏</option>
            <option
              v-for="macro in macros.macros"
              :key="macro.id"
              :value="macro.id"
              :disabled="!macro.actions.length"
            >
              {{ macro.name }}
            </option>
          </select>
        </label>
      </section>
    </div>
    <MouseDialog
      v-if="specialDialog"
      :title="specialType === 'shortcut' ? '快捷组合键' : '火力键'"
      @close="specialDialog = false"
    >
      <div class="mouse-workspace">
        <p>{{ physicalName(specialTarget) }}</p>
        <template v-if="specialType === 'shortcut'">
          <div class="mouse-toolbar">
            <label v-for="modifier in modifiers" :key="modifier.value">
              <input v-model="shortcutModifiers" type="checkbox" :value="modifier.value" />
              {{ modifier.label }}
            </label>
          </div>
          <select v-model="shortcutCode" aria-label="组合按键">
            <option v-for="key in KEYBOARD_BINDINGS" :key="key.label" :value="key.value[2]">
              {{ key.label }}
            </option>
          </select>
        </template>
        <template v-else>
          <p>火力键会替换设备共用宏存储区中的内容，其他宏绑定也可能受到影响。</p>
          <label class="mouse-field">
            次数
            <input v-model.number="fireCount" type="number" min="1" max="255" />
          </label>
          <label class="mouse-field">
            间隔（ms）
            <input v-model.number="fireInterval" type="number" min="1" max="65535" />
          </label>
        </template>
        <div class="mouse-toolbar">
          <button class="ghost" @click="specialDialog = false">取消</button>
          <button class="primary" :disabled="!validSpecial || device.busy" @click="saveSpecial">
            保存到设备
          </button>
        </div>
      </div>
    </MouseDialog>
  </section>
</template>
