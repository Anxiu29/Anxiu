<script setup lang="ts">
import { computed, ref } from 'vue'
import type { KeyboardProfile } from '@/domain/keyboard'
import type { AppTheme } from '@/ui/theme'

type SettingsSection = 'appearance' | 'device' | 'firmware' | 'about'

const props = withDefaults(defineProps<{
  profile: KeyboardProfile
  theme?: AppTheme
  busy?: boolean
}>(), { theme: 'dark', busy: false })

const emit = defineEmits<{
  reload: []
  'restore-factory': []
  'update:theme': [theme: AppTheme]
}>()

const activeSection = ref<SettingsSection>('appearance')
const resetConfirmationVisible = ref(false)
const firmwareFile = ref<File>()
const firmwareError = ref('')
const firmwareInput = ref<HTMLInputElement>()
const firmwareUpdateSupported = computed(() => !!props.profile.capabilities.firmwareUpdate)
const deviceModeLabel = computed(() => ({ app: '应用模式', boot: 'Bootloader', unknown: '未知模式' })[props.profile.device.runMode])
const formatHex = (value: number) => `0x${value.toString(16).toUpperCase().padStart(4, '0')}`
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

function requestFactoryReset() {
  if (!resetConfirmationVisible.value) {
    resetConfirmationVisible.value = true
    return
  }
  resetConfirmationVisible.value = false
  emit('restore-factory')
}
</script>

