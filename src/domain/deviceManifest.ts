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
  kind: 'keyboard' | 'mouse'
  protocolFamily: string
  id: string
  displayName: string
  protocolId: string
  transportId: string
  capabilities: readonly DeviceCapabilityId[]
  /** 单一 HID 身份，或 USB / 2.4G 接收器这类不同 VID 的多组身份。 */
  hid?: HidDeviceIdentity | readonly HidDeviceIdentity[]
}
