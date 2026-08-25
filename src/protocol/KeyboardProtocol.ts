import type { DeviceTransport, KeyboardDevice } from '@/application/ports'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import type { DeviceInfo, KeyboardConfiguration, KeyboardMode, KeyAssignment, KeyPosition, KeyboardProfile } from '@/domain/keyboard'
import type { MatrixKeyInput, PhysicalLayoutResolver } from '@/domain/layout'
import { readUint16le, uint16le, type CrcStrategy } from './codec'
import { XSYD_ACTIONS, XSYD_COMMANDS } from './xsyd/commands'
import { XsydCommandClient } from './xsyd/XsydCommandClient'
import type { CapabilityDescriptor } from '@/domain/capabilities'
import type { DefaultKeymapResolver } from './DefaultKeymapResolver'
import type { CustomKeyLighting, LightingSettings } from '@/domain/lighting'
import { DEFAULT_LIGHTING_SETTINGS } from '@/domain/lighting'
import { decodeMainLighting, encodeMainLighting } from './xsyd/lightingCodec'
import { decodeCustomLighting, encodeCustomLightingRead, encodeCustomLightingSave, encodeCustomLightingWrite, XSYD_CUSTOM_LIGHTING_KEYS_PER_PACKET } from './xsyd/customLightingCodec'
import type { AdvancedKeySettings, AdvancedKeyType, DksAdvancedKey } from '@/domain/advancedKey'
import { advancedReadRequest, decodeEnd, decodeMpt, decodeSocd, decodeTgl, encodeDks, encodeEnd, encodeMpt, encodeMt, encodeSocd, encodeTgl } from './xsyd/advancedKeyCodec'
import { DriverError } from '@/application/DriverError'
import type { MacroSettings } from '@/domain/macro'
import { createEmptyMacro, validateMacroSettings } from '@/domain/macro'
import { decodeMacroMode, encodeMacroDataWrite, encodeMacroModeRead, encodeMacroModeWrite, MACRO_ACTIONS_PER_PACKET, XSYD_MACRO_BUFFER_OFFSET, XSYD_MACRO_LAYOUT_MODE, XSYD_MAX_MACRO_ACTIONS, XSYD_MAX_MACRO_SLOTS } from './xsyd/macroCodec'
import type { KeyPerformanceSettings, PerformanceMode, PollingRate } from '@/domain/performance'
import { validatePerformanceSettings } from '@/domain/performance'
import { decodeGlobalPerformance, encodeGlobalPerformance } from './xsyd/performanceCodec'
import { decodeTravelHalf, encodeTravelRequest, encodeTravelStateRequest } from './xsyd/travelCodec'

const ADVANCED_LAYOUT = {
  db0: 0x04, db1: 0x05, db2: 0x06, mode: 0x08,
  dks1: 0x09, dks2: 0x0a, dks3: 0x0b, dks4: 0x0c,
  trps1: 0x0d, trps2: 0x0e, trps3: 0x0f, trps4: 0x10,
  delay: 0x13, rapidPress: 0x14, rapidRelease: 0x15, pressDeadZone: 0x16, releaseDeadZone: 0x17,
} as const
const PERFORMANCE_MODE: Record<PerformanceMode, number> = { global: 0, single: 1, 'rapid-trigger': 2 }
const PERFORMANCE_MODE_BY_VALUE: Record<number, PerformanceMode> = { 0: 'global', 1: 'single', 2: 'rapid-trigger' }
const POLLING_RATE_CODES: Record<PollingRate, number> = { 8000: 0, 4000: 1, 2000: 2, 1000: 3, 500: 4, 250: 5, 125: 6 }
const POLLING_RATES_BY_CODE: Record<number, PollingRate> = { 0: 8000, 1: 4000, 2: 2000, 3: 1000, 4: 500, 5: 250, 6: 125 }

