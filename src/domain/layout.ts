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
