import { describe, expect, it } from 'vitest'
import { parseMatrixRowPair } from '@/protocol/xsyd/matrix'

describe('XSYD matrix response parser', () => {
  it('parses two complete 21-column rows without deleting empty slots', () => {
    const data = new Uint8Array(45)
    data[0] = 0
    data[1] = 2
    data[2] = 0x2b
    data[3] = 0
    data[22] = 0x4b
    data[23] = 3
    data[24] = 0x39
    data[25] = 0xff
    data[44] = 0x4e

    const slots = parseMatrixRowPair(data, 2, 21)

    expect(slots).toHaveLength(42)
    expect(slots[0]).toEqual({ row: 2, column: 0, sourceCode: 0x2b, present: true })
    expect(slots[1]).toEqual({ row: 2, column: 1, sourceCode: 0, present: false })
    expect(slots[20]).toEqual({ row: 2, column: 20, sourceCode: 0x4b, present: true })
    expect(slots[21]).toEqual({ row: 3, column: 0, sourceCode: 0x39, present: true })
    expect(slots[22]).toEqual({ row: 3, column: 1, sourceCode: 0, present: false })
    expect(slots[41]).toEqual({ row: 3, column: 20, sourceCode: 0x4e, present: true })
  })

  it('rejects a truncated response instead of silently inventing matrix data', () => {
    expect(() => parseMatrixRowPair(new Uint8Array(44), 0, 21)).toThrow('矩阵响应长度不足')
  })
})
