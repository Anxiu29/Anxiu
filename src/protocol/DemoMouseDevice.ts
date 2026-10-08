import type { MouseDevice } from '@/application/MouseSession'
import { MOUSE_FILE_FORMAT, type MouseConfiguration } from '@/domain/mouse/types'
import { encodeKeys, parseKeys, type KeyCode } from '@/domain/mouse/model'
import {
  changeDpi,
  changeDpiEnabled,
  changeDpiColor,
  changeRate,
  changeColor,
  stageOffset,
} from '@/domain/mouse/settings'
import {
  encodeCapturedMacro,
  macroBinding,
  validateMacro,
  type MouseMacro,
} from '@/domain/mouse/macros'
import { validateProfile, type MouseProfile } from '@/domain/mouse/profiles'
import { validateProfileCompatibility } from '@/domain/mouse/profileCompatibility'
import { unsigned } from '@/domain/mouse/codec'

/** 内存中的鼠标端口；所有返回值都是快照，不读取或写入 WebHID。 */
export class DemoMouseDevice implements MouseDevice {
  private state: MouseConfiguration
  private closed = false
  constructor(private readonly initial: MouseConfiguration, private readonly profileModel: string = MOUSE_FILE_FORMAT) {
    this.state = structuredClone(initial)
  }
  close() {
    this.closed = true
  }
  private checkOpen() {
    if (this.closed) throw new Error('演示会话已结束')
  }
  async readConfiguration() {
    this.checkOpen()
    return structuredClone(this.state)
  }
  async readDpiStage() {
    this.checkOpen()
    return this.state.functions[12]
  }
  private async update(change: (next: MouseConfiguration) => void) {
    this.checkOpen()
    const next = structuredClone(this.state)
    change(next)
    this.state = next
    return this.readConfiguration()
  }
  setKey(index: number, key?: KeyCode) {
    return this.update((c) => {
      unsigned(index, c.keys.length - 1, 'Key index')
      if (c.defaultKeys[index].every((v) => v === 0)) throw new Error('Invalid mouse key')
      const replacement = key ?? c.defaultKeys[index]
      const next = c.keys.map((item, i) => (i === index ? replacement : item))
      if (!next.some((k) => k[0] === 0x10 && k[1] === 1))
        throw new Error('Keep at least one left mouse button')
      c.keysRaw.set(encodeKeys([replacement]), index * 3)
      c.keys = parseKeys(c.keysRaw.slice(0, c.basic.keyBytes))
    })
  }
  resetKeys() {
    return this.update((c) => {
      c.keys = structuredClone(c.defaultKeys)
      c.keysRaw.set(encodeKeys(c.keys))
    })
  }
  setDpi(index: number, dpi: number) {
    return this.update((c) => {
      changeDpi(c.functions, index, dpi, c.basic)
      if (c.functions[stageOffset(index, c.basic)]) c.functions[12] = index
    })
  }
  selectDpi(index: number) {
    return this.update((c) => {
      if (!c.functions[stageOffset(index, c.basic)]) throw new Error('This DPI stage is disabled')
      c.functions[12] = index
    })
  }
  setDpiEnabled(index: number, enabled: boolean) {
    return this.update((c) => changeDpiEnabled(c.functions, index, enabled, c.basic))
  }
  setDpiColor(index: number, color: string) {
    return this.update((c) => changeDpiColor(c.functions, index, color, c.basic))
  }
  setRate(code: number) {
    return this.update((c) => changeRate(c.functions, code))
  }
  setColor(color: string) {
    return this.update((c) => changeColor(c.functions, color))
  }
  setBrightness(level: number) {
    return this.update((c) => {
      c.functions[2] = unsigned(level, 4, 'Brightness')
    })
  }
  setLightMode(mode: number) {
    return this.update((c) => {
      c.functions[1] = unsigned(mode, 6, 'Light mode')
    })
  }
  setLightSpeed(speed: number) {
    return this.update((c) => {
      c.functions[3] = unsigned(speed, 3, 'Light speed')
    })
  }
  async bindMacro(index: number, macro: MouseMacro) {
    const value = validateMacro(macro)
    encodeCapturedMacro(value, this.state.basic.macroBytes)
    await this.setKey(index, macroBinding(value))
    return this.update((c) => {
      c.macro = value
    })
  }
  applyProfile(profile: MouseProfile) {
    const value = validateProfile(profile, this.profileModel)
    return this.update((c) => {
      validateProfileCompatibility(value, c, { lighting: true })
      if (value.macro) encodeCapturedMacro(value.macro, c.basic.macroBytes)
      value.functions[0] = c.functions[0]
      c.functions = Uint8Array.from(value.functions)
      c.keysRaw = Uint8Array.from(value.keys)
      c.keys = parseKeys(c.keysRaw.slice(0, c.basic.keyBytes))
      c.macro = value.macro
    })
  }
  restoreFactory() {
    return this.update((c) => Object.assign(c, structuredClone(this.initial)))
  }
}
