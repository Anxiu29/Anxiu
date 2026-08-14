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

export const toDriverError = (cause: unknown): DriverError =>
  cause instanceof DriverError
    ? cause
    : new DriverError('UNKNOWN', cause instanceof Error ? cause.message : String(cause), true, { cause })
