import { unsigned } from './codec'
import type { KeyCode } from './model'

// 按键4对应零起始索引3，暂时关闭改键和宏绑定入口，保留协议矩阵原结构。
export const TEMPORARILY_DISABLED_KEY_INDEX = 3

export interface DpiLimits {
  dpiStart: number
  dpiStep: number
  dpiRank: number
  dpiStageCount: number
}
// Endpoints 0/3 are captured; intermediate codes follow the ascending rate enum.
export const VERIFIED_RATES = [
  { code: 0, hz: 125 },
  { code: 1, hz: 250 },
  { code: 2, hz: 500 },
  { code: 3, hz: 1000 },
] as const

export function stageOffset(stage: number, limits: DpiLimits): number {
  unsigned(stage, limits.dpiStageCount - 1, 'DPI stage')
  return 14 + 9 * stage
}

export function readDpi(data: Uint8Array, stage: number, limits: DpiLimits): number {
  const offset = stageOffset(stage, limits)
  if (data.length < offset + 9) throw new Error('Truncated DPI configuration')
  return limits.dpiStart + data[offset + 2] * limits.dpiStep
}

/** Actual capture repeats index 0x3B four times for 3000 DPI.
 * This firmware's values are 8-bit ranks, not the PDF's 16-bit DPI fields.
 */
export function changeDpi(data: Uint8Array, stage: number, dpi: number, limits: DpiLimits) {
  const offset = stageOffset(stage, limits)
  if (data.length < offset + 9 || limits.dpiStep <= 0) throw new Error('Invalid DPI configuration')
  const index = unsigned(
    (dpi - limits.dpiStart) / limits.dpiStep,
    Math.min(limits.dpiRank, 255),
    'DPI rank',
  )
  data.fill(index, offset + 2, offset + 6)
}

export function changeRate(data: Uint8Array, code: number) {
  if (!VERIFIED_RATES.some((rate) => rate.code === code)) throw new Error('Unsupported report rate')
  data[11] = code
}

export function changeColor(data: Uint8Array, color: string) {
  if (!/^#[\da-f]{6}$/i.test(color)) throw new Error('Invalid RGB color')
  data.set(
    [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16)),
    6,
  )
}

export function changeDpiEnabled(
  data: Uint8Array,
  stage: number,
  enabled: boolean,
  limits: DpiLimits,
) {
  const offset = stageOffset(stage, limits)
  if (
    !enabled &&
    !Array.from({ length: limits.dpiStageCount }, (_, i) => i).some(
      (i) => i !== stage && data[stageOffset(i, limits)] !== 0,
    )
  )
    throw new Error('Keep at least one DPI stage')
  data[offset] = enabled ? 1 : 0
  if (!enabled && data[12] === stage) {
    data[12] = Array.from({ length: limits.dpiStageCount }, (_, i) => i).find(
      (i) => data[stageOffset(i, limits)] !== 0,
    )!
  }
}

export function changeDpiColor(data: Uint8Array, stage: number, color: string, limits: DpiLimits) {
  const offset = stageOffset(stage, limits)
  if (!/^#[\da-f]{6}$/i.test(color)) throw new Error('Invalid RGB color')
  data.set(
    [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)),
    offset + 6,
  )
}

export const MOUSE_BINDINGS: { label: string; value: KeyCode }[] = [
  { label: 'Left click', value: [0x10, 1, 0] },
  { label: 'Right click', value: [0x10, 2, 0] },
  { label: 'Middle click', value: [0x10, 4, 0] },
  { label: 'Back', value: [0x10, 8, 0] },
  { label: 'Forward', value: [0x10, 16, 0] },
  { label: 'DPI +', value: [0x13, 1, 0] },
  { label: 'DPI -', value: [0x13, 2, 0] },
]

export const KEYBOARD_BINDINGS: { label: string; value: KeyCode; eventCode?: string }[] = [
  ...Array.from({ length: 26 }, (_, i) => ({
    label: String.fromCharCode(65 + i),
    value: [0x20, 0, 4 + i] as KeyCode,
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    label: String((i + 1) % 10),
    value: [0x20, 0, 30 + i] as KeyCode,
  })),
  ...['Enter', 'Esc', 'Backspace', 'Tab', 'Space'].map((label, i) => ({
    label,
    value: [0x20, 0, 40 + i] as KeyCode,
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    label: `F${i + 1}`,
    value: [0x20, 0, 58 + i] as KeyCode,
  })),
  ...['Right', 'Left', 'Down', 'Up'].map((label, i) => ({
    label,
    value: [0x20, 0, 79 + i] as KeyCode,
  })),
  ...(
    [
      ['NumLock', 'NumLock', 0x53],
      ['Num /', 'NumpadDivide', 0x54],
      ['Num *', 'NumpadMultiply', 0x55],
      ['Num -', 'NumpadSubtract', 0x56],
      ['Num +', 'NumpadAdd', 0x57],
      ['Num Enter', 'NumpadEnter', 0x58],
      ['Num 1', 'Numpad1', 0x59],
      ['Num 2', 'Numpad2', 0x5a],
      ['Num 3', 'Numpad3', 0x5b],
      ['Num 4', 'Numpad4', 0x5c],
      ['Num 5', 'Numpad5', 0x5d],
      ['Num 6', 'Numpad6', 0x5e],
      ['Num 7', 'Numpad7', 0x5f],
      ['Num 8', 'Numpad8', 0x60],
      ['Num 9', 'Numpad9', 0x61],
      ['Num 0', 'Numpad0', 0x62],
      ['Num .', 'NumpadDecimal', 0x63],
      ['Num =', 'NumpadEqual', 0x67],
    ] as const
  ).map(([label, eventCode, code]) => ({ label, eventCode, value: [0x20, 0, code] as KeyCode })),
]

