import type { FirmwareDiagnostic } from './FirmwareUpdate'

/** 有界日志避免长时间重试占满内存；只在用户导出时生成 JSON。 */
export function createFirmwareDiagnostics(limit = 4096) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('日志容量必须为正整数')
  const events: (FirmwareDiagnostic & { timestamp: string })[] = []
  let dropped = 0
  let startedAt = new Date().toISOString()
  return {
    reset() { events.length = 0; dropped = 0; startedAt = new Date().toISOString() },
    record(event: FirmwareDiagnostic) {
      if (events.length === limit) { events.shift(); dropped++ }
      // 显式白名单，调用方误传原始 HID 字节或 SN 时也不会进入导出文件。
      const { kind, outcome, command, stage, current, total, frames, address, size, durationMs, message } = event
      events.push({ timestamp: new Date().toISOString(), kind, outcome, command, stage, current, total, frames, address, size, durationMs, message: message?.slice(0, 500) })
    },
    export() { return JSON.stringify({ schemaVersion: 1, startedAt, exportedAt: new Date().toISOString(), dropped, events }, null, 2) },
  }
}
