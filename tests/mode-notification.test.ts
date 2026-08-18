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
  notifyAction(order: number, value: number) {
    this.listener?.(encodePacket(XSYD_COMMANDS.action.responseCode, new Uint8Array([0, order, value, 0xff])))
  }
}

describe('XsydKeyboardProtocol hardware state notifications', () => {
  it('maps unsolicited 0x80 actions directly to mode and configuration events', () => {
    const transport = new NotificationTransport()
    // 此测试只覆盖通知解析，不会访问键表、能力描述或默认表解析器。
    const protocol = new XsydKeyboardProtocol(
      transport,
      {} as KeyCatalog,
      {} as CapabilityDescriptor,
      (() => []) as DefaultKeymapResolver,
    )
    const modes: string[] = []
    const configurations: number[] = []
    protocol.systemMode.onModeChange((mode) => modes.push(mode))
    protocol.configurationSwitch.onConfigurationChange((configuration) => configurations.push(configuration))

    transport.notifyAction(0x22, 1)
    transport.notifyAction(0x21, 1)
    transport.notifyAction(0x22, 0)
    transport.notifyAction(0x70, 1)
    transport.notifyAction(0x70, 3)
    transport.notifyAction(0x70, 4)

    expect(modes).toEqual(['mac', 'win'])
    expect(configurations).toEqual([2, 4])
    protocol.close()
  })
})
