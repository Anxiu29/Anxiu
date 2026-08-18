import type { DeviceSession } from './DeviceSession'
import type { DeviceDriverRegistry } from './DeviceDriverRegistry'

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
    return this.registry.list().map(({ manifest }) => manifest)
  }

  get session() { return this.active }

  async connect(options: ConnectOptions = {}) {
    // 同一时刻只保留一个活动会话，先关闭旧监听和传输，防止报告被两个会话消费。
    await this.disconnect()
    const driver = options.driverId ? this.registry.get(options.driverId) : this.registry.defaultDriver
    this.active = options.demo
      ? driver.createDemoSession()
      : await driver.connect(options.onDisconnect ?? (() => undefined))
    return this.active
  }

  async reconnectAuthorized(options: Omit<ConnectOptions, 'demo'> = {}) {
    // WebHID 的 getDevices 只能返回用户过去授权过的设备，因此此路径不会弹选择框。
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
