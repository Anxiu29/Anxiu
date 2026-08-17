import { CompositeKeyCatalog, StaticKeyCatalog } from '@/domain/KeyCatalog'
import { HID_KEY_CATALOG, hidCategoryFor } from '@/domain/keycodes'
import type { KeyCategory, KeyDefinition } from '@/domain/keyboard'
import { OFFICIAL_XSYD_KEY_MAP } from './officialKeyMap'

const xsydCategory = (code: number): KeyCategory => {
  if (code === 62217) return 'modifier'
  if (code >= 61441 && code <= 61443) return 'function'
  if (code >= 4207 && code < 5000) return 'media'
  return hidCategoryFor(code)
}

const extensions: KeyDefinition[] = Object.entries(OFFICIAL_XSYD_KEY_MAP).map(([rawCode, label]) => {
  const code = Number(rawCode)
  return { code, label, category: xsydCategory(code) }
})

export const XSYD_KEY_CATALOG = new CompositeKeyCatalog(
  HID_KEY_CATALOG,
  new StaticKeyCatalog(extensions),
)
