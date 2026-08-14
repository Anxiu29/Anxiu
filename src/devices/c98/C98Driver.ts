import { DeviceSession } from '@/application/DeviceSession'
import { C98_DEVICE } from '@/config/devices'
import { DemoKeyboardProtocol } from '@/protocol/DemoKeyboardProtocol'
import { XsydKeyboardProtocol } from '@/protocol/KeyboardProtocol'
import { WebHidTransport } from '@/transport/HidTransport'
import type { DeviceDriver } from '../DeviceDriver'
import { XSYD_KEY_CATALOG } from '@/protocol/xsyd/keyCatalog'

/** RK-C98 的组合适配器；替换协议或传输不会影响应用层和 UI。 */
export class C98Driver implements DeviceDriver {
  readonly manifest = {
    id: 'rk-c98-xsyd-webhid',
    displayName: 'RK-C98',
    protocolId: 'xsyd-keyboard-v1',
    transportId: 'webhid',
    capabilities: ['device-profile', 'keymap', 'configuration', 'factory-reset'],
    hid: {
      vendorId: C98_DEVICE.vendorId,
      productIds: [C98_DEVICE.productId],
      usagePage: C98_DEVICE.usagePage,
      usage: C98_DEVICE.usage,
    },
  } as const

  async connect(onDisconnect: () => void) {
    const transport = this.createTransport(onDisconnect)
    await transport.requestDevice()
    await transport.open()
    return this.createSession(transport)
  }

  async reconnectAuthorized(onDisconnect: () => void) {
    const transport = this.createTransport(onDisconnect)
    if (!await transport.reconnectAuthorized()) return undefined
    await transport.open()
    return this.createSession(transport)
  }

  createDemoSession() {
    return new DeviceSession(new DemoKeyboardProtocol(XSYD_KEY_CATALOG), XSYD_KEY_CATALOG)
  }

  private createTransport(onDisconnect: () => void) {
    if (!('hid' in navigator)) throw new Error('当前浏览器不支持 WebHID，请使用桌面版 Chrome 或 Edge')
    const transport = new WebHidTransport(C98_DEVICE)
    transport.onDisconnect(onDisconnect)
    return transport
  }

  private createSession(transport: WebHidTransport) {
    return new DeviceSession(new XsydKeyboardProtocol(transport, XSYD_KEY_CATALOG), XSYD_KEY_CATALOG, transport)
  }
}
