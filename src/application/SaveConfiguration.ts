import type { KeyboardDevice } from './ports'
import { DriverError } from './DriverError'
import type { KeyAssignment, KeyboardProfile } from '@/domain/keyboard'
import { assignmentsEqual, validateAssignments } from '@/domain/keyboard'

export type SavePhase = 'validating' | 'writing' | 'committing' | 'verifying' | 'completed'
export interface SaveProgress { readonly phase: SavePhase; readonly completed: number; readonly total: number }
export interface SaveResult { readonly changedAssignments: number; readonly profile: KeyboardProfile }
export type SaveProgressObserver = (progress: SaveProgress) => void

const identity = (item: KeyAssignment) => `${item.layer}:${item.positionId}`

export async function saveConfiguration(device: KeyboardDevice, profile: KeyboardProfile, original: readonly KeyAssignment[], draft: readonly KeyAssignment[], onProgress: SaveProgressObserver = () => undefined): Promise<SaveResult> {
  onProgress({ phase: 'validating', completed: 0, total: 1 })
  const errors = validateAssignments(profile, [...draft])
  if (errors.length) throw new DriverError('INVALID_CONFIGURATION', errors[0]!, false, { details: { errors } })
  if (!profile.capabilities.remap) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备配置不允许改键', false, { details: { capability: 'keymap' } })
  if (!device.keymap) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持改键', false, { details: { capability: 'keymap' } })
  if (!device.configuration) throw new DriverError('UNSUPPORTED_CAPABILITY', '当前设备不支持保存配置', false, { details: { capability: 'configuration' } })

  const originals = new Map(original.map((item) => [identity(item), item]))
  const changes = draft.filter((item) => originals.get(identity(item))?.keyCode !== item.keyCode)
  if (!changes.length) {
    onProgress({ phase: 'completed', completed: 0, total: 0 })
    return { changedAssignments: 0, profile }
  }

  onProgress({ phase: 'writing', completed: 0, total: changes.length })
  await device.keymap.writeAssignments([...changes])
  onProgress({ phase: 'writing', completed: changes.length, total: changes.length })
  onProgress({ phase: 'committing', completed: 0, total: 1 })
  await device.configuration.save()
  onProgress({ phase: 'committing', completed: 1, total: 1 })
  onProgress({ phase: 'verifying', completed: 0, total: 1 })
  const verified = await device.profile.getProfile()
  if (!assignmentsEqual(verified.assignments, [...draft])) throw new DriverError('VERIFY_FAILED', '写入后的回读配置不一致，编辑草稿已保留', true, { details: { changedAssignments: changes.length } })
  onProgress({ phase: 'completed', completed: 1, total: 1 })
  return {
    changedAssignments: changes.length,
    profile: { ...verified, defaultAssignments: profile.defaultAssignments.map((item) => ({ ...item })) },
  }
}
