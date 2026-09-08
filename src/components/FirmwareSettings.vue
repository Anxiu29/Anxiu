<script setup lang="ts">
import { ref } from 'vue'
import type { KeyboardProfile } from '@/domain/keyboard'
import type { FirmwareDownload } from '@/ui/DevicePresentation'
import type { FirmwareProgress } from '@/application/FirmwareUpdate'

// 仅负责文件选择、确认和进度展示；设备操作由父级事件交给 Store。
withDefaults(defineProps<{
  profile: KeyboardProfile
  busy?: boolean
  firmwareDownload?: FirmwareDownload
  canUpgradeFirmware?: boolean
  firmwareProgress?: FirmwareProgress
  firmwareLogAvailable?: boolean
}>(), { busy: false })

const emit = defineEmits<{
  'upgrade-firmware': [file: File]
  'authorize-firmware': []
  'cancel-firmware-authorization': []
  'export-firmware-log': []
}>()

const firmwareFile = ref<File>()
const firmwareError = ref('')
const firmwareInput = ref<HTMLInputElement>()
const firmwareConfirmed = ref(false)
const formatFileSize = (bytes: number) => bytes < 1024
  ? `${bytes} B`
  : bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`

function selectFirmware(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  firmwareFile.value = undefined
  firmwareError.value = ''
  firmwareConfirmed.value = false
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.bin')) {
    firmwareError.value = '请选择 .bin 格式的键盘固件包。'
    input.value = ''
    return
  }
  if (!file.size) {
    firmwareError.value = '固件文件为空，无法用于升级。'
    input.value = ''
    return
  }
  firmwareFile.value = file
}

</script>

<template>
<section class="settings-section">
  <div class="settings-section-title"><span>FIRMWARE UPDATE</span><h3>固件下载与升级</h3><p>下载官方固件，查看当前版本和本地文件信息。</p></div>
  <div class="firmware-version-card">
    <div><small>当前固件</small><strong>{{ profile.device.firmwareVersion }}</strong><span>{{ profile.device.productName }}</span></div>
    <span class="firmware-status">{{ canUpgradeFirmware ? '支持网页升级' : '当前会话不支持刷写' }}</span>
  </div>
  <div v-if="firmwareDownload" class="settings-action-card firmware-download-card">
    <div><strong>官方固件下载</strong><p>{{ firmwareDownload.target }}</p><p>文件标注版本：{{ firmwareDownload.version }}</p><p class="firmware-download-name">{{ firmwareDownload.fileName }}</p></div>
    <a class="settings-secondary-button firmware-download-link" :href="firmwareDownload.url" :download="firmwareDownload.fileName" target="_blank" rel="noopener noreferrer">下载官方固件</a>
  </div>
  <div class="firmware-upload-card" :class="{ selected: firmwareFile }" @click="!busy && firmwareInput?.click()">
    <input ref="firmwareInput" type="file" :disabled="busy" accept=".bin,application/octet-stream" @change="selectFirmware" />
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5"/></svg>
    <div v-if="firmwareFile"><strong>{{ firmwareFile.name }}</strong><p>{{ formatFileSize(firmwareFile.size) }} · 非空 .bin 文件，尚未验证设备适配性</p></div>
    <div v-else><strong>选择本地固件包</strong><p>点击选择厂商提供的 .bin 文件</p></div>
    <button type="button" tabindex="-1">{{ firmwareFile ? '重新选择' : '浏览文件' }}</button>
  </div>
  <p v-if="firmwareError" class="firmware-error" role="alert">{{ firmwareError }}</p>
  <div class="firmware-unavailable"><strong>升级前确认</strong><p>目前支持本页下载的官方固件（{{ firmwareDownload?.target }}，{{ firmwareDownload?.version }}），开始前自动校验文件。使用有线连接，关闭其他键盘驱动，升级期间保持供电、不要刷新页面。失败时可重新授权设备并再次升级恢复。</p></div>
  <label><input v-model="firmwareConfirmed" type="checkbox" :disabled="busy" /> 我确认设备与上方固件适用型号一致，理解升级会擦除固件，已备份需要的配置。</label>
  <div v-if="firmwareProgress" role="status" aria-live="polite">
    <p>{{ firmwareProgress.message }}</p>
    <progress v-if="['writing', 'verifying', 'restarting', 'complete'].includes(firmwareProgress.stage)" :value="firmwareProgress.current" :max="firmwareProgress.total" aria-label="固件写入进度"></progress>
    <span v-if="firmwareProgress.stage === 'writing'"> {{ Math.floor(firmwareProgress.current / firmwareProgress.total * 100) }}%</span>
    <template v-if="firmwareProgress.stage === 'authorizing'">
      <button type="button" class="primary" @click="emit('authorize-firmware')">授权升级设备</button>
      <button type="button" class="settings-secondary-button" @click="emit('cancel-firmware-authorization')">停止等待</button>
    </template>
  </div>
  <button v-if="firmwareLogAvailable" type="button" class="settings-secondary-button" @click="emit('export-firmware-log')">导出升级诊断日志</button>
  <div class="firmware-footer"><p>仅使用与当前型号、板卡完全匹配的官方固件。</p><button class="primary" type="button" :disabled="busy || !canUpgradeFirmware || !firmwareFile || !firmwareConfirmed" @click="firmwareFile && emit('upgrade-firmware', firmwareFile)">{{ busy ? '升级处理中' : '开始升级' }}</button></div>
</section>
</template>
