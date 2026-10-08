export interface FirmwareImageSource { url: string; sha256: string }
export interface FirmwareImageValidator {
  maxImageBytes: number
  validate(input: Uint8Array): Uint8Array
}

export async function readMouseFirmware(file: File, support: FirmwareImageValidator) {
  if (!file.name.toLowerCase().endsWith('.bin') || !file.size || file.size > support.maxImageBytes)
    throw new Error('请选择适用于此鼠标的 .bin 固件文件')
  return support.validate(new Uint8Array(await file.arrayBuffer()))
}

/** Bounded download, cancellation and integrity checks complete before USB is requested. */
export async function downloadMouseFirmware(
  source: FirmwareImageSource,
  support: FirmwareImageValidator,
  signal?: AbortSignal,
) {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) cancel()
  const timeout = setTimeout(cancel, 60000)
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  try {
    controller.signal.throwIfAborted()
    const response = await fetch(source.url, { signal: controller.signal, credentials: 'omit', cache: 'no-store' })
    if (!response.ok || !response.body) throw new Error('在线固件获取失败，请稍后重试')
    reader = response.body.getReader()
    const buffer = new Uint8Array(support.maxImageBytes)
    let size = 0
    while (true) {
      controller.signal.throwIfAborted()
      const { value, done } = await reader.read()
      if (done) break
      if (size + value.length > buffer.length) throw new Error('在线固件文件过大，已停止下载')
      buffer.set(value, size)
      size += value.length
    }
    controller.signal.throwIfAborted()
    const bytes = buffer.slice(0, size)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    controller.signal.throwIfAborted()
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    if (hash !== source.sha256) throw new Error('在线固件校验失败，请重新获取')
    return support.validate(bytes)
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', cancel)
    await reader?.cancel().catch(() => undefined)
  }
}
