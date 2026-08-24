import { StaticCapabilityDescriptor } from '@/domain/capabilities'
import { C98_DEVICE } from './device'

export const C98_CAPABILITIES = new StaticCapabilityDescriptor('rk-c98-v1', {
  layers: C98_DEVICE.layers,
  remap: true,
  restoreFactory: true,
  lighting: true,
  customLighting: true,
  advancedKey: true,
  performance: true,
  pollingRates: [125, 250, 500, 1000, 2000, 4000, 8000],
  travelTest: true,
  calibration: true,
  macro: true,
  macroSlots: 16,
  macroMaxActions: 42,
  layoutRows: C98_DEVICE.matrixRows,
  layoutColumns: C98_DEVICE.matrixColumns,
})
