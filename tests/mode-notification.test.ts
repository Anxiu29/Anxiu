import { describe, expect, it } from 'vitest'
import type { DeviceTransport } from '@/application/ports'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import type { CapabilityDescriptor } from '@/domain/capabilities'
import type { DefaultKeymapResolver } from '@/protocol/DefaultKeymapResolver'
import { encodePacket } from '@/protocol/codec'
import { XsydKeyboardProtocol } from '@/protocol/KeyboardProtocol'
import { XSYD_COMMANDS } from '@/protocol/xsyd/commands'

class NotificationTransport implements DeviceTransport {
  readonly connected = true
  readonly productName = 'fake'
  readonly vendorId = 1
  readonly productId = 2
  private listener?: (data: Uint8Array) => void

  requestDevice = async () => undefined
  reconnectAuthorized = async () => true
  open = async () => undefined
  close = async () => undefined
  send = async () => undefined
  onDisconnect = () => () => undefined
  onReport(listener: (data: Uint8Array) => void) { this.listener = listener; return () => { this.listener = undefined } }
  notifyMode(order: number, enabled: number) {
    this.listener?.(encodePacket(XSYD_COMMANDS.action.responseCode, new Uint8Array([0, order, enabled, 0xff])))
  }
}

describe('XsydKeyboardProtocol hardware mode notification', () => {
  it('maps unsolicited 0x80 orders 0x22 and 0x21 directly to Mac and WIN', () => {
    const transport = new NotificationTransport()
    // 此测试只覆盖通知解析，不会访问键表、能力描述或默认表解析器。
    const protocol = new XsydKeyboardProtocol(
      transport,
      {} as KeyCatalog,
      {} as CapabilityDescriptor,
      (() => []) as DefaultKeymapResolver,
    )
    const modes: string[] = []
    protocol.systemMode.onModeChange((mode) => modes.push(mode))

    transport.notifyMode(0x22, 1)
    transport.notifyMode(0x21, 1)
    transport.notifyMode(0x22, 0)

    expect(modes).toEqual(['mac', 'win'])
    protocol.close()
  })
})
