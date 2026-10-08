import type { DeviceSession } from './DeviceSession'
import type { DeviceDriverRegistry } from './DeviceDriverRegistry'
import type { FirmwareUpdateOptions } from './FirmwareUpdate'

export interface ConnectOptions {
  driverId?: string
  demo?: boolean
  onDisconnect?: () => void
}

/** UI 无关的应用门面；React、Vue、桌面壳或测试都使用同一入口。 */
export class KeyboardDriverService {
  private active?: DeviceSession
  private activeDriverId?: string
  private demo = false

  constructor(private readonly registry: DeviceDriverRegistry) {}

  get availableDrivers() {
    return this.registry.list().map(({ manifest }) => manifest)
  }

  adopt(session: DeviceSession, driverId: string) {
    this.active = session
    this.activeDriverId = driverId
    this.demo = false
  }

  release() {
    this.active = undefined
    this.activeDriverId = undefined
  }

  get session() {
    return this.active
  }
  get driverId() {
    return this.activeDriverId
  }
  get canUpgradeFirmware() {
    return (
      !this.demo &&
      !!this.activeDriverId &&
      !!this.registry.keyboard(this.activeDriverId).upgradeFirmware
    )
  }
  requestUpgradeDevice() {
    if (!this.canUpgradeFirmware) return Promise.reject(new Error('当前会话不能授权升级设备'))
    return this.registry.keyboard(this.activeDriverId!).requestUpgradeDevice!()
  }

  async downloadFirmware(onProgress: FirmwareUpdateOptions['onProgress']) {
    if (!this.canUpgradeFirmware) throw new Error('当前会话不支持固件升级')
    const driver = this.registry.keyboard(this.activeDriverId!)
    if (!driver.downloadFirmware) throw new Error('当前设备暂无可用的官方在线固件')
    return driver.downloadFirmware(onProgress)
  }

  async upgradeFirmware(image: Uint8Array, options: FirmwareUpdateOptions) {
    if (!this.canUpgradeFirmware) throw new Error('当前会话不支持固件升级，演示模式不能刷写')
    const driver = this.registry.keyboard(this.activeDriverId!)
    // 错误文件不会关闭正常会话，更不会发送擦除指令。
    await driver.validateFirmware?.(image)
    await this.active?.close()
    this.active = undefined
    await driver.upgradeFirmware!(image, options)
  }

  async connect(options: ConnectOptions = {}) {
    // 同一时刻只保留一个活动会话，先关闭旧监听和传输，防止报告被两个会话消费。
    await this.disconnect()
    this.demo = options.demo ?? false
    const driver = options.driverId
      ? this.registry.keyboard(options.driverId)
      : this.registry.keyboard()
    this.active = options.demo
      ? driver.createDemoSession()
      : await driver.connect(options.onDisconnect ?? (() => undefined))
    this.activeDriverId = driver.manifest.id
    return this.active
  }

  async reconnectAuthorized(options: Omit<ConnectOptions, 'demo'> = {}) {
    // WebHID 的 getDevices 只能返回用户过去授权过的设备，因此此路径不会弹选择框。
    await this.disconnect()
    this.demo = false
    const driver = options.driverId
      ? this.registry.keyboard(options.driverId)
      : this.registry.keyboard()
    this.active = await driver.reconnectAuthorized(options.onDisconnect ?? (() => undefined))
    this.activeDriverId = this.active ? driver.manifest.id : undefined
    return this.active
  }

  async disconnect() {
    await this.active?.close()
    this.active = undefined
    this.activeDriverId = undefined
  }
}
