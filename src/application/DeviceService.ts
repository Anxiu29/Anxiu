import type { ActiveDeviceSession, DeviceDriverRegistry } from './DeviceDriverRegistry'
import type { HidDeviceIdentity } from '@/domain/deviceManifest'

export interface ExternalDeviceEntry {
  id: string
  displayName: string
  path: string
  hid: readonly HidDeviceIdentity[]
}

function matchesExternal(entry: ExternalDeviceEntry, device: HIDDevice) {
  return entry.hid.some((hid) =>
    hid.vendorId === device.vendorId &&
    hid.productIds.includes(device.productId) &&
    device.collections.some((collection) =>
      (hid.usagePage === undefined || collection.usagePage === hid.usagePage) &&
      (hid.usage === undefined || collection.usage === hid.usage)))
}

export interface DeviceSelectionPort {
  request(filters: HIDDeviceFilter[]): Promise<HIDDevice[]>
  authorized(): Promise<HIDDevice[]>
}
export interface AuthorizedDevice {
  device: HIDDevice
  driverId: string
  name: string
}

/** 唯一的设备选择/切换入口；具体设备的初始化仍由插件执行。 */
export class DeviceService {
  private active?: ActiveDeviceSession
  private revision = 0
  private connecting = false
  constructor(
    readonly registry: DeviceDriverRegistry,
    private readonly selection: DeviceSelectionPort,
    private readonly externalDevices: readonly ExternalDeviceEntry[] = [],
  ) {}
  get session() {
    return this.active
  }
  request() {
    const externalFilters = this.externalDevices.flatMap((entry) => entry.hid.flatMap((hid) =>
      hid.productIds.map((productId) => ({
        vendorId: hid.vendorId,
        productId,
        usagePage: hid.usagePage,
        usage: hid.usage,
      }))))
    return this.selection.request([...this.registry.filters, ...externalFilters])
  }
  externalMatch(device: HIDDevice) {
    return this.externalDevices.find((entry) => matchesExternal(entry, device))
  }
  async authorized(): Promise<AuthorizedDevice[]> {
    return (await this.selection.authorized()).flatMap((device) => {
      const driver = this.registry.match(device)
      if (driver) return [{ device, driverId: driver.manifest.id, name: driver.manifest.displayName }]
      const external = this.externalMatch(device)
      return external ? [{ device, driverId: external.id, name: external.displayName }] : []
    })
  }
  adopt(session: ActiveDeviceSession) {
    this.active = session
  }
  async connect(device: HIDDevice, onDisconnect: () => void) {
    if (this.connecting) throw new Error('正在连接设备')
    if (this.externalMatch(device)) throw new Error('此设备需要在对应的设备页面连接')
    const driver = this.registry.match(device)
    if (!driver) throw new Error('不支持此设备或 HID 接口')
    this.connecting = true
    const ticket = ++this.revision
    try {
      await this.active?.close()
      this.active = undefined
      const session = await driver.connect(() => {
        if (ticket !== this.revision) return
        this.revision++
        const previous = this.active
        this.active = undefined
        void previous?.close().catch(console.error)
        onDisconnect()
      }, device)
      if (ticket !== this.revision) {
        await session.close()
        throw new Error('设备连接已取消')
      }
      this.active = session
      return { session, driverId: driver.manifest.id }
    } finally {
      this.connecting = false
    }
  }
  async disconnect() {
    this.revision++
    const session = this.active
    this.active = undefined
    await session?.close()
  }
}
