import type { createDriverState } from './driverState'
import { createRequestScope } from './requestScope'
import type { CustomKeyLighting, LightingSettings } from '@/domain/lighting'

/** 灯光状态与请求生命周期由功能模块管理，连接流程只负责统一失效。 */
export function createLightingActions(
  state: ReturnType<typeof createDriverState>,
  feedback: { clearFeedback(): void; fail(cause: unknown): void },
) {
  const { status, profile, lighting, customLighting, customLightingLoading, message } = state
  const mainRequests = createRequestScope()
  const customRequests = createRequestScope()
  const writable = () => ['ready', 'error'].includes(status.value)

  async function updateLighting(settings: LightingSettings) {
    const session = state.session
    if (!session || !profile.value?.capabilities.lighting || !writable()) return
    const isCurrent = mainRequests.begin()
    feedback.clearFeedback(); status.value = 'writing'
    try {
      const verified = await session.updateLighting(settings)
      if (!isCurrent() || state.session !== session) return
      lighting.value = verified
      status.value = 'ready'
      message.value = '灯光设置已写入并通过回读验证'
    } catch (cause) { if (isCurrent() && state.session === session) feedback.fail(cause) }
  }

  async function reloadLighting() {
    const session = state.session
    if (!session || !profile.value?.capabilities.lighting || !writable()) return
    const isCurrent = mainRequests.begin()
    feedback.clearFeedback(); status.value = 'reading'
    try {
      const result = await session.getLighting()
      if (!isCurrent() || state.session !== session) return
      lighting.value = result
      status.value = 'ready'
      message.value = '已重新读取灯光设置'
    } catch (cause) { if (isCurrent() && state.session === session) feedback.fail(cause) }
  }

  async function loadCustomLighting() {
    const session = state.session
    if (!session || !profile.value?.capabilities.customLighting || customLightingLoading.value || !writable()) return
    const isCurrent = customRequests.begin()
    customLightingLoading.value = true
    feedback.clearFeedback()
    try {
      const result = await session.getCustomLighting(profile.value.positions.map((position) => position.sourceCode))
      if (isCurrent() && state.session === session) customLighting.value = result
    } catch (cause) { if (isCurrent() && state.session === session) feedback.fail(cause) }
    finally { if (isCurrent()) customLightingLoading.value = false }
  }

  async function updateCustomLighting(items: CustomKeyLighting[]) {
    const session = state.session
    if (!session || !profile.value?.capabilities.customLighting || !writable()) return
    const isCurrent = customRequests.begin()
    customLightingLoading.value = false
    feedback.clearFeedback(); status.value = 'writing'
    try {
      const verified = await session.updateCustomLighting(items)
      if (!isCurrent() || state.session !== session) return
      // 部分写入的回读只替换对应按键，其余颜色继续保留。
      const merged = new Map(customLighting.value.map((item) => [item.sourceCode, item]))
      verified.forEach((item) => merged.set(item.sourceCode, item))
      customLighting.value = [...merged.values()]
      status.value = 'ready'
      message.value = `已自动保存并回读验证 ${items.length} 个按键的自定义颜色`
    } catch (cause) { if (isCurrent() && state.session === session) feedback.fail(cause) }
  }

  function invalidate() {
    mainRequests.invalidate()
    customRequests.invalidate()
    customLighting.value = []
    customLightingLoading.value = false
  }

  return { updateLighting, reloadLighting, loadCustomLighting, updateCustomLighting, invalidate }
}
