import { describe, expect, it } from 'vitest'
import type { DeviceTransport } from '@/application/ports'
import { encodePacket } from '@/protocol/codec'
import { XSYD_COMMANDS } from '@/protocol/xsyd/commands'
import { XsydCommandClient } from '@/protocol/xsyd/XsydCommandClient'

class FakeTransport implements DeviceTransport {
  readonly connected = true
  readonly productName = 'fake'
  readonly vendorId = 1
  readonly productId = 2
  readonly sent: Uint8Array[] = []
  private listener?: (data: Uint8Array) => void

  requestDevice = async () => undefined
  reconnectAuthorized = async () => true
  open = async () => undefined
  close = async () => undefined
  onDisconnect = () => () => undefined
  onReport(listener: (data: Uint8Array) => void) { this.listener = listener; return () => { this.listener = undefined } }
  async send(report: Uint8Array) { this.sent.push(report) }
  respond(command: number, data: number[]) { this.listener?.(encodePacket(command, new Uint8Array(data))) }
}

describe('XsydCommandClient', () => {
  it('uses declarative command metadata to correlate responses', async () => {
    const transport = new FakeTransport()
    const client = new XsydCommandClient(transport)
    const pending = client.request(XSYD_COMMANDS.keymap, new Uint8Array([0]))

    await Promise.resolve()
    transport.respond(XSYD_COMMANDS.keymap.responseCode, [0, 4, 0, 5])

    await expect(pending).resolves.toEqual(new Uint8Array([0, 4, 0, 5]))
    expect(transport.sent[0]?.[2]).toBe(XSYD_COMMANDS.keymap.code)
    client.close()
  })

  it('maps non-zero status responses to a stable driver error', async () => {
    const transport = new FakeTransport()
    const client = new XsydCommandClient(transport)
    const pending = client.request(XSYD_COMMANDS.action, new Uint8Array([2]))

    await Promise.resolve()
    transport.respond(XSYD_COMMANDS.action.responseCode, [7])

    await expect(pending).rejects.toMatchObject({ code: 'PROTOCOL_REJECTED', details: { errorCode: 7, commandName: 'action' } })
    client.close()
  })

  it('forwards unsolicited reports so device state can be synchronized', () => {
    const transport = new FakeTransport()
    const client = new XsydCommandClient(transport)
    const received: number[] = []
    client.onNotification((packet) => received.push(packet.command))

    transport.respond(XSYD_COMMANDS.action.responseCode, [0, 0x22, 1, 0xff])

    expect(received).toEqual([XSYD_COMMANDS.action.responseCode])
    client.close()
  })

  it('does not consume an unsolicited action packet as another action response', async () => {
    const transport = new FakeTransport()
    const client = new XsydCommandClient(transport)
    const notifications: number[] = []
    client.onNotification((packet) => notifications.push(packet.data[1] ?? -1))
    const pending = client.request(XSYD_COMMANDS.action, new Uint8Array([0x01]))

    await Promise.resolve()
    transport.respond(XSYD_COMMANDS.action.responseCode, [0, 0x22, 1, 0xff])
    transport.respond(XSYD_COMMANDS.action.responseCode, [0, 0x01, 0x31])

    await expect(pending).resolves.toEqual(new Uint8Array([0, 0x01, 0x31]))
    expect(notifications).toEqual([0x22])
    client.close()
  })

  it('rejects queued work when the session closes', async () => {
    const transport = new FakeTransport()
    const client = new XsydCommandClient(transport)
    const active = client.request(XSYD_COMMANDS.sync, new Uint8Array())
    const queued = client.request(XSYD_COMMANDS.action, new Uint8Array([1]))

    await Promise.resolve()
    client.close()

    await expect(active).rejects.toMatchObject({ code: 'DEVICE_NOT_CONNECTED' })
    await expect(queued).rejects.toMatchObject({ code: 'DEVICE_NOT_CONNECTED' })
    expect(transport.sent).toHaveLength(1)
  })
})
