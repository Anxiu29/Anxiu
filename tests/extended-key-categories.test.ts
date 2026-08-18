import { describe, expect, it } from 'vitest'
import { extendedCategoryFor, isSelectableExtendedKey } from '@/ui/extendedKeyCategories'
import type { KeyDefinition } from '@/domain/keyboard'

const key = (code: number, label: string): KeyDefinition => ({ code, label, category: 'special' })

describe('extended key categories', () => {
  it('groups documented vendor functions without changing their keycodes', () => {
    expect(extendedCategoryFor(key(61697, 'Win'))).toBe('system')
    expect(extendedCategoryFor(key(4277, '下一首'))).toBe('media')
    expect(extendedCategoryFor(key(62226, '主灯亮度+'))).toBe('lighting')
    expect(extendedCategoryFor(key(29441, '鼠标左键'))).toBe('mouse')
    expect(extendedCategoryFor(key(4498, 'Calc'))).toBe('shortcut')
    expect(extendedCategoryFor(key(25141, '~'))).toBe('more')
  })

  it('hides only empty and dash placeholders', () => {
    expect(isSelectableExtendedKey(key(167, '-'))).toBe(false)
    expect(isSelectableExtendedKey(key(168, '  '))).toBe(false)
    expect(isSelectableExtendedKey(key(0, '△'))).toBe(true)
  })
})
