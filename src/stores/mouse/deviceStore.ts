import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { MouseSession, MouseDevice } from '@/application/MouseSession'
import type { MouseConfiguration } from '@/domain/mouse/types'
import { mouseFailureMessage } from '@/ui/mouseLabels'

export const useDeviceStore = defineStore('mouse_device', () => {
  const session = shallowRef<MouseSession>()
  const config = shallowRef<MouseConfiguration>()
  const identity = computed(() => session.value?.identity)
  const busy = ref(false),
    error = ref(''),
    saved = ref(false),
    completedOperation = ref('')
  const revision = ref(0),
    dirty = ref(false),
    macroAcknowledged = ref(false)
  let generation = 0,
    polling = false
  const firmwareState = ref<'idle' | 'selecting' | 'updating' | 'sent' | 'failed'>('idle')
  const firmwareProgress = ref(0)
  const firmwareNeedsReconnect = ref(false)
  const firmwareUpdating = computed(() => ['selecting', 'updating'].includes(firmwareState.value))
  function reset() {
    generation++
    session.value = undefined
    config.value = undefined
    busy.value = false
    error.value = ''
    saved.value = false
    dirty.value = false
    firmwareState.value = 'idle'
    firmwareProgress.value = 0
    firmwareNeedsReconnect.value = false
  }
  async function attach(next: MouseSession) {
    reset()
    session.value = next
    return refresh()
  }
  async function run(
    action: (device: MouseDevice) => Promise<MouseConfiguration>,
    writing = true,
    macro = false,
    operation = 'tlw.save',
  ) {
    const current = session.value
    if (!current || busy.value || firmwareNeedsReconnect.value) return false
    const ticket = generation
    busy.value = true
    error.value = ''
    saved.value = false
    try {
      const result = await action(current.device)
      if (ticket !== generation || session.value !== current) return false
      config.value = result
      saved.value = writing
      completedOperation.value = operation
      macroAcknowledged.value = macro
      return true
    } catch (cause) {
      if (ticket === generation)
        error.value = mouseFailureMessage(cause)
      return false
    } finally {
      if (ticket === generation) {
        busy.value = false
        revision.value++
      }
    }
  }
  const refresh = (notify = false) =>
    run((device) => device.readConfiguration(), notify, false, 'tlw.refresh')
  async function syncDpiStage() {
    const current = session.value
    if (!current) return false
    if (busy.value || firmwareNeedsReconnect.value || polling || !config.value) return true
    const ticket = generation,
      version = revision.value
    polling = true
    try {
      const stage = await current.device.readDpiStage()
      if (
        ticket !== generation ||
        session.value !== current ||
        busy.value ||
        version !== revision.value
      )
        return true
      if (!config.value || stage >= config.value.basic.dpiStageCount)
        throw new Error('Invalid DPI stage')
      if (config.value.functions[12] !== stage) {
        const functions = config.value.functions.slice()
        functions[12] = stage
        config.value = { ...config.value, functions }
      }
      return true
    } catch {
      return false
    } finally {
      polling = false
    }
  }
  async function updateFirmware(input: Uint8Array) {
    const current = session.value
    const support = current?.firmware
    if (!current || !support || current.identity.demo || current.identity.connection !== 'wired' || busy.value || firmwareNeedsReconnect.value) return false
    const ticket = generation
    let target: HIDDevice | undefined
    let openedHere = false
    busy.value = true
    error.value = ''
    saved.value = false
    firmwareProgress.value = 0
    try {
      const image = support.validate(input)
      firmwareState.value = 'selecting'
      target = await support.requestDevice()
      if (ticket !== generation || session.value !== current) return false
      if (!target) { firmwareState.value = 'idle'; return false }
      if (!target.opened) { await target.open(); openedHere = true }
      if (ticket !== generation || session.value !== current) return false
      firmwareNeedsReconnect.value = true
      firmwareState.value = 'updating'
      await support.update(target, image, (percent) => {
        if (ticket === generation) firmwareProgress.value = percent
      })
      if (ticket !== generation) return false
      firmwareState.value = 'sent'
      return true
    } catch (cause) {
      if (ticket === generation) {
        firmwareState.value = 'failed'
        error.value = cause instanceof Error ? cause.message : '固件升级失败，请重新连接鼠标'
      }
      return false
    } finally {
      if (openedHere && target?.opened) await target.close().catch(() => undefined)
      if (ticket === generation) busy.value = false
    }
  }
  return {
    firmwareState,
    firmwareProgress,
    firmwareNeedsReconnect,
    firmwareUpdating,
    updateFirmware,
    session,
    identity,
    config,
    busy,
    error,
    saved,
    completedOperation,
    revision,
    dirty,
    macroAcknowledged,
    reset,
    attach,
    run,
    refresh,
    syncDpiStage,
  }
})
