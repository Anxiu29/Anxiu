import type { KeyboardDevice } from '@/application/ports'
import type { DeviceCapabilities, DeviceInfo, KeyboardConfiguration, KeyboardMode, KeyAssignment, KeyPosition, KeyboardProfile } from '@/domain/keyboard'
import { cloneAssignments } from '@/domain/keyboard'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import type { MatrixKeyInput } from '@/domain/layout'
import type { CapabilityDescriptor } from '@/domain/capabilities'
import type { DefaultKeymapResolver } from './DefaultKeymapResolver'
import { cloneLightingSettings, DEFAULT_LIGHTING_SETTINGS, type CustomKeyLighting, type LightingSettings } from '@/domain/lighting'
import { cloneAdvancedKeySettings, type AdvancedKeySettings } from '@/domain/advancedKey'
import { cloneMacroSettings, createEmptyMacro, type MacroSettings } from '@/domain/macro'
import { DEFAULT_PERFORMANCE_SETTINGS, type KeyPerformanceSettings, type PollingRate } from '@/domain/performance'

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
  readonly customLighting = { getCustomLighting: (sourceCodes: number[]) => this.getCustomLighting(sourceCodes), setCustomLighting: (items: CustomKeyLighting[]) => this.setCustomLighting(items), saveCustomLighting: () => this.saveCustomLighting() }
  readonly advancedKey = { getAdvancedKey: (sourceCode: number) => this.getAdvancedKey(sourceCode), getAdvancedKeyTypes: (sourceCodes: number[]) => this.getAdvancedKeyTypes(sourceCodes), setAdvancedKey: (settings: Exclude<AdvancedKeySettings, { type: 'none' }>) => this.setAdvancedKey(settings), deleteAdvancedKey: (sourceCode: number) => this.deleteAdvancedKey(sourceCode) }
  readonly macro = { getMacro: (sourceCode: number) => this.getMacro(sourceCode), setMacro: (settings: MacroSettings) => this.setMacro(settings), deleteMacroBinding: (sourceCode: number) => this.deleteMacroBinding(sourceCode) }
  readonly performance = {
    getPerformance: (sourceCode: number) => this.getPerformance(sourceCode),
    getPerformances: (sourceCodes: number[]) => this.getPerformances(sourceCodes),
    setPerformance: (settings: KeyPerformanceSettings) => this.setPerformance(settings),
    getPollingRate: () => this.getPollingRate(),
    setPollingRate: (rate: PollingRate) => this.setPollingRate(rate),
    getTravelMatrix: () => this.getTravelMatrix(),
    startCalibration: () => this.startCalibration(),
    finishCalibration: () => this.finishCalibration(),
  }
  private readonly capabilities: DeviceCapabilities
  private currentMode: KeyboardMode = 'win'
  private lightingSettings = cloneLightingSettings(DEFAULT_LIGHTING_SETTINGS)
  private readonly customLightingColors = new Map<number, string>()
  private readonly advancedKeys = new Map<number, AdvancedKeySettings>()
  private readonly macros = new Map<number, MacroSettings>()
  private readonly performanceSettings = new Map<number, KeyPerformanceSettings>()
  private pollingRate: PollingRate = 1000
  private calibrationActive = false
  // 全局触发与死区在真机中由 0x29 单独保存，不能错误地挂在某一个物理键上。
  private globalPerformance = {
    globalActuation: DEFAULT_PERFORMANCE_SETTINGS.globalActuation,
    pressDeadZone: DEFAULT_PERFORMANCE_SETTINGS.pressDeadZone,
    releaseDeadZone: DEFAULT_PERFORMANCE_SETTINGS.releaseDeadZone,
  }
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
  async restoreFactory() { await this.wait(); const defaults = this.defaultsFor(this.currentMode); this.working = cloneAssignments(defaults); this.stored = cloneAssignments(defaults); this.macros.clear(); this.performanceSettings.clear(); this.globalPerformance = { globalActuation: DEFAULT_PERFORMANCE_SETTINGS.globalActuation, pressDeadZone: DEFAULT_PERFORMANCE_SETTINGS.pressDeadZone, releaseDeadZone: DEFAULT_PERFORMANCE_SETTINGS.releaseDeadZone }; this.pollingRate = 1000; this.calibrationActive = false; this.customLightingColors.clear() }
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
  async getCustomLighting(sourceCodes: number[]) { await this.wait(); return sourceCodes.map((sourceCode) => ({ sourceCode, color: this.customLightingColors.get(sourceCode) ?? '#000000' })) }
  async setCustomLighting(items: CustomKeyLighting[]) { await this.wait(); items.forEach((item) => this.customLightingColors.set(item.sourceCode, item.color.toUpperCase())) }
  async saveCustomLighting() { await this.wait() }
  async getAdvancedKey(sourceCode: number): Promise<AdvancedKeySettings> { await this.wait(); return cloneAdvancedKeySettings(this.advancedKeys.get(sourceCode) ?? { type: 'none', sourceCode }) }
  async getAdvancedKeyTypes(sourceCodes: number[]) { await this.wait(); return Object.fromEntries(sourceCodes.flatMap((sourceCode) => { const type = this.advancedKeys.get(sourceCode)?.type; return type && type !== 'none' ? [[sourceCode, type]] : [] })) }
  async setAdvancedKey(settings: Exclude<AdvancedKeySettings, { type: 'none' }>) { await this.wait(); this.advancedKeys.set(settings.sourceCode, cloneAdvancedKeySettings(settings)) }
  async deleteAdvancedKey(sourceCode: number) { await this.wait(); this.advancedKeys.delete(sourceCode) }
  async getMacro(sourceCode: number) {
    await this.wait()
    const stored = this.macros.get(sourceCode)
    const value = cloneMacroSettings(stored ?? createEmptyMacro(0))
    return { ...value, storedActionCount: value.actions.length, actionsAvailable: true }
  }
  async setMacro(settings: MacroSettings) {
    await this.wait()
    // 宏正文属于固定槽位；多个物理键可以保存同一个 index，并共享同一套动作。
    for (const [sourceCode, macro] of this.macros) if (macro.index === settings.index) this.macros.set(sourceCode, cloneMacroSettings({ ...settings, sourceCode }))
    this.macros.set(settings.sourceCode, cloneMacroSettings(settings))
  }
  async deleteMacroBinding(sourceCode: number) { await this.wait(); this.macros.delete(sourceCode) }
  async getPerformance(sourceCode: number) {
    await this.wait()
    return { sourceCode, ...DEFAULT_PERFORMANCE_SETTINGS, ...this.performanceSettings.get(sourceCode), ...this.globalPerformance }
  }
  async getPerformances(sourceCodes: number[]) {
    await this.wait()
    return sourceCodes.map((sourceCode) => ({ sourceCode, ...DEFAULT_PERFORMANCE_SETTINGS, ...this.performanceSettings.get(sourceCode), ...this.globalPerformance }))
  }
  async setPerformance(settings: KeyPerformanceSettings) {
    await this.wait()
    if (settings.mode === 'global') {
      this.globalPerformance = { globalActuation: settings.globalActuation, pressDeadZone: settings.pressDeadZone, releaseDeadZone: settings.releaseDeadZone }
    }
    this.performanceSettings.set(settings.sourceCode, { ...settings })
  }
  async getPollingRate() { await this.wait(); return this.pollingRate }
  async setPollingRate(rate: PollingRate) { await this.wait(); this.pollingRate = rate; return rate }
  async getTravelMatrix() {
    await this.wait()
    // 演示模式生成平滑变化，便于在没有真机时检查实时行程 UI。
    const phase = (Date.now() % 2400) / 2400 * Math.PI * 2
    return Array.from({ length: 6 }, (_, row) => Array.from({ length: 21 }, (_, column) => Math.max(0, Math.sin(phase + (row * 21 + column) * 0.07)) * 4))
  }
  async startCalibration() { await this.wait(); this.calibrationActive = true }
  async finishCalibration() { await this.wait(); this.calibrationActive = false }
  close() {}

  private defaultsFor(mode: KeyboardMode) {
    return this.resolveDefaultKeymap({ mode, positions: this.positions, layers: this.capabilities.layers, keyCatalog: this.keyCatalog })
  }
}
