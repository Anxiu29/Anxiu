/** Lossless CB75 profile payload matching the matrices and board buffers in RK exports. */
export interface RawKeyboardProfile {
  mode: 'win' | 'mac'
  layers: Record<'0' | '1', Uint8Array[]>
  profile: Uint8Array
  ledEffect: Uint8Array
  ledColors: Uint8Array
}

export function cloneRawKeyboardProfile(value: RawKeyboardProfile): RawKeyboardProfile {
  return {
    mode: value.mode,
    layers: { '0': value.layers['0'].map((layer) => layer.slice()), '1': value.layers['1'].map((layer) => layer.slice()) },
    profile: value.profile.slice(), ledEffect: value.ledEffect.slice(), ledColors: value.ledColors.slice(),
  }
}

function readBytes(value: unknown, minimum: number, label: string) {
  if (!value || typeof value !== 'object') throw new Error(`RK ${label}缺失`)
  const source = value as Record<number, unknown>
  const length = Array.isArray(value) || value instanceof Uint8Array ? value.length : Object.keys(value).length
  if (length < minimum) throw new Error(`RK ${label}长度不足`)
  const result = new Uint8Array(minimum)
  for (let index = 0; index < minimum; index++) {
    const byte = source[index]
    if (!Number.isInteger(byte) || Number(byte) < 0 || Number(byte) > 255) throw new Error(`RK ${label}包含无效字节`)
    result[index] = Number(byte)
  }
  return result
}

export function normalizeRawKeyboardProfile(value: unknown): RawKeyboardProfile {
  if (!value || typeof value !== 'object') throw new Error('RK 原始配置格式无效')
  const item = value as Record<string, unknown>
  if (item.mode !== 'win' && item.mode !== 'mac') throw new Error('RK 系统模式无效')
  if (!item.layers || typeof item.layers !== 'object') throw new Error('RK 键位矩阵缺失')
  const source = item.layers as Record<string, unknown>
  const layers = { '0': [] as Uint8Array[], '1': [] as Uint8Array[] }
  for (const table of ['0', '1'] as const) {
    const entries = source[table] as Record<number, unknown> | undefined
    if (!entries || typeof entries !== 'object') throw new Error(`RK ${table} 键值表缺失`)
    for (let layer = 0; layer < 4; layer++) layers[table].push(readBytes(entries[layer], 504, `第 ${layer + 1} 层矩阵`))
  }
  return {
    mode: item.mode, layers,
    profile: readBytes(item.profile, 128, '设备参数'),
    ledEffect: readBytes(item.ledEffect, 420, '灯效颜色'),
    ledColors: readBytes(item.ledColors, 378, '逐键灯光'),
  }
}
