import type { KeyAssignment, KeyboardProfile } from '@/domain/keyboard'

/** 应用核心依赖的设备传输端口；WebHID、WebUSB 或桌面桥接均可实现。 */
export interface DeviceTransport {
  readonly connected: boolean
  readonly productName: string
  readonly vendorId: number
  readonly productId: number
  requestDevice(): Promise<void>
  reconnectAuthorized(): Promise<boolean>
  open(): Promise<void>
  close(): Promise<void>
  send(report: Uint8Array): Promise<void>
  onReport(listener: (data: Uint8Array) => void): () => void
  onDisconnect(listener: () => void): () => void
}

/** 应用核心依赖的键盘能力端口；每套设备协议提供一个实现。 */
export interface KeyboardProtocol {
  getProfile(): Promise<KeyboardProfile>
  writeAssignments(assignments: KeyAssignment[]): Promise<void>
  save(): Promise<void>
  reload(): Promise<void>
  restoreFactory(): Promise<void>
  close(): void
}
