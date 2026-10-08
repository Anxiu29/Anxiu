import type { MouseDriver } from '@/application/DeviceDriverRegistry'
import { MouseSession } from '@/application/MouseSession'
import { CB75Protocol } from '@/protocol/tlw/protocol'
import { CB75Transport } from '@/protocol/tlw/transport'
import { CB75_CONFIG } from './config'
import { DemoMouseDevice } from '@/protocol/DemoMouseDevice'
import { parseBasicInfo } from '@/domain/mouse/codec'
import { parseKeys } from '@/domain/mouse/model'
import { demoBasic, demoFunctions, demoKeys } from './demoData'
import { CB75FirmwareUpdater, isFirmwareDevice, validateFirmware } from './firmware'

export class CB75Driver implements MouseDriver {
  readonly manifest = {
    id: CB75_CONFIG.id,
    displayName: CB75_CONFIG.name,
    kind: 'mouse',
    protocolFamily: 'tlw',
    protocolId: 'tlw-mouse-v1',
    transportId: 'webhid',
    capabilities: [
      'device-profile',
      'keymap',
      'configuration',
      'factory-reset',
      'lighting',
      'performance',
      'macro',
    ],
    hid: {
      vendorId: CB75_CONFIG.vendorId,
      productIds: CB75_CONFIG.connections.map((item) => item.productId),
      ...CB75_CONFIG.hid,
    },
  } as const

  createDemoSession() {
    const basicRaw = Uint8Array.from(demoBasic)
    const basic = parseBasicInfo(basicRaw)
    const keysRaw = new Uint8Array(128)
    keysRaw.set(demoKeys)
    const keys = parseKeys(keysRaw.slice(0, basic.keyBytes))
    const device = new DemoMouseDevice({
      basic,
      basicRaw,
      functions: Uint8Array.from(demoFunctions),
      keysRaw,
      keys,
      defaultKeys: structuredClone(keys),
      battery: { percent: 100, charging: 0 },
    })
    return new MouseSession(
      device,
      {
        demo: true,
        profileModel: CB75_CONFIG.profileModel,
        name: CB75_CONFIG.name,
        capabilities: this.manifest.capabilities,
        connection: 'wireless',
        storage: {
          profiles: CB75_CONFIG.storage.profiles + '.demo',
          macros: CB75_CONFIG.storage.macros + '.demo',
        },
      },
      async () => device.close(),
    )
  }

  async connect(onDisconnect: () => void, selectedDevice?: HIDDevice) {
    if (!selectedDevice) throw new Error('请先选择鼠标')
    const device = selectedDevice
    const connection = CB75_CONFIG.connections.find((item) => item.productId === device.productId)
    if (
      !connection ||
      device.vendorId !== CB75_CONFIG.vendorId ||
      !device.collections.some(
        (item) =>
          item.usagePage === CB75_CONFIG.hid.usagePage && item.usage === CB75_CONFIG.hid.usage,
      )
    )
      throw new Error('鼠标 HID 接口不匹配')
    let disconnected = false
    let protocol: CB75Protocol | undefined
    const cleanup = async () => {
      disconnected = true
      protocol?.destroy()
      navigator.hid.removeEventListener('disconnect', unplug)
      if (device.opened) await device.close()
    }
    const unplug = (event: HIDConnectionEvent) => {
      if (event.device !== device) return
      disconnected = true
      protocol?.destroy()
      onDisconnect()
    }
    navigator.hid.addEventListener('disconnect', unplug)
    try {
      if (!device.opened) await device.open()
      if (disconnected) throw new Error('鼠标已断开')
      protocol = new CB75Protocol(
        new CB75Transport(device, 2000, connection.mode, 'current', {
          reportId: CB75_CONFIG.hid.reportId,
          dataSize: connection.dataSize,
        }),
        CB75_CONFIG.profileModel,
        { lighting: this.manifest.capabilities.includes('lighting') },
      )
      await protocol.init()
      if (disconnected) throw new Error('鼠标已断开')
      return new MouseSession(
        protocol,
        {
          capabilities: this.manifest.capabilities,
          profileModel: CB75_CONFIG.profileModel,
          name: CB75_CONFIG.name,
          connection: connection.mode,
          storage: CB75_CONFIG.storage,
        },
        cleanup,
        connection.mode === 'wired' ? {
          maxImageBytes: 0xff00 * 16,
          validate: validateFirmware,
          async requestDevice() {
            const selected = await navigator.hid.requestDevice({
              filters: [{ vendorId: CB75_CONFIG.vendorId, productId: device.productId }],
            })
            if (!selected.length) return undefined
            const target = selected.find(isFirmwareDevice)
            if (!target) throw new Error('请选择 CB75 鼠标 USB 固件接口')
            return target
          },
          update: (target, image, progress) => protocol!.updateFirmware(
            () => new CB75FirmwareUpdater(target).update(image, progress),
          ),
        } : undefined,
      )
    } catch (error) {
      await cleanup()
      throw error
    }
  }
}
