import type { LightingModeType, LightingSettings } from '@/domain/lighting'

const byte = (value: number) => Math.max(0, Math.min(0xff, Math.round(value)))
const validColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'
const typeForMode = (mode: number): LightingModeType => mode === 0 ? 'static' : mode <= 20 ? 'dynamic' : 'custom'

/** 官方 PRGB 格式：rw + 4 保留字节 + 7 个 BGR/FF + 4 保留字节 + 灯光参数。 */
export function encodeMainLighting(settings: LightingSettings, write: boolean, includeDynamicColorId: boolean): Uint8Array {
  // 官方首次读取使用空 colors，写入和后续读取才可能携带最多七色；长度必须按实参生成。
  const colors = settings.colors.slice(0, 7).map(validColor)
  const colorBytes = colors.flatMap((color) => [
    Number.parseInt(color.slice(5, 7), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(1, 3), 16),
    0xff,
  ])
  const bitmap = (settings.open ? 0x01 : 0) | (settings.direction ? 0x02 : 0) | (settings.superResponse ? 0x10 : 0)
  const data = [write ? 1 : 0, 0, 0, 0, 0, ...colorBytes, 0, 0, 0, 0, bitmap, byte(settings.luminance), byte(settings.mode), byte(settings.speed), byte(settings.sleepDelay), byte(settings.staticColor)]
  if (includeDynamicColorId) data.push(byte(settings.dynamicColorId))
  return new Uint8Array(data)
}

/**
 * 实机响应与请求保持同一数据布局：data[0] 是状态/读写位，data[1..4]
 * 是保留区，颜色从 data[5] 开始。这里的偏移已经扣除了四字节协议包头。
 */
export function decodeMainLighting(data: Uint8Array): LightingSettings {
  if (data.length < 43) throw new Error(`灯光响应长度不足：${data.length}`)
  const colors: string[] = []
  for (let offset = 5; offset < 33; offset += 4) {
    const [b = 0, g = 0, r = 0] = data.slice(offset, offset + 3)
    colors.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase())
  }
  const bitmap = data[37] ?? 0
  const mode = data[39] ?? 0
  return {
    open: (bitmap & 0x01) !== 0,
    direction: (bitmap & 0x02) !== 0,
    superResponse: (bitmap & 0x10) !== 0,
    colors,
    luminance: data[38] ?? 0,
    mode,
    speed: data[40] ?? 0,
    sleepDelay: data[41] ?? 0,
    staticColor: data[42] ?? 0,
    dynamicColorId: data[43] ?? 0,
    type: typeForMode(mode),
  }
}
