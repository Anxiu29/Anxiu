import { CompositeKeyCatalog, StaticKeyCatalog } from '@/domain/KeyCatalog'
import { HID_KEY_CATALOG, hidCategoryFor } from '@/domain/keycodes'
import type { KeyCategory, KeyDefinition } from '@/domain/keyboard'
import { OFFICIAL_XSYD_KEY_MAP } from './officialKeyMap'

// 配置 1~4 的扩展键码来自星闪键值表；固件要求物理按键长按 5 秒后才切换配置。
const configurationShortcutCodes = new Set([61704, 61705, 61706, 61708])

const xsydCategory = (code: number): KeyCategory => {
  if (code === 62217) return 'modifier'
  if (code >= 61441 && code <= 61443) return 'function'
  if (code >= 4207 && code < 5000) return 'media'
  return hidCategoryFor(code)
}

const extensions: KeyDefinition[] = Object.entries(OFFICIAL_XSYD_KEY_MAP).map(([rawCode, label]) => {
  const code = Number(rawCode)
  return {
    code,
    label,
    category: xsydCategory(code),
    hint: configurationShortcutCodes.has(code) ? '需长按 5 秒才生效' : undefined,
  }
})

export const XSYD_KEY_CATALOG = new CompositeKeyCatalog(
  HID_KEY_CATALOG,
  new StaticKeyCatalog(extensions),
)
