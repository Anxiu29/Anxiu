import type { KeyDefinition } from '@/domain/keyboard'

export type ExtendedKeyCategory = 'system' | 'media' | 'lighting' | 'mouse' | 'shortcut' | 'more'

export const EXTENDED_KEY_CATEGORIES: readonly { id: ExtendedKeyCategory; label: string }[] = [
  { id: 'system', label: '系统功能' },
  { id: 'media', label: '媒体' },
  { id: 'lighting', label: '灯光' },
  { id: 'mouse', label: '鼠标' },
  { id: 'shortcut', label: '快捷指令' },
  { id: 'more', label: '更多' },
]

const MEDIA_CODES = new Set([127, 128, 129, 173, 174, 175, 176, 177, 178, 179, 180, 4207, 4208, 4277, 4278, 4279, 4301, 4322, 4329, 4330, 4483])
const SYSTEM_CODES = new Set([102, 165, 166, 61441, 61442, 61443, 61696, 61697, 61698, 61699, 61704, 61705, 61706, 61707, 61708, 62217, 62265])
const SHORTCUT_CODES = new Set([101, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 4490, 4498, 4500, 4641, 4643, 4767])

/** 型号白名单由设备目录传入；公共 UI 只额外排除官方表中的空值和“-”占位符。 */
export const isSelectableExtendedKey = ({ code, label }: KeyDefinition, supportedCodes: ReadonlySet<number>) =>
  supportedCodes.has(code) && label.trim() !== '' && label.trim() !== '-'

/**
 * 所有键值选择器共用同一套型号白名单和占位符过滤规则。
 * excludedCodes 用于排除已经在当前选择器键盘区域展示的键值，避免重复入口。
 */
export const selectableExtendedKeys = (
  definitions: readonly KeyDefinition[],
  supportedCodes: ReadonlySet<number>,
  excludedCodes: ReadonlySet<number> = new Set<number>(),
) => definitions.filter((item) => !excludedCodes.has(item.code) && isSelectableExtendedKey(item, supportedCodes))

/**
 * 分类仅用于 UI 浏览，不改变 KeyDefinition.category 或协议键码。
 * 优先使用文档中稳定的厂商键码范围，名称规则只作为未来新增同类键值的补充。
 */
export const extendedCategoryFor = ({ code, label }: KeyDefinition): ExtendedKeyCategory => {
  const normalized = label.trim().toLowerCase()
  if ((code >= 62224 && code <= 62262) || code === 199 || code === 200 || /灯|light/.test(normalized)) return 'lighting'
  if (code >= 29441 && code <= 29449 || /鼠标|滚轮|mouse/.test(normalized)) return 'mouse'
  if (MEDIA_CODES.has(code) || /播放|静音|声音|音量|下一首|上一首|track|media|vol[+-]/.test(normalized)) return 'media'
  if (SYSTEM_CODES.has(code) || /^(fn\d|win|mac|lockwin|恢复|校准|配置\d|wasd切换|power|desktop sleep)/.test(normalized)) return 'system'
  if (SHORTCUT_CODES.has(code) || /email|calc|file|search|www|desktop|undo|cut|copy|paste|find|bookmarks|refresh/.test(normalized)) return 'shortcut'
  return 'more'
}
