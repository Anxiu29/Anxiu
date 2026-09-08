import type { createDriverState } from './driverState'
import { createRequestScope } from './requestScope'
import type { MacroSettings } from '@/domain/macro'
import { clearDeviceMacroSnapshots, deleteMacroSnapshot, listMacroSnapshots, replaceMacroSnapshots, restoreMacroSnapshot, saveMacroSnapshot, type MacroSnapshotContext } from './macroSnapshots'

/** 宏的设备绑定、槽位、网页快照和在途请求作为一个功能模块维护。 */
export function createMacroActions(
  state: ReturnType<typeof createDriverState>,
  feedback: { clearFeedback(): void; fail(cause: unknown): void },
) {
  const { status, profile, selectedPositionId, macro, macroSlots, macroLoading, macroBindings,
    selectedMacroSlot, driverId, activeConfiguration, mode, messageWarning, message } = state
  let macroReadRevision = 0
  const macroWrites = createRequestScope()
  let loadingMacroSourceCode: number | undefined

  async function loadMacro(positionId = selectedPositionId.value, force = false) {
    if (!state.session || !profile.value?.capabilities.macro || !positionId || ['connecting', 'writing'].includes(status.value)) return
    const position = profile.value.positions.find((item) => item.id === positionId)
    if (!position) return
    if (!force && (macro.value?.sourceCode === position.sourceCode || macroLoading.value && loadingMacroSourceCode === position.sourceCode)) return
    const observedSession = state.session
    const readRevision = ++macroReadRevision
    loadingMacroSourceCode = position.sourceCode
    macroLoading.value = true
    feedback.clearFeedback()
    try {
      const result = await observedSession.getMacro(position.sourceCode)
      if (state.session === observedSession && readRevision === macroReadRevision) {
        macro.value = restoreMacroSnapshot(macroSnapshotContext(), result)
        if (macro.value.sourceCode !== 0xff) macroSlots.value = { ...macroSlots.value, [macro.value.index]: macro.value }
        rememberMacroBinding(macro.value)
      }
    } catch (cause) {
      if (state.session === observedSession && readRevision === macroReadRevision) feedback.fail(cause)
    } finally {
      if (readRevision === macroReadRevision) { macroLoading.value = false; loadingMacroSourceCode = undefined }
    }
  }

  async function updateMacro(settings: MacroSettings) {
    if (!state.session || !profile.value?.capabilities.macro || !['ready', 'error'].includes(status.value)) return
    const session = state.session
    const context = macroSnapshotContext()
    const isCurrent = macroWrites.begin()
    macroReadRevision++
    macroLoading.value = false
    loadingMacroSourceCode = undefined
    feedback.clearFeedback(); status.value = 'writing'
    try {
      const bindings = [...new Set(settings.boundSourceCodes ?? [])]
      const previous = macroSlots.value[settings.index]
      const removedBindings = (previous?.boundSourceCodes ?? []).filter((sourceCode) => !bindings.includes(sourceCode))
      for (const sourceCode of removedBindings) {
        await session.deleteMacroBinding(sourceCode)
        if (!isCurrent() || state.session !== session) return
      }
      let verified: MacroSettings | undefined
      // 同一 index 是同一套宏正文；逐键发送 0x21 只是建立多份“物理键 → 槽位”绑定。
      for (const sourceCode of bindings) {
        verified = await session.updateMacro({ ...settings, sourceCode, boundSourceCodes: bindings })
        if (!isCurrent() || state.session !== session) return
      }
      // 没有绑定键时固件没有可寻址入口，先保存为网页草稿；首次绑定时再写入设备。
      const saved = { ...(verified ?? settings), sourceCode: bindings[0] ?? 0xff, boundSourceCodes: bindings, actions: settings.actions, storedActionCount: settings.actions.length, actionsAvailable: true }
      saveMacroSnapshot(context, saved)
      // 一个物理键只能指向一个宏槽位，从其他槽位的本地绑定索引中移除它。
      const nextSlots = { ...macroSlots.value, [settings.index]: saved }
      for (const [slotIndex, slot] of Object.entries(nextSlots)) {
        if (Number(slotIndex) === settings.index) continue
        const remaining = (slot.boundSourceCodes ?? []).filter((sourceCode) => !bindings.includes(sourceCode))
        if (remaining.length === (slot.boundSourceCodes ?? []).length) continue
        nextSlots[Number(slotIndex)] = { ...slot, sourceCode: remaining[0] ?? 0xff, boundSourceCodes: remaining }
        saveMacroSnapshot(context, nextSlots[Number(slotIndex)]!)
      }
      macroSlots.value = nextSlots
      macro.value = saved
      rebuildMacroBindings()
      status.value = 'ready'
      messageWarning.value = !bindings.length
      message.value = bindings.length ? '宏已写入，槽位和执行参数已通过设备回读验证' : '宏已保存为未绑定草稿，绑定按键并保存后可写入键盘'
    }
    catch (cause) { if (isCurrent() && state.session === session) feedback.fail(cause) }
  }

  /** 清除当前槽位：先解除真机上的全部入口，再删除网页保存的动作正文。 */
  async function deleteMacro(index: number) {
    if (!state.session || !profile.value?.capabilities.macro || !['ready', 'error'].includes(status.value)) return
    const session = state.session
    const context = macroSnapshotContext()
    const isCurrent = macroWrites.begin()
    macroReadRevision++
    macroLoading.value = false
    loadingMacroSourceCode = undefined
    feedback.clearFeedback(); status.value = 'writing'
    try {
      const settings = macroSlots.value[index]
      for (const sourceCode of settings?.boundSourceCodes ?? []) {
        await session.deleteMacroBinding(sourceCode)
        if (!isCurrent() || state.session !== session) return
      }
      deleteMacroSnapshot(context, index)
      const nextSlots = { ...macroSlots.value }
      delete nextSlots[index]
      macroSlots.value = nextSlots
      if (selectedMacroSlot.value === index) macro.value = undefined
      rebuildMacroBindings()
      status.value = 'ready'; message.value = `已清除 M${index + 1} 的动作和全部按键绑定`
    } catch (cause) { if (isCurrent() && state.session === session) feedback.fail(cause) }
  }

  function invalidate() {
    macroWrites.invalidate()
    macroReadRevision++
    macro.value = undefined
    macroSlots.value = {}
    macroLoading.value = false
    loadingMacroSourceCode = undefined
    macroBindings.value = {}
  }
  function macroSnapshotContext(): MacroSnapshotContext {
    if (!profile.value) throw new Error('尚未读取设备配置')
    return { driverId: driverId.value, profile: profile.value, configuration: activeConfiguration.value, mode: mode.value }
  }
  /**
   * 进入宏页面或切换设备配置后扫描每个物理键的 0x21 元数据。
   * 本地快照只能补足协议无法回读的动作正文，绝不能凭自己创建宏槽和绑定。
   */
  async function loadMacrosFromDevice() {
    // 模式/配置同步会在 reading 期间调用；writing、disconnected 不得启动新扫描。
    if (!state.session || !profile.value?.capabilities.macro || macroLoading.value || !['ready', 'error', 'reading'].includes(status.value)) return
    const observedSession = state.session
    const observedProfile = profile.value
    const context = macroSnapshotContext()
    // 未绑定宏在固件中没有物理键入口，只能作为网页草稿保留；有绑定的旧快照必须由设备确认。
    const localUnbound = listMacroSnapshots(context).filter((settings) => !(settings.boundSourceCodes?.length))
    const readRevision = ++macroReadRevision
    macroLoading.value = true
    try {
      const results: MacroSettings[] = []
      // 协议没有事务序号，同命令必须逐键串行读取，避免 0xA1 响应对应错物理键。
      for (const position of observedProfile.positions) {
        results.push(await observedSession.getMacro(position.sourceCode))
        // 不仅丢弃最终结果，也在当前响应结束后停止向旧上下文继续追加命令。
        if (state.session !== observedSession || readRevision !== macroReadRevision) return
      }
      if (state.session !== observedSession || readRevision !== macroReadRevision) return
      const nextSlots: Record<number, MacroSettings> = {}
      for (const deviceSettings of results) {
        if (deviceSettings.sourceCode === 0xff) continue
        const restored = restoreMacroSnapshot(context, deviceSettings)
        const existing = nextSlots[restored.index]
        if (!existing) nextSlots[restored.index] = restored
        else nextSlots[restored.index] = {
          // 一个槽位可由多个键触发，但本次扫描中的每个物理键只会落入一个槽位。
          ...(existing.actionsAvailable ? existing : restored),
          boundSourceCodes: [...new Set([...(existing.boundSourceCodes ?? []), restored.sourceCode])],
        }
      }
      for (const draft of localUnbound) if (!nextSlots[draft.index]) nextSlots[draft.index] = draft
      macroSlots.value = nextSlots
      replaceMacroSnapshots(context, Object.values(nextSlots))
      rebuildMacroBindings()
    } catch (cause) {
      if (state.session === observedSession && readRevision === macroReadRevision) feedback.fail(cause)
    } finally {
      if (readRevision === macroReadRevision) macroLoading.value = false
    }
  }
  function rebuildMacroBindings() {
    macroBindings.value = Object.fromEntries(Object.values(macroSlots.value).flatMap((settings) => (settings.boundSourceCodes ?? []).map((sourceCode) => [sourceCode, `M${settings.index + 1}`])))
  }
  function selectMacroSlot(index: number) {
    const slotCount = profile.value?.capabilities.macroSlots ?? 0
    if (Number.isInteger(index) && index >= 0 && index < slotCount) selectedMacroSlot.value = index
  }
  /** 设备回读为空时移除过期角标；绑定是否存在只看 0x21 的 sourceCode，不能依赖缺失的动作数。 */
  function rememberMacroBinding(settings: MacroSettings) {
    const nextSlots = { ...macroSlots.value }
    if (settings.sourceCode !== 0xff) {
      const slot = nextSlots[settings.index] ?? settings
      nextSlots[settings.index] = { ...slot, boundSourceCodes: [...new Set([...(slot.boundSourceCodes ?? []), settings.sourceCode])] }
    } else {
      for (const [index, slot] of Object.entries(nextSlots)) nextSlots[Number(index)] = { ...slot, boundSourceCodes: (slot.boundSourceCodes ?? []).filter((code) => code !== settings.sourceCode) }
    }
    macroSlots.value = nextSlots
    rebuildMacroBindings()
  }
  /** 在恢复出厂前捕获设备身份；只在恢复成功后调用返回函数删除该设备的快照。 */
  function prepareSnapshotCleanup() {
    const context = macroSnapshotContext()
    return () => clearDeviceMacroSnapshots(context)
  }

  return { loadMacro, updateMacro, deleteMacro, loadMacrosFromDevice, selectMacroSlot, invalidate, prepareSnapshotCleanup }
}
