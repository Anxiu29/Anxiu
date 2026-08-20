import { StaticCapabilityDescriptor } from '@/domain/capabilities'
import { C98_DEVICE } from './device'

export const C98_CAPABILITIES = new StaticCapabilityDescriptor('rk-c98-v1', {
  layers: C98_DEVICE.layers,
  remap: true,
  restoreFactory: true,
  lighting: true,
  advancedKey: true,
  macro: true,
  macroSlots: 16,
  macroMaxActions: 42,
  layoutRows: C98_DEVICE.matrixRows,
  layoutColumns: C98_DEVICE.matrixColumns,
})
