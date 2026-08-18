import type { DeviceDriver } from '@/application/DeviceDriverRegistry'
import type { DevicePresentation } from '@/ui/DevicePresentation'
import { C98Driver } from './c98/C98Driver'
import { C98_PRESENTATION } from './c98/presentation'

/**
 * 已安装设备插件目录。具体型号只在 devices 内登记；共享组合根遍历统一结构，
 * 新增设备时不需要向 App、Store、协议或通用组件添加型号判断。
 */
export interface InstalledDevice {
  driver: DeviceDriver
  presentation: DevicePresentation
}

export const INSTALLED_DEVICES: readonly InstalledDevice[] = [
  { driver: new C98Driver(), presentation: C98_PRESENTATION },
]
