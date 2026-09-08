import { describe, expect, it, vi } from 'vitest'
import { createFirmwareDiagnostics } from '@/application/FirmwareDiagnostics'
import { FirmwareChannel } from '@/protocol/xsyd/FirmwareChannel'
import type { DeviceTransport } from '@/application/ports'
import { encodePacket } from '@/protocol/codec'

describe('firmware diagnostics', () => {
  it('bounds memory, drops unknown fields and starts a clean log for each attempt', () => {
    const log = createFirmwareDiagnostics(2)
    log.record({ kind: 'command', outcome: 'started', command: 8, serial: 'secret', bytes: [1, 2] } as Parameters<typeof log.record>[0])
    expect(log.export()).not.toContain('secret')
    expect(log.export()).not.toContain('bytes')
    log.record({ kind: 'command', outcome: 'success', command: 8 })
    log.record({ kind: 'result', outcome: 'failure', message: 'CRC mismatch' })
    const result = JSON.parse(log.export())
    expect(result.events).toHaveLength(2)
    expect(result.dropped).toBe(1)
    expect(result.events[1].message).toBe('CRC mismatch')
    log.reset()
    expect(JSON.parse(log.export())).toMatchObject({ events: [], dropped: 0 })
  })

  it.each(['success', 'failure'] as const)('records command %s with duration and preserves the actual outcome', async (outcome) => {
    let report: (data: Uint8Array) => void = () => {}
    const transport = {
      onReport: (listener: typeof report) => { report = listener; return () => {} },
      onDisconnect: () => () => {},
      send: async () => { report(encodePacket(0x88, Uint8Array.of(outcome === 'success' ? 0 : 1))) },
    } as unknown as DeviceTransport
    const events = vi.fn()
    const request = new FirmwareChannel(transport, events).request(encodePacket(8, Uint8Array.of(2)))
    if (outcome === 'success') await expect(request).resolves.toEqual(Uint8Array.of(0))
    else await expect(request).rejects.toThrow('拒绝')
    expect(events.mock.calls[0]![0]).toMatchObject({ command: 8, outcome: 'started' })
    expect(events.mock.lastCall![0]).toMatchObject({ command: 8, outcome, durationMs: expect.any(Number) })
  })

  it('does not mistake a sent restart for verified success or let logging stop a restart', async () => {
    const log = vi.fn((_event: import('@/application/FirmwareUpdate').FirmwareDiagnostic) => { throw new Error('logger failed') })
    const send = vi.fn(async () => {})
    await new FirmwareChannel({ send } as unknown as DeviceTransport, log).sendRestart(encodePacket(10, Uint8Array.of(255, 255)))
    expect(send).toHaveBeenCalledOnce()
    expect(log.mock.lastCall![0]).toMatchObject({ command: 10, outcome: 'sent' })
  })
})
