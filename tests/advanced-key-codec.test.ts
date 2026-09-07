import { describe, expect, it } from 'vitest'
import { decodeEnd, decodeMpt, decodeSocd, decodeTgl, encodeDks, encodeEnd, encodeMpt, encodeMt, encodeSocd, encodeTgl } from '../src/protocol/xsyd/advancedKeyCodec'

describe('高级键协议编解码', () => {
  it('编码 DKS 的四个 16 位键码、TRPS 和毫米行程', () => {
    expect([...encodeDks({ type: 'dks', sourceCode: 7, keyCodes: [0x1234, 2, 3, 4], triggers: [1, 2, 4, 8], travels: [0.5, 3.5] })])
      .toEqual([1, 7, 0x34, 0x12, 2, 0, 3, 0, 4, 0, 1, 2, 4, 8, 0xf4, 0x01, 0xac, 0x0d])
  })

  it('MPT 往返保持键码和三段行程', () => {
    const value = { type: 'mpt' as const, sourceCode: 8, keyCodes: [4, 0x1234, 6] as [number, number, number], travels: [0.4, 2, 3.8] as [number, number, number] }
    const packet = encodeMpt(value)
    expect(decodeMpt(8, new Uint8Array([0, ...packet.slice(1)]))).toEqual(value)
  })

  it('MT 与 TGL 使用 10ms 档位，END 使用 16 位延迟', () => {
    expect([...encodeMt({ type: 'mt', sourceCode: 3, keyCodes: [4, 5], delay: 230 })]).toEqual([1, 3, 4, 0, 5, 0, 23])
    const tgl = { type: 'tgl' as const, sourceCode: 3, keyCode: 0x1234, delay: 230 }
    expect(decodeTgl(3, new Uint8Array([0, 3, ...encodeTgl(tgl).slice(2)]))).toEqual(tgl)
    const end = { type: 'end' as const, sourceCode: 3, keyCode: 0x1234, delay: 1000 }
    expect(decodeEnd(3, new Uint8Array([0, 3, ...encodeEnd(end).slice(2)]))).toEqual(end)
  })

  it('SOCD 往返保持物理键、输出键、优先规则和延迟', () => {
    const value = { type: 'socd' as const, sourceCode: 1, pairedSourceCode: 2, keyCodes: [4, 7] as [number, number], mode: 3 as const, delay: 50 }
    const packet = encodeSocd(value)
    expect(packet[7]).toBe(1)
    expect(decodeSocd(1, new Uint8Array([0, ...packet.slice(1)]))).toEqual(value)
  })
})

