import { describe, expect, it } from 'vitest'
import { decodeCustomLighting, encodeCustomLightingRead, encodeCustomLightingSave, encodeCustomLightingWrite } from '@/protocol/xsyd/customLightingCodec'

describe('custom lighting codec', () => {
  it('encodes read, write and save packets from the V1.0.7 KRGB layout', () => {
    expect([...encodeCustomLightingRead([0x04, 0x05])]).toEqual([0, 0x04, 0xff, 0xff, 0xff, 0x05, 0xff, 0xff, 0xff])
    expect([...encodeCustomLightingWrite([{ sourceCode: 0x04, color: '#12ABEF' }])]).toEqual([1, 0x04, 0x12, 0xab, 0xef])
    expect([...encodeCustomLightingSave()]).toEqual([0xfe])
  })

  it('decodes Key/R/G/B groups and ignores empty slots', () => {
    expect(decodeCustomLighting(new Uint8Array([0, 0x04, 0x12, 0xab, 0xef, 0xff, 0xff, 0xff, 0xff]))).toEqual([{ sourceCode: 0x04, color: '#12ABEF' }])
  })
})