// MODE=6 在 1.0.7 方案中保留给宏；7 为 RS，8 为 SOCD。
const ADVANCED_MODE = { dks: 1, mpt: 2, mt: 3, tgl: 4, end: 5, macro: 6, socd: 8 } as const
const ADVANCED_TYPE_BY_MODE: Partial<Record<number, Exclude<AdvancedKeyType, 'none'>>> = {
  [ADVANCED_MODE.dks]: 'dks', [ADVANCED_MODE.mpt]: 'mpt', [ADVANCED_MODE.mt]: 'mt',
  [ADVANCED_MODE.tgl]: 'tgl', [ADVANCED_MODE.end]: 'end', [ADVANCED_MODE.socd]: 'socd',
}

export class XsydKeyboardProtocol implements KeyboardDevice {
  private readonly commands: XsydCommandClient
  private currentMode: KeyboardMode = 'win'
  private protocolVersion = '1.0.7'
  private readonly modeListeners = new Set<(mode: KeyboardMode) => void>()
  private readonly configurationListeners = new Set<(configuration: KeyboardConfiguration) => void>()
  private readonly removeNotificationListener: () => void
  readonly profile = { getProfile: () => this.getProfile() }
  readonly keymap = { writeAssignments: (assignments: KeyAssignment[]) => this.writeAssignments(assignments) }
  readonly configuration = { save: () => this.save(), reload: () => this.reload() }
  readonly factoryReset = { restoreFactory: () => this.restoreFactory() }
  readonly systemMode = {
    switchMode: (mode: KeyboardMode) => this.switchMode(mode),
    onModeChange: (listener: (mode: KeyboardMode) => void) => this.onModeChange(listener),
  }
  readonly configurationSwitch = {
    switchConfiguration: (configuration: KeyboardConfiguration) => this.switchConfiguration(configuration),
    onConfigurationChange: (listener: (configuration: KeyboardConfiguration) => void) => this.onConfigurationChange(listener),
  }
  readonly lighting = {
    getLighting: () => this.getLighting(),
    setLighting: (settings: LightingSettings) => this.setLighting(settings),
  }
  readonly customLighting = {
    getCustomLighting: (sourceCodes: number[]) => this.getCustomLighting(sourceCodes),
    setCustomLighting: (items: CustomKeyLighting[]) => this.setCustomLighting(items),
    saveCustomLighting: () => this.saveCustomLighting(),
  }
  readonly advancedKey = {
    getAdvancedKey: (sourceCode: number) => this.getAdvancedKey(sourceCode),
    getAdvancedKeyTypes: (sourceCodes: number[]) => this.getAdvancedKeyTypes(sourceCodes),
    setAdvancedKey: (settings: Exclude<AdvancedKeySettings, { type: 'none' }>) => this.setAdvancedKey(settings),
    deleteAdvancedKey: (sourceCode: number) => this.deleteAdvancedKey(sourceCode),
  }
  readonly performance = {
    getPerformance: (sourceCode: number) => this.getPerformance(sourceCode),
    setPerformance: (settings: KeyPerformanceSettings) => this.setPerformance(settings),
    getPollingRate: () => this.getPollingRate(),
    setPollingRate: (rate: PollingRate) => this.setPollingRate(rate),
    getTravelMatrix: () => this.getTravelMatrix(),
    startCalibration: () => this.startCalibration(),
    finishCalibration: () => this.finishCalibration(),
  }
  readonly macro = {
    getMacro: (sourceCode: number) => this.getMacro(sourceCode),
    setMacro: (settings: MacroSettings) => this.setMacro(settings),
    deleteMacroBinding: (sourceCode: number) => this.deleteMacroBinding(sourceCode),
  }

  constructor(
    private readonly transport: DeviceTransport,
    private readonly keyCatalog: KeyCatalog,
    private readonly capabilityDescriptor: CapabilityDescriptor,
    private readonly resolveDefaultKeymap: DefaultKeymapResolver,
    crc?: CrcStrategy,
    private readonly resolvePhysicalLayout?: PhysicalLayoutResolver,
  ) {
    this.commands = new XsydCommandClient(transport, crc)
    this.removeNotificationListener = this.commands.onNotification((packet) => this.handleNotification(packet.command, packet.data))
  }

