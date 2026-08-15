export interface MatrixSlot {
  readonly row: number
  readonly column: number
  readonly sourceCode: number
  readonly present: boolean
}

/**
 * 解析默认键位命令返回的两行矩阵。
 * data[0] 是状态码；每一行由 1 字节行号和固定 columns 个键值组成。
 */
export function parseMatrixRowPair(data: Uint8Array, fallbackFirstRow: number, columns: number): MatrixSlot[] {
  const minimumLength = 3 + columns * 2
  if (data.length < minimumLength) throw new Error(`矩阵响应长度不足：至少需要 ${minimumLength} 字节，实际 ${data.length} 字节`)
  const secondRowOffset = 2 + columns
  const blocks = [
    { row: data[1] ?? fallbackFirstRow, start: 2 },
    { row: data[secondRowOffset] ?? fallbackFirstRow + 1, start: secondRowOffset + 1 },
  ]
  return blocks.flatMap((block) => Array.from({ length: columns }, (_, column) => {
    const rawCode = data[block.start + column] ?? 0
    const sourceCode = rawCode === 0xff ? 0 : rawCode
    return { row: block.row, column, sourceCode, present: sourceCode !== 0 }
  }))
}
