export interface FirmwareProgress {
  stage: 'validating' | 'boot' | 'reconnecting' | 'authorizing' | 'erasing' | 'writing' | 'verifying' | 'restarting' | 'reading-configuration' | 'complete' | 'failed'
  current: number
  total: number
  message: string
}

export interface FirmwareUpdateOptions {
  onProgress(progress: FirmwareProgress): void
  onDiagnostic?(event: FirmwareDiagnostic): void
  /** 重枚举后的新接口可能需要用户再次授权，UI 必须在点击事件中打开选择框。 */
  authorizeDevice(): Promise<HIDDevice>
}

/** 仅记录流程元数据；不包含固件正文、签名种子或设备序列号。 */
export interface FirmwareDiagnostic {
  kind: 'command' | 'stage' | 'connection' | 'result'
  outcome: 'started' | 'success' | 'failure' | 'sent'
  command?: number
  stage?: FirmwareProgress['stage']
  current?: number
  total?: number
  frames?: number
  address?: number
  size?: number
  durationMs?: number
  message?: string
}
