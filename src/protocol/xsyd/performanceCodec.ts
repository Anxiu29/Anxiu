import { readUint16le, uint16le } from '@/protocol/codec'
import type { KeyPerformanceSettings } from '@/domain/performance'

const travelBytes = (value: number) => uint16le(Math.round(value * 1000))

/** 0x29：rw、两个保留字节、全局触发、顶部死区、底部死区和六个保留字节。 */
export function encodeGlobalPerformance(settings: KeyPerformanceSettings, write: boolean) {
  return new Uint8Array([
    write ? 1 : 0, 0, 0,
    ...travelBytes(settings.globalActuation),
    ...travelBytes(settings.pressDeadZone),
    ...travelBytes(settings.releaseDeadZone),
    0, 0, 0, 0, 0, 0,
  ])
}

export function decodeGlobalPerformance(data: Uint8Array) {
  return {
    globalActuation: readUint16le(data, 3) / 1000,
    pressDeadZone: readUint16le(data, 5) / 1000,
    releaseDeadZone: readUint16le(data, 7) / 1000,
  }
}
