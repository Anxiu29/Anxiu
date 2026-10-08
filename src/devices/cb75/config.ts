import { MOUSE_FILE_FORMAT } from '@/domain/mouse/types'
import { buttonLayout } from './buttonLayout'
import image from './assets/mouse.png'

/** Fixed metadata; device-reported capabilities belong in runtime configuration. */
export const CB75_CONFIG = {
  id: 'cb75',
  name: 'CB75-Mouse',
  vendorId: 0x320f,
  image,
  buttonLayout,
  hid: { usagePage: 0xff1c, usage: 0x0092, reportId: 4 },
  connections: [
    { mode: 'wired', productId: 0x22f2, dataSize: 56 },
    { mode: 'wireless', productId: 0x22f3, dataSize: 24 },
  ],
  // Existing storage/file identifiers must remain compatible with saved data.
  storage: { profiles: 'cb75-mouse.profiles.v1', macros: 'cb75-mouse.macros.v1' },
  profileModel: MOUSE_FILE_FORMAT,
} as const
