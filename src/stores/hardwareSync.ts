import type { DeviceSession } from '@/application/DeviceSession'
import type { KeyboardConfiguration, KeyboardMode } from '@/domain/keyboard'

export interface HardwareChange {
  session: DeviceSession
  mode?: KeyboardMode
  configuration?: KeyboardConfiguration
}

/** 单一同步队列：忙碌期间按字段合并最新事件，不创建递归定时器。 */
export function createHardwareSync(
  canRun: () => boolean,
  synchronize: (change: HardwareChange, isCurrent: () => boolean) => Promise<void>,
) {
  let pending: HardwareChange | undefined
  let generation = 0
  let sequence = 0
  let running = false
  let active: HardwareChange | undefined

  function enqueue(change: HardwareChange) {
    const previous = pending ?? active
    pending = previous?.session === change.session ? { ...previous, ...change } : change
    sequence++
    void flush()
  }

  async function flush() {
    if (running || !pending || !canRun()) return
    running = true
    const change = pending, capturedGeneration = generation, capturedSequence = sequence
    active = change
    pending = undefined
    try { await synchronize(change, () => capturedGeneration === generation && capturedSequence === sequence) }
    finally {
      running = false
      active = undefined
      // 新事件在读取期间到来时再同步一次，队列中永远只有最新的组合。
      if (pending && canRun()) void flush()
    }
  }

  function clear() { pending = undefined; active = undefined; generation++; sequence++ }
  return { enqueue, flush, clear }
}