  async getProfile(): Promise<KeyboardProfile> {
    // 设备身份与协议版本互不依赖，可以并行查询；能力需要两者齐备后才能解析。
    const [device, protocolVersion, mode] = await Promise.all([this.sync(), this.queryProtocolVersion(), this.queryMode()])
    this.protocolVersion = protocolVersion
    this.currentMode = mode
    const capabilities = this.capabilityDescriptor.resolve({ device: { ...device, protocolVersion }, protocolVersion })
    // 0x2B 只告诉我们有哪些物理键；每个 Fn 层的实际键值还要通过 0x23 单独读取。
    const capturedPositions = await this.readDefaultLayout(capabilities.layoutRows, capabilities.layoutColumns)
    // 设备可选择修复固件在特殊启动阶段返回的不完整矩阵；协议本身不认识任何型号。
    const positions = (this.resolvePhysicalLayout?.(capturedPositions) ?? capturedPositions) as KeyPosition[]
    const assignments: KeyAssignment[] = []
    for (let layer = 0; layer < capabilities.layers; layer++) assignments.push(...await this.readLayer(layer, positions))
    // 协议需要默认值来组装 Profile，但默认表由设备层注入，协议不知道任何具体型号。
    const defaultAssignments = this.resolveDefaultKeymap({
      mode: this.currentMode,
      positions,
      layers: capabilities.layers,
      keyCatalog: this.keyCatalog,
    })
    return {
      device: { ...device, protocolVersion },
      capabilities,
      positions,
      mode,
      defaultAssignments,
      assignments,
    }
  }

  async writeAssignments(assignments: KeyAssignment[]) {
    // 一个 HID 报告最多容纳 14 条四字节键位记录，超出部分必须按同样格式分批发送。
    for (let offset = 0; offset < assignments.length; offset += 14) {
      const batch = assignments.slice(offset, offset + 14)
      const data = [1]
      batch.forEach((item) => data.push(item.sourceCode, item.layer, ...uint16le(item.keyCode)))
      await this.commands.request(XSYD_COMMANDS.keymap, new Uint8Array(data))
    }
  }

  save() { return this.action(XSYD_ACTIONS.save, 1600) }
  reload() { return this.action(XSYD_ACTIONS.reload, 1600) }
  restoreFactory() { return this.action(XSYD_ACTIONS.restoreFactory, 2500) }
  async switchMode(mode: KeyboardMode) {
    await this.action(mode === 'mac' ? XSYD_ACTIONS.switchToMac : XSYD_ACTIONS.switchToWin, 1600)
    this.currentMode = mode
    await this.waitForStateSettled()
  }
  async switchConfiguration(configuration: KeyboardConfiguration) {
    await this.action(XSYD_ACTIONS.switchConfiguration, 1600, [configuration - 1])
    await this.waitForStateSettled()
  }
  async getLighting() {
    // 官方 SDK 的读取也携带一份完整占位结构，不能只发送单独的 rw 字节。
    const request = encodeMainLighting({ ...DEFAULT_LIGHTING_SETTINGS, colors: [] }, false, this.supportsDynamicColorId())
    return decodeMainLighting(await this.commands.request(XSYD_COMMANDS.lighting, request))
  }
  async setLighting(settings: LightingSettings) {
    await this.commands.request(XSYD_COMMANDS.lighting, encodeMainLighting(settings, true, this.supportsDynamicColorId()))
  }

  async getCustomLighting(sourceCodes: number[]) {
    const result: CustomKeyLighting[] = []
    for (let offset = 0; offset < sourceCodes.length; offset += XSYD_CUSTOM_LIGHTING_KEYS_PER_PACKET) {
      const batch = sourceCodes.slice(offset, offset + XSYD_CUSTOM_LIGHTING_KEYS_PER_PACKET)
      result.push(...decodeCustomLighting(await this.commands.request(XSYD_COMMANDS.customLighting, encodeCustomLightingRead(batch))))
    }
    return result
  }

  async setCustomLighting(items: CustomKeyLighting[]) {
    for (let offset = 0; offset < items.length; offset += XSYD_CUSTOM_LIGHTING_KEYS_PER_PACKET) {
      await this.commands.request(XSYD_COMMANDS.customLighting, encodeCustomLightingWrite(items.slice(offset, offset + XSYD_CUSTOM_LIGHTING_KEYS_PER_PACKET)))
    }
  }

