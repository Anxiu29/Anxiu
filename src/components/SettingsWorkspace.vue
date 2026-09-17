<script setup lang="ts">
import { computed, ref } from 'vue'
import FirmwareSettings from './FirmwareSettings.vue'
import type { KeyboardProfile } from '@/domain/keyboard'
import type { AppTheme } from '@/ui/theme'
import type { FirmwareDownload } from '@/ui/DevicePresentation'
import type { FirmwareProgress } from '@/application/FirmwareUpdate'

type SettingsSection = 'appearance' | 'device' | 'firmware' | 'about'

const props = withDefaults(defineProps<{
  profile: KeyboardProfile
  theme?: AppTheme
  busy?: boolean
  firmwareDownload?: FirmwareDownload
  canUpgradeFirmware?: boolean
  firmwareProgress?: FirmwareProgress
  firmwareLogAvailable?: boolean
}>(), { theme: 'dark', busy: false })

const emit = defineEmits<{
  reload: []
  'restore-factory': []
  'update:theme': [theme: AppTheme]
  'upgrade-firmware': [file?: File]
  'authorize-firmware': []
  'cancel-firmware-authorization': []
  'export-firmware-log': []
}>()

const activeSection = ref<SettingsSection>(props.profile.device.runMode === 'boot' ? 'firmware' : 'appearance')
const resetConfirmationVisible = ref(false)
const deviceModeLabel = computed(() => ({ app: '应用模式', boot: 'Bootloader', unknown: '未知模式' })[props.profile.device.runMode])
const formatHex = (value: number) => `0x${value.toString(16).toUpperCase().padStart(4, '0')}`
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
          <span><strong>固件升级</strong><small>在线更新与本地升级</small></span>
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



        <section v-else-if="activeSection === 'about'" class="settings-section">
          <div class="settings-section-title"><span>ABOUT ANXIU</span><h3>关于驱动</h3><p>ANXIU Keyboard Studio 通过浏览器 WebHID 与键盘直接通信。</p></div>
          <div class="settings-about-brand"><div class="settings-device-mark">A</div><div><strong>ANXIU</strong><span>KEYBOARD STUDIO</span></div><small>v0.1.0</small></div>
          <div class="settings-card about-copy"><strong>本地优先</strong><p>键位、灯光和固件文件均在当前浏览器与设备之间处理。此页面不会上传所选择的固件包。</p></div>
          <dl class="settings-device-details compact"><div><dt>连接方式</dt><dd>WebHID</dd></div><div><dt>当前协议</dt><dd>{{ profile.device.protocolVersion }}</dd></div><div><dt>浏览器要求</dt><dd>Chrome / Edge 89+</dd></div><div><dt>运行环境</dt><dd>HTTPS 或本机</dd></div></dl>
        </section>
        <!-- KeepAlive 保留设置分栏切换前升级确认状态，与拆分前一致。 -->
        <KeepAlive>
          <FirmwareSettings
            v-if="activeSection === 'firmware'"
            :profile="profile"
            :busy="busy"
            :firmware-download="firmwareDownload"
            :can-upgrade-firmware="canUpgradeFirmware"
            :firmware-progress="firmwareProgress"
            :firmware-log-available="firmwareLogAvailable"
            @export-firmware-log="emit('export-firmware-log')"
            @upgrade-firmware="emit('upgrade-firmware', $event)"
            @authorize-firmware="emit('authorize-firmware')"
            @cancel-firmware-authorization="emit('cancel-firmware-authorization')"
          />
        </KeepAlive>
      </div>
    </div>
  </section>
</template>
