import type { KeyPosition } from './keyboard'

export interface MatrixAddress {
  kind: 'matrix'
  row: number
  column: number
}

export interface ControlGeometry {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export interface MatrixKeyInput {
  id: string
  sourceCode: number
  label: string
  address: MatrixAddress
}

export interface LayoutDescriptor {
  readonly id: string
  describe(keys: readonly MatrixKeyInput[]): KeyPosition[]
}

export class MatrixGridLayout implements LayoutDescriptor {
  readonly id = 'matrix-grid'
  describe(keys: readonly MatrixKeyInput[]): KeyPosition[] {
    return keys.map((key) => ({ ...key, geometry: { x: key.address.column, y: key.address.row, width: 1, height: 1 } }))
  }
}
