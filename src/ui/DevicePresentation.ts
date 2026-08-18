import type { KeyGeometryResolver } from './keyboardGeometry'

/** 设备在 Vue UI 中的纯表现资源；由组合根选择，不进入领域或协议模型。 */
export interface DevicePresentation {
  keyGeometry: KeyGeometryResolver
  overviewImageUrl: string
  sidebarImageUrl: string
  overviewImageAlt?: string
}
