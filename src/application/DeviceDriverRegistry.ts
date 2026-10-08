import type { MouseSession } from './MouseSession'
import type { DeviceSession } from './DeviceSession'
import type { DeviceManifest, HidDeviceIdentity } from '@/domain/deviceManifest'
import type { FirmwareUpdateOptions } from './FirmwareUpdate'

export function hidIdentities(manifest: Pick<DeviceManifest, 'hid'>): HidDeviceIdentity[] {
  const hid = manifest.hid
  if (!hid) return []
  return 'vendorId' in hid ? [hid] : [...hid]
}

function hidConflicts(left: HidDeviceIdentity, right: HidDeviceIdentity) {
  return (
    left.vendorId === right.vendorId &&
    left.productIds.some((pid) => right.productIds.includes(pid)) &&
    (left.usagePage === undefined ||
      right.usagePage === undefined ||
      left.usagePage === right.usagePage) &&
    (left.usage === undefined || right.usage === undefined || left.usage === right.usage)
  )
}

function hidMatches(
  hid: HidDeviceIdentity,
  device: Pick<HIDDevice, 'vendorId' | 'productId' | 'collections'>,
) {
  return (
    hid.vendorId === device.vendorId &&
    hid.productIds.includes(device.productId) &&
    device.collections.some(
      (collection) =>
        (hid.usagePage === undefined || collection.usagePage === hid.usagePage) &&
        (hid.usage === undefined || collection.usage === hid.usage),
    )
  )
}

/** 外层设备插件必须实现的应用端口。 */
export interface DeviceDriver {
  readonly manifest: DeviceManifest & { kind: 'keyboard' }
  connect(onDisconnect: () => void, selectedDevice?: HIDDevice): Promise<DeviceSession>
  reconnectAuthorized(onDisconnect: () => void): Promise<DeviceSession | undefined>
  createDemoSession(): DeviceSession
  downloadFirmware?(onProgress: FirmwareUpdateOptions['onProgress']): Promise<Uint8Array>
  validateFirmware?(image: Uint8Array): Promise<void>
  requestUpgradeDevice?(): Promise<HIDDevice>
  upgradeFirmware?(image: Uint8Array, options: FirmwareUpdateOptions): Promise<void>
}

export interface MouseDriver {
  createDemoSession?(): MouseSession
  readonly manifest: DeviceManifest & { kind: 'mouse' }
  connect(onDisconnect: () => void, selectedDevice?: HIDDevice): Promise<MouseSession>
}
export type RegisteredDriver = DeviceDriver | MouseDriver
export type ActiveDeviceSession = DeviceSession | MouseSession

export class DeviceDriverRegistry {
  private readonly drivers = new Map<string, RegisteredDriver>()

  register(driver: RegisteredDriver) {
    // 重复 id 通常意味着组合根误注册，启动阶段立即失败比运行时选错驱动更安全。
    if (this.drivers.has(driver.manifest.id))
      throw new Error(`设备驱动已注册：${driver.manifest.id}`)
    const candidates = hidIdentities(driver.manifest)
    if (driver.manifest.hid && !candidates.length) throw new Error('设备没有声明 PID')
    if (candidates.some((item) => !item.productIds.length)) throw new Error('设备没有声明 PID')
    for (const existing of this.drivers.values()) {
      const identities = hidIdentities(existing.manifest)
      if (candidates.some((candidate) => identities.some((identity) => hidConflicts(identity, candidate))))
        throw new Error('设备 HID 身份重复')
    }
    this.drivers.set(driver.manifest.id, driver)
    return this
  }

  get(id: string) {
    const driver = this.drivers.get(id)
    if (!driver) throw new Error(`找不到设备驱动：${id}`)
    return driver
  }

  keyboard(id?: string): DeviceDriver {
    const driver = id ? this.get(id) : this.list().find((item) => item.manifest.kind === 'keyboard')
    if (!driver || driver.manifest.kind !== 'keyboard') throw new Error('当前设备不是键盘')
    return driver as DeviceDriver
  }

  match(device: Pick<HIDDevice, 'vendorId' | 'productId' | 'collections'>) {
    const matches = this.list().filter(({ manifest }) =>
      hidIdentities(manifest).some((hid) => hidMatches(hid, device)),
    )
    if (matches.length > 1) throw new Error('设备身份与多个驱动匹配，请检查型号注册')
    return matches[0]
  }

  get filters(): HIDDeviceFilter[] {
    return this.list().flatMap(({ manifest }) =>
      hidIdentities(manifest).flatMap((hid) =>
        hid.productIds.map((productId) => ({
          vendorId: hid.vendorId,
          productId,
          usagePage: hid.usagePage,
          usage: hid.usage,
        })),
      ),
    )
  }

  list() {
    return [...this.drivers.values()]
  }

  get defaultDriver() {
    // 单设备版本默认取第一个；多设备 UI 可以通过 driverId 显式选择。
    const driver = this.list()[0]
    if (!driver) throw new Error('尚未注册任何设备驱动')
    return driver
  }
}
