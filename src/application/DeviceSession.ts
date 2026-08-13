import type { KeyboardProtocol } from '@/protocol/KeyboardProtocol'
import type { HidTransport } from '@/transport/HidTransport'
import type { KeyAssignment, KeyboardProfile } from '@/domain/keyboard'
import { assignmentsEqual, cloneAssignments, validateAssignments } from '@/domain/keyboard'

export class DeviceSession {
  profile?: KeyboardProfile
  original: KeyAssignment[] = []
  draft: KeyAssignment[] = []

  constructor(private readonly protocol: KeyboardProtocol, private readonly transport?: HidTransport) {}

  get dirty() { return !assignmentsEqual(this.original, this.draft) }

  async load() {
    this.profile = await this.protocol.getProfile()
    this.original = cloneAssignments(this.profile.assignments)
    this.draft = cloneAssignments(this.profile.assignments)
    return this.profile
  }

  update(positionId: string, layer: number, keyCode: number, category: KeyAssignment['category']) {
    const item = this.draft.find((assignment) => assignment.positionId === positionId && assignment.layer === layer)
    if (!item) throw new Error('找不到待修改的键位')
    Object.assign(item, { keyCode, category })
  }

  async save() {
    if (!this.profile) throw new Error('尚未读取设备配置')
    const errors = validateAssignments(this.profile, this.draft)
    if (errors.length) throw new Error(errors[0])
    await this.protocol.writeAssignments(this.draft)
    await this.protocol.save()
    const verified = await this.protocol.getProfile()
    if (!assignmentsEqual(verified.assignments, this.draft)) throw new Error('写入后的回读配置不一致，草稿已保留')
    this.profile = verified
    this.original = cloneAssignments(verified.assignments)
    this.draft = cloneAssignments(verified.assignments)
  }

  async reload() { await this.protocol.reload(); return this.load() }
  async restoreFactory() { await this.protocol.restoreFactory(); return this.load() }
  async close() { this.protocol.close(); await this.transport?.close() }
}
