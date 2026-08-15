import type { DeviceTransport } from '@/application/ports'
import { DriverError } from '@/application/DriverError'

export interface HidDeviceFilterConfig {
  vendorId: number
  productId: number
  usagePage: number
  usage: number
  reportId: number
  reportSize: number
}

export class WebHidTransport implements DeviceTransport {
  private device?: HIDDevice
  private reportListeners = new Set<(data: Uint8Array) => void>()
  private disconnectListeners = new Set<() => void>()
  private readonly reportHandler = (event: HIDInputReportEvent) => {
    const bytes = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength)
    this.reportListeners.forEach((listener) => listener(bytes.slice()))
  }
  private readonly disconnectHandler = (event: HIDConnectionEvent) => {
    if (event.device === this.device) this.disconnectListeners.forEach((listener) => listener())
  }

  constructor(private readonly config: HidDeviceFilterConfig) {
    navigator.hid?.addEventListener('disconnect', this.disconnectHandler)
  }

  get connected() { return this.device?.opened === true }
  get productName() { return this.device?.productName ?? 'Unknown HID device' }
  get vendorId() { return this.device?.vendorId ?? this.config.vendorId }
  get productId() { return this.device?.productId ?? this.config.productId }

  async requestDevice() {
    this.ensureSupported()
    const devices = await navigator.hid.requestDevice({ filters: [{ vendorId: this.config.vendorId, productId: this.config.productId, usagePage: this.config.usagePage, usage: this.config.usage }] })
    if (!devices[0]) throw new DriverError('DEVICE_NOT_SELECTED', '未选择键盘')
    this.setDevice(devices[0])
  }

  async reconnectAuthorized() {
    this.ensureSupported()
    const devices = await navigator.hid.getDevices()
    const match = devices.find((device) => device.vendorId === this.config.vendorId && device.productId === this.config.productId)
    if (!match) return false
    this.setDevice(match)
    return true
  }

  async open() {
    if (!this.device) throw new DriverError('DEVICE_NOT_SELECTED', '尚未选择键盘')
    if (!this.device.opened) await this.device.open()
  }

  async close() {
    if (this.device?.opened) await this.device.close()
    this.device?.removeEventListener('inputreport', this.reportHandler)
    navigator.hid?.removeEventListener('disconnect', this.disconnectHandler)
    this.reportListeners.clear()
    this.disconnectListeners.clear()
    this.device = undefined
  }

  async send(report: Uint8Array) {
    if (!this.device?.opened) throw new DriverError('DEVICE_NOT_CONNECTED', '键盘未连接')
    const payload = new Uint8Array(this.config.reportSize)
    payload.fill(0xff)
    payload.set(report.slice(0, payload.length))
    await this.device.sendReport(this.config.reportId, payload)
  }

  onReport(listener: (data: Uint8Array) => void) {
    this.reportListeners.add(listener)
    return () => this.reportListeners.delete(listener)
  }

  onDisconnect(listener: () => void) {
    this.disconnectListeners.add(listener)
    return () => this.disconnectListeners.delete(listener)
  }

  private setDevice(device: HIDDevice) {
    this.device?.removeEventListener('inputreport', this.reportHandler)
    this.device = device
    this.device.addEventListener('inputreport', this.reportHandler)
  }

  private ensureSupported() {
    if (!('hid' in navigator)) throw new DriverError('UNSUPPORTED_BROWSER', '当前浏览器不支持 WebHID，请使用桌面版 Chrome 或 Edge', false)
  }
}
