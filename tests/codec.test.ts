import { describe, expect, it } from 'vitest'
import { checksum8, decodePacket, encodePacket } from '@/protocol/codec'

describe('protocol codec', () => {
  it('encodes and decodes a packet', () => {
    const packet = encodePacket(0x23, new Uint8Array([0, 4, 0, 0xff, 0xff]))
    expect(packet[0]).toBe(0x5c)
    expect(packet[1]).toBe(5)
    expect(decodePacket(packet)).toEqual({ command: 0x23, data: new Uint8Array([0, 4, 0, 0xff, 0xff]) })
  })
  it('creates a zero-sum checksum', () => {
    const bytes = new Uint8Array([0x5c, 1, 0, 2])
    expect((bytes.reduce((sum, byte) => sum + byte, 0) + checksum8(bytes)) & 0xff).toBe(0)
  })
  it('rejects a corrupt packet', () => {
    const packet = encodePacket(1, new Uint8Array([2]))
    packet[4] = 3
    expect(() => decodePacket(packet)).toThrow('CRC')
  })
})
