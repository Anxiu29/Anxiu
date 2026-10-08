import { MOUSE_FILE_FORMAT } from './types'
import { validateMacro, type MouseMacro } from './macros'

export interface MouseProfile {
  version: 1
  model: string
  name: string
  functions: number[]
  keys: number[]
  macro?: MouseMacro
}

export function validateProfile(value: unknown, profileModel: string = MOUSE_FILE_FORMAT): MouseProfile {
  const p = value as MouseProfile
  const bytes = (v: unknown): v is number[] =>
    Array.isArray(v) &&
    v.length === 128 &&
    v.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)
  if (
    !p ||
    p.version !== 1 ||
    p.model !== profileModel ||
    typeof p.name !== 'string' ||
    !p.name.trim() ||
    p.name.length > 80 ||
    !bytes(p.functions) ||
    !bytes(p.keys)
  )
    throw new Error('Invalid CB75 profile')
  const macro = p.macro === undefined ? undefined : validateMacro(p.macro)
  for (let i = 0; i < 126; i += 3) {
    if (
      [0x70, 0x71].includes(p.keys[i]) &&
      (!macro ||
        !macro.actions.length ||
        p.keys[i + 1] !== 0 ||
        (p.keys[i] === 0x70 ? p.keys[i + 2] > 3 : p.keys[i + 2] < 1))
    ) {
      throw new Error('Profile requires its macro data')
    }
  }
  if (!p.keys.some((b, i) => i % 3 === 0 && i < 126 && b === 0x10 && p.keys[i + 1] === 1)) {
    throw new Error('Keep at least one left mouse button')
  }
  return {
    version: 1,
    model: profileModel,
    name: p.name.trim(),
    functions: [...p.functions],
    keys: [...p.keys],
    ...(macro ? { macro } : {}),
  }
}
