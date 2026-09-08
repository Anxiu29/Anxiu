import official from '@sparklinkplayjoy/protocol-keyboard'
import type { FirmwareUpdateOptions, FirmwareProgress } from '@/application/FirmwareUpdate'
import { encodePacket, readUint16le } from '../codec'
import { firmwareCrc, firmwareSignature } from './firmwareSignature'
import { FirmwareChannel } from './FirmwareChannel'

const commands = official.systemProtocol
export const firmwareDelay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const u32 = (bytes: Uint8Array, offset: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true)
export interface FirmwareIdentity { board: number; sn: Uint8Array; capacity: number; mode: number }

export async function readFirmwareIdentity(channel: FirmwareChannel): Promise<FirmwareIdentity> {
  const data = await channel.request(encodePacket(1, Uint8Array.of(1, 2, 3, 4, 255, 255)))
  if (data.length < 25 || data[8] !== 16 || ![0, 255].includes(data[7]!)) throw new Error('设备升级身份响应不完整')
  return { board: u32(data, 1), capacity: readUint16le(data, 5) * 256, mode: data[7]!, sn: data.slice(9, 25) }
}

export function assertFirmwareIdentity(actual: FirmwareIdentity, expected: FirmwareIdentity, size: number) {
  if (actual.board !== expected.board || actual.sn.some((byte, i) => byte !== expected.sn[i])) throw new Error('重连设备的板卡或序列号不匹配，未继续写入')
  if (!actual.capacity || size > actual.capacity) throw new Error('固件超过设备报告的可用空间')
}

/** 流程依据 SDK updateBin/toBoot；解锁链和擦除完成条件以协议 1.0.7 为准。 */
export async function updateFirmware(
  initial: FirmwareChannel, image: Uint8Array, options: FirmwareUpdateOptions,
  reconnect: (identity: FirmwareIdentity, mode: number) => Promise<FirmwareChannel>,
  delay = firmwareDelay,
) {
  const padded = new Uint8Array(Math.ceil(image.length / 512) * 512).fill(255)
  if (!image.length) throw new Error('固件不能为空')
  padded.set(image)
  let channel = initial
  let identity = await readFirmwareIdentity(channel)
  assertFirmwareIdentity(identity, identity, padded.length)
  const progress = (stage: FirmwareProgress['stage'], message: string, current = 0) => options.onProgress({ stage, message, current, total: padded.length })
  const unlock = async (operation: number) => {
    const sign = async (code: number, seed: Uint8Array) => {
      const data = await channel.request(commands.blSIGN(code, firmwareSignature(seed, code), [...seed]))
      if (data.length < 19 || data[1] !== code || data[2] !== 16) throw new Error('升级签名响应无效')
      await delay(10)
      return data.slice(3, 19)
    }
    const challenge = await sign(2, identity.sn)
    await sign(operation, challenge)
  }
  const erase = async (size: number) => {
    await unlock(3)
    await channel.request(commands.blERASE(size), (data) => {
      if (data.length < 2) throw new Error('擦除进度响应不完整')
      return data[1] === 255
    }, 30000)
  }
  if (identity.mode === 0) {
    progress('boot', '正在进入 Bootloader，请勿断电')
    await erase(0)
    await unlock(4)
    // 重启可能没有 ACK：发送成功后必须通过重新枚举、SYNC 和身份核对确认结果。
    await channel.sendRestart(commands.blREBOOT())
    progress('reconnecting', '等待 Bootloader 重新连接')
    await delay(4000)
    channel = await reconnect(identity, 255)
    const bootIdentity = await readFirmwareIdentity(channel)
    assertFirmwareIdentity(bootIdentity, identity, padded.length)
    if (bootIdentity.mode !== 255) throw new Error('设备没有进入 Bootloader')
    identity = bootIdentity
  }
  progress('erasing', '正在擦除固件区域')
  await erase(padded.length)
  await unlock(6)
  for (let address = 0; address < padded.length;) {
    const size = Math.min(244, padded.length - address)
    await delay(30)
    const data = await channel.request(commands.blWRITE({ addr: address, size, codes: [...padded.slice(address, address + size)] }))
    if (data.length < 7 || u32(data, 1) !== address || readUint16le(data, 5) !== size) throw new Error('固件写入地址或长度确认不一致，已停止写入')
    address += size
    progress('writing', '正在写入固件，请勿拔出键盘', address)
  }
  progress('verifying', '正在校验设备中的完整固件', padded.length)
  const data = await channel.request(commands.blRCRC(padded.length))
  const crc = firmwareCrc(padded)
  if (data.length < 11 || u32(data, 1) !== 0 || u32(data, 5) !== padded.length || readUint16le(data, 9) !== crc) throw new Error('固件 CRC 校验失败，未跳转应用')
  await unlock(5)
  progress('restarting', '校验通过，等待键盘重启', padded.length)
  await channel.sendRestart(commands.blTOAPP(padded.length, crc))
  await delay(4000)
  channel = await reconnect(identity, 0)
  const app = await readFirmwareIdentity(channel)
  assertFirmwareIdentity(app, identity, padded.length)
  if (app.mode !== 0) throw new Error('固件已写入，但设备尚未恢复应用模式')
  progress('complete', '固件写入、CRC 校验及应用模式重连完成', padded.length)
}
