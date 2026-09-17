import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadC98Firmware, C98_FIRMWARE_SIZE, C98_FIRMWARE_URL } from '@/devices/c98/firmware'
afterEach(() => vi.unstubAllGlobals())
describe('official firmware download', () => {
  it('fetches only the official URL and reports progress', async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array(C98_FIRMWARE_SIZE)))
    vi.stubGlobal('fetch', fetcher)
    const progress = vi.fn()
    expect((await downloadC98Firmware(progress)).length).toBe(C98_FIRMWARE_SIZE)
    expect(fetcher).toHaveBeenCalledWith(C98_FIRMWARE_URL, expect.objectContaining({ credentials: 'omit', cache: 'no-store' }))
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ stage: 'downloading', current: C98_FIRMWARE_SIZE }))
  })
  it.each([0, 10, C98_FIRMWARE_SIZE + 1])('rejects incorrect byte length %s', async (size) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(size))))
    await expect(downloadC98Firmware(vi.fn())).rejects.toThrow()
  })
  it('rejects HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    await expect(downloadC98Firmware(vi.fn())).rejects.toThrow('503')
  })
})
