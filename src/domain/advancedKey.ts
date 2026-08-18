/** 高级键类型。数值映射由协议适配器负责，领域层只使用有语义的名称。 */
export type AdvancedKeyType = 'none' | 'dks' | 'mpt' | 'mt' | 'tgl' | 'end' | 'socd'

interface AdvancedKeyBase {
  /** 物理键在设备矩阵中的 sourceCode，而不是改键后的 HID 键码。 */
  sourceCode: number
  type: AdvancedKeyType
}

export interface NoAdvancedKey extends AdvancedKeyBase { type: 'none' }
export interface DksAdvancedKey extends AdvancedKeyBase {
  type: 'dks'
  keyCodes: [number, number, number, number]
  /** 四个 TRPS 触发掩码，协议按 1 字节保存。 */
  triggers: [number, number, number, number]
  /** 按下和抬起行程，UI 与领域层统一使用 mm。 */
  travels: [number, number]
}
export interface MptAdvancedKey extends AdvancedKeyBase {
  type: 'mpt'
  keyCodes: [number, number, number]
  travels: [number, number, number]
}
export interface MtAdvancedKey extends AdvancedKeyBase {
  type: 'mt'
  keyCodes: [number, number]
  delay: number
}
export interface TglAdvancedKey extends AdvancedKeyBase { type: 'tgl'; keyCode: number; delay: number }
export interface EndAdvancedKey extends AdvancedKeyBase { type: 'end'; keyCode: number; delay: number }
export interface SocdAdvancedKey extends AdvancedKeyBase {
  type: 'socd'
  pairedSourceCode: number
  keyCodes: [number, number]
  /** 0=后输入优先、1=键1优先、2=键2优先、3=中性。 */
  mode: 0 | 1 | 2 | 3
  delay: number
}

export type AdvancedKeySettings = NoAdvancedKey | DksAdvancedKey | MptAdvancedKey | MtAdvancedKey | TglAdvancedKey | EndAdvancedKey | SocdAdvancedKey

/** 切换类型时提供可编辑初值；真正设备状态仍须通过 getAdvancedKey 回读。 */
export function createAdvancedKeySettings(type: Exclude<AdvancedKeyType, 'none'>, sourceCode: number, fallbackKeyCode: number): Exclude<AdvancedKeySettings, NoAdvancedKey> {
  if (type === 'dks') return { type, sourceCode, keyCodes: [fallbackKeyCode, 0, 0, 0], triggers: [0, 0, 0, 0], travels: [0.5, 3.5] }
  if (type === 'mpt') return { type, sourceCode, keyCodes: [fallbackKeyCode, 0, 0], travels: [0.5, 2, 3.5] }
  if (type === 'mt') return { type, sourceCode, keyCodes: [fallbackKeyCode, fallbackKeyCode], delay: 200 }
  if (type === 'tgl') return { type, sourceCode, keyCode: fallbackKeyCode, delay: 200 }
  if (type === 'end') return { type, sourceCode, keyCode: fallbackKeyCode, delay: 200 }
  return { type, sourceCode, pairedSourceCode: sourceCode, keyCodes: [fallbackKeyCode, fallbackKeyCode], mode: 0, delay: 0 }
}
