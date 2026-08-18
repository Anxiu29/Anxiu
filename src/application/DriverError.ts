export type DriverErrorCode =
  | 'UNSUPPORTED_BROWSER'
  | 'DEVICE_NOT_SELECTED'
  | 'DEVICE_NOT_CONNECTED'
  | 'DEVICE_DISCONNECTED'
  | 'UNSUPPORTED_CAPABILITY'
  | 'INVALID_CONFIGURATION'
  | 'PROTOCOL_TIMEOUT'
  | 'PROTOCOL_CRC_ERROR'
  | 'PROTOCOL_REJECTED'
  | 'VERIFY_FAILED'
  | 'UNKNOWN'

export class DriverError extends Error {
  override readonly name = 'DriverError'

  constructor(
    readonly code: DriverErrorCode,
    message: string,
    readonly recoverable = true,
    options?: { cause?: unknown; details?: Readonly<Record<string, unknown>> },
  ) {
    super(message, { cause: options?.cause })
    this.details = options?.details
  }

  readonly details?: Readonly<Record<string, unknown>>
}

/**
 * 应用边界只向 UI 暴露 DriverError。未知的浏览器、协议或第三方异常在此归一化，
 * 让界面可以依赖稳定 code，而不是匹配可能变化的错误文本。
 */
export const toDriverError = (cause: unknown): DriverError =>
  cause instanceof DriverError
    ? cause
    : new DriverError('UNKNOWN', cause instanceof Error ? cause.message : String(cause), true, { cause })
