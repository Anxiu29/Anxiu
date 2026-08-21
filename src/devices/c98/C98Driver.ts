import { DeviceSession } from '@/application/DeviceSession'
import { DemoKeyboardProtocol } from '@/protocol/DemoKeyboardProtocol'
import { XsydKeyboardProtocol } from '@/protocol/KeyboardProtocol'
import { WebHidTransport } from '@/transport/HidTransport'
import type { DeviceDriver } from '@/application/DeviceDriverRegistry'
import { XSYD_KEY_CATALOG } from '@/protocol/xsyd/keyCatalog'
import { DriverError } from '@/application/DriverError'
import { C98_DEMO_KEYS, resolveC98PhysicalLayout } from './layout'
import { C98_CAPABILITIES } from './capabilities'
import { resolveC98DefaultKeymap } from './factoryKeymap'
import { C98_DEMO_DEVICE, C98_DEVICE } from './device'

/** RK-C98 的组合适配器；替换协议或传输不会影响应用层和 UI。 */
export class C98Driver implements DeviceDriver {
  readonly manifest = {
    id: 'rk-c98-xsyd-webhid',
    displayName: 'RK-C98',
    protocolId: 'xsyd-keyboard-v1',
    transportId: 'webhid',
    capabilities: ['device-profile', 'keymap', 'configuration', 'factory-reset', 'system-mode', 'configuration-switch', 'lighting', 'advanced-key', 'macro'],
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
    // 演示模式与真机共享键码目录、能力和默认表，只替换最外层协议实现。
    return new DeviceSession(new DemoKeyboardProtocol(XSYD_KEY_CATALOG, C98_DEMO_KEYS, C98_CAPABILITIES, resolveC98DefaultKeymap, C98_DEMO_DEVICE), XSYD_KEY_CATALOG)
  }

  private createTransport(onDisconnect: () => void) {
    if (!('hid' in navigator)) throw new DriverError('UNSUPPORTED_BROWSER', '当前浏览器不支持 WebHID，请使用桌面版 Chrome 或 Edge', false)
    const transport = new WebHidTransport(C98_DEVICE)
    transport.onDisconnect(onDisconnect)
    return transport
  }

  private createSession(transport: WebHidTransport) {
    // 设备层是具体实现相遇的位置：传输、协议、能力和 C98 默认数据都在这里注入。
    return new DeviceSession(new XsydKeyboardProtocol(
      transport,
      XSYD_KEY_CATALOG,
      C98_CAPABILITIES,
      resolveC98DefaultKeymap,
      undefined,
      resolveC98PhysicalLayout,
    ), XSYD_KEY_CATALOG, transport)
  }
}
