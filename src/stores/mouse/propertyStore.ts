import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDeviceStore } from './deviceStore'

export const usePropertyStore = defineStore('mouse_property', () => {
  const device = useDeviceStore()
  const color = computed(
    () =>
      '#' +
      [...(device.config?.functions.slice(6, 9) ?? [0, 0, 0])]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join(''),
  )
  const setColor = (value: string | null) =>
    value ? device.run((p) => p.setColor(value), true, false, 'tlw.color') : undefined
  const setMode = (value: number) =>
    device.run((p) => p.setLightMode(value), true, false, 'tlw.mode')
  const setBrightness = (value: number) =>
    device.run((p) => p.setBrightness(value), true, false, 'tlw.brightness')
  const setSpeed = (value: number) =>
    device.run((p) => p.setLightSpeed(value), true, false, 'tlw.lightSpeed')
  return { color, setColor, setMode, setBrightness, setSpeed }
})