// Macro modifiers are individual key events, separate from shortcut modifier masks.
export const MACRO_KEYBOARD_BINDINGS = [
  ...KEYBOARD_BINDINGS,
  ...([
    ['-', 'Minus', 0x2d],
    ['=', 'Equal', 0x2e],
    ['[', 'BracketLeft', 0x2f],
    [']', 'BracketRight', 0x30],
    ['\\', 'Backslash', 0x31],
    [';', 'Semicolon', 0x33],
    ["'", 'Quote', 0x34],
    ['`', 'Backquote', 0x35],
    [',', 'Comma', 0x36],
    ['.', 'Period', 0x37],
    ['/', 'Slash', 0x38],
    ['CapsLock', 'CapsLock', 0x39],
    ['PrintScreen', 'PrintScreen', 0x46],
    ['ScrollLock', 'ScrollLock', 0x47],
    ['Pause', 'Pause', 0x48],
    ['Insert', 'Insert', 0x49],
    ['Home', 'Home', 0x4a],
    ['PageUp', 'PageUp', 0x4b],
    ['Delete', 'Delete', 0x4c],
    ['End', 'End', 0x4d],
    ['PageDown', 'PageDown', 0x4e],
    ['Intl \\', 'IntlBackslash', 0x64],
    ['Menu', 'ContextMenu', 0x65],
  ] as const).map(([label, eventCode, code]) => ({
    label,
    eventCode,
    value: [0x20, 0, code] as KeyCode,
  })),
  ...([
    ['Left Ctrl', 'ControlLeft'],
    ['Left Shift', 'ShiftLeft'],
    ['Left Alt', 'AltLeft'],
    ['Left Win / Meta', 'MetaLeft'],
    ['Right Ctrl', 'ControlRight'],
    ['Right Shift', 'ShiftRight'],
    ['Right Alt', 'AltRight'],
    ['Right Win / Meta', 'MetaRight'],
  ] as const).map(([label, eventCode], index) => ({
    label,
    eventCode,
    value: [0x20, 0, 0xe0 + index] as KeyCode,
  })),
]

/** Use physical codes so NumLock and keyboard locale do not change recorded keys. */
export function keyboardUsageFromEventCode(eventCode: string): number | undefined {
  const physical = MACRO_KEYBOARD_BINDINGS.find((key) => key.eventCode === eventCode)
  if (physical) return physical.value[2]
  const label = eventCode.startsWith('Key')
    ? eventCode.slice(3)
    : eventCode.startsWith('Digit')
      ? eventCode.slice(5)
      : eventCode.startsWith('Arrow')
        ? eventCode.slice(5)
        : eventCode === 'Escape'
          ? 'Esc'
          : eventCode
  return KEYBOARD_BINDINGS.find((key) => key.label.toLowerCase() === label.toLowerCase())?.value[2]
}

// Consumer HID usage IDs use the PDF's type 0x30, followed by the little-endian usage.
export const MEDIA_BINDINGS: { label: string; labelKey?: string; value: KeyCode }[] = [
  ...(
    [
      ['PlayPause', 0xcd],
      ['Stop', 0xb7],
      ['PrevTr', 0xb6],
      ['NextTr', 0xb5],
      ['Mute', 0xe2],
      ['VolumD', 0xea],
      ['VolumI', 0xe9],
      ['Calculator', 0x192],
      ['Mail', 0x18a],
      ['Explorer', 0x194],
      ['Home', 0x223],
      ['Search', 0x221],
      ['Back', 0x224],
      ['Forward', 0x225],
    ] as const
  ).map(([label, usage]) => ({
    label,
    labelKey: `mediaKey.${label}`,
    value: [0x30, usage & 255, usage >>> 8] as KeyCode,
  })),
  ...(
    [
      ['C', 6],
      ['X', 27],
      ['V', 25],
      ['Z', 29],
      ['A', 4],
      ['S', 22],
    ] as const
  ).map(([key, code]) => ({ label: `Ctrl + ${key}`, value: [0x20, 1, code] as KeyCode })),
]
