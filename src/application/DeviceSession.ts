import type { DeviceTransport, KeyboardDevice } from './ports'
import type { KeyboardConfiguration, KeyboardMode, KeyAssignment, KeyboardProfile } from '@/domain/keyboard'
import { assignmentsEqual, cloneAssignments } from '@/domain/keyboard'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import { DriverError } from './DriverError'
import { saveConfiguration, type SaveProgressObserver } from './SaveConfiguration'
import type { CustomKeyLighting, LightingSettings } from '@/domain/lighting'
import type { AdvancedKeySettings } from '@/domain/advancedKey'
import type { MacroSettings } from '@/domain/macro'
import type { KeyPerformanceSettings, PollingRate } from '@/domain/performance'

const wait = (milliseconds: number) => new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds))
const sameNumbers = (left: readonly number[], right: readonly number[], tolerance = 0) => left.length === right.length
  && left.every((value, index) => Math.abs(value - right[index]!) <= tolerance)

/** 比较“请求写入值”和“设备实际回读值”，防止用旧值覆盖界面后仍提示验证成功。 */
function advancedKeyMatches(expected: Exclude<AdvancedKeySettings, { type: 'none' }>, actual: AdvancedKeySettings) {
  if (expected.type !== actual.type || expected.sourceCode !== actual.sourceCode) return false
  // 此类固件的布局读取无法返回 DKS 写入行程；模式、四个键值和 TRPS 仍可可靠回读验证。
  if (expected.type === 'dks' && actual.type === 'dks') return sameNumbers(expected.keyCodes, actual.keyCodes)
    && sameNumbers(expected.triggers, actual.triggers)
  if (expected.type === 'mpt' && actual.type === 'mpt') return sameNumbers(expected.keyCodes, actual.keyCodes)
    && sameNumbers(expected.travels, actual.travels, 0.001)
  if (expected.type === 'mt' && actual.type === 'mt') return sameNumbers(expected.keyCodes, actual.keyCodes) && expected.delay === actual.delay
  if (expected.type === 'socd' && actual.type === 'socd') return expected.pairedSourceCode === actual.pairedSourceCode
    && sameNumbers(expected.keyCodes, actual.keyCodes) && expected.mode === actual.mode && expected.delay === actual.delay
  if ((expected.type === 'tgl' && actual.type === 'tgl') || (expected.type === 'end' && actual.type === 'end')) {
    return expected.keyCode === actual.keyCode && expected.delay === actual.delay
  }
  return false
}

export class DeviceSession {
  // original 是最近一次已验证的设备状态；draft 是允许 UI 修改的工作副本。
  profile?: KeyboardProfile
  original: KeyAssignment[] = []
  draft: KeyAssignment[] = []
  // 部分固件的 DB1/DB2 读取返回轴体校准行程，而不是最近写入的 DKS 位置；会话内保留已确认写入值。
  private readonly dksTravelCache = new Map<number, [number, number]>()

  constructor(private readonly device: KeyboardDevice, readonly keyCatalog: KeyCatalog, private readonly transport?: DeviceTransport) {}

  get dirty() { return !assignmentsEqual(this.original, this.draft) }

  async load() {
    // 每次加载都重建两个副本，防止 UI 修改 draft 时污染回读基线。
    this.profile = await this.device.profile.getProfile()
    this.original = cloneAssignments(this.profile.assignments)
    this.draft = cloneAssignments(this.profile.assignments)
    return this.profile
  }

  update(positionId: string, layer: number, keyCode: number, category: KeyAssignment['category']) {
    const item = this.draft.find((assignment) => assignment.positionId === positionId && assignment.layer === layer)
    if (!item) throw new DriverError('INVALID_CONFIGURATION', '找不到待修改的键位', false, { details: { positionId, layer } })
    Object.assign(item, { keyCode, category })
  }

  /** 单次改键用例：更新草稿后立即走统一保存与回读验证事务。 */
  async updateAndSave(positionId: string, layer: number, keyCode: number, category: KeyAssignment['category'], onProgress?: SaveProgressObserver) {
    this.update(positionId, layer, keyCode, category)
    return this.save(onProgress)
  }

