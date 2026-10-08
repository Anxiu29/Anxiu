import { afterEach, expect, it, vi } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'
import { downloadMouseFirmware, readMouseFirmware } from '@/application/MouseFirmwareImage'
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('rejects oversized streams before validation and cancels their reader', async () => {
  const cancel = vi.fn()
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(17)) }, cancel,
  }))))
  const validate = vi.fn((bytes) => bytes)
  await expect(downloadMouseFirmware({ url: '/firmware.bin', sha256: '' }, { maxImageBytes: 16, validate })).rejects.toThrow('过大')
  expect(validate).not.toHaveBeenCalled()
  expect(cancel).toHaveBeenCalledOnce()
})
it('does not fetch when already aborted', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  const controller = new AbortController(); controller.abort()
  await expect(downloadMouseFirmware({ url: '/firmware.bin', sha256: '' }, { maxImageBytes: 16, validate: vi.fn() }, controller.signal)).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
it('checks integrity before passing bytes to the model validator', async () => {
  const bytes = Uint8Array.of(1, 2, 3)
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes)))
  const validate = vi.fn((value) => value)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  expect(await downloadMouseFirmware({ url: '/firmware.bin', sha256 }, { maxImageBytes: 16, validate })).toEqual(bytes)
  expect(validate).toHaveBeenCalledOnce()
})
it('rejects an invalid local file before reading it', async () => {
  const arrayBuffer = vi.fn()
  await expect(readMouseFirmware({ name: 'update.exe', size: 10, arrayBuffer } as unknown as File, { maxImageBytes: 16, validate: vi.fn() })).rejects.toThrow('.bin')
  expect(arrayBuffer).not.toHaveBeenCalled()
})
