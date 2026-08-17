<script setup lang="ts">
import { computed, ref } from 'vue'
import type { KeyDefinition } from '@/domain/keyboard'

const props = defineProps<{ current?: number; hint?: string; keys: readonly KeyDefinition[]; disabled?: boolean }>()
const emit = defineEmits<{ select: [code: number] }>()

type PickerItem = { code?: number; width?: number; height?: number; label?: string }
type PositionedPickerItem = PickerItem & { code: number; x: number; y: number }
const spacer = (width = 0.5): PickerItem => ({ width })
const key = (code: number, width = 1, label?: string, height = 1): PickerItem => ({ code, width, label, height })
const modifierWidth = 9 / 7

const placeRow = (y: number, items: PickerItem[], startX = 0): PositionedPickerItem[] => {
  let x = startX
  return items.flatMap((item) => {
    const width = item.width ?? 1
    const placed = item.code === undefined ? [] : [{ ...item, code: item.code, x, y }]
    x += width
    return placed
  })
}

/**
 * 参考图中的标准全尺寸选择矩阵。各区域使用独立坐标，右侧修饰键的数量变化
 * 不会再把导航区、方向区或数字区推走；这里只决定外观，不参与设备矩阵读写。
 */
const keyboardKeys: PositionedPickerItem[] = [
  ...placeRow(0, [key(41),spacer(1),key(58),key(59),key(60),key(61),spacer(.5),key(62),key(63),key(64),key(65),spacer(.5),key(66),key(67),key(68),key(69)]),
  ...placeRow(1, [key(53),key(30),key(31),key(32),key(33),key(34),key(35),key(36),key(37),key(38),key(39),key(45),key(46),key(42,2)]),
  ...placeRow(2, [key(43,1.5),key(20),key(26),key(8),key(21),key(23),key(28),key(24),key(12),key(18),key(19),key(47),key(48),key(49,1.5)]),
  ...placeRow(3, [key(57,1.8),key(4),key(22),key(7),key(9),key(10),key(11),key(13),key(14),key(15),key(51),key(52),key(40,2.2)]),
  ...placeRow(4, [key(225,2.2,'Shift'),key(29),key(27),key(6),key(25),key(5),key(17),key(16),key(54),key(55),key(56),key(229,2.8,'Shift')]),
  ...placeRow(5, [key(224,modifierWidth,'CTRL'),key(227,modifierWidth,'WIN'),key(226,modifierWidth,'ALT'),key(44,6,'SPACE'),key(230,modifierWidth,'ALT'),key(231,modifierWidth,'WIN'),key(101,modifierWidth,'MENU'),key(228,modifierWidth,'CTRL')]),

  ...placeRow(0, [key(70,1,'PRTSC'),key(71,1,'LOCK'),key(72,1,'PAUSE')], 15.55),
  ...placeRow(1, [key(73,1,'INS'),key(74,1,'HOME'),key(75,1,'PGUP')], 15.55),
  ...placeRow(2, [key(76,1,'DEL'),key(77,1,'END'),key(78,1,'PGDN')], 15.55),
  ...placeRow(4, [key(82)], 16.55),
  ...placeRow(5, [key(80),key(81),key(79)], 15.55),

  ...placeRow(1, [key(83),key(84),key(85),key(86)], 19.05),
  ...placeRow(2, [key(95),key(96),key(97),key(87,1,undefined,2)], 19.05),
  ...placeRow(3, [key(92),key(93),key(94)], 19.05),
  ...placeRow(4, [key(89),key(90),key(91),key(88,1,undefined,2)], 19.05),
  ...placeRow(5, [key(98,2),key(99)], 19.05),
]

const mode = ref<'keyboard' | 'extended'>('keyboard')
const search = ref('')
const byCode = computed(() => new Map(props.keys.map((item) => [item.code, item])))
const visualCodes = new Set(keyboardKeys.map((item) => item.code))
const query = computed(() => search.value.trim().toLowerCase())
const matches = (code: number) => {
  if (!query.value) return true
  const definition = byCode.value.get(code)
  return definition?.label.toLowerCase().includes(query.value) || String(code).includes(query.value) || code.toString(16).includes(query.value.replace(/^0x/, ''))
}
const extendedKeys = computed(() => props.keys.filter((item) => !visualCodes.has(item.code) && matches(item.code)))
const labelFor = (item: PickerItem) => item.label ?? (item.code === undefined ? '' : byCode.value.get(item.code)?.label ?? `0x${item.code.toString(16).toUpperCase()}`)
</script>

<template>
  <section class="picker panel picker-wide">
    <div class="picker-toolbar">
      <div class="picker-modes">
        <button :class="{ active: mode === 'keyboard' }" @click="mode = 'keyboard'">键盘按键</button>
        <button :class="{ active: mode === 'extended' }" @click="mode = 'extended'">扩展按键</button>
      </div>
      <div class="picker-current" v-if="current !== undefined">当前键码：0x{{ current.toString(16).padStart(4, '0').toUpperCase() }}</div>
      <div v-if="hint" class="picker-hint">{{ hint }}</div>
      <input v-model="search" class="search picker-search" placeholder="搜索按键或键码" />
    </div>

    <div v-if="mode === 'keyboard'" class="picker-keyboard">
      <button v-for="item in keyboardKeys" :key="item.code" class="picker-key" :class="{ active: current === item.code, muted: !matches(item.code) }" :style="{ '--picker-x': item.x, '--picker-y': item.y, '--picker-width': item.width ?? 1, '--picker-height': item.height ?? 1 }" :title="`${labelFor(item)} · 0x${item.code.toString(16).padStart(4, '0').toUpperCase()}`" :disabled="disabled" @click="emit('select', item.code)">
        <span>{{ labelFor(item) }}</span>
        <small>{{ item.code.toString(16).padStart(2, '0').toUpperCase() }}</small>
      </button>
    </div>

    <div v-else class="extended-key-list">
      <button v-for="item in extendedKeys" :key="item.code" :class="{ active: current === item.code }" :disabled="disabled" @click="emit('select', item.code)">
        <span>{{ item.label }}</span><small>0x{{ item.code.toString(16).padStart(4, '0').toUpperCase() }}</small>
      </button>
    </div>
  </section>
</template>
