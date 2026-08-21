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
  if (typeof localStorage === 'undefined' || deviceSettings.sourceCode === EMPTY_MACRO_SOURCE) return deviceSettings
  try {
    const raw = localStorage.getItem(slotKey(context, deviceSettings.index)) ?? localStorage.getItem(legacyKey(context, deviceSettings.sourceCode))
    if (!raw) return { ...deviceSettings, boundSourceCodes: [deviceSettings.sourceCode], actionsAvailable: false }
    const snapshot = normalizeSnapshot(JSON.parse(raw) as MacroSettings)
    // 0x21 的主动查询不返回动作数，因此用设备可回读的全部元数据校验本地正文。
    // 任一字段不同都说明宏可能被其他驱动改过，此时宁可标记正文不可读，也不能展示旧动作。
    const metadataMatches = snapshot.index === deviceSettings.index
      && snapshot.mode === deviceSettings.mode
      && snapshot.repeatCount === deviceSettings.repeatCount
      && snapshot.repeatDelay === deviceSettings.repeatDelay
    // 非零动作数是可用证据，必须一致；某些方案的主动查询固定返回 0，只能跳过这一项。
    const actionCountMatches = !deviceSettings.storedActionCount || snapshot.actions.length === deviceSettings.storedActionCount
    if (validateMacroSettings(snapshot).length || !metadataMatches || !actionCountMatches) return { ...deviceSettings, boundSourceCodes: [deviceSettings.sourceCode], actionsAvailable: false }
    return { ...deviceSettings, boundSourceCodes: [deviceSettings.sourceCode], actions: snapshot.actions, storedActionCount: snapshot.actions.length, actionsAvailable: true }
  } catch { return { ...deviceSettings, boundSourceCodes: [deviceSettings.sourceCode], actionsAvailable: false } }
}

/** 恢复出厂会清除整台设备的四个配置和两种系统模式，网页缓存必须按设备整体删除。 */
export function clearDeviceMacroSnapshots(context: MacroSnapshotContext) {
  if (typeof localStorage === 'undefined') return
  const [driver, identity] = contextParts(context)
  const prefixes = [`${STORAGE_PREFIX}:${driver}:${identity}:`, `${LEGACY_STORAGE_PREFIX}:${driver}:${identity}:`]
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter((key): key is string => !!key)
    for (const key of keys) if (prefixes.some((prefix) => key.startsWith(prefix))) localStorage.removeItem(key)
  } catch { /* 浏览器拒绝存储访问时，设备恢复本身仍然算成功。 */ }
}

/** 设备扫描完成后，只保留当前配置中仍被真机确认的宏正文。 */
export function replaceMacroSnapshots(context: MacroSnapshotContext, settings: MacroSettings[]) {
  if (typeof localStorage === 'undefined') return
  try {
    const slotCount = context.profile.capabilities.macroSlots ?? 16
    for (let index = 0; index < slotCount; index++) localStorage.removeItem(slotKey(context, index))
    for (const position of context.profile.positions) localStorage.removeItem(legacyKey(context, position.sourceCode))
    for (const value of settings) if (value.actionsAvailable && value.actions.length) saveMacroSnapshot(context, value)
  } catch { /* 缓存维护失败不能覆盖已经成功的设备读取结果。 */ }
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
