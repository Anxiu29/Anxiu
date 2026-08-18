import { KeyboardDriverService } from '@/application/KeyboardDriverService'
import { DeviceDriverRegistry } from '@/application/DeviceDriverRegistry'
import { C98Driver } from '@/devices/c98/C98Driver'
import { createDriverStore } from '@/stores/driver'
import { c98KeyGeometry } from '@/ui/c98KeyboardGeometry'
import type { DevicePresentation } from '@/ui/DevicePresentation'
import c98OverviewImageUrl from '@/assets/c98-keyboard.webp'
import c98SidebarImageUrl from '@/assets/c98-keyboard-transparent.png'

// 唯一组合根：新增键盘时在这里注册适配器，其他层无需修改。
export const deviceDriverRegistry = new DeviceDriverRegistry()
  .register(new C98Driver())

export const keyboardDriverService = new KeyboardDriverService(deviceDriverRegistry)
// Store 工厂在这里接收应用服务，避免表现层状态反向导入组合根单例。
export const useDriverStore = createDriverStore(keyboardDriverService)

// 当前设备的 UI 外观也只在组合根组装；通用 Vue 组件只认识 DevicePresentation 契约。
export const devicePresentation: DevicePresentation = {
  keyGeometry: c98KeyGeometry,
  overviewImageUrl: c98OverviewImageUrl,
  sidebarImageUrl: c98SidebarImageUrl,
  overviewImageAlt: 'C98(739) 单模 US 带旋钮键盘大图',
}
