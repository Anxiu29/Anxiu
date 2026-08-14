import { KeyboardDriverService } from '@/application/KeyboardDriverService'
import { DeviceDriverRegistry } from '@/application/DeviceDriverRegistry'
import { C98Driver } from '@/devices/c98/C98Driver'

// 唯一组合根：新增键盘时在这里注册适配器，其他层无需修改。
export const deviceDriverRegistry = new DeviceDriverRegistry()
  .register(new C98Driver())

export const keyboardDriverService = new KeyboardDriverService(deviceDriverRegistry)
