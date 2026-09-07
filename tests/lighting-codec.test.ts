import { describe, expect, it } from 'vitest'
import { decodeMainLighting, encodeMainLighting } from '@/protocol/xsyd/lightingCodec'
import type { LightingSettings } from '@/domain/lighting'

const settings: LightingSettings = {
  open: true, direction: false, superResponse: true, speed: 3,
  colors: ['#123456', '#ABCDEF', '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF'],
  mode: 5, luminance: 80, sleepDelay: 30, staticColor: 2, type: 'dynamic', dynamicColorId: 7,
}

describe('XSYD main-lighting codec', () => {
  it('encodes the documented PRGB byte layout', () => {
    const data = encodeMainLighting(settings, true, true)
    expect(data[0]).toBe(1)
    expect([...data.slice(5, 9)]).toEqual([0x56, 0x34, 0x12, 0xff])
    expect([...data.slice(33)]).toEqual([0, 0, 0, 0, 0x11, 80, 5, 3, 30, 2, 7])
  })

  it('decodes a response after the packet header has been removed', () => {
    // C98 实机响应保留四字节前置保留区，布局与请求一致，仅读写位变为 0。
    const response = encodeMainLighting(settings, false, true)
    expect(decodeMainLighting(response)).toEqual({ ...settings, colors: settings.colors.map((color) => color.toUpperCase()) })
  })

  it('decodes the captured C98 0x98 response without treating reserved bytes as a color', () => {
    const captured = new Uint8Array([
      0, 0, 0, 0, 0,
      0x00, 0x00, 0xff, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0x7f, 0x7f, 0xff,
      0xff, 0x00, 0x00, 0xff, 0x7f, 0x00, 0x7f, 0xff, 0x7f, 0x7f, 0x00, 0xff,
      0x7f, 0x7f, 0x7f, 0xff,
      0, 0, 0, 0, 0, 3, 0, 3, 5, 0, 0xff,
    ])
    expect(decodeMainLighting(captured)).toMatchObject({
      colors: ['#FF0000', '#00FF00', '#7F7F00', '#0000FF', '#7F007F', '#007F7F', '#7F7F7F'],
      open: false, luminance: 3, mode: 0, speed: 3, sleepDelay: 5, staticColor: 0, dynamicColorId: 0xff,
    })
  })
})
