import type { DeviceTransport, KeyboardDevice } from './ports'
import type { KeyboardConfiguration, KeyboardMode, KeyAssignment, KeyboardProfile } from '@/domain/keyboard'
import { assignmentsEqual, cloneAssignments } from '@/domain/keyboard'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import { DriverError } from './DriverError'
import { saveConfiguration, type SaveProgressObserver } from './SaveConfiguration'

export class DeviceSession {
  // original 是最近一次已验证的设备状态；draft 是允许 UI 修改的工作副本。
  profile?: KeyboardProfile
  original: KeyAssignment[] = []
  draft: KeyAssignment[] = []

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

  async switchConfiguration(configuration: KeyboardConfiguration) {
    if (!this.device.configurationSwitch) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持切换配置', false, { details: { capability: 'configuration-switch', configuration } })
    await this.device.configurationSwitch.switchConfiguration(configuration)
    return this.load()
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
