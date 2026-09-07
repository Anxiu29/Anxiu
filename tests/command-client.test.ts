import { describe, expect, it } from 'vitest'
import type { DeviceTransport } from '@/application/ports'
import { computePacketCrc, encodePacket, PACKET_HEAD } from '@/protocol/codec'
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
  respondRaw(data: Uint8Array) { this.listener?.(data) }
  respondFragmented(matrixType: number, corruptCrc = false) {
    const data = new Uint8Array(128)
    data.set([0, matrixType])
    const frame = new Uint8Array(4 + data.length)
    frame.set([PACKET_HEAD, data.length, XSYD_COMMANDS.travelMatrix.responseCode], 0)
    frame.set(data, 4)
    frame[3] = computePacketCrc(frame)
    if (corruptCrc) frame[3] ^= 0xff
    for (let offset = 0; offset < frame.length; offset += 64) {
      const report = new Uint8Array(64)
      report.set(frame.slice(offset, offset + 64))
      this.respondRaw(report)
    }
  }
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

  it('collects every fragment of a matrix response before resolving', async () => {
    const transport = new FakeTransport()
    const client = new XsydCommandClient(transport)
    const pending = client.requestMultiple(XSYD_COMMANDS.travelMatrix, new Uint8Array([2, 1, 0xff, 0xff]), 3)

    await Promise.resolve()
    transport.respond(XSYD_COMMANDS.travelMatrix.responseCode, [2, 1, 1])
    transport.respond(XSYD_COMMANDS.travelMatrix.responseCode, [2, 3])
    transport.respond(XSYD_COMMANDS.travelMatrix.responseCode, [4, 5])

    await expect(pending).resolves.toEqual([
      new Uint8Array([2, 1, 1]),
      new Uint8Array([2, 3]),
      new Uint8Array([4, 5]),
    ])
    client.close()
  })

  it('reassembles one long protocol frame split across raw HID reports', async () => {
    const transport = new FakeTransport()
    const client = new XsydCommandClient(transport)
    const pending = client.requestFragmented(XSYD_COMMANDS.travelMatrix, new Uint8Array([2, 1, 0xff, 0xff]))
    await Promise.resolve()

    // 上一轮残留的无包头尾片不能让新请求失败，也不能成为新长帧的第一片。
    transport.respondRaw(new Uint8Array(64))

    const data = Uint8Array.from({ length: 128 }, (_, index) => index & 0xff)
    data.set([0, 2], 0)
    const frame = new Uint8Array(4 + data.length)
    frame.set([PACKET_HEAD, data.length, XSYD_COMMANDS.travelMatrix.responseCode], 0)
    frame.set(data, 4)
    frame[3] = computePacketCrc(new Uint8Array([PACKET_HEAD, data.length, XSYD_COMMANDS.travelMatrix.responseCode, ...data]))
    for (let offset = 0; offset < frame.length; offset += 64) {
      const report = new Uint8Array(64)
      report.set(frame.slice(offset, offset + 64))
      transport.respondRaw(report)
    }

    await expect(pending).resolves.toEqual(data)
    client.close()
  })

  it('keeps a fragmented matrix sequence atomic against ordinary queued commands', async () => {
    const transport = new FakeTransport()
    const client = new XsydCommandClient(transport)
    const sequence = client.requestFragmentedSequence(XSYD_COMMANDS.travelMatrix, [
      new Uint8Array([2, 1]), new Uint8Array([3, 1]), new Uint8Array([2, 2]), new Uint8Array([3, 1]),
    ])
    const ordinary = client.request(XSYD_COMMANDS.action, new Uint8Array([1]))

    await Promise.resolve()
    for (const matrixType of [2, 3, 2, 3]) {
      // 每次长响应完成后，下一项必须仍是矩阵请求；普通 action 只能排在四包之后。
      transport.respondFragmented(matrixType)
      await Promise.resolve()
    }
    await expect(sequence).resolves.toHaveLength(4)
    expect(transport.sent.slice(0, 4).map((packet) => packet[2])).toEqual([0x12, 0x12, 0x12, 0x12])

    await Promise.resolve()
    expect(transport.sent[4]?.[2]).toBe(XSYD_COMMANDS.action.code)
    transport.respond(XSYD_COMMANDS.action.responseCode, [0, 1])
    await expect(ordinary).resolves.toEqual(new Uint8Array([0, 1]))
    client.close()
  })

  it('ignores a delayed complete state matrix while waiting for the next travel matrix', async () => {
    const transport = new FakeTransport()
    const client = new XsydCommandClient(transport)
    const pending = client.requestFragmented(XSYD_COMMANDS.travelMatrix, new Uint8Array([2, 1]))
    await Promise.resolve()

    // 上一轮延迟到达的 0x03 不能让当前 0x02 请求失败。
    transport.respondFragmented(3)
    transport.respondFragmented(2)

    await expect(pending).resolves.toMatchObject({ 0: 0, 1: 2 })
    client.close()
  })

  it('retries the current matrix page after a fragmented CRC failure', async () => {
    const transport = new FakeTransport()
    const client = new XsydCommandClient(transport)
    const pending = client.requestFragmented(XSYD_COMMANDS.travelMatrix, new Uint8Array([2, 1]))
    await Promise.resolve()

    transport.respondFragmented(2, true)
    await Promise.resolve()
    expect(transport.sent).toHaveLength(2)
    transport.respondFragmented(2)

    await expect(pending).resolves.toMatchObject({ 0: 0, 1: 2 })
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
