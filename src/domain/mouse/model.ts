import { readU16, unsigned } from './codec'

export type KeyCode = readonly [type: number, code1: number, code2: number]
export interface DpiStage {
  enabled: number
  independentXY: number
  /** Raw firmware values; conversion to displayed DPI requires firmware confirmation. */
  x: number
  y: number
  color: readonly [number, number, number]
}

export interface FunctionInfo {
  profile: number
  ledMode: number
  brightness: number
  speed: number
  direction: number
  multicolor: number
  color: readonly [number, number, number]
  reserved: readonly [number, number]
  reportRate: number
  dpiRank: number
  liftOffDistance: number
  stages: DpiStage[]
  /** Preserve firmware extensions when editing known fields. */
  tail: Uint8Array
}

export function parseFunctions(data: Uint8Array, stageCount: number): FunctionInfo {
  unsigned(stageCount, 0xff, 'DPI stage count')
  const size = 14 + stageCount * 9
  if (data.length < size) throw new RangeError('Truncated function information')
  const stages: DpiStage[] = []
  for (let offset = 14; offset < size; offset += 9) {
    stages.push({
      enabled: data[offset],
      independentXY: data[offset + 1],
      x: readU16(data, offset + 2),
      y: readU16(data, offset + 4),
      color: [data[offset + 6], data[offset + 7], data[offset + 8]],
    })
  }
  return {
    profile: data[0],
    ledMode: data[1],
    brightness: data[2],
    speed: data[3],
    direction: data[4],
    multicolor: data[5],
    color: [data[6], data[7], data[8]],
    reserved: [data[9], data[10]],
    reportRate: data[11],
    dpiRank: data[12],
    liftOffDistance: data[13],
    stages,
    tail: data.slice(size),
  }
}

export function encodeFunctions(info: FunctionInfo): Uint8Array {
  unsigned(info.stages.length, 0xff, 'DPI stage count')
  const bytes = [
    info.profile,
    info.ledMode,
    info.brightness,
    info.speed,
    info.direction,
    info.multicolor,
    ...info.color,
    ...info.reserved,
    info.reportRate,
    info.dpiRank,
    info.liftOffDistance,
  ]
  for (const stage of info.stages) {
    unsigned(stage.x, 0xffff, 'X DPI')
    unsigned(stage.y, 0xffff, 'Y DPI')
    bytes.push(
      stage.enabled,
      stage.independentXY,
      stage.x & 0xff,
      stage.x >>> 8,
      stage.y & 0xff,
      stage.y >>> 8,
      ...stage.color,
    )
  }
  bytes.push(...info.tail)
  return Uint8Array.from(bytes.map((value) => unsigned(value, 0xff, 'Function byte')))
}

export function parseKeys(data: Uint8Array): KeyCode[] {
  if (data.length % 3 !== 0) throw new RangeError('Truncated key matrix')
  const keys: KeyCode[] = []
  for (let offset = 0; offset < data.length; offset += 3) {
    keys.push([data[offset], data[offset + 1], data[offset + 2]])
  }
  return keys
}

export function encodeKeys(keys: readonly KeyCode[]): Uint8Array {
  return Uint8Array.from(
    keys.flatMap((key) => {
      if (key.length !== 3) throw new RangeError('Key code requires three bytes')
      return key.map((value) => unsigned(value, 0xff, 'Key code'))
    }),
  )
}

/** Raw macro action fields from section 3.2.5.1, without guessing key code enums. */
export interface MacroAction {
  delay: number
  typeAndStatus: number
  code: number
}
export interface MacroData {
  reserved: readonly [number, number]
  actions: MacroAction[]
}

export function parseMacroData(data: Uint8Array): MacroData {
  if (data.length < 4) throw new RangeError('Truncated macro header')
  const count = readU16(data, 0)
  if (data.length !== 4 + count * 4) throw new RangeError('Macro action count mismatch')
  const actions: MacroAction[] = []
  for (let offset = 4; offset < data.length; offset += 4) {
    actions.push({
      delay: readU16(data, offset),
      typeAndStatus: data[offset + 2],
      code: data[offset + 3],
    })
  }
  return { reserved: [data[2], data[3]], actions }
}

export function encodeMacroData(macro: MacroData): Uint8Array {
  const count = unsigned(macro.actions.length, 0xffff, 'Action count')
  const bytes = [count & 0xff, count >>> 8, ...macro.reserved]
  for (const action of macro.actions) {
    const delay = unsigned(action.delay, 0xffff, 'Macro delay')
    bytes.push(delay & 0xff, delay >>> 8, action.typeAndStatus, action.code)
  }
  return Uint8Array.from(bytes.map((value) => unsigned(value, 0xff, 'Macro byte')))
}
