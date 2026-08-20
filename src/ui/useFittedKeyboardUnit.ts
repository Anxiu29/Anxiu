import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import type { KeyPosition } from '@/domain/keyboard'
import { matrixKeyGeometry, type KeyGeometryResolver } from '@/ui/keyboardGeometry'

/** 根据真实容器和设备配列边界计算键帽单位；窗口分档无法感知侧栏等局部布局变化。 */
export function useFittedKeyboardUnit(
  positions: () => readonly KeyPosition[],
  geometry: () => KeyGeometryResolver | undefined,
  options: { maxUnit?: number; minUnit?: number; horizontalPadding?: number; verticalPadding?: number } = {},
): { container: Ref<HTMLElement | undefined>; unit: Readonly<Ref<number>> } {
  const container = ref<HTMLElement>()
  const size = ref({ width: 0, height: 0 })
  const maxUnit = options.maxUnit ?? 64
  const minUnit = options.minUnit ?? 24
  let observer: ResizeObserver | undefined
  let stopWatching: (() => void) | undefined

  const bounds = computed(() => {
    const resolve = geometry() ?? matrixKeyGeometry
    const items = positions().map(resolve)
    return {
      width: Math.max(...items.map((item) => item.x + item.width), 1),
      height: Math.max(...items.map((item) => item.y + item.height), 1),
    }
  })
  const unit = computed(() => {
    if (!size.value.width || !size.value.height) return maxUnit
    const availableWidth = Math.max(1, size.value.width - (options.horizontalPadding ?? 38))
    const availableHeight = Math.max(1, size.value.height - (options.verticalPadding ?? 34))
    return Math.max(minUnit, Math.min(maxUnit, Math.floor(availableWidth / bounds.value.width), Math.floor(availableHeight / bounds.value.height)))
  })
  const measure = () => {
    if (!container.value) return
    size.value = { width: container.value.clientWidth, height: container.value.clientHeight }
  }

  onMounted(() => {
    window.addEventListener('resize', measure)
    stopWatching = watch(container, (element) => {
      observer?.disconnect()
      observer = undefined
      if (!element) { size.value = { width: 0, height: 0 }; return }
      measure()
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(measure)
        observer.observe(element)
      }
    }, { immediate: true, flush: 'post' })
  })
  onBeforeUnmount(() => {
    stopWatching?.()
    observer?.disconnect()
    window.removeEventListener('resize', measure)
  })

  return { container, unit }
}
