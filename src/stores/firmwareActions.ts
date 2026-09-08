import { computed, ref } from 'vue'
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
  const firmwareProgress = ref<FirmwareProgress>()
  const firmwareUpdating = ref(false)
  let pendingAuthorization: { resolve(device: HIDDevice): void; reject(error: Error): void } | undefined
  let authorizationInProgress = false
  const canUpgradeFirmware = computed(() => !state.demo.value && !!state.profile.value && driverService.canUpgradeFirmware)

  async function upgradeFirmware(file: File) {
    if (firmwareUpdating.value || !canUpgradeFirmware.value || ['connecting', 'reading', 'writing'].includes(status.value)) return
    firmwareUpdating.value = true
    lifecycle.clearFeedback(); status.value = 'writing'
    firmwareProgress.value = { stage: 'validating', current: 0, total: file.size, message: '正在验证官方固件文件' }
    try {
      if (file.size > 16 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.bin')) throw new Error('请选择有效的官方 .bin 固件')
      const image = new Uint8Array(await file.arrayBuffer())
      lifecycle.removeDeviceStateListeners()
      lifecycle.invalidateDeviceCaches()
      state.session = undefined
      await driverService.upgradeFirmware(image, {
        onProgress: (progress) => { firmwareProgress.value = progress },
        authorizeDevice: () => new Promise<HIDDevice>((resolve, reject) => { pendingAuthorization = { resolve, reject } }),
      })
      state.session = await driverService.reconnectAuthorized({ driverId: driverId.value, onDisconnect: lifecycle.handleDisconnect })
      if (!state.session) throw new Error('固件已校验并启动，请重新连接以读取配置')
      lifecycle.observeDeviceStateChanges()
      await lifecycle.readProfile()
      message.value = '固件升级完成，已校验并重新读取设备配置'
    } catch (cause) {
      state.session = driverService.session
      if (state.session) lifecycle.observeDeviceStateChanges()
      const detail = cause instanceof Error ? cause.message : String(cause)
      firmwareProgress.value = { stage: 'failed', current: firmwareProgress.value?.current ?? 0, total: file.size, message: detail }
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
    pendingAuthorization?.reject(new Error('已停止等待授权；如键盘处于 Bootloader，请保持供电并重新选择固件恢复'))
  }

  return { firmwareProgress, firmwareUpdating, canUpgradeFirmware, upgradeFirmware, authorizeFirmwareDevice, cancelFirmwareAuthorization }
}
