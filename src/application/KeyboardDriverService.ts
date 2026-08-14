import type { DeviceSession } from './DeviceSession'
import type { DeviceDriverRegistry } from '@/devices/DeviceDriver'

export interface ConnectOptions {
  driverId?: string
  demo?: boolean
  onDisconnect?: () => void
}

/** UI 无关的应用门面；React、Vue、桌面壳或测试都使用同一入口。 */
export class KeyboardDriverService {
  private active?: DeviceSession

  constructor(private readonly registry: DeviceDriverRegistry) {}

  get availableDrivers() {
    return this.registry.list().map(({ id, displayName }) => ({ id, displayName }))
  }

  get session() { return this.active }

  async connect(options: ConnectOptions = {}) {
    await this.disconnect()
    const driver = options.driverId ? this.registry.get(options.driverId) : this.registry.defaultDriver
    this.active = options.demo
      ? driver.createDemoSession()
      : await driver.connect(options.onDisconnect ?? (() => undefined))
    return this.active
  }

  async reconnectAuthorized(options: Omit<ConnectOptions, 'demo'> = {}) {
    await this.disconnect()
    const driver = options.driverId ? this.registry.get(options.driverId) : this.registry.defaultDriver
    this.active = await driver.reconnectAuthorized(options.onDisconnect ?? (() => undefined))
    return this.active
  }

  async disconnect() {
    await this.active?.close()
    this.active = undefined
  }
}
