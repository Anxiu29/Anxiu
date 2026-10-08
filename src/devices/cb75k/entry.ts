import type { ExternalDeviceEntry } from '@/application/DeviceService'
import { CB75K_DONGLE, CB75K_USB } from './device'

/** 主站只负责识别并转入 RK 页面；设备读写由 RK 页面接管。 */
export const CB75_KEYBOARD_ENTRY: ExternalDeviceEntry = {
  id: 'cb75-keyboard',
  displayName: 'CB75-Keyboard',
  path: '/cb75/index.html',
  hid: [
    {
      vendorId: CB75K_USB.vendorId,
      productIds: [CB75K_USB.productId],
      usagePage: CB75K_USB.usagePage,
      usage: CB75K_USB.usage,
    },
    {
      vendorId: CB75K_DONGLE.vendorId,
      productIds: [CB75K_DONGLE.productId],
      usagePage: CB75K_DONGLE.usagePage,
      usage: CB75K_DONGLE.usage,
    },
  ],
}
