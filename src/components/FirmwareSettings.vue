<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { KeyboardProfile } from '@/domain/keyboard'
import type { FirmwareDownload } from '@/ui/DevicePresentation'
import type { FirmwareProgress } from '@/application/FirmwareUpdate'

const props = withDefaults(defineProps<{
  profile: KeyboardProfile
  busy?: boolean
  firmwareDownload?: FirmwareDownload
  canUpgradeFirmware?: boolean
  firmwareProgress?: FirmwareProgress
  firmwareLogAvailable?: boolean
}>(), { busy: false })
const emit = defineEmits<{
  'upgrade-firmware': [file?: File]
  'authorize-firmware': []
  'cancel-firmware-authorization': []
  'export-firmware-log': []
}>()
const mode = ref<'online' | 'local'>('online')
const firmwareFile = ref<File>()
const firmwareError = ref('')
const firmwareConfirmed = ref(false)
const fileInput = ref<HTMLInputElement>()
watch(mode, () => { firmwareConfirmed.value = false })
const ready = computed(() => !props.busy && props.canUpgradeFirmware && firmwareConfirmed.value && (mode.value === 'online' ? !!props.firmwareDownload : !!firmwareFile.value))
const percent = computed(() => {
  const progress = props.firmwareProgress
  return progress && progress.total > 0 ? Math.min(100, Math.max(0, Math.floor(progress.current / progress.total * 100))) : 0
})
function selectFile(event: Event) {
  if (props.busy) return
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  firmwareFile.value = undefined
  firmwareConfirmed.value = false
  firmwareError.value = ''
  if (!file.name.toLowerCase().endsWith('.bin')) firmwareError.value = '请选择 .bin 格式的官方固件。'
  else if (!file.size) firmwareError.value = '固件文件为空，请重新选择。'
  else if (file.size > 16 * 1024 * 1024) firmwareError.value = '固件文件过大，请选择正确的官方固件。'
  else firmwareFile.value = file
  input.value = ''
}
function upgrade() {
  if (!ready.value) return
  if (mode.value === 'local') emit('upgrade-firmware', firmwareFile.value)
  else emit('upgrade-firmware')
}
</script>

<template>
<section class="settings-section firmware-panel">
  <div class="settings-section-title"><span>FIRMWARE UPDATE</span><h3>固件升级</h3><p>在线获取或选择本地官方固件。</p></div>
  <div class="firmware-version-card">
    <div><small>当前设备 · {{ profile.device.productName }}</small><strong>{{ profile.device.firmwareVersion }}</strong><span>当前固件版本</span></div>
    <span class="firmware-status" :class="{ available: canUpgradeFirmware }">{{ canUpgradeFirmware ? '支持网页升级' : '当前会话不支持刷写' }}</span>
  </div>
  <div class="fw-modes" role="group" aria-label="升级方式">
    <button type="button" :aria-pressed="mode === 'online'" :class="{ active: mode === 'online' }" :disabled="busy" @click="mode = 'online'">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17H5a4 4 0 0 1-.4-8A7 7 0 0 1 18 7a5 5 0 0 1 1 10h-2M12 12v9m-3-3 3 3 3-3"/></svg>
      <span><strong>在线升级 <em>推荐</em></strong><small>自动获取官方固件</small></span><i></i>
    </button>
    <button type="button" :aria-pressed="mode === 'local'" :class="{ active: mode === 'local' }" :disabled="busy" @click="mode = 'local'">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 13h8m-8 4h5"/></svg>
      <span><strong>本地升级</strong><small>使用已保存的固件文件</small></span><i></i>
    </button>
  </div>
  <div class="fw-body"><div class="fw-source">
    <template v-if="mode === 'online'">
      <div v-if="firmwareDownload" class="firmware-download-card">
        <div class="fw-source-heading"><span class="fw-eyebrow">官方发布版本</span><span class="fw-badge">官方固件</span></div>
        <h4>{{ firmwareDownload.version }}</h4><p>{{ firmwareDownload.target }}</p>
        <p class="fw-filename">{{ firmwareDownload.fileName }}</p>
        <div class="fw-source-note">点击在线升级后自动获取并校验，无需手动下载。</div>
      </div>
      <p v-else>当前设备暂无可用的官方在线固件。</p>
    </template>
    <template v-else>
      <div class="fw-source-heading"><span class="fw-eyebrow">本地固件文件</span><a v-if="firmwareDownload" :href="firmwareDownload.url" :download="firmwareDownload.fileName" target="_blank" rel="noopener noreferrer">下载官方固件 ↗</a></div>
      <input ref="fileInput" class="fw-file-input" type="file" accept=".bin,application/octet-stream" :disabled="busy" aria-label="选择本地固件" @change="selectFile" />
      <button class="fw-file-picker" type="button" :disabled="busy" @click="fileInput?.click()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M5 15v5h14v-5"/></svg>
        <strong>{{ firmwareFile?.name || '选择官方固件文件' }}</strong>
        <small>{{ firmwareFile ? `${(firmwareFile.size / 1024).toFixed(1)} KB · 点击重新选择` : '支持 .bin 格式 · 文件仅在本地处理' }}</small>
      </button>
      <p v-if="firmwareError" class="firmware-error" role="alert">{{ firmwareError }}</p>
      <p class="fw-source-note">{{ firmwareDownload ? `适用固件：${firmwareDownload.target} · ${firmwareDownload.version}。` : '' }}开始前会校验文件与设备适配性。</p>
    </template>
  </div>
  <div class="fw-checklist"><div class="fw-safety"><strong>升级前准备</strong><p>使用有线连接，关闭其他键盘驱动。升级期间保持供电，不要拔线或刷新页面。</p></div>
  <label class="fw-confirm"><input v-model="firmwareConfirmed" type="checkbox" :disabled="busy" /><span>我已确认固件适用型号，了解升级会擦除固件，并已备份需要的配置。</span></label></div></div>
  <div v-if="firmwareProgress" class="fw-progress" :class="firmwareProgress.stage" role="status" aria-live="polite">
    <div><strong>{{ firmwareProgress.message }}</strong><span v-if="['downloading', 'writing'].includes(firmwareProgress.stage)">{{ percent }}%</span></div>
    <progress v-if="['downloading', 'writing'].includes(firmwareProgress.stage)" :value="firmwareProgress.current" :max="Math.max(1, firmwareProgress.total)" aria-label="固件升级进度"></progress>
    <div v-if="firmwareProgress.stage === 'authorizing'" class="fw-authorization"><button type="button" class="primary" @click="emit('authorize-firmware')">授权升级设备</button><button type="button" class="settings-secondary-button" @click="emit('cancel-firmware-authorization')">停止等待</button></div>
  </div>
  <div class="firmware-footer"><p>{{ mode === 'online' ? '官方来源 · 自动获取 · 校验后升级' : '本地文件 · 适配校验 · 安全写入' }}</p><button class="primary" type="button" :disabled="!ready" @click="upgrade">{{ busy ? '升级处理中…' : mode === 'online' ? '在线升级' : '开始本地升级' }}</button></div>
  <button v-if="firmwareLogAvailable" type="button" class="fw-log" @click="emit('export-firmware-log')">导出升级诊断日志</button>
