import type { KeyboardConfiguration, KeyboardMode, KeyboardProfile } from '@/domain/keyboard'
import { cloneMacroSettings, EMPTY_MACRO_SOURCE, validateMacroSettings, type MacroSettings } from '@/domain/macro'

const LEGACY_STORAGE_PREFIX = 'anxiu:macro-snapshot:v1'
const STORAGE_PREFIX = 'anxiu:macro-slot:v2'

export interface MacroSnapshotContext {
  driverId?: string
  profile: KeyboardProfile
  configuration: KeyboardConfiguration
  mode: KeyboardMode
}

function contextParts(context: MacroSnapshotContext) {
  const device = context.profile.device
  const identity = device.serialNumber?.trim() || `${device.vendorId.toString(16)}-${device.productId.toString(16)}`
  return [context.driverId ?? 'unknown', identity, context.configuration, context.mode]
}

const slotKey = (context: MacroSnapshotContext, index: number) => [STORAGE_PREFIX, ...contextParts(context), index].join(':')
const legacyKey = (context: MacroSnapshotContext, sourceCode: number) => [LEGACY_STORAGE_PREFIX, ...contextParts(context), sourceCode].join(':')

function normalizeSnapshot(settings: MacroSettings): MacroSettings {
  const bindings = [...new Set(settings.boundSourceCodes ?? (settings.sourceCode === EMPTY_MACRO_SOURCE ? [] : [settings.sourceCode]))]
  return cloneMacroSettings({ ...settings, sourceCode: bindings[0] ?? EMPTY_MACRO_SOURCE, boundSourceCodes: bindings, storedActionCount: settings.actions.length, actionsAvailable: true })
}

/** 宏正文按 M1~M16 槽位保存；绑定键只是该槽位的一个列表。 */
export function saveMacroSnapshot(context: MacroSnapshotContext, settings: MacroSettings) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(slotKey(context, settings.index), JSON.stringify(normalizeSnapshot(settings))) }
  catch { /* 浏览器拒绝存储不能让已经成功的设备写入被误报为失败。 */ }
}

export function restoreMacroSnapshot(context: MacroSnapshotContext, deviceSettings: MacroSettings): MacroSettings {
  if (typeof localStorage === 'undefined' || (deviceSettings.storedActionCount ?? 0) === 0) return deviceSettings
  try {
    const raw = localStorage.getItem(slotKey(context, deviceSettings.index)) ?? localStorage.getItem(legacyKey(context, deviceSettings.sourceCode))
    if (!raw) return deviceSettings
    const snapshot = normalizeSnapshot(JSON.parse(raw) as MacroSettings)
    const expectedCount = deviceSettings.storedActionCount ?? 0
    if (validateMacroSettings(snapshot).length || snapshot.index !== deviceSettings.index || snapshot.actions.length !== expectedCount) return deviceSettings
    const bindings = [...new Set([...(snapshot.boundSourceCodes ?? []), deviceSettings.sourceCode])]
    return { ...deviceSettings, boundSourceCodes: bindings, actions: snapshot.actions, actionsAvailable: true }
  } catch { return deviceSettings }
}

/** 首次读取 v2 槽位；没有 v2 时把旧版按物理键保存的多份 M1 合并成一份槽位。 */
export function listMacroSnapshots(context: MacroSnapshotContext): MacroSettings[] {
  if (typeof localStorage === 'undefined') return []
  const slotCount = context.profile.capabilities.macroSlots ?? 16
  const slots = new Map<number, MacroSettings>()
  for (let index = 0; index < slotCount; index++) {
    try {
      const raw = localStorage.getItem(slotKey(context, index))
      if (!raw) continue
      const snapshot = normalizeSnapshot(JSON.parse(raw) as MacroSettings)
      if (!validateMacroSettings(snapshot).length && snapshot.actions.length) slots.set(index, snapshot)
    } catch { /* 忽略损坏的单个槽位。 */ }
  }
  for (const position of context.profile.positions) {
    try {
      const raw = localStorage.getItem(legacyKey(context, position.sourceCode))
      if (!raw) continue
      const legacy = normalizeSnapshot(JSON.parse(raw) as MacroSettings)
      if (validateMacroSettings(legacy).length || !legacy.actions.length) continue
      const existing = slots.get(legacy.index)
      if (existing) existing.boundSourceCodes = [...new Set([...(existing.boundSourceCodes ?? []), position.sourceCode])]
      else slots.set(legacy.index, { ...legacy, sourceCode: position.sourceCode, boundSourceCodes: [position.sourceCode] })
    } catch { /* 旧快照仅用于一次性兼容。 */ }
  }
  for (const snapshot of slots.values()) saveMacroSnapshot(context, snapshot)
  return [...slots.values()].sort((a, b) => a.index - b.index).map(cloneMacroSettings)
}
