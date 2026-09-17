import { computed, ref } from 'vue'
import { createFirmwareDiagnostics } from '@/application/FirmwareDiagnostics'
import type { FirmwareProgress } from '@/application/FirmwareUpdate'
import type { KeyboardDriverService } from '@/application/KeyboardDriverService'
import type { createDriverState } from './driverState'

interface FirmwareLifecycle {
  clearFeedback(): void
  removeDeviceStateListeners(): void
  invalidateDeviceCaches(): void
  handleDisconnect(): void
  observeDeviceStateChanges(): void
  readProfile(): Promise<boolean>
  fail(cause: unknown): void
}

/** 固件状态与授权等待由功能模块持有，普通会话的生命周期通过明确接口协作。 */
export function createFirmwareActions(
  state: ReturnType<typeof createDriverState>,
  driverService: KeyboardDriverService,
  lifecycle: FirmwareLifecycle,
) {
  const { status, driverId, message } = state
  const diagnostics = createFirmwareDiagnostics()
  const firmwareLogAvailable = ref(false)
  const exportFirmwareLog = () => diagnostics.export()
  const firmwareProgress = ref<FirmwareProgress>()
  const firmwareUpdating = ref(false)
  let pendingAuthorization: { resolve(device: HIDDevice): void; reject(error: Error): void } | undefined
  let authorizationInProgress = false
  const canUpgradeFirmware = computed(() => !state.demo.value && !!state.profile.value && driverService.canUpgradeFirmware)

  async function upgradeFirmware(file?: File) {
    if (firmwareUpdating.value || !canUpgradeFirmware.value || ['connecting', 'reading', 'writing'].includes(status.value)) return
    diagnostics.reset()
    firmwareLogAvailable.value = true
    diagnostics.record({ kind: 'stage', outcome: 'started', stage: file ? 'validating' : 'downloading', total: file?.size ?? 0 })
    firmwareUpdating.value = true
    lifecycle.clearFeedback(); status.value = 'writing'
    firmwareProgress.value = { stage: file ? 'validating' : 'downloading', current: 0, total: file?.size ?? 0, message: file ? '正在验证官方固件文件' : '正在获取官方固件' }
    try {
      if (file && (file.size > 16 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.bin'))) throw new Error('请选择有效的官方 .bin 固件')
      const image = file ? new Uint8Array(await file.arrayBuffer()) : await driverService.downloadFirmware((progress) => {
        firmwareProgress.value = progress
      })
      firmwareProgress.value = { stage: 'validating', current: 0, total: image.length, message: '正在验证官方固件文件' }
      diagnostics.record({ kind: 'stage', outcome: 'started', ...firmwareProgress.value })
      lifecycle.removeDeviceStateListeners()
      lifecycle.invalidateDeviceCaches()
      state.session = undefined
      await driverService.upgradeFirmware(image, {
        onProgress: (progress) => {
          firmwareProgress.value = progress
          diagnostics.record({ kind: 'stage', outcome: 'started', ...progress })
        },
        onDiagnostic: (event) => diagnostics.record(event),
        authorizeDevice: () => new Promise<HIDDevice>((resolve, reject) => { pendingAuthorization = { resolve, reject } }),
      })
      firmwareProgress.value = { stage: 'reading-configuration', current: image.length, total: image.length, message: '固件已启动，正在重新读取配置' }
      diagnostics.record({ kind: 'stage', outcome: 'started', ...firmwareProgress.value })
      state.session = await driverService.reconnectAuthorized({ driverId: driverId.value, onDisconnect: lifecycle.handleDisconnect })
      if (!state.session) throw new Error('固件已校验并启动，请重新连接以读取配置')
      lifecycle.observeDeviceStateChanges()
      if (!await lifecycle.readProfile()) throw new Error('固件写入后配置读取已中断，请重新连接')
      diagnostics.record({ kind: 'result', outcome: 'success', message: '固件及配置回读完成' })
      firmwareProgress.value = { stage: 'complete', current: image.length, total: image.length, message: '固件升级及配置回读完成' }
      message.value = '固件升级完成，已校验并重新读取设备配置'
    } catch (cause) {
      state.session = driverService.session
      if (state.session) lifecycle.observeDeviceStateChanges()
      const detail = cause instanceof Error ? cause.message : String(cause)
      diagnostics.record({ kind: 'result', outcome: 'failure', stage: firmwareProgress.value?.stage, message: detail })
      firmwareProgress.value = { stage: 'failed', current: firmwareProgress.value?.current ?? 0, total: firmwareProgress.value?.total ?? 0, message: detail }
      lifecycle.fail(cause)
    } finally { pendingAuthorization = undefined; firmwareUpdating.value = false }
  }

  async function authorizeFirmwareDevice() {
    const pending = pendingAuthorization
    if (!pending || authorizationInProgress) return
    authorizationInProgress = true
    try { pending.resolve(await driverService.requestUpgradeDevice()) }
    catch (cause) { pending.reject(cause instanceof Error ? cause : new Error(String(cause))) }
    finally { authorizationInProgress = false }
  }
  function cancelFirmwareAuthorization() {
    pendingAuthorization?.reject(new Error('已停止等待授权；如键盘处于 Bootloader，请保持供电并重新在线升级恢复'))
  }

  return { firmwareLogAvailable, exportFirmwareLog, firmwareProgress, firmwareUpdating, canUpgradeFirmware, upgradeFirmware, authorizeFirmwareDevice, cancelFirmwareAuthorization }
}
