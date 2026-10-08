<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import type { MousePresentation } from '@/ui/MousePresentation'
import { useDeviceStore } from '@/stores/mouse/deviceStore'
import { downloadMouseFirmware, readMouseFirmware } from '@/application/MouseFirmwareImage'
import { parseFirmwareVersion } from '@/domain/mouse/firmwareVersion'

const props = defineProps<{ resources?: MousePresentation['firmware'] }>()
const device = useDeviceStore()
const mode = ref<'online' | 'local'>('online')
const image = shallowRef<Uint8Array>()
const filename = ref(''), error = ref(''), loading = ref(false)
const fileInput = ref<HTMLInputElement>()
const supported = computed(() => !!device.session?.firmware && !device.identity?.demo)
const currentVersion = computed(() =>
  device.firmwareNeedsReconnect ? '--' : (device.config?.basic.firmwareVersion ?? '未报告'),
)
function versionNote(versionCode?: string) {
  if (device.firmwareNeedsReconnect) return '请重新连接鼠标后再读取当前固件版本。'
  if (!versionCode) return '此安装包未声明版本号，请自行确认是否需要更新。'
  const current = parseFirmwareVersion(currentVersion.value)
  const packaged = parseFirmwareVersion(versionCode)
  if (current === undefined || packaged === undefined)
    return '设备未报告固件版本，请自行确认是否需要更新。'
  return current < packaged
    ? `发现更新：设备 ${currentVersion.value}，安装包 ${versionCode}`
    : '设备固件不低于此安装包。'
}
const locked = computed(() => device.busy || loading.value || device.firmwareNeedsReconnect || !supported.value)
let selection = 0
let controller: AbortController | undefined
onBeforeUnmount(() => { selection++; controller?.abort() })

async function selectFile(event: Event) {
  if (locked.value) return
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const ticket = ++selection
  image.value = undefined
  error.value = ''
  loading.value = true
  try {
    const current = device.session
    const bytes = await readMouseFirmware(file, current!.firmware!)
    if (ticket !== selection || current !== device.session) return
    image.value = bytes
    filename.value = file.name
  } catch (cause) {
    if (ticket === selection) error.value = cause instanceof Error ? cause.message : '读取固件失败'
  } finally { if (ticket === selection) loading.value = false }
}

async function download() {
  if (locked.value || !props.resources?.online) return
  const current = device.session
  const ticket = ++selection
  const abort = new AbortController()
  controller = abort
  image.value = undefined
  error.value = ''
  loading.value = true
  try {
    const bytes = await downloadMouseFirmware(props.resources.online, current!.firmware!, abort.signal)
    if (ticket !== selection || device.session !== current) return
    image.value = bytes
    filename.value = props.resources.online.fileName
  } catch (cause) {
    if (ticket === selection) error.value = cause instanceof Error ? cause.message : '在线固件获取失败'
  } finally {
    if (controller === abort) controller = undefined
    if (ticket === selection) loading.value = false
  }
}
function start() {
  if (!locked.value && image.value) void device.updateFirmware(image.value)
}
</script>

