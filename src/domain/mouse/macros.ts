import { encodeMacroData, type MacroAction, type KeyCode } from './model'

export interface MouseMacro {
  name: string
  actions: MacroAction[]
  playbackMode?: 0 | 1 | 2 | 3
  playbackCount?: number
}

/** One left click per repetition, with a post-release interval. */
export function createFireMacro(name: string, count: number, interval: number): MouseMacro {
  if (!Number.isInteger(interval) || interval < 1 || interval > 65535)
    throw new Error('Invalid fire interval')
  return validateMacro({
    name,
    playbackMode: 0,
    playbackCount: count,
    actions: [
      { delay: 0, typeAndStatus: 0x81, code: 1 },
      { delay: interval, typeAndStatus: 0x01, code: 1 },
    ],
  })
}

export function validateMacro(value: unknown): MouseMacro {
  const macro = value as MouseMacro
  if (
    !macro ||
    typeof macro.name !== 'string' ||
    !macro.name.trim() ||
    macro.name.length > 80 ||
    !Array.isArray(macro.actions) ||
    macro.actions.length > 750
  ) {
    throw new Error('Invalid macro')
  }
  if (macro.playbackMode !== undefined && ![0, 1, 2, 3].includes(macro.playbackMode))
    throw new Error('Invalid macro playback mode')
  if (
    macro.playbackCount !== undefined &&
    (!Number.isInteger(macro.playbackCount) || macro.playbackCount < 1 || macro.playbackCount > 255)
  )
    throw new Error('Invalid macro playback count')
  for (const action of macro.actions) {
    if (
      !action ||
      ![0x8a, 0x0a, 0x81, 0x01].includes(action.typeAndStatus) ||
      !Number.isInteger(action.code) ||
      ((action.typeAndStatus & 0x7f) === 1
        ? ![1, 2, 4, 8, 16].includes(action.code)
        : action.code < 4 || action.code > 0xe7) ||
      !Number.isInteger(action.delay) ||
      action.delay < 0 ||
      action.delay > 65535
    )
      throw new Error('Invalid macro action')
  }
  return {
    name: macro.name.trim(),
    ...(macro.playbackMode !== undefined ? { playbackMode: macro.playbackMode } : {}),
    ...(macro.playbackCount !== undefined ? { playbackCount: macro.playbackCount } : {}),
    actions: macro.actions.map((a) => ({
      delay: a.delay,
      typeAndStatus: a.typeAndStatus,
      code: a.code,
    })),
  }
}

/** Capture #9: one macro at 0x12, SIZE = 10 + 4 * actions, not the occupied byte count.
 * Preserve this firmware convention: four captured actions produce SIZE 0x001A.
 * The capture sends a full 56-byte data block without Begin/End commands.
 */
export function encodeCapturedMacro(value: MouseMacro, capacity: number): Uint8Array {
  const macro = validateMacro(value)
  if (!macro.actions.length) throw new Error('Cannot write an empty macro')
  const body = encodeMacroData({ reserved: [0, 0], actions: macro.actions })
  const used = 18 + body.length
  const length = Math.ceil(used / 56) * 56
  if (length > capacity) throw new Error('Macro exceeds device capacity')
  const data = new Uint8Array(length)
  const size = 10 + macro.actions.length * 4
  data.set([0xaa, 0x55, size & 255, size >>> 8, 1, 0])
  data[16] = 0x12
  data.set(body, 18)
  return data
}

/** Original TLW driver: 70 <macro index> <stop mode>, 71 <macro index> <repeat count>. */
export function macroBinding(value: MouseMacro): KeyCode {
  const macro = validateMacro(value),
    mode = macro.playbackMode ?? 0,
    count = macro.playbackCount ?? 1
  return mode === 0 && count > 1 ? [0x71, 0, count] : [0x70, 0, mode]
}

/** TLW stores each pause after its preceding input action. */
export function insertMacroDelay(actions: MacroAction[], index: number, delay: number): void {
  if (
    !Number.isInteger(index) ||
    index < 1 ||
    index > actions.length ||
    !Number.isInteger(delay) ||
    delay < 1 ||
    delay > 65535 ||
    actions[index - 1].delay + delay > 65535
  )
    throw new Error('Invalid macro delay insertion')
  actions[index - 1].delay += delay
}
