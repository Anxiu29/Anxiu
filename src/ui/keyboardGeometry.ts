import type { KeyPosition } from '@/domain/keyboard'

export interface KeyGeometry {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export type KeyGeometryResolver = (key: KeyPosition) => KeyGeometry

/** 没有专用外观描述时，按固件矩阵坐标提供可用的通用布局。 */
export const matrixKeyGeometry: KeyGeometryResolver = (key) => ({
  x: key.address.kind === 'matrix' ? key.address.column : key.address.index,
  y: key.address.kind === 'matrix' ? key.address.row : 0,
  width: 1,
  height: 1,
})
