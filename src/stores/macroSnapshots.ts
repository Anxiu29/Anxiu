import type { KeyboardConfiguration, KeyboardMode, KeyboardProfile } from '@/domain/keyboard'
import { cloneMacroSettings, validateMacroSettings, type MacroSettings } from '@/domain/macro'

const STORAGE_PREFIX = 'anxiu:macro-snapshot:v1'

export interface MacroSnapshotContext {
  driverId?: string
  profile: KeyboardProfile
  configuration: KeyboardConfiguration
  mode: KeyboardMode
}

function snapshotKey(context: MacroSnapshotContext, sourceCode: number) {
  const device = context.profile.device
  // SN 最稳定；演示设备或无 SN 固件退回 VID/PID，仍与配置槽和系统模式隔离。
  const identity = device.serialNumber?.trim() || `${device.vendorId.toString(16)}-${device.productId.toString(16)}`
  return [STORAGE_PREFIX, context.driverId ?? 'unknown', identity, context.configuration, context.mode, sourceCode].join(':')
}

/**
 * 方案 1.0.7 只能可靠回读宏元数据，因此把本驱动成功写入的动作正文保存在浏览器。
 * 快照不是设备真值：恢复时必须用设备回读的槽位和动作数再次校验。
 */
export function saveMacroSnapshot(context: MacroSnapshotContext, settings: MacroSettings) {
  if (typeof localStorage === 'undefined') return
  try {
    const snapshot = cloneMacroSettings({ ...settings, storedActionCount: settings.actions.length, actionsAvailable: true })
    localStorage.setItem(snapshotKey(context, settings.sourceCode), JSON.stringify(snapshot))
  } catch {
    // 隐私模式或存储配额不足不能让已经成功的设备写入被误报为失败。
  }
}

export function restoreMacroSnapshot(context: MacroSnapshotContext, deviceSettings: MacroSettings): MacroSettings {
  if (typeof localStorage === 'undefined' || (deviceSettings.storedActionCount ?? 0) === 0) return deviceSettings
  try {
    const raw = localStorage.getItem(snapshotKey(context, deviceSettings.sourceCode))
    if (!raw) return deviceSettings
    const snapshot = JSON.parse(raw) as MacroSettings
    const expectedCount = deviceSettings.storedActionCount ?? 0
    if (validateMacroSettings(snapshot).length || snapshot.index !== deviceSettings.index || snapshot.actions.length !== expectedCount) return deviceSettings
    // 模式、次数和延迟仍以设备回读为准，只从快照补回协议未返回的动作正文。
    return { ...deviceSettings, actions: cloneMacroSettings(snapshot).actions, actionsAvailable: true }
  } catch {
    return deviceSettings
  }
}

/**
 * 列出当前设备/配置/系统模式下由本驱动保存过的宏。
 * 这份索引只用于 UI 角标和快速定位；点击键帽后仍以设备 0x21 回读结果校验。
 */
export function listMacroSnapshots(context: MacroSnapshotContext): MacroSettings[] {
  if (typeof localStorage === 'undefined') return []
  const snapshots: MacroSettings[] = []
  for (const position of context.profile.positions) {
    try {
      const raw = localStorage.getItem(snapshotKey(context, position.sourceCode))
      if (!raw) continue
      const snapshot = JSON.parse(raw) as MacroSettings
      if (snapshot.sourceCode !== position.sourceCode || validateMacroSettings(snapshot).length || !snapshot.actions.length) continue
      snapshots.push(cloneMacroSettings(snapshot))
    } catch {
      // 单条旧快照损坏时忽略该条，不能让整个宏页面无法打开。
    }
  }
  return snapshots
}
