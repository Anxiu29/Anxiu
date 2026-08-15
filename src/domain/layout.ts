import type { KeyPosition } from './keyboard'

export interface MatrixAddress {
  kind: 'matrix'
  row: number
  column: number
}

export interface IndexedAddress {
  kind: 'indexed'
  index: number
}

export type PhysicalAddress = MatrixAddress | IndexedAddress

export interface ControlGeometry {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export interface PhysicalControlInput {
  id: string
  sourceCode: number
  label: string
  address: PhysicalAddress
}

export interface MatrixKeyInput extends PhysicalControlInput {
  address: MatrixAddress
}

export interface LayoutDescriptor<TInput extends PhysicalControlInput = PhysicalControlInput> {
  readonly id: string
  describe(keys: readonly TInput[]): KeyPosition[]
}

export class MatrixGridLayout implements LayoutDescriptor<MatrixKeyInput> {
  readonly id = 'matrix-grid'
  describe(keys: readonly MatrixKeyInput[]): KeyPosition[] {
    return keys.map((key) => ({ ...key, geometry: { x: key.address.column, y: key.address.row, width: 1, height: 1 } }))
  }
}
