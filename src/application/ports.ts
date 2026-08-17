import type { KeyboardConfiguration, KeyboardMode, KeyAssignment, KeyboardProfile } from '@/domain/keyboard'

/** 应用核心依赖的设备传输端口；WebHID、WebUSB 或桌面桥接均可实现。 */
export interface DeviceTransport {
  readonly connected: boolean
  readonly productName: string
  readonly vendorId: number
  readonly productId: number
  requestDevice(): Promise<void>
  reconnectAuthorized(): Promise<boolean>
  open(): Promise<void>
  close(): Promise<void>
  send(report: Uint8Array): Promise<void>
  onReport(listener: (data: Uint8Array) => void): () => void
  onDisconnect(listener: () => void): () => void
}

export interface DeviceProfileCapability {
  getProfile(): Promise<KeyboardProfile>
}

export interface KeymapCapability {
  writeAssignments(assignments: KeyAssignment[]): Promise<void>
}

export interface ConfigurationCapability {
  save(): Promise<void>
  reload(): Promise<void>
}

export interface FactoryResetCapability {
  restoreFactory(): Promise<void>
}

export interface SystemModeCapability {
  switchMode(mode: KeyboardMode): Promise<void>
}

export interface ConfigurationSwitchCapability {
  switchConfiguration(configuration: KeyboardConfiguration): Promise<void>
}

/** 协议适配器按能力组合；未支持的能力保持 undefined。 */
export interface KeyboardDevice {
  readonly profile: DeviceProfileCapability
  readonly keymap?: KeymapCapability
  readonly configuration?: ConfigurationCapability
  readonly factoryReset?: FactoryResetCapability
  readonly systemMode?: SystemModeCapability
  readonly configurationSwitch?: ConfigurationSwitchCapability
  close(): void
}
