import type { DeviceTransport, KeyboardDevice } from './ports'
import type { KeyAssignment, KeyboardProfile } from '@/domain/keyboard'
import { assignmentsEqual, cloneAssignments } from '@/domain/keyboard'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import { DriverError } from './DriverError'
import { saveConfiguration, type SaveProgressObserver } from './SaveConfiguration'

export class DeviceSession {
  profile?: KeyboardProfile
  original: KeyAssignment[] = []
  draft: KeyAssignment[] = []

  constructor(private readonly device: KeyboardDevice, readonly keyCatalog: KeyCatalog, private readonly transport?: DeviceTransport) {}

  get dirty() { return !assignmentsEqual(this.original, this.draft) }

  async load() {
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

  async save(onProgress?: SaveProgressObserver) {
    if (!this.profile) throw new DriverError('INVALID_CONFIGURATION', '尚未读取设备配置')
    const result = await saveConfiguration(this.device, this.profile, this.original, this.draft, onProgress)
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

  async close() {
    this.device.close()
    await this.transport?.close()
  }
}
