import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeviceDriverRegistry, type DeviceDriver } from '@/application/DeviceDriverRegistry'
import { DeviceService } from '@/application/DeviceService'
import { CB75Driver } from '@/devices/cb75/CB75Driver'
import { C98Driver } from '@/devices/c98/C98Driver'
import { CB75_CONFIG } from '@/devices/cb75/config'
import { CB75_KEYBOARD_ENTRY } from '@/devices/cb75k/entry'
import { CapturedMouse, MouseHid } from './helpers/tlwDevice'

let hid: MouseHid
const services: DeviceService[] = []
beforeEach(() => {
  hid = new MouseHid()
  vi.stubGlobal('navigator', { hid })
})
afterEach(async () => {
  for (const service of services.splice(0)) await service.disconnect()
  vi.unstubAllGlobals()
})
function setup() {
  const registry = new DeviceDriverRegistry().register(new C98Driver()).register(new CB75Driver())
  const service = new DeviceService(registry, {
    request: (filters) => hid.asHid().requestDevice({ filters }),
    authorized: async () => [],
  })
  services.push(service)
  return { registry, service }
}

describe('unified device registry', () => {
  it('lists CB75 USB and 2.4G in the shared chooser and routes them to the RK page', async () => {
    const registry = new DeviceDriverRegistry().register(new C98Driver()).register(new CB75Driver())
    const usb = {
      vendorId: 0x258a, productId: 0x02f1,
      collections: [{ usagePage: 0xff00, usage: 0x0001 }],
    } as HIDDevice
    const dongle = {
      vendorId: 0x3554, productId: 0xfa09,
      collections: [{ usagePage: 0xff02, usage: 0x0002 }],
    } as HIDDevice
    const request = vi.fn(async (_filters: HIDDeviceFilter[]) => [] as HIDDevice[])
    const service = new DeviceService(registry, { request, authorized: async () => [usb, dongle] }, [CB75_KEYBOARD_ENTRY])

    await service.request()
    expect(request.mock.calls[0]?.[0]).toEqual(expect.arrayContaining([
      { vendorId: 0x258a, productId: 0x02f1, usagePage: 0xff00, usage: 0x0001 },
      { vendorId: 0x3554, productId: 0xfa09, usagePage: 0xff02, usage: 0x0002 },
    ]))
    expect((await service.authorized()).map(({ driverId }) => driverId)).toEqual(['cb75-keyboard', 'cb75-keyboard'])
    expect(service.externalMatch(usb)?.path).toBe('/cb75/index.html')
    expect(service.externalMatch(dongle)?.path).toBe('/cb75/index.html')
    await expect(service.connect(usb, vi.fn())).rejects.toThrow('设备页面')
  })
  it('registers keyboard and mouse with independent protocol families and one chooser', async () => {
    const { registry, service } = setup()
    expect(
      registry.list().map((driver) => [driver.manifest.kind, driver.manifest.protocolFamily]),
    ).toEqual([
      ['keyboard', 'sparklink'],
      ['mouse', 'tlw'],
    ])
    await service.request()
    expect(hid.requestDevice).toHaveBeenCalledWith({
      filters: [
        { vendorId: 0x1ca2, productId: 0x1604, usagePage: 0xffa0, usage: 1 },
        { vendorId: 0x320f, productId: 0x22f2, usagePage: 0xff1c, usage: 0x92 },
        { vendorId: 0x320f, productId: 0x22f3, usagePage: 0xff1c, usage: 0x92 },
      ],
    })
    expect(CB75_CONFIG.storage.macros).toBe('cb75-mouse.macros.v1')
    expect(CB75_CONFIG.profileModel).toBe('CB75-Mouse')
  })
  it('rejects duplicate IDs and conflicting HID identities', () => {
    const { registry } = setup()
    expect(() => registry.register(new CB75Driver())).toThrow('已注册')
    const duplicate = new CB75Driver()
    Object.assign(duplicate.manifest, { id: 'another-mouse' })
    expect(() => registry.register(duplicate)).toThrow('HID')
  })
  it('permits different collections on one VID/PID and matches the exact interface', () => {
    const { registry } = setup()
    const other = new CB75Driver()
    Object.assign(other.manifest, {
      id: 'another-interface',
      hid: { ...other.manifest.hid, usage: 3 },
    })
    registry.register(other)
    expect(registry.match(new CapturedMouse().asHid())?.manifest.id).toBe('cb75')
    const wrong = new CapturedMouse()
    wrong.collections = [{ usagePage: 1, usage: 6 }]
    expect(registry.match(wrong.asHid())).toBeUndefined()
  })
  it.each([false, true])(
    'initializes a mouse via the selected driver (wireless: %s)',
    async (wireless) => {
      const { service } = setup(),
        device = new CapturedMouse(wireless)
      const { session } = await service.connect(device.asHid(), vi.fn())
      expect(session.kind).toBe('mouse')
      expect(device.sent.map((p) => p[2])).toEqual(wireless ? [0xa1, 0xa3, 0xa3, 0xa2] : [0xa3])
      expect(hid.requestDevice).not.toHaveBeenCalled()
    },
  )
  it('keeps the active connection when the authorization window is cancelled', async () => {
    const { service } = setup(),
      device = new CapturedMouse()
    await service.connect(device.asHid(), vi.fn())
    expect(await service.request()).toEqual([])
    expect(service.session).toBeDefined()
    expect(device.close).not.toHaveBeenCalled()
  })
  it('closes the previous connection when switching and ignores its later disconnect', async () => {
    const { service } = setup(),
      first = new CapturedMouse(),
      second = new CapturedMouse(true),
      disconnected = vi.fn()
    await service.connect(first.asHid(), disconnected)
    await service.connect(second.asHid(), disconnected)
    expect(first.close).toHaveBeenCalledOnce()
    hid.disconnect(first.asHid())
    expect(disconnected).not.toHaveBeenCalled()
    hid.disconnect(second.asHid())
    expect(disconnected).toHaveBeenCalledOnce()
    expect(service.session).toBeUndefined()
  })
  it('cleans up initialization failure and permits retry', async () => {
    const { service } = setup(),
      device = new CapturedMouse()
    device.sendReport.mockRejectedValue(new Error('broken'))
    await expect(service.connect(device.asHid(), vi.fn())).rejects.toThrow('broken')
    expect(device.close).toHaveBeenCalledOnce()
    await service.connect(new CapturedMouse().asHid(), vi.fn())
    expect(service.session?.kind).toBe('mouse')
  })
  it('rejects an unknown device without closing the current session', async () => {
    const { service } = setup(),
      first = new CapturedMouse(),
      unknown = new CapturedMouse()
    await service.connect(first.asHid(), vi.fn())
    unknown.productId = 1
    await expect(service.connect(unknown.asHid(), vi.fn())).rejects.toThrow('不支持')
    expect(first.close).not.toHaveBeenCalled()
  })
  it('closes a late initialization after the application is disposed', async () => {
    const { service } = setup(),
      device = new CapturedMouse()
    let finish!: () => void
    device.open.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = () => {
            device.opened = true
            resolve()
          }
        }),
    )
    const pending = service.connect(device.asHid(), vi.fn())
    const rejected = expect(pending).rejects.toThrow('取消')
    await vi.waitFor(() => expect(device.open).toHaveBeenCalled())
    await service.disconnect()
    finish()
    await rejected
    expect(device.opened).toBe(false)
    expect(service.session).toBeUndefined()
  })
  it('passes the selected keyboard directly to its driver', async () => {
    const keyboard = new C98Driver()
    const session = keyboard.createDemoSession()
    const driver: DeviceDriver = {
      manifest: keyboard.manifest,
      connect: vi.fn(async () => session),
      reconnectAuthorized: async () => undefined,
      createDemoSession: () => session,
    }
    const device = {
      vendorId: 0x1ca2,
      productId: 0x1604,
      collections: [{ usagePage: 0xffa0, usage: 1 }],
    } as HIDDevice
    const service = new DeviceService(new DeviceDriverRegistry().register(driver), {
      request: async () => [device],
      authorized: async () => [device],
    })
    services.push(service)
    const result = await service.connect(device, vi.fn())
    expect(result.session.kind).toBe('keyboard')
    expect(driver.connect).toHaveBeenCalledWith(expect.any(Function), device)
    expect(await service.authorized()).toHaveLength(1)
  })
})
