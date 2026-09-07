export interface FirmwareProgress {
  stage: 'validating' | 'boot' | 'reconnecting' | 'authorizing' | 'erasing' | 'writing' | 'verifying' | 'restarting' | 'complete' | 'failed'
  current: number
  total: number
  message: string
}

export interface FirmwareUpdateOptions {
  onProgress(progress: FirmwareProgress): void
  /** 重枚举后的新接口可能需要用户再次授权，UI 必须在点击事件中打开选择框。 */
  authorizeDevice(): Promise<HIDDevice>
}