<template>
  <section class="mouse-firmware" aria-label="鼠标固件更新">
    <h3>固件更新</h3>
    <p>当前固件 {{ currentVersion }}</p>
    <div class="firmware-mode-switch" role="group" aria-label="更新方式">
      <button class="ghost" :aria-pressed="mode === 'online'" :disabled="device.busy || loading" @click="mode = 'online'">在线更新</button>
      <button class="ghost" :aria-pressed="mode === 'local'" :disabled="device.busy || loading" @click="mode = 'local'">本地更新</button>
    </div>
    <template v-if="mode === 'online'">
      <p>通过浏览器写入鼠标固件。请使用 USB 有线连接，升级期间保持供电，不要拔线或刷新页面。</p>
      <p>{{ versionNote(resources?.online?.versionCode) }}</p>
      <p v-if="device.identity?.demo">演示模式不支持固件刷写。</p>
      <p v-else-if="!supported">请使用 USB 线连接鼠标后重新连接设备。</p>
      <div v-if="resources?.online" class="firmware-release">
        <div><small>可用固件</small><strong>{{ resources.online.version }}</strong></div>
        <button class="ghost" :disabled="locked" @click="download">{{ loading ? '正在获取…' : '获取在线固件' }}</button>
      </div>
      <p v-else>暂未配置此鼠标的在线固件下载源，可选择官方 BIN 文件进行网页更新。</p>
      <input ref="fileInput" type="file" accept=".bin" hidden :disabled="locked" aria-label="选择鼠标固件" @change="selectFile" />
      <div class="mouse-toolbar firmware-file-actions">
        <button class="ghost" :disabled="locked" @click="fileInput?.click()">选择 BIN 固件</button>
        <span class="firmware-filename">{{ filename || '尚未选择固件' }}</span>
        <button class="primary" :disabled="locked || !image" @click="start">开始网页更新</button>
      </div>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-if="device.firmwareState === 'selecting'" role="status">请选择此鼠标的 USB 固件接口。</p>
      <div v-if="device.firmwareState === 'updating'" role="status">
        <p>正在传输固件 {{ device.firmwareProgress }}%</p>
        <progress :value="device.firmwareProgress" max="100" aria-label="鼠标固件更新进度" />
      </div>
      <p v-if="device.firmwareState === 'sent'" role="status">固件已发送。请断开并重新连接鼠标，确认固件安装结果。</p>
      <p v-else-if="device.firmwareState === 'failed'" role="alert">更新未完成。{{ device.firmwareNeedsReconnect ? '请断开并重新连接鼠标后再试。' : '请检查文件与 USB 接口后重试。' }}</p>
    </template>
    <template v-else>
      <p>下载 Windows 更新工具，断开网页设备连接后在本机运行，按提示完成升级。</p>
      <p>{{ versionNote(resources?.executable?.versionCode) }}</p>
      <template v-if="resources?.executable">
        <div class="firmware-release"><div><small>Windows 更新工具 · EXE</small><strong>{{ resources.executable.version }}</strong><span class="firmware-filename">{{ resources.executable.fileName }}</span></div></div>
        <a class="firmware-download" :href="resources.executable.url" :download="resources.executable.fileName" target="_blank" rel="noopener noreferrer">下载本地更新工具 ↗</a>
      </template>
      <p v-else>暂未提供此鼠标的本地更新工具。</p>
    </template>
  </section>
</template>

<style scoped>
.mouse-firmware { min-width: 0; }
.mouse-firmware h3 { margin: 0; font-size: 16px; }
.mouse-firmware p { line-height: 1.7; font-size: 13px; color: var(--text-secondary, #97a4b4); }
.firmware-mode-switch { display: flex; padding: 4px; gap: 4px; background: var(--surface-control, #171d27); border-radius: 10px; border: 1px solid var(--border-subtle, #28303b); }
.firmware-mode-switch .ghost { flex: 1; border: 1px solid transparent; border-radius: 7px; padding: 10px 14px; }
.firmware-mode-switch .ghost[aria-pressed='true'] { background: var(--panel, #11151d); border-color: var(--border-subtle, #28303b); color: var(--cyan); }
.firmware-release { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; padding: 16px; margin: 18px 0; border: 1px solid var(--border-subtle, #28303b); border-radius: 10px; }
.firmware-release > div { display: grid; gap: 8px; min-width: 0; }
.firmware-release small { color: var(--text-secondary, #97a4b4); font-size: 12px; }
.firmware-release strong { font-size: 14px; }
.firmware-filename { overflow-wrap: anywhere; font-size: 12px; color: var(--text-secondary, #97a4b4); }
.firmware-file-actions .firmware-filename { flex: 1; min-width: 120px; }
.firmware-file-actions .primary { margin-left: auto; }
.firmware-download { display: inline-flex; justify-content: center; width: 100%; box-sizing: border-box; padding: 12px 18px; border: 1px solid var(--cyan); border-radius: 8px; text-decoration: none; font-size: 14px; }
.mouse-firmware .mouse-toolbar { flex-wrap: wrap; }
.mouse-firmware [aria-pressed='true'] { border-color: var(--cyan); color: var(--cyan); }
.mouse-firmware progress { width: 100%; accent-color: var(--cyan); }
.mouse-firmware a { color: var(--cyan); }
.mouse-firmware [role='alert'] { color: #d76161; }
.firmware-mode-switch { margin-top: 18px; margin-bottom: 16px; }
.mouse-firmware p { margin: 12px 0; }
@media (max-width: 600px) { .firmware-file-actions .primary { width: 100%; } }
</style>
