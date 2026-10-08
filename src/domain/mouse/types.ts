import type { KeyCode } from './model'
import type { MouseMacro } from './macros'

export const MOUSE_FILE_FORMAT = 'CB75-Mouse' as const
export interface MouseConfiguration {
  basic: {
    keyCount: number
    keyBytes: number
    macroBytes: number
    dpiStep: number
    dpiRank: number
    dpiStart: number
    independentXY: boolean
    dpiStageCount: number
    firmwareVersion?: string
    vendorId: number
    productId: number
  }
  basicRaw: Uint8Array
  functions: Uint8Array
  keysRaw: Uint8Array
  keys: KeyCode[]
  defaultKeys: KeyCode[]
  battery: { percent: number; charging: number }
  macro?: MouseMacro
}
export interface MouseIdentity {
  profileModel?: string
  demo?: boolean
  capabilities: readonly string[]
  name: string
  connection: 'wired' | 'wireless'
  storage: { profiles: string; macros: string }
}
