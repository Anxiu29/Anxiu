import type { FirmwareUpdateOptions } from '@/application/FirmwareUpdate'
import { WebHidTransport } from '@/transport/HidTransport'
import { FirmwareChannel } from '@/protocol/xsyd/FirmwareChannel'
import { updateFirmware, readFirmwareIdentity, assertFirmwareIdentity, firmwareDelay, type FirmwareIdentity } from '@/protocol/xsyd/FirmwareUpdater'
import { C98_DEVICE } from './device'

export const C98_FIRMWARE_SIZE = 105588
export const C98_FIRMWARE_SHA256 = '8bee06e292d3b4eb76249c0969c9d05731ff025d54c4b38d80a51bf5e2bcc78f'

export const C98_FIRMWARE_URL = 'https://drive.rkgaming.com/down/work/RKWEB/firmware/C98(739)/1_MODE/XS105_RK739X_C98_App_v1.0.1_20250515a.bin'

export async function downloadC98Firmware(onProgress: FirmwareUpdateOptions['onProgress']) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  try {
    const response = await fetch(C98_FIRMWARE_URL, { signal: controller.signal, credentials: 'omit', cache: 'no-store' })
    if (!response.ok) throw new Error('官方固件获取失败（HTTP ' + response.status + '），请稍后重试')
    if (!response.body) throw new Error('官方固件响应为空，请重试')
    reader = response.body.getReader()
    const image = new Uint8Array(C98_FIRMWARE_SIZE)
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (size + value.length > image.length) throw new Error('官方固件大小不匹配，已停止升级')
      image.set(value, size)
      size += value.length
      onProgress({ stage: 'downloading', current: size, total: image.length, message: '正在获取官方固件' })
    }
    if (size !== image.length) throw new Error('官方固件下载不完整，请重新在线升级')
    return image
  } catch (cause) {
    if (controller.signal.aborted) throw new Error('获取官方固件超时，请检查网络后重试')
    if (cause instanceof TypeError) throw new Error('无法获取官方固件，请检查网络后重试')
    throw cause
  } finally {
    await reader?.cancel().catch(() => undefined)
    clearTimeout(timeout)
  }
}

/** 只允许已核对的 739 单模官方固件通过校验。 */
export async function validateC98Firmware(image: Uint8Array) {
  if (image.length !== C98_FIRMWARE_SIZE) throw new Error('在线固件不匹配，需要 C98(739) 单模 v1.0.1 官方固件（105588 字节）')
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(image))
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  if (hash !== C98_FIRMWARE_SHA256) throw new Error('固件 SHA-256 与已核对的官方文件不一致，请重新在线升级')
}

export function requestC98UpgradeDevice() {
  // 必须直接从用户点击调用；重枚举后仍只允许本型号的 VID/PID。
  return navigator.hid.requestDevice({ filters: [{ vendorId: C98_DEVICE.vendorId, productId: C98_DEVICE.productId }] })
    .then((devices) => { if (!devices[0]) throw new Error('未选择升级设备'); return devices[0] })
}

export async function upgradeC98Firmware(device: HIDDevice | undefined, image: Uint8Array, options: FirmwareUpdateOptions) {
  await validateC98Firmware(image)
  let transport: WebHidTransport | undefined
  // 重启移除旧 HID 对象后 close 可能拒绝；监听器由 transport 的 finally 保证释放。
  const release = async () => { await transport?.close().catch(() => undefined) }
  const open = async (target: HIDDevice) => {
    if (target.vendorId !== C98_DEVICE.vendorId || target.productId !== C98_DEVICE.productId) throw new Error('所选设备不是受支持的 C98')
    await release()
    transport = new WebHidTransport(C98_DEVICE)
    transport.setDevice(target)
    await transport.open()
    return new FirmwareChannel(transport, options.onDiagnostic)
  }
  const authorize = async () => {
    options.onProgress({ stage: 'authorizing', current: 0, total: image.length, message: '请点击“授权升级设备”，选择重新出现的 C98；保持键盘供电' })
    return open(await options.authorizeDevice())
  }
  const reconnect = async (expected: FirmwareIdentity, mode: number) => {
    await release()
    const deadline = Date.now() + 10000
    while (Date.now() < deadline) {
      for (const candidate of await navigator.hid.getDevices()) {
        if (candidate.vendorId !== C98_DEVICE.vendorId || candidate.productId !== C98_DEVICE.productId) continue
        try {
          const channel = await open(candidate)
          const identity = await readFirmwareIdentity(channel)
          assertFirmwareIdentity(identity, expected, Math.ceil(image.length / 512) * 512)
          if (identity.mode === mode) return channel
        } catch (cause) {
          options.onDiagnostic?.({ kind: 'connection', outcome: 'failure', message: cause instanceof Error ? cause.message : String(cause) })
        }
        await release()
      }
      await firmwareDelay(500)
    }
    const channel = await authorize()
    const identity = await readFirmwareIdentity(channel)
    assertFirmwareIdentity(identity, expected, Math.ceil(image.length / 512) * 512)
    if (identity.mode !== mode) throw new Error('所选设备没有进入预期的运行模式')
    return channel
  }
  try {
    let channel: FirmwareChannel
    try { if (!device) throw new Error('需要授权'); channel = await open(device); await readFirmwareIdentity(channel) }
    catch { channel = await authorize() }
    await updateFirmware(channel, image, options, reconnect)
    return transport?.hidDevice
  } finally { await release() }
}
