import { describe, expect, it } from 'vitest'
import { decodeTravelHalf, encodeTravelRequest, encodeTravelStateRequest } from '@/protocol/xsyd/travelCodec'

describe('travel matrix codec', () => {
  it('matches the official matrix page requests', () => {
    expect([...encodeTravelRequest(1)]).toEqual([2, 1, 0xff, 0xff])
    expect([...encodeTravelRequest(2)]).toEqual([2, 2, 0xff, 0xff])
    expect([...encodeTravelStateRequest()]).toEqual([3, 1, 0xff, 0xff])
  })

  it('decodes 3 by 21 uint16 travel values after status and matrix bytes', () => {
    const data = new Uint8Array(128)
    data.set([0, 2, 0xdc, 0x05, 0xb8, 0x0b])
    const rows = decodeTravelHalf(data)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveLength(21)
    expect(rows[0]?.[0]).toBe(1.5)
    expect(rows[0]?.[1]).toBe(3)
  })
})
