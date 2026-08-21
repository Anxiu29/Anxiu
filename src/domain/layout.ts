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

export interface PhysicalControlInput {
  id: string
  sourceCode: number
  label: string
  address: PhysicalAddress
}

export interface MatrixKeyInput extends PhysicalControlInput {
  address: MatrixAddress
}

/**
 * 设备层用于校验、修复协议实读物理矩阵的公共契约。
 *
 * 协议只负责上传设备当次返回的位置；具体型号是否有固定矩阵、缺失位置应如何
 * 补齐，由设备目录中的实现决定，避免通用协议依赖某个键盘型号。
 */
export type PhysicalLayoutResolver = (positions: PhysicalControlInput[]) => PhysicalControlInput[]
