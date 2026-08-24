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
    // WebHID 通常把 reportId 放在 event.reportId 并从 data 中移除；部分平台仍可能
    // 返回抓包中那种“00 + 64 字节报告”。只在长度精确多 1 时剥离，避免误删长帧续片的 00 数据。
    const payload = bytes.length === this.config.reportSize + 1 && bytes[0] === event.reportId
      ? bytes.slice(1)
      : bytes
    // 每个订阅者收到独立副本，避免某个解析器修改共享 HID 缓冲区。
    this.reportListeners.forEach((listener) => listener(payload.slice()))
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
    // requestDevice 必须由用户手势触发；这里只筛选目标 VID/PID 和 usage。
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
    // 释放设备的同时移除浏览器级监听，避免多次连接后重复触发回调。
    if (this.device?.opened) await this.device.close()
    this.device?.removeEventListener('inputreport', this.reportHandler)
    navigator.hid?.removeEventListener('disconnect', this.disconnectHandler)
    this.reportListeners.clear()
    this.disconnectListeners.clear()
    this.device = undefined
  }

  async send(report: Uint8Array) {
    if (!this.device?.opened) throw new DriverError('DEVICE_NOT_CONNECTED', '键盘未连接')
    // 固件要求固定长度报告，未使用区域填 0xFF；codec 只负责有效协议包部分。
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
    // 切换设备前先解绑旧实例，确保一个 transport 只消费当前设备报告。
    this.device?.removeEventListener('inputreport', this.reportHandler)
    this.device = device
    this.device.addEventListener('inputreport', this.reportHandler)
  }

  private ensureSupported() {
    if (!('hid' in navigator)) throw new DriverError('UNSUPPORTED_BROWSER', '当前浏览器不支持 WebHID，请使用桌面版 Chrome 或 Edge', false)
  }
}