  /** 只修改草稿，供后续右键“单键恢复默认”复用。 */
  restoreKeyToDefault(positionId: string, layer: number) {
    this.applyKeyDefaults((item) => item.positionId === positionId && item.layer === layer)
  }

  /** 右键单键恢复用例：只替换目标键位，并立即执行写入、保存与回读验证。 */
  async restoreKeyDefaultAndSave(positionId: string, layer: number, onProgress?: SaveProgressObserver) {
    this.restoreKeyToDefault(positionId, layer)
    return this.save(onProgress)
  }

  /** 恢复所有层的键位映射，然后复用正常保存与回读验证事务。 */
  async restoreAllKeyDefaults(onProgress?: SaveProgressObserver) {
    this.applyKeyDefaults(() => true)
    return this.save(onProgress)
  }

  async save(onProgress?: SaveProgressObserver) {
    if (!this.profile) throw new DriverError('INVALID_CONFIGURATION', '尚未读取设备配置')
    const result = await saveConfiguration(this.device, this.profile, this.original, this.draft, onProgress)
    // 只有保存且回读验证成功后，才推进 original 基线并清除 dirty 状态。
    this.profile = result.profile
    this.original = cloneAssignments(result.profile.assignments)
    this.draft = cloneAssignments(result.profile.assignments)
    return result
  }

  async reload() {
    if (!this.device.configuration) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持重新加载配置', false, { details: { capability: 'configuration' } })
    await this.device.configuration.reload()
    return this.load()
  }

  async restoreFactory() {
    if (!this.profile?.capabilities.restoreFactory) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备配置不允许恢复出厂设置', false, { details: { capability: 'factory-reset' } })
    if (!this.device.factoryReset) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持恢复出厂设置', false, { details: { capability: 'factory-reset' } })
    await this.device.factoryReset.restoreFactory()
  }

  async switchMode(mode: KeyboardMode) {
    if (!this.device.systemMode) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持切换系统模式', false, { details: { capability: 'system-mode', mode } })
    await this.device.systemMode.switchMode(mode)
    return this.load()
  }

  /** 向状态层转发设备模式事件，应用层不需要认识具体的 HID 通知码。 */
  onModeChange(listener: (mode: KeyboardMode) => void) {
    return this.device.systemMode?.onModeChange?.(listener) ?? (() => undefined)
  }

  async switchConfiguration(configuration: KeyboardConfiguration) {
    if (!this.device.configurationSwitch) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持切换配置', false, { details: { capability: 'configuration-switch', configuration } })
    await this.device.configurationSwitch.switchConfiguration(configuration)
    return this.load()
  }

  /** 与模式事件一样，只暴露领域中的配置编号，不向状态层泄漏 0x70。 */
  onConfigurationChange(listener: (configuration: KeyboardConfiguration) => void) {
    return this.device.configurationSwitch?.onConfigurationChange?.(listener) ?? (() => undefined)
  }

  async getLighting() {
    if (!this.device.lighting) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持灯光设置', false, { details: { capability: 'lighting' } })
    return this.device.lighting.getLighting()
  }

  /** 灯光采用即时写入，并以设备回读值作为最终状态，避免滑块显示与固件实际值不同。 */
  async updateLighting(settings: LightingSettings) {
    if (!this.device.lighting) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持灯光设置', false, { details: { capability: 'lighting' } })
    await this.device.lighting.setLighting(settings)
    return this.device.lighting.getLighting()
  }

  async getCustomLighting(sourceCodes: number[]) {
    if (!this.device.customLighting) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持逐键自定义灯光', false, { details: { capability: 'custom-lighting' } })
    return this.device.customLighting.getCustomLighting(sourceCodes)
  }

  /** 逐键颜色先分批写入 RAM，全部完成后只保存一次，再全量回读验证。 */
  async updateCustomLighting(items: CustomKeyLighting[]) {
    if (!this.device.customLighting) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持逐键自定义灯光', false, { details: { capability: 'custom-lighting' } })
    await this.device.customLighting.setCustomLighting(items)
    await this.device.customLighting.saveCustomLighting()
    const verified = await this.device.customLighting.getCustomLighting(items.map((item) => item.sourceCode))
    const actual = new Map(verified.map((item) => [item.sourceCode, item.color.toUpperCase()]))
    const failed = items.find((item) => actual.get(item.sourceCode) !== item.color.toUpperCase())
    if (failed) throw new DriverError('VERIFY_FAILED', `按键 0x${failed.sourceCode.toString(16).toUpperCase()} 的自定义颜色回读不一致`, true)
    return verified
  }

