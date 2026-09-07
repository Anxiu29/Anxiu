import type { createDriverState } from './driverState'
import { createRequestScope } from './requestScope'
import type { AdvancedKeySettings } from '@/domain/advancedKey'

/** 高级键的读取、写入和角标共用一个失效边界；设备通信仍由应用服务处理。 */
export function createAdvancedKeyActions(
  state: ReturnType<typeof createDriverState>,
  feedback: { clearFeedback(): void; fail(cause: unknown): void },
) {
  const { profile, status, selectedPositionId, advancedKey, advancedKeyLoading, advancedKeyTypes, message } = state
  const reads = createRequestScope()
  const scans = createRequestScope()
  const writes = createRequestScope()
  let loadingSourceCode: number | undefined
  let scanning = false
  const available = () => ['ready', 'error'].includes(status.value)

  function invalidateReads() {
    reads.invalidate()
    scans.invalidate()
    advancedKeyLoading.value = false
    loadingSourceCode = undefined
    scanning = false
  }

  function rememberType(settings: AdvancedKeySettings) {
    const next = { ...advancedKeyTypes.value }
    if (settings.type === 'none') delete next[settings.sourceCode]
    else next[settings.sourceCode] = settings.type.toUpperCase()
    advancedKeyTypes.value = next
  }

  async function loadAdvancedKey(positionId = selectedPositionId.value, force = false) {
    const session = state.session
    if (!session || !profile.value?.capabilities.advancedKey || !positionId || !available()) return
    const position = profile.value.positions.find((item) => item.id === positionId)
    if (!position || advancedKeyLoading.value && loadingSourceCode === position.sourceCode) return
    // A 已缓存、B 在途、再选 A 时也必须使 B 失效；缓存命中同样是一次选择。
    const isCurrent = reads.begin()
    advancedKeyLoading.value = false
    loadingSourceCode = undefined
    if (!force && advancedKey.value?.sourceCode === position.sourceCode) return
    advancedKeyLoading.value = true
    loadingSourceCode = position.sourceCode
    feedback.clearFeedback()
    try {
      const result = await session.getAdvancedKey(position.sourceCode)
      if (!isCurrent() || state.session !== session) return
      advancedKey.value = result
      rememberType(result)
    } catch (cause) { if (isCurrent() && state.session === session) feedback.fail(cause) }
    finally {
      if (isCurrent()) { advancedKeyLoading.value = false; loadingSourceCode = undefined }
    }
  }

  async function loadAdvancedKeyTypes() {
    const session = state.session
    if (!session || !profile.value?.capabilities.advancedKey || scanning || !available()) return
    const isCurrent = scans.begin()
    scanning = true
    try {
      const types = await session.getAdvancedKeyTypes(profile.value.positions.map((position) => position.sourceCode))
      if (!isCurrent() || state.session !== session) return
      advancedKeyTypes.value = Object.fromEntries(Object.entries(types).map(([code, type]) => [Number(code), type.toUpperCase()]))
      await loadAdvancedKey(selectedPositionId.value, true)
    } catch (cause) { if (isCurrent() && state.session === session) feedback.fail(cause) }
    finally { if (isCurrent()) scanning = false }
  }

  async function writeAdvancedKey(settings: Exclude<AdvancedKeySettings, { type: 'none' }> | number) {
    const session = state.session
    if (!session || !profile.value?.capabilities.advancedKey || !available()) return
    // 写入优先于之前的单键读取和全键扫描，旧结果不能覆盖已验证的新配置。
    invalidateReads()
    const isCurrent = writes.begin()
    feedback.clearFeedback(); status.value = 'writing'
    try {
      const verified = typeof settings === 'number'
        ? await session.deleteAdvancedKey(settings)
        : await session.updateAdvancedKey(settings)
      if (!isCurrent() || state.session !== session) return
      advancedKey.value = verified
      rememberType(verified)
      status.value = 'ready'
      message.value = typeof settings === 'number' ? '已删除当前按键的高级键设置' : '高级键已写入并通过回读验证'
    } catch (cause) { if (isCurrent() && state.session === session) feedback.fail(cause) }
  }

  function invalidate() {
    invalidateReads()
    writes.invalidate()
    advancedKey.value = undefined
    advancedKeyTypes.value = {}
  }

  return {
    loadAdvancedKey, loadAdvancedKeyTypes, invalidate,
    updateAdvancedKey: (settings: Exclude<AdvancedKeySettings, { type: 'none' }>) => writeAdvancedKey(settings),
    deleteAdvancedKey: (sourceCode: number) => writeAdvancedKey(sourceCode),
  }
}
