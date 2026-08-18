import { KeyboardDriverService } from '@/application/KeyboardDriverService'
import { DeviceDriverRegistry } from '@/application/DeviceDriverRegistry'
import { createDriverStore } from '@/stores/driver'
import { INSTALLED_DEVICES } from '@/devices/catalog'

// 唯一组合根只遍历设备插件目录，不包含任何具体型号判断。
export const deviceDriverRegistry = INSTALLED_DEVICES.reduce(
  (registry, plugin) => registry.register(plugin.driver),
  new DeviceDriverRegistry(),
)

const presentations = new Map(INSTALLED_DEVICES.map(({ driver, presentation }) => [driver.manifest.id, presentation]))

export const keyboardDriverService = new KeyboardDriverService(deviceDriverRegistry)
// Store 工厂在这里接收应用服务，避免表现层状态反向导入组合根单例。
export const useDriverStore = createDriverStore(keyboardDriverService)

/** 根据当前驱动选择表现配置；未连接时使用默认驱动的连接页配置。 */
export const getDevicePresentation = (driverId?: string) => {
  const targetId = driverId ?? deviceDriverRegistry.defaultDriver.manifest.id
  const presentation = presentations.get(targetId)
  if (!presentation) throw new Error(`找不到设备表现配置：${targetId}`)
  return presentation
}