</section>
</template>

<style scoped>
.firmware-panel { --fw-text: #e1e8ef; --fw-line: #2c3945; --fw-muted: #91a0ae; --fw-tint: rgba(69,230,208,.055); --fw-accent: var(--cyan); color: var(--fw-text); width: 100%; height: auto; padding: clamp(12px,2vh,24px) clamp(16px,2vw,30px); display: flex; flex-direction: column; gap: clamp(10px,1.7vh,18px); }
:global(html[data-theme='light'] .firmware-panel) { --fw-text: #25323c; --fw-line: #ccd7df; --fw-muted: #435360; --fw-tint: rgba(8,127,116,.045); --fw-accent: #087f74; }
.firmware-panel .settings-section-title { margin: 0; display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.settings-section-title > span { display: none; }.settings-section-title h3 { margin: 0; font-size: 20px; }
.firmware-panel .firmware-version-card { padding: 12px 16px; border-radius: 8px; background: var(--fw-tint); gap: 12px; }
.firmware-version-card > div { flex-direction: row; align-items: center; gap: 14px; flex-wrap: wrap; }
.firmware-version-card strong { margin: 0; font-size: 20px; letter-spacing: -.5px; }.firmware-version-card div span { margin: 0; }
.fw-modes { display: flex; border-bottom: 1px solid var(--fw-line); gap: 24px; }
.fw-modes button { display: flex; align-items: center; gap: 8px; padding: 8px 0 12px; border: 0; border-bottom: 2px solid transparent; color: var(--fw-muted); background: transparent; text-align: left; cursor: pointer; }
.fw-modes button.active { border-bottom-color: var(--fw-accent); color: var(--fw-accent); }
.fw-modes svg,.fw-file-picker svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
.fw-modes strong { display: flex; gap: 8px; align-items: center; font-size: 13px; }.fw-modes small,.fw-modes i { display: none; }
.fw-modes em,.fw-badge { font-size: 13px; font-style: normal; color: var(--fw-accent); background: var(--fw-tint); padding: 3px 6px; border-radius: 4px; }
.fw-body { display: grid; grid-template-columns: minmax(0,1.5fr) minmax(210px,1fr); gap: clamp(18px,3vw,36px); }
.fw-source { min-width: 0; }
.fw-source-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }.fw-eyebrow { font-size: 13px; color: var(--fw-muted); }
.fw-source a { font-size: 13px; color: var(--fw-accent); text-decoration: none; }
.fw-source h4 { margin: 10px 0 6px; font-size: 22px; letter-spacing: -.5px; }.fw-source p { margin: 6px 0; font-size: 13px; color: var(--fw-muted); line-height: 1.6; }
.fw-filename { overflow-wrap: anywhere; font-family: monospace; font-size: 13px !important; }
.fw-source-note { margin: 10px 0 0; color: var(--fw-muted); font-size: 13px; line-height: 1.6; }
.fw-file-input { display: none; }.fw-file-picker { display: grid; grid-template-columns: 22px minmax(0,1fr); align-items: center; gap: 6px 10px; text-align: left; width: 100%; padding: 14px; margin-top: 10px; border: 1px dashed var(--fw-line); border-radius: 8px; background: var(--fw-tint); color: inherit; cursor: pointer; }
.fw-file-picker svg { grid-row: span 2; color: var(--fw-accent); }.fw-file-picker strong { overflow-wrap: anywhere; font-size: 13px; }.fw-file-picker small { font-size: 13px; color: var(--fw-muted); }
.fw-checklist { border-left: 1px solid var(--fw-line); padding-left: clamp(18px,2vw,28px); }
.fw-safety strong { font-size: 13px; }.fw-safety p { margin: 8px 0 0; color: var(--fw-muted); font-size: 13px; line-height: 1.8; }
.fw-confirm { display: flex; align-items: flex-start; gap: 8px; margin-top: 14px; font-size: 13px; line-height: 1.8; color: var(--fw-muted); cursor: pointer; }.fw-confirm input { margin: 3px 0 0; accent-color: var(--fw-accent); flex-shrink: 0; }
.firmware-panel .firmware-footer { border-top: 1px solid var(--fw-line); padding-top: 12px; margin-top: 2px; flex-shrink: 0; }
.firmware-panel .firmware-footer .primary { padding: 10px 24px; border-radius: 7px; font-size: 13px; }
.fw-progress { padding: 10px 12px; border: 1px solid var(--fw-line); border-radius: 8px; background: var(--fw-tint); }
.fw-progress > div { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.fw-progress progress { width: 100%; height: 6px; margin-top: 8px; accent-color: var(--fw-accent); }.fw-progress.failed { border-color: #b85a5a; }.fw-progress.complete { border-color: var(--fw-accent); }.fw-progress .fw-authorization { margin-top: 8px; justify-content: flex-start; flex-wrap: wrap; }
.fw-log { align-self: flex-end; padding: 0; background: none; border: 0; color: var(--fw-muted); font-size: 13px; cursor: pointer; }
button:focus-visible,a:focus-visible { outline: 2px solid var(--fw-accent); outline-offset: 3px; }button:disabled { cursor: not-allowed; opacity: .5; }
@media(max-width: 900px) { .fw-body { grid-template-columns: minmax(0,1fr) minmax(180px,.85fr); gap: 16px; }.fw-checklist { padding-left: 16px; }.firmware-version-card div span { display: none; } }
@media(max-height: 700px) { .firmware-panel { gap: 10px; padding-block: 12px; }.firmware-panel .firmware-version-card { padding-block: 8px; }.fw-source h4 { font-size: 19px; }.fw-confirm { margin-top: 8px; } }
@media(max-width: 640px) { .fw-body { grid-template-columns: 1fr; gap: 12px; }.fw-checklist { border-left: 0; border-top: 1px solid var(--fw-line); padding: 10px 0 0; }.firmware-version-card { flex-wrap: wrap; }.firmware-panel .firmware-footer { margin-top: 0; } }

.firmware-panel .settings-section-title h3,
.firmware-panel .firmware-version-card strong,
.firmware-panel .fw-source h4,
.firmware-panel .fw-file-picker strong,
.firmware-panel .fw-safety strong,
.firmware-panel .fw-progress strong { color: var(--fw-text); }
.firmware-panel .settings-section-title p,
.firmware-panel .firmware-version-card small,
.firmware-panel .firmware-version-card div span,
.firmware-panel .firmware-footer p { color: var(--fw-muted); font-size: 13px; }
.firmware-panel .firmware-status { color: var(--fw-muted); border-color: var(--fw-line); font-size: 13px; }
.firmware-panel .firmware-status.available { color: var(--fw-accent); }
.firmware-panel .fw-source .firmware-error { color: #f4a7a7; }
:global(html[data-theme='light'] .firmware-panel .fw-source .firmware-error) { color: #b42332; }
.firmware-panel button:disabled { opacity: 1; color: var(--fw-muted); background: var(--fw-tint); border-color: var(--fw-line); box-shadow: none; }
.firmware-panel .fw-filename { font-size: 13px !important; }
.firmware-panel .fw-file-picker small,.firmware-panel .fw-log { font-size: 13px; }

/* 上下排列固件信息和准备事项，保持文字可读并利用页面高度。 */
.firmware-panel .fw-body { grid-template-columns: minmax(0,1fr); gap: 14px; }
.firmware-panel .fw-checklist { border-left: 0; border-top: 1px solid var(--fw-line); padding: 12px 0 0; }
.firmware-panel .fw-safety strong { font-size: 15px; }
.firmware-panel .fw-safety p { margin-top: 6px; }
.firmware-panel .fw-confirm { margin-top: 8px; }
.firmware-panel .fw-source h4 { font-size: 24px; }
.firmware-panel .fw-modes strong { font-size: 14px; }
.firmware-panel .firmware-footer .primary { font-size: 14px; }
</style>
