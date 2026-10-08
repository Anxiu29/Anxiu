import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useDeviceStore } from './deviceStore'
import {
  MOUSE_BINDINGS,
  KEYBOARD_BINDINGS,
  MEDIA_BINDINGS,
  TEMPORARILY_DISABLED_KEY_INDEX,
} from '@/domain/mouse/settings'

export const useKeyStore = defineStore('mouse_key', () => {
  const device = useDeviceStore()
  const selectedIndex = ref(0)
  const category = ref<'basic' | 'mouse' | 'media'>('basic')
  const bindings = [...MOUSE_BINDINGS, ...KEYBOARD_BINDINGS, ...MEDIA_BINDINGS]
  const indices = computed(
    () =>
      device.config?.defaultKeys.flatMap((key, i) =>
        i !== TEMPORARILY_DISABLED_KEY_INDEX && key.some((v) => v !== 0) ? [i] : [],
      ) ?? [],
  )
  // 页面热更新或重新连接后，不再保留已停用按键的选中状态。
  watch(
    [indices, selectedIndex],
    ([available, selected]) => {
      if (available.length && !available.includes(selected)) selectedIndex.value = available[0]
    },
    { immediate: true, flush: 'sync' },
  )
  const binding = computed(() => device.config?.keys[selectedIndex.value]?.join(',') ?? '')
  function assign(value: string) {
    if (selectedIndex.value === TEMPORARILY_DISABLED_KEY_INDEX) return
    const key = bindings.find((item) => item.value.join(',') === value)
    if (key)
      return device.run(
        (protocol) => protocol.setKey(selectedIndex.value, key.value),
        true,
        false,
        'tlw.keys',
      )
  }
  function assignShortcut(modifiers: number, code: number, index = selectedIndex.value) {
    if (
      !indices.value.includes(index) ||
      !Number.isInteger(modifiers) ||
      modifiers < 0 ||
      modifiers > 15 ||
      !KEYBOARD_BINDINGS.some((key) => key.value[2] === code)
    )
      return
    return device.run(
      (protocol) => protocol.setKey(index, [0x20, modifiers, code]),
      true,
      false,
      'tlw.shortcutKey',
    )
  }
  const restore = () =>
    selectedIndex.value === TEMPORARILY_DISABLED_KEY_INDEX
      ? undefined
      : device.run((protocol) => protocol.setKey(selectedIndex.value), true, false, 'tlw.resetKey')
  const resetAll = () =>
    device.run((protocol) => protocol.resetKeys(), true, false, 'tlw.resetAllKeys')
  return {
    resetAll,
    selectedIndex,
    category,
    indices,
    binding,
    bindings,
    assign,
    assignShortcut,
    restore,
  }
})
