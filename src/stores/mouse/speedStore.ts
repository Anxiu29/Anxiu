import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDeviceStore } from './deviceStore'
import { readDpi, VERIFIED_RATES } from '@/domain/mouse/settings'

export const useSpeedStore = defineStore('mouse_speed', () => {
  const device = useDeviceStore()
  const stages = computed(() =>
    device.config
      ? Array.from({ length: device.config.basic.dpiStageCount }, (_, index) => ({
          index,
          value: readDpi(device.config!.functions, index, device.config!.basic),
          enabled: !!device.config!.functions[14 + index * 9],
          color:
            '#' +
            [...device.config!.functions.slice(20 + index * 9, 23 + index * 9)]
              .map((v) => v.toString(16).padStart(2, '0'))
              .join(''),
        }))
      : [],
  )
  const maxDpi = computed(() =>
    device.config
      ? device.config.basic.dpiStart +
        Math.min(device.config.basic.dpiRank, 255) * device.config.basic.dpiStep
      : 7500,
  )
  const save = (index: number, value: number) =>
    device.run((p) => p.setDpi(index, value), true, false, 'tlw.performance')
  const select = (index: number) =>
    device.run((p) => p.selectDpi(index), true, false, 'tlw.performance')
  const setRate = (value: number) => device.run((p) => p.setRate(value), true, false, 'tlw.rate')
  const setEnabled = (index: number, value: boolean) =>
    device.run((p) => p.setDpiEnabled(index, value), true, false, 'tlw.performance')
  const setColor = (index: number, value: string | null) =>
    value
      ? device.run((p) => p.setDpiColor(index, value), true, false, 'tlw.performance')
      : undefined
  return { stages, maxDpi, rates: VERIFIED_RATES, save, select, setRate, setEnabled, setColor }
})
