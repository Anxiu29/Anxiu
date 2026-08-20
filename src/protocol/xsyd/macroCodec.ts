import type { MacroAction, MacroSettings } from '@/domain/macro'
import { readUint16le, uint16le } from '@/protocol/codec'

export const MACRO_ACTIONS_PER_PACKET = 9
export const XSYD_MAX_MACRO_ACTIONS = 42
export const XSYD_MAX_MACRO_SLOTS = 16
/** 官方 SDK 使用 0x0100 作为宏动作暂存区的起始地址。 */
export const XSYD_MACRO_BUFFER_OFFSET = 0x0100
const MACRO_PRESS = 0x01
const MACRO_RELEASE = 0x08

const uint24le = (value: number) => [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff]
const readUint24le = (data: Uint8Array, offset: number) => (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8) | ((data[offset + 2] ?? 0) << 16)

/** 官方 SDK 的单动作格式：16 位小端键码 + 24 位小端延迟 + 状态位。 */
export function encodeMacroAction(action: MacroAction): number[] {
  return [...uint16le(action.keyCode), ...uint24le(action.delay), action.pressed ? MACRO_PRESS : MACRO_RELEASE]
}

export function decodeMacroAction(data: Uint8Array, offset: number): MacroAction {
  return {
    keyCode: readUint16le(data, offset),
    pressed: ((data[offset + 5] ?? 0) & 0x0f) === MACRO_PRESS,
    delay: readUint24le(data, offset + 2),
  }
}

export function encodeMacroDataWrite(offset: number, actions: MacroAction[]) {
  if (actions.length > MACRO_ACTIONS_PER_PACKET) throw new Error(`单包宏动作不能超过 ${MACRO_ACTIONS_PER_PACKET} 个`)
  return new Uint8Array([1, ...uint16le(offset), actions.length, ...actions.flatMap(encodeMacroAction)])
}

export function encodeMacroDataRead(offset: number, length: number) {
  return new Uint8Array([0, ...uint16le(offset), length])
}

/** 响应为 Err + offset + len + 动作；命令客户端已确认 Err 为 0。 */
export function decodeMacroData(data: Uint8Array) {
  const offset = readUint16le(data, 1)
  const length = data[3] ?? 0
  const actions: MacroAction[] = []
  for (let index = 0; index < length; index += 1) actions.push(decodeMacroAction(data, 4 + index * 6))
  return { offset, actions }
}

export function encodeMacroModeWrite(settings: MacroSettings) {
  return new Uint8Array([
    1, settings.sourceCode, ...uint16le(settings.index), settings.actions.length, settings.mode,
    ...uint16le(settings.repeatCount), ...uint24le(settings.repeatDelay),
  ])
}

/** 旧版 SDK 按物理键查询；其余字段是协议要求的固定占位区。 */
export function encodeMacroModeRead(sourceCode: number) { return new Uint8Array([0, sourceCode, 0, 0, 0, 0, 0, 0, 0, 0, 0]) }

export function decodeMacroMode(data: Uint8Array): Omit<MacroSettings, 'actions'> {
  return {
    sourceCode: data[1] ?? 0xff,
    index: readUint16le(data, 2),
    mode: ((data[5] ?? 0) & 0x03) as MacroSettings['mode'],
    repeatCount: readUint16le(data, 6),
    repeatDelay: readUint24le(data, 8),
  }
}
