import type { FirmwareUpdateOptions } from '@/application/FirmwareUpdate'
import { WebHidTransport } from '@/transport/HidTransport'
import { FirmwareChannel } from '@/protocol/xsyd/FirmwareChannel'
import { updateFirmware, readFirmwareIdentity, assertFirmwareIdentity, firmwareDelay, type FirmwareIdentity } from '@/protocol/xsyd/FirmwareUpdater'
import { C98_DEVICE } from './device'

export const C98_FIRMWARE_SIZE = 105588
export const C98_FIRMWARE_SHA256 = '8bee06e292d3b4eb76249c0969c9d05731ff025d54c4b38d80a51bf5e2bcc78f'

/** 当前只支持用户指定的 739 单模固件；改名文件可以使用，其他二进制不能绕过校验。 */
export async function validateC98Firmware(image: Uint8Array) {
  if (image.length !== C98_FIRMWARE_SIZE) throw new Error('请选择本页下载的 C98(739) 单模 v1.0.1 官方固件（105588 字节）')
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(image))
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  if (hash !== C98_FIRMWARE_SHA256) throw new Error('固件 SHA-256 与已核对的官方文件不一致，请重新下载')
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
