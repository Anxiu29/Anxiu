import type { DeviceSelectionPort } from '@/application/DeviceService'
import { DriverError } from '@/application/DriverError'

export class WebHidDeviceSelection implements DeviceSelectionPort {
  request(filters: HIDDeviceFilter[]) {
    if (!navigator.hid)
      return Promise.reject(new DriverError('UNSUPPORTED_BROWSER', '请使用桌面版 Chrome 或 Edge'))
    // 用户手势中直接弹出授权窗口，不能先 await 关闭旧设备。
    return navigator.hid.requestDevice({ filters })
  }
  authorized() {
    return navigator.hid ? navigator.hid.getDevices() : Promise.resolve([])
  }
}
