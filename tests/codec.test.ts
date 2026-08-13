import { describe, expect, it } from 'vitest'
import { computePacketCrc, decodePacket, encodePacket } from '@/protocol/codec'

describe('protocol codec', () => {
  it('encodes and decodes a packet', () => {
    const packet = encodePacket(0x23, new Uint8Array([0, 4, 0, 0xff, 0xff]))
    expect(packet[0]).toBe(0x5c)
    expect(packet[1]).toBe(5)
    expect(decodePacket(packet)).toEqual({ command: 0x23, data: new Uint8Array([0, 4, 0, 0xff, 0xff]) })
  })
  it.each([
    ['query protocol version', 0x00, [0x01, 0xff, 0xff], 0x93],
    ['read default rows 0/1', 0x2b, [0x00, 0x00, 0x01], 0xc0],
    ['read default rows 2/3', 0x2b, [0x00, 0x02, 0x03], 0xc2],
    ['read default rows 4/5', 0x2b, [0x00, 0x04, 0x05], 0xc4],
    ['sync', 0x01, [0x01, 0x02, 0x03, 0x04, 0xff, 0xff], 0x97],
  ])('matches captured %s packet', (_name, command, data, expected) => {
    const packet = encodePacket(command, new Uint8Array(data))
    expect(packet[3]).toBe(expected)
  })
  it('uses the last data byte only', () => {
    expect(computePacketCrc(new Uint8Array([0x5c, 3, 0x2b, 0, 0, 1]))).toBe(0xc0)
    expect(computePacketCrc(new Uint8Array([0x5c, 3, 0x2b, 99, 88, 1]))).toBe(0xc0)
  })
  it('rejects a corrupt packet', () => {
    const packet = encodePacket(1, new Uint8Array([2]))
    packet[4] = 3
    expect(() => decodePacket(packet)).toThrow('CRC')
  })
})
