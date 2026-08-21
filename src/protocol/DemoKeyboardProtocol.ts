import type { KeyboardDevice } from '@/application/ports'
import type { DeviceCapabilities, DeviceInfo, KeyboardConfiguration, KeyboardMode, KeyAssignment, KeyPosition, KeyboardProfile } from '@/domain/keyboard'
import { cloneAssignments } from '@/domain/keyboard'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import type { MatrixKeyInput } from '@/domain/layout'
import type { CapabilityDescriptor } from '@/domain/capabilities'
import type { DefaultKeymapResolver } from './DefaultKeymapResolver'
import { cloneLightingSettings, DEFAULT_LIGHTING_SETTINGS, type LightingSettings } from '@/domain/lighting'
import { cloneAdvancedKeySettings, type AdvancedKeySettings } from '@/domain/advancedKey'
import { cloneMacroSettings, createEmptyMacro, type MacroSettings } from '@/domain/macro'

/**
 * 不访问 HID 的内存协议实现。它实现与真机相同的 KeyboardDevice 端口，
 * 因此 UI 和应用用例无需为演示模式增加分支。
 */
export class DemoKeyboardProtocol implements KeyboardDevice {
  private readonly positions: KeyPosition[]
  private readonly initial: KeyAssignment[]
  // working 模拟固件 RAM；stored 模拟执行“保存”后写入的持久化配置。
  private stored: KeyAssignment[]
  private working: KeyAssignment[]
  private wait = () => new Promise((resolve) => setTimeout(resolve, 260))
  readonly profile = { getProfile: () => this.getProfile() }
  readonly keymap = { writeAssignments: (assignments: KeyAssignment[]) => this.writeAssignments(assignments) }
  readonly configuration = { save: () => this.save(), reload: () => this.reload() }
  readonly factoryReset = { restoreFactory: () => this.restoreFactory() }
  readonly systemMode = { switchMode: (mode: KeyboardMode) => this.switchMode(mode) }
  readonly configurationSwitch = { switchConfiguration: (configuration: KeyboardConfiguration) => this.switchConfiguration(configuration) }
  readonly lighting = { getLighting: () => this.getLighting(), setLighting: (settings: LightingSettings) => this.setLighting(settings) }
  readonly advancedKey = { getAdvancedKey: (sourceCode: number) => this.getAdvancedKey(sourceCode), setAdvancedKey: (settings: Exclude<AdvancedKeySettings, { type: 'none' }>) => this.setAdvancedKey(settings), deleteAdvancedKey: (sourceCode: number) => this.deleteAdvancedKey(sourceCode) }
  readonly macro = { getMacro: (sourceCode: number) => this.getMacro(sourceCode), setMacro: (settings: MacroSettings) => this.setMacro(settings), deleteMacroBinding: (sourceCode: number) => this.deleteMacroBinding(sourceCode) }
  private readonly capabilities: DeviceCapabilities
  private currentMode: KeyboardMode = 'win'
  private lightingSettings = cloneLightingSettings(DEFAULT_LIGHTING_SETTINGS)
  private readonly advancedKeys = new Map<number, AdvancedKeySettings>()
  private readonly macros = new Map<number, MacroSettings>()
  constructor(
    private readonly keyCatalog: KeyCatalog,
    demoKeys: readonly MatrixKeyInput[],
    capabilityDescriptor: CapabilityDescriptor,
    private readonly resolveDefaultKeymap: DefaultKeymapResolver,
    private readonly deviceInfo: DeviceInfo,
  ) {
    this.positions = demoKeys.map((key) => ({ ...key, label: this.keyCatalog.get(key.sourceCode).label }))
    this.capabilities = capabilityDescriptor.resolve({ device: this.deviceInfo, protocolVersion: this.deviceInfo.protocolVersion })
    this.initial = this.defaultsFor('win')
    this.stored = cloneAssignments(this.initial)
    this.working = cloneAssignments(this.initial)
  }
  async getProfile(): Promise<KeyboardProfile> {
    await this.wait()
    return { device: { ...this.deviceInfo }, capabilities: this.capabilities, positions: this.positions, mode: this.currentMode, defaultAssignments: cloneAssignments(this.defaultsFor(this.currentMode)), assignments: cloneAssignments(this.working) }
  }
  async writeAssignments(assignments: KeyAssignment[]) {
    await this.wait()
    // 真机允许差异写入，所以演示协议也只合并传入项，不能用局部数组覆盖整张键位表。
    const changes = new Map(assignments.map((item) => [`${item.layer}:${item.positionId}`, item]))
    this.working = this.working.map((item) => ({ ...(changes.get(`${item.layer}:${item.positionId}`) ?? item) }))
  }
  async save() { await this.wait(); this.stored = cloneAssignments(this.working) }
  async reload() { await this.wait(); this.working = cloneAssignments(this.stored) }
  async restoreFactory() { await this.wait(); const defaults = this.defaultsFor(this.currentMode); this.working = cloneAssignments(defaults); this.stored = cloneAssignments(defaults) }
  async switchMode(mode: KeyboardMode) {
    await this.wait()
    this.currentMode = mode
    // WIN/MAC 拥有独立出厂表；切换后重建当前模式的内存与持久化快照。
    const defaults = this.defaultsFor(mode)
    this.working = cloneAssignments(defaults)
    this.stored = cloneAssignments(defaults)
  }
  async switchConfiguration(_configuration: KeyboardConfiguration) { await this.wait() }
  async getLighting() { await this.wait(); return cloneLightingSettings(this.lightingSettings) }
  async setLighting(settings: LightingSettings) { await this.wait(); this.lightingSettings = cloneLightingSettings(settings) }
  async getAdvancedKey(sourceCode: number): Promise<AdvancedKeySettings> { await this.wait(); return cloneAdvancedKeySettings(this.advancedKeys.get(sourceCode) ?? { type: 'none', sourceCode }) }
  async setAdvancedKey(settings: Exclude<AdvancedKeySettings, { type: 'none' }>) { await this.wait(); this.advancedKeys.set(settings.sourceCode, cloneAdvancedKeySettings(settings)) }
  async deleteAdvancedKey(sourceCode: number) { await this.wait(); this.advancedKeys.delete(sourceCode) }
  async getMacro(sourceCode: number) {
    await this.wait()
    const value = cloneMacroSettings(this.macros.get(sourceCode) ?? createEmptyMacro(0, sourceCode))
    return { ...value, storedActionCount: value.actions.length, actionsAvailable: true }
  }
  async setMacro(settings: MacroSettings) {
    await this.wait()
    // 宏正文属于固定槽位；多个物理键可以保存同一个 index，并共享同一套动作。
    for (const [sourceCode, macro] of this.macros) if (macro.index === settings.index) this.macros.set(sourceCode, cloneMacroSettings({ ...settings, sourceCode }))
    this.macros.set(settings.sourceCode, cloneMacroSettings(settings))
  }
  async deleteMacroBinding(sourceCode: number) { await this.wait(); this.macros.delete(sourceCode) }
  close() {}

  private defaultsFor(mode: KeyboardMode) {
    return this.resolveDefaultKeymap({ mode, positions: this.positions, layers: this.capabilities.layers, keyCatalog: this.keyCatalog })
  }
}
