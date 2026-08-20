import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

/**
 * 为响应式键盘补充横向浏览能力：细滚动条、边缘提示、空白区拖动和 Shift+滚轮。
 * 只操作 UI 容器，不感知键码、设备型号或协议。
 */
export function useHorizontalKeyboardScroll(container: Ref<HTMLElement | undefined>) {
  let host: HTMLElement | undefined
  let scroller: HTMLElement | undefined
  let resizeObserver: ResizeObserver | undefined
  let dragStartX = 0
  let dragStartScrollLeft = 0
  let dragging = false

  const refreshCues = () => {
    if (!host || !scroller) return
    const overflow = scroller.scrollWidth - scroller.clientWidth
    host.classList.toggle('keyboard-can-scroll', overflow > 2)
    host.classList.toggle('keyboard-can-scroll-left', scroller.scrollLeft > 2)
    host.classList.toggle('keyboard-can-scroll-right', scroller.scrollLeft < overflow - 2)
  }
  const finishDrag = () => {
    dragging = false
    host?.classList.remove('keyboard-is-dragging')
  }
  const handlePointerMove = (event: PointerEvent) => {
    if (!dragging || !scroller) return
    scroller.scrollLeft = dragStartScrollLeft - (event.clientX - dragStartX)
  }
  const handlePointerDown = (event: PointerEvent) => {
    if (!scroller || event.button !== 0 || (event.target as HTMLElement).closest('button, input, select, textarea, a')) return
    dragStartX = event.clientX
    dragStartScrollLeft = scroller.scrollLeft
    dragging = true
    host?.classList.add('keyboard-is-dragging')
    event.preventDefault()
  }
  const handleWheel = (event: WheelEvent) => {
    if (!scroller || !host?.classList.contains('keyboard-can-scroll')) return
    const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0
    if (!horizontalDelta) return
    scroller.scrollLeft += horizontalDelta
    event.preventDefault()
  }
  const detach = () => {
    finishDrag()
    resizeObserver?.disconnect()
    resizeObserver = undefined
    scroller?.removeEventListener('scroll', refreshCues)
    host?.removeEventListener('pointerdown', handlePointerDown)
    host?.removeEventListener('wheel', handleWheel)
    host?.classList.remove('keyboard-scroll-viewport', 'keyboard-can-scroll', 'keyboard-can-scroll-left', 'keyboard-can-scroll-right')
    host = undefined
    scroller = undefined
  }
  const attach = (element: HTMLElement | undefined) => {
    detach()
    if (!element) return
    const keyboardShell = element.querySelector<HTMLElement>('.keyboard-shell')
    if (!keyboardShell) return
    host = element
    scroller = keyboardShell
    host.classList.add('keyboard-scroll-viewport')
    scroller.addEventListener('scroll', refreshCues, { passive: true })
    host.addEventListener('pointerdown', handlePointerDown)
    host.addEventListener('wheel', handleWheel, { passive: false })
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(refreshCues)
      resizeObserver.observe(host)
      resizeObserver.observe(scroller)
      const layout = scroller.querySelector<HTMLElement>('.keyboard-layout')
      if (layout) resizeObserver.observe(layout)
    }
    requestAnimationFrame(refreshCues)
  }

  let stopWatching: (() => void) | undefined
  onMounted(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('pointercancel', finishDrag)
    stopWatching = watch(container, attach, { immediate: true, flush: 'post' })
  })
  onBeforeUnmount(() => {
    stopWatching?.()
    detach()
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', finishDrag)
    window.removeEventListener('pointercancel', finishDrag)
  })
}
