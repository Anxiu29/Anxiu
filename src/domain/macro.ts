/** 当前宏领域模型支持的四种触发模式；数值与具体设备协议的转换由适配器负责。 */
export type MacroMode = 0 | 1 | 2 | 3

export interface MacroAction {
  keyCode: number
  /** 领域层使用易懂的布尔值；协议层再转换为 0x01/0x08 状态位。 */
  pressed: boolean
  /** 当前动作结束后到下一动作的间隔，单位毫秒。 */
  delay: number
}

export interface MacroSettings {
  /** 设备内的宏槽位，范围 0~15。 */
  index: number
  /** 绑定的默认布局物理键值；0xFF 表示槽位未绑定。 */
  sourceCode: number
  mode: MacroMode
  repeatCount: number
  repeatDelay: number
  actions: MacroAction[]
}

export const EMPTY_MACRO_SOURCE = 0xff

export function createEmptyMacro(index = 0, sourceCode = EMPTY_MACRO_SOURCE): MacroSettings {
  return { index, sourceCode, mode: 0, repeatCount: 1, repeatDelay: 0, actions: [] }
}

export function cloneMacroSettings(value: MacroSettings): MacroSettings {
  return { ...value, actions: value.actions.map((action) => ({ ...action })) }
}

/** 在进入协议层前集中验证，避免无效 UI 数据被截断后悄悄写入设备。 */
export function validateMacroSettings(value: MacroSettings): string[] {
  const errors: string[] = []
  if (!Number.isInteger(value.index) || value.index < 0 || value.index > 0xffff) errors.push('宏槽位超出协议字段范围')
  if (!Number.isInteger(value.sourceCode) || value.sourceCode < 0 || value.sourceCode > 0xff) errors.push('宏物理键值无效')
  if (![0, 1, 2, 3].includes(value.mode)) errors.push('宏触发模式无效')
  if (!Number.isInteger(value.repeatCount) || value.repeatCount < 0 || value.repeatCount > 0xffff) errors.push('宏重复次数必须在 0~65535 之间')
  if (!Number.isInteger(value.repeatDelay) || value.repeatDelay < 0 || value.repeatDelay > 0xffffff) errors.push('宏重复延迟超出协议范围')
  if (value.actions.length > 0xff) errors.push('宏动作数量超出协议字段范围')
  value.actions.forEach((action, index) => {
    if (!Number.isInteger(action.keyCode) || action.keyCode < 0 || action.keyCode > 0xffff) errors.push(`第 ${index + 1} 个动作的键码无效`)
    if (!Number.isInteger(action.delay) || action.delay < 0 || action.delay > 0xffffff) errors.push(`第 ${index + 1} 个动作的延迟超出协议范围`)
  })
  return errors
}
