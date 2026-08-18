import type { KeyGeometryResolver } from './keyboardGeometry'

/** 设备在 Vue UI 中的纯表现资源；由组合根选择，不进入领域或协议模型。 */
export interface DevicePresentation {
  keyGeometry: KeyGeometryResolver
  /** 当前型号允许在改键 UI 中选择的扩展键；具体清单由设备目录维护。 */
  extendedKeyCodes: ReadonlySet<number>
  overviewImageUrl: string
  sidebarImageUrl: string
  overviewImageAlt?: string
  /** 面向用户展示的设备方案名称；不是用于能力判断的内部协议版本号。 */
  solutionName: string
}
