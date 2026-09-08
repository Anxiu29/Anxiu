import { describe, expect, it, vi } from 'vitest'
import { createHardwareSync } from '@/stores/hardwareSync'
import type { DeviceSession } from '@/application/DeviceSession'

const session = {} as DeviceSession
describe('hardware synchronization queue', () => {
  it('merges both fields and keeps only the latest values while busy', async () => {
    let ready = false
    const synchronize = vi.fn(async (_change: import('@/stores/hardwareSync').HardwareChange) => {})
    const queue = createHardwareSync(() => ready, synchronize)
    queue.enqueue({ session, mode: 'mac' })
    queue.enqueue({ session, configuration: 2 })
    queue.enqueue({ session, mode: 'win' })
    queue.enqueue({ session, configuration: 4 })
    expect(synchronize).not.toHaveBeenCalled()
    ready = true
    await queue.flush()
    expect(synchronize).toHaveBeenCalledOnce()
    expect(synchronize.mock.calls[0]?.[0]).toEqual({ session, mode: 'win', configuration: 4 })
  })

  it('invalidates an in-flight result when a newer event arrives and serializes the next read', async () => {
    let release!: () => void
    let current!: () => boolean
    const gate = new Promise<void>((resolve) => { release = resolve })
    const calls: string[] = []
    const queue = createHardwareSync(() => true, async (change, isCurrent) => {
      calls.push(change.mode!)
      if (calls.length === 1) { current = isCurrent; await gate }
    })
    queue.enqueue({ session, mode: 'mac' })
    expect(current()).toBe(true)
    queue.enqueue({ session, mode: 'win' })
    expect(current()).toBe(false)
    expect(calls).toEqual(['mac'])
    release()
    await gate; await Promise.resolve(); await Promise.resolve()
    expect(calls).toEqual(['mac', 'win'])
  })

  it('clears pending work on disconnect without polling timers', async () => {
    let ready = false
    const synchronize = vi.fn(async () => {})
    const queue = createHardwareSync(() => ready, synchronize)
    queue.enqueue({ session, mode: 'mac', configuration: 3 })
    queue.clear()
    ready = true
    await queue.flush()
    expect(synchronize).not.toHaveBeenCalled()
  })

  it('retains the other field when an in-flight combined change is superseded', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const received: import('@/stores/hardwareSync').HardwareChange[] = []
    const queue = createHardwareSync(() => true, async (change) => {
      received.push(change)
      if (received.length === 1) await gate
    })
    queue.enqueue({ session, mode: 'mac', configuration: 3 })
    queue.enqueue({ session, mode: 'win' })
    release(); await gate; await Promise.resolve(); await Promise.resolve()
    expect(received[1]).toEqual({ session, mode: 'win', configuration: 3 })
  })
})
