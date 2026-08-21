import type { KeyboardConfiguration, KeyboardMode, KeyAssignment, KeyboardProfile } from '@/domain/keyboard'
import type { LightingSettings } from '@/domain/lighting'
import type { AdvancedKeySettings } from '@/domain/advancedKey'
import type { MacroSettings } from '@/domain/macro'

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
  /** 监听键盘本体触发的模式变化；返回函数用于随会话解除监听。 */
  onModeChange?(listener: (mode: KeyboardMode) => void): () => void
}

export interface ConfigurationSwitchCapability {
  switchConfiguration(configuration: KeyboardConfiguration): Promise<void>
  /** 监听键盘快捷键触发的配置槽变化。 */
  onConfigurationChange?(listener: (configuration: KeyboardConfiguration) => void): () => void
}

export interface LightingCapability {
  getLighting(): Promise<LightingSettings>
  setLighting(settings: LightingSettings): Promise<void>
}

export interface AdvancedKeyCapability {
  getAdvancedKey(sourceCode: number): Promise<AdvancedKeySettings>
  setAdvancedKey(settings: Exclude<AdvancedKeySettings, { type: 'none' }>): Promise<void>
  deleteAdvancedKey(sourceCode: number): Promise<void>
}

export interface MacroCapability {
  getMacro(sourceCode: number): Promise<MacroSettings>
  setMacro(settings: MacroSettings): Promise<void>
  deleteMacroBinding(sourceCode: number): Promise<void>
}

/** 协议适配器按能力组合；未支持的能力保持 undefined。 */
export interface KeyboardDevice {
  readonly profile: DeviceProfileCapability
  readonly keymap?: KeymapCapability
  readonly configuration?: ConfigurationCapability
  readonly factoryReset?: FactoryResetCapability
  readonly systemMode?: SystemModeCapability
  readonly configurationSwitch?: ConfigurationSwitchCapability
  readonly lighting?: LightingCapability
  readonly advancedKey?: AdvancedKeyCapability
  readonly macro?: MacroCapability
  close(): void
}
