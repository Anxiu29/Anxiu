import type { createDriverState } from './driverState'
import { createRequestScope } from './requestScope'
import { toDriverError } from '@/application/DriverError'
import type { KeyPerformanceSettings, PollingRate } from '@/domain/performance'

/** 性能参数、回报率、行程采样与校准共享状态和失效入口，避免主 Store 逐项清理。 */
export function createPerformanceActions(
  state: ReturnType<typeof createDriverState>,
  feedback: { clearFeedback(): void; fail(cause: unknown): void },
) {
  const { status, profile, selectedPositionId, performanceLoading, performanceSettings, performanceBySourceCode,
    performanceMapLoading, pollingRate, travelReading, travelMatrix, calibrationActive, error, errorCode, message } = state
  let performanceReadRevision = 0
  let loadingPerformanceSourceCode: number | undefined
  const pollingRateRequests = createRequestScope()
  const travelRequests = createRequestScope()
  let performanceMapReadRevision = 0
  let consecutiveTravelReadFailures = 0

  async function loadPerformance(positionId = selectedPositionId.value, force = false) {
    if (!state.session || !profile.value?.capabilities.performance || !positionId || !['ready', 'error'].includes(status.value)) return
    const position = profile.value.positions.find((item) => item.id === positionId)
    if (!position || performanceLoading.value && loadingPerformanceSourceCode === position.sourceCode) return
    // 即使命中缓存，也要使之前另一按键的读取失效。
    const readRevision = ++performanceReadRevision
    performanceLoading.value = false
    loadingPerformanceSourceCode = undefined
    if (!force && performanceSettings.value?.sourceCode === position.sourceCode) return
    const cached = performanceBySourceCode.value[position.sourceCode]
    if (!force && cached) { performanceSettings.value = { ...cached }; return }
    const observedSession = state.session
    loadingPerformanceSourceCode = position.sourceCode
    performanceLoading.value = true
    feedback.clearFeedback()
    try {
      const result = await observedSession.getPerformance(position.sourceCode)
      if (state.session === observedSession && readRevision === performanceReadRevision) {
        performanceSettings.value = result
        performanceBySourceCode.value = { ...performanceBySourceCode.value, [result.sourceCode]: result }
      }
    } catch (cause) { if (state.session === observedSession && readRevision === performanceReadRevision) feedback.fail(cause) }
    finally {
      if (readRevision === performanceReadRevision) {
        performanceLoading.value = false
        loadingPerformanceSourceCode = undefined
      }
    }
  }

  async function updatePerformance(settings: KeyPerformanceSettings) {
    if (!state.session || !profile.value?.capabilities.performance || !['ready', 'error'].includes(status.value)) return
    feedback.clearFeedback(); status.value = 'writing'
    try {
      performanceSettings.value = await state.session.updatePerformance(settings)
      performanceBySourceCode.value = { ...performanceBySourceCode.value, [performanceSettings.value.sourceCode]: performanceSettings.value }
      status.value = 'ready'
      message.value = '性能设置已写入并通过回读验证'
    } catch (cause) { feedback.fail(cause) }
  }

  /** 批量读取全部键位参数；协议适配器会把相同 Layout 合并成每包 14 键。 */
  async function loadPerformanceMap(force = false) {
    if (!state.session || !profile.value?.capabilities.performance || performanceMapLoading.value || ['connecting', 'writing'].includes(status.value)) return
    const positions = profile.value.positions
    if (!force && positions.every((position) => performanceBySourceCode.value[position.sourceCode])) return
    const observedSession = state.session
    const readRevision = ++performanceMapReadRevision
    performanceMapLoading.value = true
    try {
      const results = await observedSession.getPerformances(positions.map((position) => position.sourceCode))
      if (state.session !== observedSession || readRevision !== performanceMapReadRevision) return
      performanceBySourceCode.value = Object.fromEntries(results.map((settings) => [settings.sourceCode, settings]))
      const currentSourceCode = positions.find((position) => position.id === selectedPositionId.value)?.sourceCode
      if (currentSourceCode && performanceBySourceCode.value[currentSourceCode]) performanceSettings.value = { ...performanceBySourceCode.value[currentSourceCode]! }
    } catch (cause) { if (state.session === observedSession && readRevision === performanceMapReadRevision) feedback.fail(cause) }
    finally { if (readRevision === performanceMapReadRevision) performanceMapLoading.value = false }
  }

  /** 批量写入仍逐键执行设备回读验证，任何键失败都会停止并显示真实错误。 */
  async function updatePerformances(settingsList: KeyPerformanceSettings[]) {
    if (!state.session || !profile.value?.capabilities.performance || !settingsList.length || !['ready', 'error'].includes(status.value)) return
    feedback.clearFeedback(); status.value = 'writing'
    try {
      const next = { ...performanceBySourceCode.value }
      const verifiedSettings = await state.session.updatePerformances(settingsList)
      for (const verified of verifiedSettings) {
        next[verified.sourceCode] = verified
        if (verified.sourceCode === performanceSettings.value?.sourceCode) performanceSettings.value = verified
      }
      // 整批回读验证成功后一次替换缓存，避免界面在写入期间呈现半套全局状态。
      performanceBySourceCode.value = next
      status.value = 'ready'
      message.value = `已写入并验证 ${settingsList.length} 个按键的性能设置`
    } catch (cause) { feedback.fail(cause) }
  }

  async function loadPollingRate() {
    if (!state.session || !profile.value?.capabilities.pollingRates?.length) return
    const observedSession = state.session
    const isCurrent = pollingRateRequests.begin()
    try {
      const result = await observedSession.getPollingRate()
      if (isCurrent() && state.session === observedSession) pollingRate.value = result
    } catch (cause) { if (isCurrent() && state.session === observedSession) feedback.fail(cause) }
  }

  async function updatePollingRate(rate: PollingRate) {
    if (!state.session || !profile.value?.capabilities.pollingRates?.includes(rate) || !['ready', 'error'].includes(status.value)) return
    pollingRateRequests.invalidate()
    feedback.clearFeedback(); status.value = 'writing'
    try { pollingRate.value = await state.session.updatePollingRate(rate); status.value = 'ready'; message.value = `回报率已设置为 ${rate} Hz` }
    catch (cause) { feedback.fail(cause) }
  }

  async function readTravelMatrix() {
    // 性能参数读取会连续访问布局字段；此时不再追加矩阵轮询，避免无意义排队和页面切键延迟。
    if (!state.session || !profile.value?.capabilities.travelTest || status.value !== 'ready' || performanceLoading.value || travelReading.value) return
    const observedSession = state.session
    const isCurrent = travelRequests.begin()
    travelReading.value = true
    try {
      const result = await observedSession.getTravelMatrix()
      if (!isCurrent() || state.session !== observedSession) return
      travelMatrix.value = result
      consecutiveTravelReadFailures = 0
      // 行程采样曾短暂失败但随后恢复时，清掉仅由采样产生的协议提示。
      if (['PROTOCOL_CRC_ERROR', 'PROTOCOL_REJECTED', 'PROTOCOL_TIMEOUT'].includes(errorCode.value ?? '')) {
        error.value = ''
        errorCode.value = undefined
      }
    } catch (cause) {
      if (!isCurrent() || state.session !== observedSession) return
      const driverError = toDriverError(cause)
      const recoverableSamplingError = driverError.recoverable
        && ['PROTOCOL_CRC_ERROR', 'PROTOCOL_REJECTED', 'PROTOCOL_TIMEOUT'].includes(driverError.code)
      if (!recoverableSamplingError) feedback.fail(driverError)
      else if (++consecutiveTravelReadFailures >= 3) {
        // 实时采样失败不改变会话 ready 状态，否则轮询自身会被永久停止；后续成功会自动清除。
        error.value = `行程采样暂时异常，正在自动重试：${driverError.message}`
        errorCode.value = driverError.code
      }
    }
    finally { if (isCurrent()) travelReading.value = false }
  }

  async function startCalibration() {
    if (!state.session || !profile.value?.capabilities.calibration || !['ready', 'error'].includes(status.value)) return
    feedback.clearFeedback(); status.value = 'writing'
    try { await state.session.startCalibration(); calibrationActive.value = true; status.value = 'ready'; message.value = '校准已开始，请依次将所有按键按到底' }
    catch (cause) { feedback.fail(cause) }
  }

  async function finishCalibration() {
    if (!state.session || !profile.value?.capabilities.calibration || !calibrationActive.value) return
    feedback.clearFeedback(); status.value = 'writing'
    try { await state.session.finishCalibration(); calibrationActive.value = false; status.value = 'ready'; message.value = '键盘校准已完成' }
    catch (cause) { feedback.fail(cause) }
  }

  function invalidate() {
    pollingRateRequests.invalidate()
    travelRequests.invalidate()
    consecutiveTravelReadFailures = 0
    loadingPerformanceSourceCode = undefined
    performanceReadRevision++
    performanceMapReadRevision++
    performanceSettings.value = undefined
    performanceLoading.value = false
    performanceBySourceCode.value = {}
    performanceMapLoading.value = false
    pollingRate.value = undefined
    travelMatrix.value = []
    travelReading.value = false
    calibrationActive.value = false
  }

  return { loadPerformance, updatePerformance, loadPerformanceMap, updatePerformances, loadPollingRate, updatePollingRate, readTravelMatrix, startCalibration, finishCalibration, invalidate }
}