  async getAdvancedKey(sourceCode: number) {
    if (!this.device.advancedKey) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持高级键', false, { details: { capability: 'advanced-key' } })
    const settings = await this.device.advancedKey.getAdvancedKey(sourceCode)
    const cachedTravels = this.dksTravelCache.get(sourceCode)
    return settings.type === 'dks' && cachedTravels
      ? { ...settings, travels: [...cachedTravels] as [number, number] }
      : settings
  }

  async getAdvancedKeyTypes(sourceCodes: number[]) {
    if (!this.device.advancedKey) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持高级键', false, { details: { capability: 'advanced-key' } })
    return this.device.advancedKey.getAdvancedKeyTypes(sourceCodes)
  }

  /** 高级键写入后等待固件落盘并回读；回读不一致时保留 UI 草稿并明确报错。 */
  async updateAdvancedKey(settings: Exclude<AdvancedKeySettings, { type: 'none' }>) {
    if (!this.device.advancedKey) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持高级键', false, { details: { capability: 'advanced-key' } })
    await this.device.advancedKey.setAdvancedKey(settings)
    let verified: AdvancedKeySettings = { type: 'none', sourceCode: settings.sourceCode }
    // 0x26 的响应只表示报文已接收，布局参数可能稍后才更新，因此允许短暂重试。
    for (const delay of [60, 100, 160]) {
      await wait(delay)
      verified = await this.device.advancedKey.getAdvancedKey(settings.sourceCode)
      if (advancedKeyMatches(settings, verified)) {
        if (settings.type === 'dks' && verified.type === 'dks') {
          const travels: [number, number] = [...settings.travels]
          this.dksTravelCache.set(settings.sourceCode, travels)
          // 真机功能已经证明 0x26 接受了行程；布局读取却返回校准总行程，因此 UI 保留本次写入值。
          return { ...verified, travels }
        }
        return verified
      }
    }
    throw new DriverError('VERIFY_FAILED', '高级键设置未被设备完整接受：模式、键值或触发点回读不一致', true, {
      details: { expected: settings, actual: verified },
    })
  }

  async deleteAdvancedKey(sourceCode: number) {
    if (!this.device.advancedKey) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持高级键', false, { details: { capability: 'advanced-key' } })
    await this.device.advancedKey.deleteAdvancedKey(sourceCode)
    this.dksTravelCache.delete(sourceCode)
    return this.device.advancedKey.getAdvancedKey(sourceCode)
  }

  async getPerformance(sourceCode: number) {
    if (!this.device.performance) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持性能设置', false, { details: { capability: 'performance' } })
    return this.device.performance.getPerformance(sourceCode)
  }

  /** 批量读取由设备适配器合并同类 Layout 请求，供键盘矩阵展示真实参数。 */
  async getPerformances(sourceCodes: number[]) {
    if (!this.device.performance) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持性能设置', false, { details: { capability: 'performance' } })
    return this.device.performance.getPerformances(sourceCodes)
  }

  async updatePerformance(settings: KeyPerformanceSettings) {
    if (!this.device.performance) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持性能设置', false, { details: { capability: 'performance' } })
    await this.device.performance.setPerformance(settings)
    let verified = await this.device.performance.getPerformance(settings.sourceCode)
    // 固件的布局区和全局参数区可能异步落盘，短暂重读避免把已成功写入误报为失败。
    for (const delay of [0, 60, 100]) {
      if (delay) {
        await wait(delay)
        verified = await this.device.performance.getPerformance(settings.sourceCode)
      }
      const same = verified.mode === settings.mode
        && (settings.mode !== 'global' || sameNumbers([verified.globalActuation, verified.pressDeadZone, verified.releaseDeadZone], [settings.globalActuation, settings.pressDeadZone, settings.releaseDeadZone], 0.001))
        && (settings.mode !== 'single' || sameNumbers([verified.actuation, verified.pressDeadZone, verified.releaseDeadZone], [settings.actuation, settings.pressDeadZone, settings.releaseDeadZone], 0.001))
        && (settings.mode !== 'rapid-trigger' || sameNumbers([verified.actuation, verified.rapidPress, verified.rapidRelease, verified.pressDeadZone, verified.releaseDeadZone], [settings.actuation, settings.rapidPress, settings.rapidRelease, settings.pressDeadZone, settings.releaseDeadZone], 0.001))
      if (same) return verified
    }
    throw new DriverError('VERIFY_FAILED', '性能设置未被设备完整接受', true, { details: { expected: settings, actual: verified } })
  }

