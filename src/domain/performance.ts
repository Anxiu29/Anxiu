export type PerformanceMode = 'global' | 'single' | 'rapid-trigger'
export type PollingRate = 125 | 250 | 500 | 1000 | 2000 | 4000 | 8000
/** 设备 6×21 矩阵中的实时按压行程，单位为 mm。 */
export type TravelMatrix = number[][]
/** 一轮官方 0x12 查询同时返回毫米行程（matrix=2）和固件状态（matrix=3）。 */
export interface TravelSnapshot {
  travels: TravelMatrix
  states: number[][]
}

/** 单个物理键的性能参数；所有行程统一使用 mm。 */
export interface KeyPerformanceSettings {
  sourceCode: number
  mode: PerformanceMode
  globalActuation: number
  actuation: number
  rapidPress: number
  rapidRelease: number
  pressDeadZone: number
  releaseDeadZone: number
}

export const DEFAULT_PERFORMANCE_SETTINGS: Omit<KeyPerformanceSettings, 'sourceCode'> = {
  mode: 'global',
  globalActuation: 2,
  actuation: 2,
  rapidPress: 0.2,
  rapidRelease: 0.2,
  pressDeadZone: 0.1,
  releaseDeadZone: 0.1,
}

export const clonePerformanceSettings = (value: KeyPerformanceSettings): KeyPerformanceSettings => ({ ...value })

export function validatePerformanceSettings(value: KeyPerformanceSettings) {
  const errors: string[] = []
  const travels = [value.globalActuation, value.actuation, value.rapidPress, value.rapidRelease, value.pressDeadZone, value.releaseDeadZone]
  if (travels.some((item) => !Number.isFinite(item) || item < 0 || item > 4)) errors.push('性能行程必须在 0–4 mm 之间')
  if (value.sourceCode < 0 || value.sourceCode > 0xff) errors.push('物理键编号无效')
  return errors
}
