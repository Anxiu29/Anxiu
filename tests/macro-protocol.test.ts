import { describe, expect, it } from 'vitest'
import type { DeviceTransport } from '@/application/ports'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import type { CapabilityDescriptor } from '@/domain/capabilities'
import type { DefaultKeymapResolver } from '@/protocol/DefaultKeymapResolver'
import { decodePacket, encodePacket } from '@/protocol/codec'
import { XsydKeyboardProtocol } from '@/protocol/KeyboardProtocol'
import { XSYD_COMMANDS } from '@/protocol/xsyd/commands'

/** 自动应答协议请求，并保留网页实际发出的命令，便于验证完整写入事务。 */
class MacroTransport implements DeviceTransport {
  readonly connected = true
  readonly productName = 'fake'
  readonly vendorId = 1
  readonly productId = 2
  readonly sent: Array<{ command: number; data: Uint8Array }> = []
  private listener?: (data: Uint8Array) => void

  requestDevice = async () => undefined
  reconnectAuthorized = async () => true
  open = async () => undefined
  close = async () => undefined
  onDisconnect = () => () => undefined
  onReport(listener: (data: Uint8Array) => void) { this.listener = listener; return () => { this.listener = undefined } }

  async send(report: Uint8Array) {
    const request = decodePacket(report)
    this.sent.push(request)
    // Action 响应必须回显 order；其他写命令只需返回成功状态。
    const response = request.command === XSYD_COMMANDS.action.code
      ? [0, request.data[0] ?? 0, 0]
      : [0]
    this.listener?.(encodePacket(request.command | 0x80, new Uint8Array(response)))
  }
}

describe('XsydKeyboardProtocol macro transaction', () => {
  it('writes macro actions, binding and metadata in the SDK order', async () => {
    const transport = new MacroTransport()
    const protocol = new XsydKeyboardProtocol(
      transport,
      {} as KeyCatalog,
      {} as CapabilityDescriptor,
      (() => []) as DefaultKeymapResolver,
    )

    await protocol.macro.setMacro({
      index: 0,
      sourceCode: 0x4a,
      boundSourceCodes: [0x4a],
      mode: 0,
      repeatCount: 3,
      repeatDelay: 2,
      actions: [{ keyCode: 0x04, pressed: true, delay: 10 }],
    })

    expect(transport.sent.map(({ command }) => command)).toEqual([
      XSYD_COMMANDS.macroData.code,
      XSYD_COMMANDS.keymap.code,
      XSYD_COMMANDS.macroMode.code,
    ])
    protocol.close()
  })
})
