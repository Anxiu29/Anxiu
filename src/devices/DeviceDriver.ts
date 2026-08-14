import type { DeviceSession } from '@/application/DeviceSession'
import type { DeviceManifest } from '@/domain/deviceManifest'

export interface DeviceDriver {
  readonly manifest: DeviceManifest
  connect(onDisconnect: () => void): Promise<DeviceSession>
  reconnectAuthorized(onDisconnect: () => void): Promise<DeviceSession | undefined>
  createDemoSession(): DeviceSession
}

export class DeviceDriverRegistry {
  private readonly drivers = new Map<string, DeviceDriver>()

  register(driver: DeviceDriver) {
    if (this.drivers.has(driver.manifest.id)) throw new Error(`设备驱动已注册：${driver.manifest.id}`)
    this.drivers.set(driver.manifest.id, driver)
    return this
  }

  get(id: string) {
    const driver = this.drivers.get(id)
    if (!driver) throw new Error(`找不到设备驱动：${id}`)
    return driver
  }

  list() { return [...this.drivers.values()] }

  get defaultDriver() {
    const driver = this.list()[0]
    if (!driver) throw new Error('尚未注册任何设备驱动')
    return driver
  }
}