<template>
  <section class="settings-workspace">
    <header class="settings-heading">
      <div><span class="eyebrow">DEVICE SETTINGS</span><h2>设置</h2><p>管理界面外观、当前设备和固件。</p></div>
    </header>

    <div class="settings-layout">
      <nav class="settings-navigation" aria-label="设置页面">
        <button type="button" :class="{ active: activeSection === 'appearance' }" @click="activeSection = 'appearance'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          <span><strong>外观</strong><small>主题与显示偏好</small></span>
        </button>
        <button type="button" :class="{ active: activeSection === 'device' }" @click="activeSection = 'device'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>
          <span><strong>设备</strong><small>信息与维护操作</small></span>
        </button>
        <button type="button" :class="{ active: activeSection === 'firmware' }" @click="activeSection = 'firmware'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14"/></svg>
          <span><strong>固件升级</strong><small>本地固件包与版本</small></span>
        </button>
        <button type="button" :class="{ active: activeSection === 'about' }" @click="activeSection = 'about'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></svg>
          <span><strong>关于</strong><small>驱动与协议信息</small></span>
        </button>
      </nav>

      <div class="settings-page">
        <section v-if="activeSection === 'appearance'" class="settings-section">
          <div class="settings-section-title"><span>APPEARANCE</span><h3>界面外观</h3><p>选择更适合当前环境的显示主题，偏好会保存在此浏览器中。</p></div>
          <div class="settings-card">
            <div class="settings-card-copy"><strong>界面主题</strong><p>所有设备工作区都会立即应用新的颜色方案。</p></div>
            <div class="theme-options" role="radiogroup" aria-label="界面主题">
              <button type="button" role="radio" :aria-checked="theme === 'light'" :class="{ active: theme === 'light' }" @click="emit('update:theme', 'light')"><span class="theme-preview light"><i></i><i></i></span><span>浅色<small>明亮清晰</small></span></button>
              <button type="button" role="radio" :aria-checked="theme === 'dark'" :class="{ active: theme === 'dark' }" @click="emit('update:theme', 'dark')"><span class="theme-preview dark"><i></i><i></i></span><span>深色<small>专注沉浸</small></span></button>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'device'" class="settings-section">
          <div class="settings-section-title"><span>CONNECTED DEVICE</span><h3>设备管理</h3><p>查看当前连接身份，重新读取配置或执行维护操作。</p></div>
          <div class="settings-device-summary"><div class="settings-device-mark">A</div><div><small>当前设备</small><strong>{{ profile.device.productName }}</strong><span><i></i> 已连接 · {{ deviceModeLabel }}</span></div></div>
          <dl class="settings-device-details">
            <div><dt>固件版本</dt><dd>{{ profile.device.firmwareVersion }}</dd></div>
            <div><dt>协议版本</dt><dd>{{ profile.device.protocolVersion }}</dd></div>
            <div><dt>VID / PID</dt><dd>{{ formatHex(profile.device.vendorId) }} / {{ formatHex(profile.device.productId) }}</dd></div>
            <div><dt>序列号</dt><dd>{{ profile.device.serialNumber || '设备未提供' }}</dd></div>
            <div><dt>板卡 ID</dt><dd>{{ profile.device.boardId || '设备未提供' }}</dd></div>
            <div><dt>配置能力</dt><dd>{{ profile.capabilities.layers }} 层 · {{ profile.positions.length }} 键</dd></div>
          </dl>
          <div class="settings-action-card">
            <div><strong>重新读取设备配置</strong><p>丢弃网页中的临时状态，并从键盘重新读取当前配置。</p></div>
            <button class="settings-secondary-button" type="button" :disabled="busy" @click="emit('reload')">{{ busy ? '设备忙碌中' : '重新读取' }}</button>
          </div>
          <div v-if="profile.capabilities.restoreFactory" class="settings-action-card danger">
            <div><strong>恢复出厂设置</strong><p>清除全部改键、灯光、宏和配置数据，完成后需要重新连接键盘。</p></div>
            <div class="settings-danger-actions">
              <span v-if="resetConfirmationVisible">再次点击确认清除全部数据</span>
              <button class="factory-reset-button" type="button" :disabled="busy" @click="requestFactoryReset">{{ resetConfirmationVisible ? '确认恢复' : '恢复出厂设置' }}</button>
              <button v-if="resetConfirmationVisible" class="settings-cancel-button" type="button" @click="resetConfirmationVisible = false">取消</button>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'firmware'" class="settings-section">
          <div class="settings-section-title"><span>FIRMWARE UPDATE</span><h3>固件升级</h3><p>使用厂商提供的原始固件包。升级过程中请勿断开键盘或关闭页面。</p></div>
          <div class="firmware-version-card">
            <div><small>当前固件</small><strong>{{ profile.device.firmwareVersion }}</strong><span>{{ profile.device.productName }}</span></div>
            <span class="firmware-status" :class="{ available: firmwareUpdateSupported }">{{ firmwareUpdateSupported ? '支持网页升级' : '当前驱动未开放刷写' }}</span>
          </div>
          <div class="firmware-upload-card" :class="{ selected: firmwareFile }" @click="firmwareInput?.click()">
            <input ref="firmwareInput" type="file" accept=".bin,application/octet-stream" @change="selectFirmware" />
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5"/></svg>
            <div v-if="firmwareFile"><strong>{{ firmwareFile.name }}</strong><p>{{ formatFileSize(firmwareFile.size) }} · 已完成本地文件校验</p></div>
            <div v-else><strong>选择本地固件包</strong><p>点击选择厂商提供的 .bin 文件</p></div>
            <button type="button" tabindex="-1">{{ firmwareFile ? '重新选择' : '浏览文件' }}</button>
          </div>
          <p v-if="firmwareError" class="firmware-error" role="alert">{{ firmwareError }}</p>
          <div v-if="!firmwareUpdateSupported" class="firmware-unavailable"><strong>暂不能从网页写入此设备</strong><p>当前驱动还没有声明 Bootloader 传输能力。固件文件只在浏览器本地读取，不会上传或写入键盘；待设备协议适配完成后，此处会开放升级操作。</p></div>
          <div class="firmware-footer"><p>仅使用与当前型号、板卡完全匹配的官方固件。</p><button class="primary" type="button" :disabled="!firmwareFile || !firmwareUpdateSupported || busy">开始升级</button></div>
        </section>

        <section v-else class="settings-section">
          <div class="settings-section-title"><span>ABOUT ANXIU</span><h3>关于驱动</h3><p>ANXIU Keyboard Studio 通过浏览器 WebHID 与键盘直接通信。</p></div>
          <div class="settings-about-brand"><div class="settings-device-mark">A</div><div><strong>ANXIU</strong><span>KEYBOARD STUDIO</span></div><small>v0.1.0</small></div>
          <div class="settings-card about-copy"><strong>本地优先</strong><p>键位、灯光和固件文件均在当前浏览器与设备之间处理。此页面不会上传所选择的固件包。</p></div>
          <dl class="settings-device-details compact"><div><dt>连接方式</dt><dd>WebHID</dd></div><div><dt>当前协议</dt><dd>{{ profile.device.protocolVersion }}</dd></div><div><dt>浏览器要求</dt><dd>Chrome / Edge 89+</dd></div><div><dt>运行环境</dt><dd>HTTPS 或本机</dd></div></dl>
        </section>
      </div>
    </div>
  </section>
</template>
