import type { DeviceSession } from './DeviceSession'
import type { DeviceManifest } from '@/domain/deviceManifest'

/** 外层设备插件必须实现的应用端口。 */
export interface DeviceDriver {
  readonly manifest: DeviceManifest
  connect(onDisconnect: () => void): Promise<DeviceSession>
  reconnectAuthorized(onDisconnect: () => void): Promise<DeviceSession | undefined>
  createDemoSession(): DeviceSession
}

export class DeviceDriverRegistry {
  private readonly drivers = new Map<string, DeviceDriver>()

  register(driver: DeviceDriver) {
    // 重复 id 通常意味着组合根误注册，启动阶段立即失败比运行时选错驱动更安全。
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
    // 单设备版本默认取第一个；多设备 UI 可以通过 driverId 显式选择。
    const driver = this.list()[0]
    if (!driver) throw new Error('尚未注册任何设备驱动')
    return driver
  }
}
