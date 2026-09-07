import { describe, expect, it } from 'vitest'
import { computePacketCrc, decodePacket, encodePacket } from '@/protocol/codec'
import { decodeMacroData, decodeMacroMode, encodeMacroAction, encodeMacroDataRead, encodeMacroDataWrite, encodeMacroModeWrite, XSYD_MACRO_LAYOUT_MODE } from '@/protocol/xsyd/macroCodec'

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

describe('宏协议编解码', () => {
  it('使用官方 SDK 的单触发宏模式值', () => {
    expect(XSYD_MACRO_LAYOUT_MODE).toBe(0x16)
  })

  it('按六字节动作格式编码 24 位小端延迟和末尾状态', () => {
    expect(encodeMacroAction({ keyCode: 0x1234, pressed: true, delay: 0x010203 })).toEqual([0x34, 0x12, 0x03, 0x02, 0x01, 0x01])
  })

  it('保留宏动作分页和模式字段', () => {
    const actions = [{ keyCode: 4, pressed: true, delay: 12 }, { keyCode: 4, pressed: false, delay: 20 }]
    const packet = encodeMacroDataWrite(9, actions)
    expect([...encodeMacroDataRead(9, 9)]).toEqual([0, 9, 0, 9])
    expect(decodeMacroData(new Uint8Array([0, ...packet.slice(1)]))).toEqual({ offset: 9, actions })

    const mode = { index: 2, sourceCode: 0x10, mode: 3 as const, repeatCount: 9, repeatDelay: 0x010203, actions }
    // 官方 protocol-keyboard 1.0.7 的 MacroModePack 原始布局，避免自编自解掩盖字段偏移错误。
    expect([...encodeMacroModeWrite(mode)]).toEqual([1, 0x10, 2, 0, 2, 3, 9, 0, 3, 2, 1])
    expect(decodeMacroMode(new Uint8Array([0, ...encodeMacroModeWrite(mode).slice(1)]))).toEqual({ index: 2, sourceCode: 0x10, mode: 3, repeatCount: 9, repeatDelay: 0x010203 })
  })
})
