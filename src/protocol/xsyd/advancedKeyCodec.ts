import type { DksAdvancedKey, EndAdvancedKey, MptAdvancedKey, MtAdvancedKey, SocdAdvancedKey, TglAdvancedKey } from '@/domain/advancedKey'
import { readUint16le, uint16le } from '@/protocol/codec'

const millimetresToProtocol = (value: number) => Math.round(value * 1000)
const protocolToMillimetres = (value: number) => value / 1000

/** 写标记 1 后依次编码四个 16 位键码、四个 TRPS 字节和两段行程。 */
export function encodeDks(settings: DksAdvancedKey) {
  return new Uint8Array([1, settings.sourceCode, ...settings.keyCodes.flatMap(uint16le), ...settings.triggers.map((value) => value & 0xff), ...settings.travels.flatMap((value) => uint16le(millimetresToProtocol(value)))])
}

export function encodeMpt(settings: MptAdvancedKey) {
  return new Uint8Array([1, settings.sourceCode, ...settings.keyCodes.flatMap(uint16le), ...settings.travels.flatMap((value) => uint16le(millimetresToProtocol(value)))])
}

export function decodeMpt(sourceCode: number, data: Uint8Array): MptAdvancedKey {
  return { type: 'mpt', sourceCode, keyCodes: [readUint16le(data, 2), readUint16le(data, 4), readUint16le(data, 6)], travels: [protocolToMillimetres(readUint16le(data, 8)), protocolToMillimetres(readUint16le(data, 10)), protocolToMillimetres(readUint16le(data, 12))] }
}

/** MT 的固件字段以 10 ms 为一档，领域层和 UI 仍统一使用毫秒。 */
export function encodeMt(settings: MtAdvancedKey) {
  return new Uint8Array([1, settings.sourceCode, ...settings.keyCodes.flatMap(uint16le), Math.round(settings.delay / 10) & 0xff])
}

export function encodeTgl(settings: TglAdvancedKey) {
  return new Uint8Array([1, settings.sourceCode, ...uint16le(settings.keyCode), Math.round(settings.delay / 10) & 0xff])
}

export function decodeTgl(sourceCode: number, data: Uint8Array): TglAdvancedKey {
  return { type: 'tgl', sourceCode, keyCode: readUint16le(data, 2), delay: (data[4] ?? 0) * 10 }
}

/** 协议 1.0.7 起 END 的 delay 扩展为 16 位；当前适配器按该格式读写。 */
export function encodeEnd(settings: EndAdvancedKey) {
  return new Uint8Array([1, settings.sourceCode, ...uint16le(settings.keyCode), ...uint16le(settings.delay)])
}

export function decodeEnd(sourceCode: number, data: Uint8Array): EndAdvancedKey {
  return { type: 'end', sourceCode, keyCode: readUint16le(data, 2), delay: readUint16le(data, 4) }
}

export function encodeSocd(settings: SocdAdvancedKey) {
  // type=1 表示按 key1/key2 发送用户选择的输出键；type=0 会忽略它们并按物理位置发送。
  return new Uint8Array([1, settings.sourceCode, settings.pairedSourceCode, ...uint16le(settings.keyCodes[0]), ...uint16le(settings.keyCodes[1]), 1, settings.mode, ...uint16le(settings.delay)])
}

export function decodeSocd(sourceCode: number, data: Uint8Array): SocdAdvancedKey {
  return { type: 'socd', sourceCode: data[1] ?? sourceCode, pairedSourceCode: data[2] ?? sourceCode, keyCodes: [readUint16le(data, 3), readUint16le(data, 5)], mode: ((data[8] ?? 0) & 0x03) as SocdAdvancedKey['mode'], delay: readUint16le(data, 9) }
}

export const advancedReadRequest = (sourceCode: number) => new Uint8Array([0, sourceCode])