  async getPollingRate() {
    if (!this.device.performance) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持回报率设置', false)
    return this.device.performance.getPollingRate()
  }

  async updatePollingRate(rate: PollingRate) {
    if (!this.device.performance) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持回报率设置', false)
    const actual = await this.device.performance.setPollingRate(rate)
    if (actual !== rate) throw new DriverError('VERIFY_FAILED', `设备回报率为 ${actual} Hz，未接受 ${rate} Hz`, true)
    return actual
  }

  async getTravelMatrix() {
    if (!this.device.performance) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持行程测试', false)
    return this.device.performance.getTravelMatrix()
  }

  async startCalibration() {
    if (!this.device.performance) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持键盘校准', false)
    await this.device.performance.startCalibration()
  }

  async finishCalibration() {
    if (!this.device.performance) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持键盘校准', false)
    await this.device.performance.finishCalibration()
  }

  async getMacro(sourceCode: number) {
    if (!this.device.macro) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持宏设置', false, { details: { capability: 'macro' } })
    return this.device.macro.getMacro(sourceCode)
  }

  /** 宏写入后按绑定物理键回读，保证动作序列和触发模式以设备实际值为准。 */
  async updateMacro(settings: MacroSettings) {
    if (!this.device.macro) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持宏设置', false, { details: { capability: 'macro' } })
    await this.device.macro.setMacro(settings)
    const verified = await this.device.macro.getMacro(settings.sourceCode)
    const metadataMatches = verified.sourceCode === settings.sourceCode
      && verified.index === settings.index
      && verified.mode === settings.mode
      && verified.repeatCount === settings.repeatCount
      && verified.repeatDelay === settings.repeatDelay
    if (!metadataMatches) {
      // 不能用设备回读值静默覆盖 UI，否则“写入 3、回读 1”看起来仍像保存成功。
      throw new DriverError('VERIFY_FAILED', `宏设置未被设备完整接受：重复次数写入 ${settings.repeatCount}，设备回读 ${verified.repeatCount}`, true, {
        details: {
          expected: { sourceCode: settings.sourceCode, index: settings.index, mode: settings.mode, repeatCount: settings.repeatCount, repeatDelay: settings.repeatDelay },
          actual: { sourceCode: verified.sourceCode, index: verified.index, mode: verified.mode, repeatCount: verified.repeatCount, repeatDelay: verified.repeatDelay },
        },
      })
    }
    return verified
  }

  async deleteMacroBinding(sourceCode: number) {
    if (!this.device.macro) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持宏设置', false, { details: { capability: 'macro' } })
    await this.device.macro.deleteMacroBinding(sourceCode)
  }

  private applyKeyDefaults(matches: (item: KeyAssignment) => boolean) {
    if (!this.profile) throw new DriverError('INVALID_CONFIGURATION', '尚未读取设备配置')
    // 默认值按“层 + 物理位置”索引，同一个物理键在不同 Fn 层可以有不同默认功能。
    const defaults = new Map(this.profile.defaultAssignments.map((item) => [`${item.layer}:${item.positionId}`, item]))
    let matched = false
    this.draft = this.draft.map((item) => {
      if (!matches(item)) return item
      matched = true
      const defaultAssignment = defaults.get(`${item.layer}:${item.positionId}`)
      if (!defaultAssignment) throw new DriverError('INVALID_CONFIGURATION', '设备没有提供该键位的默认映射', false, { details: { positionId: item.positionId, layer: item.layer } })
      return { ...defaultAssignment }
    })
    if (!matched) throw new DriverError('INVALID_CONFIGURATION', '找不到要恢复的键位')
  }

  async close() {
    this.device.close()
    await this.transport?.close()
  }
}
