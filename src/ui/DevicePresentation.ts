import type { KeyGeometryResolver } from './keyboardGeometry'

/** 固件灯效编号在 UI 中的型号专属名称；编号仍由设备协议负责传输。 */
export interface LightingModePresentation {
  value: number
  label: string
}

export interface LightingRangePresentation {
  min: number
  max: number
  step: number
}

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
  /** 不同型号支持的灯效数量和命名可能不同，因此由设备目录提供给公共 UI。 */
  lightingModes: readonly LightingModePresentation[]
  /** UI 滑块使用设备原始档位；范围属于型号能力，不由公共组件猜测。 */
  lightingRanges: {
    luminance: LightingRangePresentation
    speed: LightingRangePresentation
  }
}
