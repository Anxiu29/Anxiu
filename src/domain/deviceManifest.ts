export type DeviceCapabilityId =
  | 'device-profile'
  | 'keymap'
  | 'configuration'
  | 'factory-reset'
  | 'system-mode'
  | 'configuration-switch'
  | 'lighting'
  | 'custom-lighting'
  | 'advanced-key'
  | 'performance'
  | 'macro'
  | 'firmware-update'

export interface HidDeviceIdentity {
  vendorId: number
  productIds: readonly number[]
  usagePage?: number
  usage?: number
}

/** 声明设备是什么、如何识别以及支持什么；不包含运行时代码。 */
export interface DeviceManifest {
  id: string
  displayName: string
  protocolId: string
  transportId: string
  capabilities: readonly DeviceCapabilityId[]
  hid?: HidDeviceIdentity
}
