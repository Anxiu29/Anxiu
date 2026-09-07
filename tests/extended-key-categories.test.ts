import { describe, expect, it } from 'vitest'
import { extendedCategoryFor, isSelectableExtendedKey } from '@/ui/extendedKeyCategories'
import type { KeyDefinition } from '@/domain/keyboard'

const key = (code: number, label: string): KeyDefinition => ({ code, label, category: 'special' })
const supported = new Set([0, 167])

describe('extended key categories', () => {
  it('groups documented vendor functions without changing their keycodes', () => {
    expect(extendedCategoryFor(key(61697, 'Win'))).toBe('system')
    expect(extendedCategoryFor(key(4277, '下一首'))).toBe('media')
    expect(extendedCategoryFor(key(62226, '主灯亮度+'))).toBe('lighting')
    expect(extendedCategoryFor(key(29441, '鼠标左键'))).toBe('mouse')
    expect(extendedCategoryFor(key(4498, 'Calc'))).toBe('shortcut')
    expect(extendedCategoryFor(key(25141, '~'))).toBe('more')
  })

  it('uses the UI allowlist and still hides empty or dash placeholders', () => {
    expect(isSelectableExtendedKey(key(167, '-'), supported)).toBe(false)
    expect(isSelectableExtendedKey(key(168, '  '), supported)).toBe(false)
    expect(isSelectableExtendedKey(key(0, '△'), supported)).toBe(true)
    expect(isSelectableExtendedKey(key(65535, '未列入白名单'), supported)).toBe(false)
  })
})
