import type { KeyboardDevice } from './ports'
import { DriverError } from './DriverError'
import type { KeyAssignment, KeyboardProfile } from '@/domain/keyboard'
import { assignmentsEqual, validateAssignments } from '@/domain/keyboard'

export type SavePhase = 'validating' | 'writing' | 'committing' | 'verifying' | 'completed'
export interface SaveProgress { readonly phase: SavePhase; readonly completed: number; readonly total: number }
export interface SaveResult { readonly changedAssignments: number; readonly profile: KeyboardProfile }
export type SaveProgressObserver = (progress: SaveProgress) => void

const identity = (item: KeyAssignment) => `${item.layer}:${item.positionId}`

/**
 * 完整的保存事务：校验 -> 只写差异 -> 通知固件持久化 -> 整表回读验证。
 * 把流程放在应用层，是因为协议只应该提供“写键位/保存/读取”这些原子能力，
 * 不应该决定产品层面的事务顺序与失败策略。
 */
export async function saveConfiguration(device: KeyboardDevice, profile: KeyboardProfile, original: readonly KeyAssignment[], draft: readonly KeyAssignment[], onProgress: SaveProgressObserver = () => undefined): Promise<SaveResult> {
  // 写入前先验证整份草稿，避免把缺层、缺键或重复键位的半成品发送给设备。
  onProgress({ phase: 'validating', completed: 0, total: 1 })
  const errors = validateAssignments(profile, [...draft])
  if (errors.length) throw new DriverError('INVALID_CONFIGURATION', errors[0]!, false, { details: { errors } })
  if (!profile.capabilities.remap) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备配置不允许改键', false, { details: { capability: 'keymap' } })
  if (!device.keymap) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持改键', false, { details: { capability: 'keymap' } })
  if (!device.configuration) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持保存配置', false, { details: { capability: 'configuration' } })

  // 使用 layer + positionId 比较，不依赖设备返回数组的排列顺序。
  const originals = new Map(original.map((item) => [identity(item), item]))
  const changes = draft.filter((item) => originals.get(identity(item))?.keyCode !== item.keyCode)
  if (!changes.length) {
    onProgress({ phase: 'completed', completed: 0, total: 0 })
    return { changedAssignments: 0, profile }
  }

  // 设备写入完成不等于保存成功；必须先提交，再重新读取设备作为最终事实来源。
  onProgress({ phase: 'writing', completed: 0, total: changes.length })
  await device.keymap.writeAssignments([...changes])
  onProgress({ phase: 'writing', completed: changes.length, total: changes.length })
  onProgress({ phase: 'committing', completed: 0, total: 1 })
  await device.configuration.save()
  onProgress({ phase: 'committing', completed: 1, total: 1 })
  onProgress({ phase: 'verifying', completed: 0, total: 1 })
  const verified = await device.profile.getProfile()
  // 验证失败时不覆盖 DeviceSession 中的 draft，用户可以看到并重试原编辑内容。
  if (!assignmentsEqual(verified.assignments, [...draft])) throw new DriverError('VERIFY_FAILED', '写入后的回读配置不一致，编辑草稿已保留', true, { details: { changedAssignments: changes.length } })
  onProgress({ phase: 'completed', completed: 1, total: 1 })
  return {
    changedAssignments: changes.length,
    // 默认表属于设备型号基线，不应被当前配置的回读值替换。
    profile: { ...verified, defaultAssignments: profile.defaultAssignments.map((item) => ({ ...item })) },
  }
}
