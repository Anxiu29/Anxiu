/** 当前宏领域模型支持的四种触发模式；数值与具体设备协议的转换由适配器负责。 */
export type MacroMode = 0 | 1 | 2 | 3

export interface MacroAction {
  keyCode: number
  /** 领域层使用易懂的布尔值；协议层再转换为 0x01/0x08 状态位。 */
  pressed: boolean
  /** 距离上一个动作的间隔，单位毫秒；释放动作的 delay 也就是该键的保持时长。 */
  delay: number
}

export interface MacroSettings {
  /** 设备内的宏槽位，范围 0~15。 */
  index: number
  /** 绑定的默认布局物理键值；0xFF 表示槽位未绑定。 */
  sourceCode: number
  /** 同一宏槽可绑定多个物理键；sourceCode 仅表示本次协议写入/回读的目标键。 */
  boundSourceCodes?: number[]
  mode: MacroMode
  repeatCount: number
  repeatDelay: number
  actions: MacroAction[]
  /** 设备元数据声明的动作数；动作正文无法回读时仍可告诉 UI 宏确实存在。 */
  storedActionCount?: number
  /** true 表示 actions 是已保存正文，false 表示设备只返回了宏元数据。 */
  actionsAvailable?: boolean
}

export const EMPTY_MACRO_SOURCE = 0xff

export function createEmptyMacro(index = 0, sourceCode = EMPTY_MACRO_SOURCE): MacroSettings {
  return { index, sourceCode, boundSourceCodes: sourceCode === EMPTY_MACRO_SOURCE ? [] : [sourceCode], mode: 0, repeatCount: 1, repeatDelay: 0, actions: [], storedActionCount: 0, actionsAvailable: true }
}

export function cloneMacroSettings(value: MacroSettings): MacroSettings {
  return { ...value, boundSourceCodes: [...(value.boundSourceCodes ?? (value.sourceCode === EMPTY_MACRO_SOURCE ? [] : [value.sourceCode]))], actions: value.actions.map((action) => ({ ...action })) }
}

/** 在进入协议层前集中验证，避免无效 UI 数据被截断后悄悄写入设备。 */
export function validateMacroSettings(value: MacroSettings): string[] {
  const errors: string[] = []
  if (!Number.isInteger(value.index) || value.index < 0 || value.index > 0xffff) errors.push('宏槽位超出协议字段范围')
  if (!Number.isInteger(value.sourceCode) || value.sourceCode < 0 || value.sourceCode > 0xff) errors.push('宏物理键值无效')
  const bindings = value.boundSourceCodes ?? []
  if (new Set(bindings).size !== bindings.length || bindings.some((code) => !Number.isInteger(code) || code < 0 || code > 0xfe)) errors.push('宏绑定按键无效或重复')
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
