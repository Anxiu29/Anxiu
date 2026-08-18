import type { KeyPosition } from '@/domain/keyboard'
import { matrixKeyGeometry, type KeyGeometry, type KeyGeometryResolver } from '@/ui/keyboardGeometry'
import type { DevicePresentation } from '@/ui/DevicePresentation'
import overviewImageUrl from '@/assets/c98-keyboard.webp'
import sidebarImageUrl from '@/assets/c98-keyboard-transparent.png'

type VisualKey = Readonly<{ sourceCode: number; x: number; y: number; width?: number; height?: number }>

/**
 * C98 的物理外观描述。这里只决定 UI 中的位置与尺寸，不参与 HID 矩阵读取，
 * 也不改变固件返回的行列地址。显式坐标用于表达各功能分组、导航区和数字区。
 */
const visualKeys: readonly VisualKey[] = [
  // 功能区：旋钮没有独立键值，所以最右侧留空，不伪造可点击按键。
  { sourceCode: 0x29, x: 0, y: 0 },
  { sourceCode: 0x3a, x: 2, y: 0 }, { sourceCode: 0x3b, x: 3, y: 0 }, { sourceCode: 0x3c, x: 4, y: 0 }, { sourceCode: 0x3d, x: 5, y: 0 },
  { sourceCode: 0x3e, x: 6.5, y: 0 }, { sourceCode: 0x3f, x: 7.5, y: 0 }, { sourceCode: 0x40, x: 8.5, y: 0 }, { sourceCode: 0x41, x: 9.5, y: 0 },
  { sourceCode: 0x42, x: 11, y: 0 }, { sourceCode: 0x43, x: 12, y: 0 }, { sourceCode: 0x44, x: 13, y: 0 }, { sourceCode: 0x45, x: 14, y: 0 },
  // 出厂表 0-14~0-17：Print Screen、Insert、End、Home。
  { sourceCode: 0x46, x: 15.4, y: 0 }, { sourceCode: 0x49, x: 16.8, y: 0 }, { sourceCode: 0x4d, x: 17.8, y: 0 }, { sourceCode: 0x4a, x: 18.8, y: 0 },

  // 数字行、独立导航列与数字键盘。
  { sourceCode: 0x35, x: 0, y: 1.5 },
  { sourceCode: 0x1e, x: 1, y: 1.5 }, { sourceCode: 0x1f, x: 2, y: 1.5 }, { sourceCode: 0x20, x: 3, y: 1.5 }, { sourceCode: 0x21, x: 4, y: 1.5 },
  { sourceCode: 0x22, x: 5, y: 1.5 }, { sourceCode: 0x23, x: 6, y: 1.5 }, { sourceCode: 0x24, x: 7, y: 1.5 }, { sourceCode: 0x25, x: 8, y: 1.5 },
  { sourceCode: 0x26, x: 9, y: 1.5 }, { sourceCode: 0x27, x: 10, y: 1.5 }, { sourceCode: 0x2d, x: 11, y: 1.5 }, { sourceCode: 0x2e, x: 12, y: 1.5 },
  { sourceCode: 0x2a, x: 13, y: 1.5, width: 2 }, { sourceCode: 0x4c, x: 15.4, y: 1.5 },
  { sourceCode: 0x53, x: 16.8, y: 1.5 }, { sourceCode: 0x54, x: 17.8, y: 1.5 }, { sourceCode: 0x55, x: 18.8, y: 1.5 }, { sourceCode: 0x56, x: 19.8, y: 1.5 },

  // QWERTY 行。
  { sourceCode: 0x2b, x: 0, y: 2.5, width: 1.5 },
  { sourceCode: 0x14, x: 1.5, y: 2.5 }, { sourceCode: 0x1a, x: 2.5, y: 2.5 }, { sourceCode: 0x08, x: 3.5, y: 2.5 }, { sourceCode: 0x15, x: 4.5, y: 2.5 },
  { sourceCode: 0x17, x: 5.5, y: 2.5 }, { sourceCode: 0x1c, x: 6.5, y: 2.5 }, { sourceCode: 0x18, x: 7.5, y: 2.5 }, { sourceCode: 0x0c, x: 8.5, y: 2.5 },
  { sourceCode: 0x12, x: 9.5, y: 2.5 }, { sourceCode: 0x13, x: 10.5, y: 2.5 }, { sourceCode: 0x2f, x: 11.5, y: 2.5 }, { sourceCode: 0x30, x: 12.5, y: 2.5 },
  { sourceCode: 0x31, x: 13.5, y: 2.5, width: 1.5 }, { sourceCode: 0x4b, x: 15.4, y: 2.5 },
  { sourceCode: 0x5f, x: 16.8, y: 2.5 }, { sourceCode: 0x60, x: 17.8, y: 2.5 }, { sourceCode: 0x61, x: 18.8, y: 2.5 }, { sourceCode: 0x57, x: 19.8, y: 2.5, height: 2 },

  // ASDF 行。
  { sourceCode: 0x39, x: 0, y: 3.5, width: 1.8 },
  { sourceCode: 0x04, x: 1.8, y: 3.5 }, { sourceCode: 0x16, x: 2.8, y: 3.5 }, { sourceCode: 0x07, x: 3.8, y: 3.5 }, { sourceCode: 0x09, x: 4.8, y: 3.5 },
  { sourceCode: 0x0a, x: 5.8, y: 3.5 }, { sourceCode: 0x0b, x: 6.8, y: 3.5 }, { sourceCode: 0x0d, x: 7.8, y: 3.5 }, { sourceCode: 0x0e, x: 8.8, y: 3.5 },
  { sourceCode: 0x0f, x: 9.8, y: 3.5 }, { sourceCode: 0x33, x: 10.8, y: 3.5 }, { sourceCode: 0x34, x: 11.8, y: 3.5 }, { sourceCode: 0x28, x: 12.8, y: 3.5, width: 2.2 },
  // 出厂表 1-14、2-14、3-14：独立导航列从上到下为 Del、PgUp、PgDn。
  { sourceCode: 0x4e, x: 15.4, y: 3.5 }, { sourceCode: 0x5c, x: 16.8, y: 3.5 }, { sourceCode: 0x5d, x: 17.8, y: 3.5 }, { sourceCode: 0x5e, x: 18.8, y: 3.5 },

  // ZXCV 行。上方向键保持参考图中的正常箭头簇位置，不额外下沉。
  { sourceCode: 0xe1, x: 0, y: 4.5, width: 2.2 },
  { sourceCode: 0x1d, x: 2.2, y: 4.5 }, { sourceCode: 0x1b, x: 3.2, y: 4.5 }, { sourceCode: 0x06, x: 4.2, y: 4.5 }, { sourceCode: 0x19, x: 5.2, y: 4.5 },
  { sourceCode: 0x05, x: 6.2, y: 4.5 }, { sourceCode: 0x11, x: 7.2, y: 4.5 }, { sourceCode: 0x10, x: 8.2, y: 4.5 }, { sourceCode: 0x36, x: 9.2, y: 4.5 },
  { sourceCode: 0x37, x: 10.2, y: 4.5 }, { sourceCode: 0x38, x: 11.2, y: 4.5 }, { sourceCode: 0xe5, x: 12.2, y: 4.5, width: 2.3 },
  { sourceCode: 0x52, x: 14.8, y: 4.5 },
  { sourceCode: 0x59, x: 16.8, y: 4.5 }, { sourceCode: 0x5a, x: 17.8, y: 4.5 }, { sourceCode: 0x5b, x: 18.8, y: 4.5 }, { sourceCode: 0x58, x: 19.8, y: 4.5, height: 2 },

  // 底行与方向区下方三键；整个箭头簇不再额外向下偏移。
  { sourceCode: 0xe0, x: 0, y: 5.5, width: 1.3 }, { sourceCode: 0xe3, x: 1.3, y: 5.5, width: 1.3 }, { sourceCode: 0xe2, x: 2.6, y: 5.5, width: 1.3 },
  { sourceCode: 0x2c, x: 3.9, y: 5.5, width: 6 }, { sourceCode: 0xe6, x: 9.9, y: 5.5, width: 1.3 }, { sourceCode: 0x01, x: 11.2, y: 5.5, width: 1.3 },
  { sourceCode: 0xe4, x: 12.5, y: 5.5, width: 1.3 }, { sourceCode: 0x50, x: 13.8, y: 5.5 }, { sourceCode: 0x51, x: 14.8, y: 5.5 }, { sourceCode: 0x4f, x: 15.8, y: 5.5 },
  { sourceCode: 0x62, x: 16.8, y: 5.5, width: 2 }, { sourceCode: 0x63, x: 18.8, y: 5.5 },
]

const geometryBySourceCode = new Map<number, KeyGeometry>(visualKeys.map((key) => [key.sourceCode, {
  x: key.x,
  y: key.y,
  width: key.width ?? 1,
  height: key.height ?? 1,
}]))

/** 视觉坐标只在 UI 渲染时附加；协议返回的 KeyPosition 不携带宽高。 */
export const c98KeyGeometry: KeyGeometryResolver = (key: KeyPosition) =>
  geometryBySourceCode.get(key.sourceCode) ?? matrixKeyGeometry(key)

/** C98 的所有 UI 专用知识集中在设备目录，共享组件只接收 DevicePresentation。 */
export const C98_PRESENTATION: DevicePresentation = {
  keyGeometry: c98KeyGeometry,
  overviewImageUrl,
  sidebarImageUrl,
  overviewImageAlt: 'C98(739) 单模 US 带旋钮键盘大图',
  solutionName: '星闪',
}
