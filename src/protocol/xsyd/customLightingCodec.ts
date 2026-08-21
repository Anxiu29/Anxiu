import type { CustomKeyLighting } from '@/domain/lighting'

export const XSYD_CUSTOM_LIGHTING_KEYS_PER_PACKET = 14

const byte = (value: number) => Math.max(0, Math.min(0xff, Math.round(value)))
const normalizeColor = (color: string) => /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : '#000000'

const rgb = (color: string) => {
  const value = normalizeColor(color)
  return [Number.parseInt(value.slice(1, 3), 16), Number.parseInt(value.slice(3, 5), 16), Number.parseInt(value.slice(5, 7), 16)]
}

/** 0x2A 读取请求每项仍占四字节，RGB 使用 0xFF 占位。 */
export const encodeCustomLightingRead = (sourceCodes: number[]) => new Uint8Array([
  0,
  ...sourceCodes.slice(0, XSYD_CUSTOM_LIGHTING_KEYS_PER_PACKET).flatMap((sourceCode) => [byte(sourceCode), 0xff, 0xff, 0xff]),
])

/** 写入包为 rw=1，后接最多 14 组 Key/R/G/B。 */
export const encodeCustomLightingWrite = (items: CustomKeyLighting[]) => new Uint8Array([
  1,
  ...items.slice(0, XSYD_CUSTOM_LIGHTING_KEYS_PER_PACKET).flatMap((item) => [byte(item.sourceCode), ...rgb(item.color)]),
])

/** 协议规定数据首字节 0xFE 表示把已下发的逐键颜色持久化。 */
export const encodeCustomLightingSave = () => new Uint8Array([0xfe])

/** 响应 data[0] 是 Err Code，之后每四字节为 Key/R/G/B。 */
export function decodeCustomLighting(data: Uint8Array): CustomKeyLighting[] {
  const result: CustomKeyLighting[] = []
  for (let offset = 1; offset + 3 < data.length; offset += 4) {
    const sourceCode = data[offset] ?? 0xff
    if (sourceCode === 0xff) continue
    const color = `#${[data[offset + 1], data[offset + 2], data[offset + 3]].map((value) => (value ?? 0).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
    result.push({ sourceCode, color })
  }
  return result
}
