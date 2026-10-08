import { parseBasicInfo, parseBattery } from '@/domain/mouse/codec'
import { parseKeys, encodeKeys, type KeyCode } from '@/domain/mouse/model'
import { CB75Transport, ReadCommand, WriteCommand } from './transport'
import {
  changeDpi,
  changeRate,
  changeColor,
  stageOffset,
  changeDpiEnabled,
  changeDpiColor,
} from '@/domain/mouse/settings'
import {
  encodeCapturedMacro,
  validateMacro,
  macroBinding,
  type MouseMacro,
} from '@/domain/mouse/macros'
import { validateProfile, type MouseProfile } from '@/domain/mouse/profiles'
import { validateProfileCompatibility } from '@/domain/mouse/profileCompatibility'
import { MOUSE_FILE_FORMAT } from '@/domain/mouse/types'

export type CB75Configuration = Awaited<ReturnType<CB75Protocol['readConfiguration']>>

export class CB75Protocol {
  private queue: Promise<unknown> = Promise.resolve()
  private appliedMacro?: MouseMacro
  private basicCache?: Uint8Array
  private defaultKeysCache?: Uint8Array
  constructor(
    private readonly transport: CB75Transport,
    private readonly profileModel: string = MOUSE_FILE_FORMAT,
    private readonly features = { lighting: true },
  ) {}

  async init() {
    const basic = parseBasicInfo(
      await this.transport.readSession(() =>
        this.transport.readRange(ReadCommand.BasicInfo, 0, 34),
      ),
    )
    if (!basic.keyCount || !basic.dpiStageCount) throw new Error('Invalid CB75 capabilities')
  }

  destroy() {
    this.clearMetadata()
    this.transport.stop()
  }

  private clearMetadata() {
    this.basicCache = undefined
    this.defaultKeysCache = undefined
  }

