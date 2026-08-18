import type { KeyCatalog } from '@/domain/KeyCatalog'
import type { KeyboardMode, KeyAssignment, KeyPosition } from '@/domain/keyboard'

/**
 * 协议只声明“需要默认键位”的输入和输出，不包含任何具体键盘的数据。
 * 每个设备适配器负责注入自己的实现。
 */
export interface DefaultKeymapContext {
  mode: KeyboardMode
  positions: KeyPosition[]
  layers: number
  keyCatalog: KeyCatalog
}

export type DefaultKeymapResolver = (context: DefaultKeymapContext) => KeyAssignment[]