  saveCustomLighting() {
    return this.commands.request(XSYD_COMMANDS.customLighting, encodeCustomLightingSave()).then(() => undefined)
  }

  async getAdvancedKey(sourceCode: number): Promise<AdvancedKeySettings> {
    const modeValue = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.mode)
    const type = modeValue & 0x0f
    if (type === ADVANCED_MODE.dks) {
      // 当前真机现象表明 DKS 命令末尾的两个行程对应 Layout_DB1、Layout_DB2；
      // Layout_DB3 始终返回轴体校准总行程，误读它会让第二位置固定显示 3.44 mm。
      const layouts = [ADVANCED_LAYOUT.dks1, ADVANCED_LAYOUT.dks2, ADVANCED_LAYOUT.dks3, ADVANCED_LAYOUT.dks4, ADVANCED_LAYOUT.trps1, ADVANCED_LAYOUT.trps2, ADVANCED_LAYOUT.trps3, ADVANCED_LAYOUT.trps4, ADVANCED_LAYOUT.db1, ADVANCED_LAYOUT.db2]
      const values: number[] = []
      // HID 命令客户端按请求串行匹配响应；这里显式串行，避免同命令 0x23 的响应互相抢占。
      for (const layout of layouts) values.push(await this.readLayoutValue(sourceCode, layout))
      return { type: 'dks', sourceCode, keyCodes: values.slice(0, 4) as DksAdvancedKey['keyCodes'], triggers: values.slice(4, 8).map((value) => value & 0xff) as DksAdvancedKey['triggers'], travels: [(values[8] ?? 0) / 1000, (values[9] ?? 0) / 1000] }
    }
    if (type === ADVANCED_MODE.mpt) return decodeMpt(sourceCode, await this.commands.request(XSYD_COMMANDS.mpt, advancedReadRequest(sourceCode)))
    if (type === ADVANCED_MODE.mt) {
      const first = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.dks1)
      const second = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.dks2)
      const delay = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.delay)
      return { type: 'mt', sourceCode, keyCodes: [first, second], delay: delay * 10 }
    }
    if (type === ADVANCED_MODE.tgl) return decodeTgl(sourceCode, await this.commands.request(XSYD_COMMANDS.tgl, advancedReadRequest(sourceCode)))
    if (type === ADVANCED_MODE.end) return decodeEnd(sourceCode, await this.commands.request(XSYD_COMMANDS.end, advancedReadRequest(sourceCode)))
    if (type === ADVANCED_MODE.socd) return decodeSocd(sourceCode, await this.commands.request(XSYD_COMMANDS.socd, advancedReadRequest(sourceCode)))
    return { type: 'none', sourceCode }
  }

  async getAdvancedKeyTypes(sourceCodes: number[]) {
    // MODE 可以像普通层键值一样每包读取 14 键；只扫描类型，不读取每个高级键的完整参数。
    const modes = await this.readLayoutValues(sourceCodes, ADVANCED_LAYOUT.mode)
    return Object.fromEntries([...modes].flatMap(([sourceCode, mode]) => {
      const type = ADVANCED_TYPE_BY_MODE[mode & 0x0f]
      return type ? [[sourceCode, type]] : []
    }))
  }

  async setAdvancedKey(settings: Exclude<AdvancedKeySettings, { type: 'none' }>) {
    // 这些专用命令会同时让固件更新 Layout_Mode；SDK 的 setX 也只发送对应命令。
    if (settings.type === 'dks') await this.commands.request(XSYD_COMMANDS.dks, encodeDks(settings))
    else if (settings.type === 'mpt') await this.commands.request(XSYD_COMMANDS.mpt, encodeMpt(settings))
    else if (settings.type === 'mt') await this.commands.request(XSYD_COMMANDS.mt, encodeMt(settings))
    else if (settings.type === 'tgl') await this.commands.request(XSYD_COMMANDS.tgl, encodeTgl(settings))
    else if (settings.type === 'end') await this.commands.request(XSYD_COMMANDS.end, encodeEnd(settings))
    else await this.commands.request(XSYD_COMMANDS.socd, encodeSocd(settings))
  }

  async deleteAdvancedKey(sourceCode: number) {
    const modeValue = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.mode)
    // 高四位属于性能触发方式，删除高级键只能清除低四位，不能把另一项设置一并破坏。
    await this.writeLayoutValue(sourceCode, ADVANCED_LAYOUT.mode, modeValue & 0xf0)
  }

  async getPerformance(sourceCode: number): Promise<KeyPerformanceSettings> {
    const global = decodeGlobalPerformance(await this.commands.request(
      XSYD_COMMANDS.performance,
      encodeGlobalPerformance({ sourceCode, mode: 'global', globalActuation: 0, actuation: 0, rapidPress: 0, rapidRelease: 0, pressDeadZone: 0, releaseDeadZone: 0 }, false),
    ))
    const layouts = [ADVANCED_LAYOUT.mode, ADVANCED_LAYOUT.db0, ADVANCED_LAYOUT.rapidPress, ADVANCED_LAYOUT.rapidRelease, ADVANCED_LAYOUT.pressDeadZone, ADVANCED_LAYOUT.releaseDeadZone]
    const values: number[] = []
    for (const layout of layouts) values.push(await this.readLayoutValue(sourceCode, layout))
    const mode = PERFORMANCE_MODE_BY_VALUE[((values[0] ?? 0) >> 4) & 0x0f] ?? 'global'
    return {
      sourceCode,
      mode,
      globalActuation: global.globalActuation,
      actuation: (values[1] ?? 0) / 1000,
      rapidPress: (values[2] ?? 0) / 1000,
      rapidRelease: (values[3] ?? 0) / 1000,
      // 全局模式以 0x29 为唯一真值，不能被该键之前保存的单键参数污染。
      pressDeadZone: mode === 'global' ? global.pressDeadZone : ((values[4] ?? 0) || Math.round(global.pressDeadZone * 1000)) / 1000,
      releaseDeadZone: mode === 'global' ? global.releaseDeadZone : ((values[5] ?? 0) || Math.round(global.releaseDeadZone * 1000)) / 1000,
    }
  }

  async setPerformance(settings: KeyPerformanceSettings) {
    const errors = validatePerformanceSettings(settings)
    if (errors.length) throw new DriverError('INVALID_CONFIGURATION', errors.join('；'))
    if (settings.mode === 'global') {
      await this.commands.request(XSYD_COMMANDS.performance, encodeGlobalPerformance(settings, true))
    } else {
      // db0 在普通单键模式中是触发行程，在 RT 模式中是第一次按下时的初始触发行程。
      await this.writeLayoutValue(settings.sourceCode, ADVANCED_LAYOUT.db0, Math.round(settings.actuation * 1000))
      if (settings.mode === 'rapid-trigger') {
        await this.writeLayoutValue(settings.sourceCode, ADVANCED_LAYOUT.rapidPress, Math.round(settings.rapidPress * 1000))
        await this.writeLayoutValue(settings.sourceCode, ADVANCED_LAYOUT.rapidRelease, Math.round(settings.rapidRelease * 1000))
      }
      await this.writeLayoutValue(settings.sourceCode, ADVANCED_LAYOUT.pressDeadZone, Math.round(settings.pressDeadZone * 1000))
      await this.writeLayoutValue(settings.sourceCode, ADVANCED_LAYOUT.releaseDeadZone, Math.round(settings.releaseDeadZone * 1000))
    }
    // MODE 高四位属于性能模式；低四位可能保存 DKS、宏等高级键类型，必须原样保留。
    const mode = await this.readLayoutValue(settings.sourceCode, ADVANCED_LAYOUT.mode)
    await this.writeLayoutValue(settings.sourceCode, ADVANCED_LAYOUT.mode, (mode & 0x0f) | (PERFORMANCE_MODE[settings.mode] << 4))
  }

  async getPollingRate(): Promise<PollingRate> {
    const data = await this.commands.request(XSYD_COMMANDS.action, new Uint8Array([XSYD_ACTIONS.pollingRate]))
    return POLLING_RATES_BY_CODE[data[2] ?? -1] ?? 1000
  }

  async setPollingRate(rate: PollingRate): Promise<PollingRate> {
    const code = POLLING_RATE_CODES[rate]
    const data = await this.commands.request(XSYD_COMMANDS.action, new Uint8Array([XSYD_ACTIONS.pollingRate, code]))
    return POLLING_RATES_BY_CODE[data[2] ?? code] ?? rate
  }

  async getTravelMatrix() {
    // 完整抓包中的官方循环固定为 02-01 → 03-01 → 02-02 → 03-01。
    // matrix=3 不作为毫米值解码，但必须在两页行程后读取，保持设备分页状态与官方一致。
    const first = decodeTravelHalf(await this.commands.requestFragmented(XSYD_COMMANDS.travelMatrix, encodeTravelRequest(1)))
    await this.commands.requestFragmented(XSYD_COMMANDS.travelMatrix, encodeTravelStateRequest())
    const second = decodeTravelHalf(await this.commands.requestFragmented(XSYD_COMMANDS.travelMatrix, encodeTravelRequest(2)))
    await this.commands.requestFragmented(XSYD_COMMANDS.travelMatrix, encodeTravelStateRequest())
    return [...first, ...second]
  }

  startCalibration() { return this.action(XSYD_ACTIONS.startCalibration, 1600) }
  finishCalibration() { return this.action(XSYD_ACTIONS.finishCalibration, 1600) }

  async getMacro(sourceCode: number): Promise<MacroSettings> {
    // 0x21 的空查询也会回显传入的物理键，因此不能用 response.key 判断是否绑定宏。
    // Layout_Mode 低四位为 6 才是固件真实的宏键标记，先读它可避免把全部按键归到 M1。
    const layoutMode = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.mode)
    if ((layoutMode & 0x0f) !== ADVANCED_MODE.macro) return createEmptyMacro(0)
    const modeData = await this.commands.request(XSYD_COMMANDS.macroMode, encodeMacroModeRead(sourceCode))
    const mode = decodeMacroMode(modeData)
    // 未绑定键统一返回 0xFF；状态层据此区分“空键”和真实宏绑定。
    if (mode.sourceCode === 0xff || mode.index >= XSYD_MAX_MACRO_SLOTS) return createEmptyMacro(0)

    const storedActionCount = modeData[4] ?? 0
    // 真机抓包确认：0x21 写响应会回显动作数，但随后主动查询时该字段返回 0；
    // 因此查询只能验证槽位、模式、重复次数和间隔，不能用 len 判断已保存动作正文。
    return { ...mode, boundSourceCodes: [mode.sourceCode], actions: [], storedActionCount, actionsAvailable: false }
  }

  async setMacro(settings: MacroSettings) {
    const errors = validateMacroSettings(settings)
    if (settings.index >= XSYD_MAX_MACRO_SLOTS) errors.push(`当前方案最多支持 ${XSYD_MAX_MACRO_SLOTS} 个宏槽位`)
    if (settings.actions.length > XSYD_MAX_MACRO_ACTIONS) errors.push(`当前方案每个宏最多支持 ${XSYD_MAX_MACRO_ACTIONS} 个动作`)
    if (errors.length) throw new DriverError('INVALID_CONFIGURATION', errors.join('；'))

    // 已发布 SDK 从 0x0100 暂存区开始覆盖写入；没有额外发送 Action 0x10。
    for (let offset = 0; offset < settings.actions.length; offset += MACRO_ACTIONS_PER_PACKET) {
      await this.commands.request(XSYD_COMMANDS.macroData, encodeMacroDataWrite(XSYD_MACRO_BUFFER_OFFSET + offset, settings.actions.slice(offset, offset + MACRO_ACTIONS_PER_PACKET)))
    }
    // MODE 层就是协议里的“宏键映射”。官方 SDK 明确写 single(1) + macro(6)，
    // 不能保留旧性能模式；否则快速点击可能漏出 FN0 中原来的普通键值。
    await this.writeLayoutValue(settings.sourceCode, ADVANCED_LAYOUT.mode, XSYD_MACRO_LAYOUT_MODE)
    await this.commands.request(XSYD_COMMANDS.macroMode, encodeMacroModeWrite(settings))
  }
  /** 解除绑定只清除 MODE 低四位；FN0 键值和性能触发方式仍属于该物理键。 */
  async deleteMacroBinding(sourceCode: number) {
    const modeValue = await this.readLayoutValue(sourceCode, ADVANCED_LAYOUT.mode)
    await this.writeLayoutValue(sourceCode, ADVANCED_LAYOUT.mode, modeValue & 0xf0)
  }
  close() {
    this.removeNotificationListener()
    this.modeListeners.clear()
    this.configurationListeners.clear()
    this.commands.close()
  }

  private async sync(): Promise<DeviceInfo> {
    // 随机挑战值用于建立本次同步请求；响应中的字段偏移来自 XSYD 设备信息报文。
    const random = crypto.getRandomValues(new Uint8Array(4))
    const data = await this.commands.request(XSYD_COMMANDS.sync, new Uint8Array([...random, 0xff, 0xff]))
    const ascii = (start: number, length: number) => new TextDecoder().decode(data.slice(start + 1, start + length)).replace(/\0/g, '').trim()
    const hex = (start: number, length: number) => Array.from(data.slice(start, start + length), (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
    return {
      productName: this.transport.productName,
      vendorId: this.transport.vendorId,
      productId: this.transport.productId,
      boardId: hex(1, 4),
      runMode: data[7] === 0 ? 'app' : data[7] === 0xff ? 'boot' : 'unknown',
      serialNumber: ascii(8, 17),
      firmwareVersion: ascii(25, 17) || 'Unknown',
      protocolVersion: 'Unknown',
    }
  }

  private async queryProtocolVersion() {
    const data = await this.commands.request(XSYD_COMMANDS.action, new Uint8Array([XSYD_ACTIONS.protocolVersion]))
    // 官方响应为 [Err, order, minor|patch, major] 的压缩 BCD，不是 ASCII 字符串。
    if (data.length >= 4) return `${(data[3] ?? 0) & 0x0f}.${((data[2] ?? 0) >> 4) & 0x0f}.${(data[2] ?? 0) & 0x0f}`
    return '1.0.7'
  }

  private async action(order: number, timeoutMs: number, args: number[] = []) {
    await this.commands.request(XSYD_COMMANDS.action, new Uint8Array([order, ...args]), timeoutMs)
  }

  private supportsDynamicColorId() {
    const [major = 0, minor = 0, patch = 0] = this.protocolVersion.split('.').map(Number)
    return major > 1 || major === 1 && (minor > 0 || minor === 0 && patch >= 9)
  }

  /** 按协议响应布局 [Err Code, order, s_arg...] 读取查询结果。 */
  private async queryMode(): Promise<KeyboardMode> {
    const mac = await this.queryActionFlag(XSYD_ACTIONS.queryMacMode)
    if (mac === 1) return 'mac'
    const win = await this.queryActionFlag(XSYD_ACTIONS.queryWinMode)
    if (win === 1) return 'win'
    // 0xFF 表示设备不支持该模式查询；兼容这种固件时保留最后一次已知模式。
    return this.currentMode
  }

  private async queryActionFlag(order: number) {
    const data = await this.commands.request(XSYD_COMMANDS.action, new Uint8Array([order]))
    return data[2] ?? 0xff
  }

  private onModeChange(listener: (mode: KeyboardMode) => void) {
    this.modeListeners.add(listener)
    return () => this.modeListeners.delete(listener)
  }

  private onConfigurationChange(listener: (configuration: KeyboardConfiguration) => void) {
    this.configurationListeners.add(listener)
    return () => this.configurationListeners.delete(listener)
  }

  /**
   * 真机抓包确认：硬件切换后会主动发送 Action 返回包，
   * data 为 [Err Code, order, s_arg, ...]：0x21/0x22 表示 WIN/Mac，0x70 表示配置槽。
   */
  private handleNotification(command: number, data: Uint8Array) {
    if (command !== XSYD_COMMANDS.action.responseCode || data[0] !== 0) return
    const order = data[1]
    const value = data[2]
    if (value === 1 && (order === XSYD_ACTIONS.queryWinMode || order === XSYD_ACTIONS.queryMacMode)) {
      const mode: KeyboardMode = order === XSYD_ACTIONS.queryWinMode ? 'win' : 'mac'
      if (mode === this.currentMode) return
      this.currentMode = mode
      for (const listener of this.modeListeners) listener(mode)
      return
    }
    if (order === XSYD_ACTIONS.switchConfiguration && value !== undefined && value <= 3) {
      const configuration = (value + 1) as KeyboardConfiguration
      for (const listener of this.configurationListeners) listener(configuration)
    }
  }

  /** 模式/配置切换后给固件留出完成内部状态切换的时间，再读取新配置。 */
  private waitForStateSettled() { return new Promise<void>((resolve) => setTimeout(resolve, 2000)) }

  private async readDefaultLayout(rows: number, columns: number): Promise<KeyPosition[]> {
    const matrixKeys: MatrixKeyInput[] = []
    // defaultKeymap 每次返回相邻两行，所以 row 按 2 递增。
    for (let row = 0; row < rows; row += 2) {
      const data = await this.commands.request(XSYD_COMMANDS.defaultKeymap, new Uint8Array([0, row, row + 1]))
      const blocks = [{ row: data[1] ?? row, start: 2 }, { row: data[2 + columns] ?? row + 1, start: 3 + columns }]
      for (const block of blocks) {
        for (let column = 0; column < columns; column++) {
          const sourceCode = data[block.start + column] ?? 0xff
          // 0xFF 和 0x00 都代表矩阵空位，不创建可改键的物理位置。
          if (sourceCode === 0xff || sourceCode === 0) continue
          matrixKeys.push({ id: `${block.row}-${column}`, sourceCode, label: this.keyCatalog.get(sourceCode).label, address: { kind: 'matrix', row: block.row, column } })
        }
      }
    }
    return matrixKeys
  }

  private async readLayer(layer: number, positions: KeyPosition[]): Promise<KeyAssignment[]> {
    const assignments: KeyAssignment[] = []
    for (let offset = 0; offset < positions.length; offset += 14) {
      const batch = positions.slice(offset, offset + 14)
      const request = [0]
      // 读取请求中每项是 sourceCode、layer 和两个占位字节；响应返回同样的四字节槽位。
      batch.forEach((position) => request.push(position.sourceCode, layer, 0xff, 0xff))
      const data = await this.commands.request(XSYD_COMMANDS.keymap, new Uint8Array(request))
      for (let index = 0; index < batch.length; index++) {
        const position = batch[index]!
        // 每项前两字节回显物理键与层，后两字节是小端序目标键码。
        const keyCode = readUint16le(data, 1 + index * 4 + 2)
        assignments.push({ positionId: position.id, sourceCode: position.sourceCode, layer, keyCode, category: this.keyCatalog.get(keyCode).category })
      }
    }
    return assignments
  }

  /** 0x23 也承载高级键的细分 Layout；响应 value 与普通键码一样为小端 16 位。 */
  private async readLayoutValue(sourceCode: number, layout: number) {
    const data = await this.commands.request(XSYD_COMMANDS.keymap, new Uint8Array([0, sourceCode, layout, 0xff, 0xff]))
    return readUint16le(data, 3)
  }

  private async readLayoutValues(sourceCodes: number[], layout: number) {
    const result = new Map<number, number>()
    for (let offset = 0; offset < sourceCodes.length; offset += 14) {
      const batch = sourceCodes.slice(offset, offset + 14)
      const request = [0]
      batch.forEach((sourceCode) => request.push(sourceCode, layout, 0xff, 0xff))
      const data = await this.commands.request(XSYD_COMMANDS.keymap, new Uint8Array(request))
      batch.forEach((sourceCode, index) => result.set(sourceCode, readUint16le(data, 1 + index * 4 + 2)))
    }
    return result
  }

  private async writeLayoutValue(sourceCode: number, layout: number, value: number) {
    await this.commands.request(XSYD_COMMANDS.keymap, new Uint8Array([1, sourceCode, layout, ...uint16le(value)]))
  }
}