  updateFirmware(work: () => Promise<void>) {
    return this.exclusive(async () => {
      this.clearMetadata()
      this.transport.stop()
      await work()
    })
  }

  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const operation = this.queue.then(work)
    this.queue = operation.catch(() => undefined)
    return operation
  }

  readConfiguration() {
    return this.exclusive(() => {
      this.clearMetadata()
      return this.readCurrent()
    })
  }

  readDpiStage() {
    return this.exclusive(() =>
      this.transport.readSession(async () => {
        // Current stage is byte 12 of the captured functions block.
        const functions = await this.transport.read(
          ReadCommand.Functions,
          0,
          this.transport.dataSize,
        )
        return functions[12]
      }),
    )
  }

  restoreFactory() {
    return this.exclusive(async () => {
      this.clearMetadata()
      // PDF AD mapped to this firmware's low command family. Reset takes about 2s.
      // This envelope still needs hardware validation; never substitute a host-only reset.
      await this.transport.write(WriteCommand.FactoryReset, 0, new Uint8Array(24))
      this.appliedMacro = undefined
      await new Promise((resolve) => setTimeout(resolve, 2200))
      const config = await this.readCurrent()
      if (config.keys.some((key, i) => key.some((b, j) => b !== config.defaultKeys[i][j]))) {
        throw new Error('Factory reset key readback mismatch')
      }
      return config
    })
  }

  private readCurrent() {
    return this.transport.readSession(() => this.readBlocks())
  }

  private async readBlocks() {
    const basicRaw = this.basicCache?.slice() ??
      await this.transport.readRange(ReadCommand.BasicInfo, 0, 34)
    const basic = parseBasicInfo(basicRaw)
    if (!basic.keyCount || !basic.dpiStageCount || 14 + basic.dpiStageCount * 9 > 128) {
      throw new Error('Invalid CB75 capabilities')
    }
    const functions = await this.transport.readRange(ReadCommand.Functions, 0, 128)
    const keysRaw = await this.transport.readRange(ReadCommand.Keys, 0, 128)
    if (basic.keyBytes > keysRaw.length) throw new Error('Unsupported CB75 matrix size')
    const keys = parseKeys(keysRaw.slice(0, basic.keyBytes))
    const defaultKeysRaw = this.defaultKeysCache?.slice() ??
      await this.transport.readRange(ReadCommand.DefaultKeys, 0, basic.keyBytes)
    const defaultKeys = parseKeys(defaultKeysRaw)
    const battery = parseBattery(await this.transport.read(ReadCommand.Battery, 0, 6))
    this.basicCache = basicRaw.slice()
    this.defaultKeysCache = defaultKeysRaw.slice()
    return {
      basic,
      basicRaw,
      functions,
      keysRaw,
      keys,
      defaultKeys,
      battery,
      macro: this.appliedMacro,
    }
  }

  private async commit(
    write: WriteCommand.Functions | WriteCommand.Keys,
    read: ReadCommand,
    bytes: Uint8Array,
  ) {
    await this.transport.write(WriteCommand.Begin, 0, new Uint8Array(24))
    let failure: unknown
    try {
      for (let offset = 0; offset < bytes.length; offset += this.transport.dataSize) {
        await this.transport.write(
          write,
          offset,
          bytes.slice(offset, offset + this.transport.dataSize),
        )
      }
    } catch (error) {
      failure = error
    }
    try {
      await this.transport.write(WriteCommand.End, 0, new Uint8Array(24))
    } catch (error) {
      failure ??= error
    }
    if (failure) throw failure
    const actual = await this.transport.readSession(() =>
      this.transport.readRange(read, 0, bytes.length),
    )
    if (actual.some((byte, index) => byte !== bytes[index])) {
      throw new Error('CB75 saved data did not match readback; refresh before retrying')
    }
    return actual
  }

  private updateFunctions(change: (bytes: Uint8Array, config: CB75Configuration) => void) {
    return this.exclusive(async () => {
      const config = await this.readCurrent()
      const bytes = config.functions.slice()
      change(bytes, config)
      const functions = await this.commit(WriteCommand.Functions, ReadCommand.Functions, bytes)
      // Reuse verified device data instead of reading every block again.
      return { ...config, functions }
    })
  }

  setDpi(stage: number, dpi: number) {
    return this.updateFunctions((bytes, config) => {
      changeDpi(bytes, stage, dpi, config.basic)
      if (bytes[stageOffset(stage, config.basic)]) bytes[12] = stage
    })
  }
  setDpiEnabled(stage: number, enabled: boolean) {
    return this.updateFunctions((bytes, config) =>
      changeDpiEnabled(bytes, stage, enabled, config.basic),
    )
  }
  setDpiColor(stage: number, color: string) {
    return this.updateFunctions((bytes, config) =>
      changeDpiColor(bytes, stage, color, config.basic),
    )
  }
  selectDpi(stage: number) {
    return this.updateFunctions((bytes, config) => {
      const offset = stageOffset(stage, config.basic)
      if (!bytes[offset]) throw new Error('This DPI stage is disabled')
      bytes[12] = stage
    })
  }
  setRate(code: number) {
    return this.updateFunctions((bytes) => changeRate(bytes, code))
  }
  setColor(color: string) {
    return this.updateFunctions((bytes) => changeColor(bytes, color))
  }
  setBrightness(level: number) {
    return this.updateFunctions((bytes) => {
      if (!Number.isInteger(level) || level < 0 || level > 4)
        throw new Error('Unsupported brightness level')
      bytes[2] = level
    })
  }
  setLightMode(mode: number) {
    return this.updateFunctions((bytes) => {
      if (!Number.isInteger(mode) || mode < 0 || mode > 6) throw new Error('Unsupported light mode')
      bytes[1] = mode
    })
  }
  setLightSpeed(speed: number) {
    return this.updateFunctions((bytes) => {
      if (!Number.isInteger(speed) || speed < 0 || speed > 3)
        throw new Error('Unsupported light speed')
      bytes[3] = speed
    })
  }
  private async writeMacro(macro: MouseMacro, capacity: number) {
    const bytes = encodeCapturedMacro(macro, capacity)
    this.appliedMacro = undefined
    for (let offset = 0; offset < bytes.length; offset += this.transport.dataSize) {
      await this.transport.write(
        WriteCommand.Macros,
        offset,
        bytes.slice(offset, offset + this.transport.dataSize),
      )
    }
    // Only acknowledgement is available in the capture, not a macro read command.
    this.appliedMacro = validateMacro(macro)
  }

  bindMacro(index: number, macro: MouseMacro) {
    return this.exclusive(async () => {
      const config = await this.readCurrent()
      const binding = macroBinding(macro)
      this.checkKey(config, index, binding)
      await this.writeMacro(macro, config.basic.macroBytes)
      const bytes = config.keysRaw.slice()
      bytes.set(binding, index * 3)
      await this.commit(WriteCommand.Keys, ReadCommand.Keys, bytes)
      return this.readCurrent()
    })
  }

  applyProfile(value: MouseProfile) {
    // Validate and clone before queueing so malformed imports cannot cause partial writes.
    const profile = validateProfile(value, this.profileModel)
    return this.exclusive(async () => {
      const config = await this.readCurrent()
      const functions = Uint8Array.from(profile.functions)
      validateProfileCompatibility(profile, config, this.features)
      if (profile.macro) encodeCapturedMacro(profile.macro, config.basic.macroBytes)
      if (profile.macro) await this.writeMacro(profile.macro, config.basic.macroBytes)
      // Host profiles always target the current device configuration, not guessed firmware slots.
      functions[0] = config.functions[0]
      await this.commit(WriteCommand.Functions, ReadCommand.Functions, functions)
      await this.commit(WriteCommand.Keys, ReadCommand.Keys, Uint8Array.from(profile.keys))
      return this.readCurrent()
    })
  }

  private checkKey(config: CB75Configuration, index: number, replacement: KeyCode) {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= config.keys.length ||
      config.defaultKeys[index].every((value) => value === 0)
    )
      throw new Error('Invalid mouse key')
    if (
      !config.keys.some((value, i) => {
        const key = i === index ? replacement : value
        return key[0] === 0x10 && key[1] === 1
      })
    )
      throw new Error('Keep at least one left mouse button')
  }
  resetKeys() {
    return this.exclusive(async () => {
      const config = await this.readCurrent()
      if (!config.defaultKeys.some((key) => key[0] === 0x10 && key[1] === 1))
        throw new Error('Keep at least one left mouse button')
      const bytes = config.keysRaw.slice()
      bytes.set(encodeKeys(config.defaultKeys))
      await this.commit(WriteCommand.Keys, ReadCommand.Keys, bytes)
      return this.readCurrent()
    })
  }
  setKey(index: number, key?: KeyCode) {
    return this.exclusive(async () => {
      const config = await this.readCurrent()
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= config.keys.length ||
        config.defaultKeys[index].every((value) => value === 0)
      )
        throw new Error('Invalid mouse key')
      const replacement = key ?? config.defaultKeys[index]
      this.checkKey(config, index, replacement)
      const bytes = config.keysRaw.slice()
      bytes.set(encodeKeys([replacement]), index * 3)
      await this.commit(WriteCommand.Keys, ReadCommand.Keys, bytes)
      return this.readCurrent()
    })
  }
}
