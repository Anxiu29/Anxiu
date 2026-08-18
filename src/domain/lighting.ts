export type LightingModeType = 'static' | 'dynamic' | 'custom'

/** 与星闪 LightMode 对应的领域模型；字段保持原始数值，避免 UI 自行解释协议字节。 */
export interface LightingSettings {
  open: boolean
  direction: boolean
  superResponse: boolean
  speed: number
  colors: string[]
  mode: number
  luminance: number
  sleepDelay: number
  staticColor: number
  type: LightingModeType
  dynamicColorId: number
}

export const DEFAULT_LIGHTING_SETTINGS: LightingSettings = {
  open: true,
  direction: true,
  superResponse: false,
  speed: 3,
  colors: Array(7).fill('#FFFFFF'),
  mode: 1,
  luminance: 100,
  sleepDelay: 0,
  staticColor: 0,
  type: 'dynamic',
  dynamicColorId: 0,
}

export const cloneLightingSettings = (value: LightingSettings): LightingSettings => ({ ...value, colors: [...value.colors] })
