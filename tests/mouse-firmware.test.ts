import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CB75FirmwareUpdater, crc16, firmwareData, firmwareEnd, validateFirmware } from '@/devices/cb75/firmware'
import { CB75_FIRMWARE_RESOURCES } from '@/devices/cb75/firmwareResources'
import { CB75Driver } from '@/devices/cb75/CB75Driver'
import { MouseSession, type MouseFirmwareSupport } from '@/application/MouseSession'
import { useDeviceStore } from '@/stores/mouse/deviceStore'

function smallImage() {
  const bytes = new Uint8Array(33)
  bytes.set([0x4b, 0x4e, 0x4c, 0x54, 0x0d, 0, 0x88, 0], 8)
  new DataView(bytes.buffer).setUint32(24, bytes.length, true)
  return bytes
}
class FirmwareDevice extends EventTarget {
  vendorId = 0x320f
  productId = 0x22f2
  opened = true
  collections = [{ outputReports: [{ reportId: 5 }], children: [] }]
  packets: Uint8Array[] = []
  open = vi.fn(async () => { this.opened = true })
  close = vi.fn(async () => { this.opened = false })
  respond = true
  sendReport = vi.fn(async (reportId: number, packet: Uint8Array) => {
    this.packets.push(packet.slice())
    if (!this.respond || packet[8] === 2 && packet[9] === 0xff) return
    const reply = packet.slice(0, 32)
    const index = packet[8] | packet[9] << 8
    new DataView(reply.buffer).setUint16(8, index === 0xff01 ? 0 : index + 1, true)
    const event = new Event('inputreport')
    Object.assign(event, { reportId, data: new DataView(reply.buffer) })
    this.dispatchEvent(event)
  })
  asHid() { return this as unknown as HIDDevice }
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('navigator', { hid: new EventTarget() })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('ships the supplied BIN and EXE unchanged and validates the captured image', () => {
  const bin = readFileSync('public/firmware/cb75-mouse/cb75-mouse-20260922.bin')
  expect(bin.length).toBe(112164)
  expect(createHash('sha256').update(bin).digest('hex')).toBe(CB75_FIRMWARE_RESOURCES.online!.sha256)
  expect(validateFirmware(new Uint8Array(bin)).length).toBe(112176)
  const exe = readFileSync('public/firmware/cb75-mouse/cb75-mouse-V0110-20260921.exe')
  expect(exe.subarray(0, 2).toString()).toBe('MZ')
  expect(createHash('sha256').update(exe).digest('hex')).toBe('2060fe33b8cf88d0679a4ff506a47fe3be4b03c26d8d1fccb70900f1ba9cd5a8')
})
it('rejects malformed headers, lengths and non-FF padding', () => {
  const wrongHeader = smallImage(); wrongHeader[8] = 0
  expect(() => validateFirmware(wrongHeader)).toThrow('header')
  expect(() => validateFirmware(smallImage().slice(0, 32))).toThrow('size')
  const padded = validateFirmware(smallImage()); padded[47] = 0
  expect(() => validateFirmware(padded)).toThrow('size')
})
it('sends acknowledged 16-byte blocks with CRC and a final index, then removes listeners', async () => {
  const target = new FirmwareDevice()
  const removed = vi.spyOn(target, 'removeEventListener')
  const progress = vi.fn()
  await new CB75FirmwareUpdater(target.asHid()).update(smallImage(), progress)
  expect(target.packets).toHaveLength(5)
  expect(target.packets[0].slice(8, 10)).toEqual(Uint8Array.of(1, 255))
  const block = target.packets[1]
  expect(new DataView(block.buffer).getUint16(26, true)).toBe(crc16(block.slice(8, 26)))
  expect(target.packets[4]).toEqual(firmwareEnd(2))
  expect(progress).toHaveBeenLastCalledWith(100)
  expect(removed).toHaveBeenCalledWith('inputreport', expect.any(Function))
  expect(() => firmwareData(0xff00, new Uint8Array(16))).toThrow()
})
it('does not report success or send the end packet when an acknowledgement is missing', async () => {
  const target = new FirmwareDevice(); target.respond = false
  const progress = vi.fn()
  await expect(new CB75FirmwareUpdater(target.asHid(), 10).update(smallImage(), progress)).rejects.toThrow('timeout')
  expect(target.packets).toHaveLength(1)
  expect(progress).not.toHaveBeenCalledWith(100)
})

async function setupStore(target = new FirmwareDevice()) {
  const demo = new CB75Driver().createDemoSession()
  const support: MouseFirmwareSupport = {
    maxImageBytes: 0xff00 * 16,
    validate: validateFirmware,
    requestDevice: vi.fn(async () => target.asHid()),
    update: vi.fn(async () => undefined),
  }
  const session = new MouseSession(demo.device, { ...demo.identity, demo: false, connection: 'wired' }, async () => undefined, support)
  const store = useDeviceStore()
  await store.attach(session)
  return { store, support, target, session }
}
it('locks writes after transfer and requires a new connection', async () => {
  const { store, support } = await setupStore()
  expect(await store.updateFirmware(smallImage())).toBe(true)
  expect(support.update).toHaveBeenCalledOnce()
  expect(store.firmwareState).toBe('sent')
  expect(store.firmwareNeedsReconnect).toBe(true)
  const write = vi.fn()
  expect(await store.run(write)).toBe(false)
  expect(write).not.toHaveBeenCalled()
  expect(await store.updateFirmware(smallImage())).toBe(false)
  store.reset()
  expect(store.firmwareNeedsReconnect).toBe(false)
})
it('allows retry after cancelling device selection and keeps the existing interface open', async () => {
  const { store, support, target } = await setupStore()
  vi.mocked(support.requestDevice).mockResolvedValueOnce(undefined)
  expect(await store.updateFirmware(smallImage())).toBe(false)
  expect(store.firmwareState).toBe('idle')
  expect(store.firmwareNeedsReconnect).toBe(false)
  expect(await store.updateFirmware(smallImage())).toBe(true)
  expect(target.close).not.toHaveBeenCalled()
})
it('closes an interface opened for a failed update and blocks further writes', async () => {
  const target = new FirmwareDevice(); target.opened = false
  const { store, support } = await setupStore(target)
  vi.mocked(support.update).mockRejectedValueOnce(new Error('Transfer failed'))
  expect(await store.updateFirmware(smallImage())).toBe(false)
  expect(store.firmwareState).toBe('failed')
  expect(store.error).toBe('Transfer failed')
  expect(store.firmwareNeedsReconnect).toBe(true)
  expect(target.close).toHaveBeenCalledOnce()
})
it('ignores device selection completed after disconnect', async () => {
  const { store, support, target } = await setupStore()
  let resolve!: (target: HIDDevice) => void
  vi.mocked(support.requestDevice).mockReturnValueOnce(new Promise((done) => { resolve = done }))
  const pending = store.updateFirmware(smallImage())
  store.reset()
  resolve(target.asHid())
  expect(await pending).toBe(false)
  expect(support.update).not.toHaveBeenCalled()
  expect(store.firmwareState).toBe('idle')
})
