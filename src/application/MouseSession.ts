import type { MouseConfiguration, MouseIdentity } from '@/domain/mouse/types'
import type { KeyCode } from '@/domain/mouse/model'
import type { MouseMacro } from '@/domain/mouse/macros'
import type { MouseProfile } from '@/domain/mouse/profiles'

/** 鼠标应用端口。UI 与 Store 不依赖 TLW 或具体型号协议。 */
export interface MouseDevice {
  readConfiguration(): Promise<MouseConfiguration>
  readDpiStage(): Promise<number>
  setKey(index: number, key?: KeyCode): Promise<MouseConfiguration>
  resetKeys(): Promise<MouseConfiguration>
  setDpi(index: number, dpi: number): Promise<MouseConfiguration>
  selectDpi(index: number): Promise<MouseConfiguration>
  setDpiEnabled(index: number, enabled: boolean): Promise<MouseConfiguration>
  setDpiColor(index: number, color: string): Promise<MouseConfiguration>
  setRate(code: number): Promise<MouseConfiguration>
  setColor(color: string): Promise<MouseConfiguration>
  setBrightness(level: number): Promise<MouseConfiguration>
  setLightMode(mode: number): Promise<MouseConfiguration>
  setLightSpeed(speed: number): Promise<MouseConfiguration>
  bindMacro(index: number, macro: MouseMacro): Promise<MouseConfiguration>
  applyProfile(profile: MouseProfile): Promise<MouseConfiguration>
  restoreFactory(): Promise<MouseConfiguration>
}
export interface MouseFirmwareSupport {
  maxImageBytes: number
  validate(input: Uint8Array): Uint8Array
  requestDevice(): Promise<HIDDevice | undefined>
  update(device: HIDDevice, image: Uint8Array, progress: (percent: number) => void): Promise<void>
}

export class MouseSession {
  readonly kind = 'mouse' as const
  constructor(
    readonly device: MouseDevice,
    readonly identity: MouseIdentity,
    private readonly release: () => Promise<void>,
    readonly firmware?: MouseFirmwareSupport,
  ) {}
  load() {
    return this.device.readConfiguration()
  }
  close() {
    return this.release()
  }
}
