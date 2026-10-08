<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CB75Home from './components/rk_cb75/home.vue'
import keyboardImage from './assets/images/keyboard_rk-cb75.png'
import { keyboard, RK_DONGLE_EVENT_DEFINE } from './keyboard/beiying/keyboard'
import { RK_CB75_USB_DEFINE, RK_CB75_DONGLE_DEFINE } from './keyboard/beiying/rk_cb75'
import { ConnectionEventEnum, ConnectionStatusEnum, ConnectionType } from './device/enum'
import type { KeyboardDefine } from './keyboard/beiying/interface'
import type { HidDeviceDefine } from './device/interface'

const ready = ref(false)
const connecting = ref(false)
const error = ref('')
const theme = ref<'light' | 'dark'>(
  localStorage.getItem('anxiu-theme') === 'light' ? 'light' : 'dark',
)

watch(theme, (value) => {
  document.documentElement.dataset.theme = value
  document.documentElement.style.colorScheme = value
  localStorage.setItem('anxiu-theme', value)
}, { immediate: true })

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

const definitions = [RK_CB75_USB_DEFINE, RK_CB75_DONGLE_DEFINE]
const filters = definitions.map(({ vendorId, productId }) => ({ vendorId, productId }))

function matchingDefinition(device: HIDDevice): KeyboardDefine | undefined {
  return definitions.find((definition) =>
    definition.vendorId === device.vendorId &&
    definition.productId === device.productId &&
    device.collections.some((collection) =>
      collection.usagePage === definition.usagePage && collection.usage === definition.usage))
}

async function initializeProtocol(definition: KeyboardDefine) {
  if (!keyboard.device) throw new Error('设备连接已断开')
  keyboard.keyboardDefine = definition
  keyboard.protocol = await definition.protocol(keyboard.state, keyboard.device)
  keyboard.loadDefaultValue(keyboard.state.keyTableData, keyboard.state.lightInfo)
  await keyboard.protocol.init()
  ready.value = true
}

async function handlePassword(event: Event) {
  const password = (event as CustomEvent<number>).detail
  if (password !== 0x0300055b || !keyboard.device) {
    error.value = '接收器连接的不是 CB75 Keyboard'
    return
  }
  try {
    keyboard.device.removeEventListener('inputreport', keyboard.callback)
    await initializeProtocol(RK_CB75_DONGLE_DEFINE)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
}

function handleDongleStatus(event: Event) {
  if ((event as CustomEvent<ConnectionStatusEnum>).detail === ConnectionStatusEnum.Disconnected) ready.value = false
}

async function connect() {
  if (connecting.value || !navigator.hid) return
  connecting.value = true
  error.value = ''
  try {
    const [device] = await navigator.hid.requestDevice({ filters })
    if (!device) return
    await attach(device)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
    ready.value = false
    try { await keyboard.close() } catch { /* Show the original error. */ }
  } finally {
    connecting.value = false
  }
}

async function attach(device: HIDDevice) {
    const definition = matchingDefinition(device)
    if (!definition) throw new Error('请选择 CB75 Keyboard 的可编程 HID 接口')
    keyboard.device = device
    await keyboard.init(definition as HidDeviceDefine)
    if (definition.connectType === ConnectionType.Dongle) {
      keyboard.removeEventListener(RK_DONGLE_EVENT_DEFINE.OnPasswordGotten, handlePassword)
      keyboard.removeEventListener(RK_DONGLE_EVENT_DEFINE.OnDongleStatusChanged, handleDongleStatus)
      keyboard.addEventListener(RK_DONGLE_EVENT_DEFINE.OnPasswordGotten, handlePassword)
      keyboard.addEventListener(RK_DONGLE_EVENT_DEFINE.OnDongleStatusChanged, handleDongleStatus)
      device.addEventListener('inputreport', keyboard.callback)
      await keyboard.getDongleStatus()
    } else {
      await initializeProtocol(definition)
    }
}

function handleConnection() {
  if (keyboard.state.connectionEvent === ConnectionEventEnum.Close ||
      keyboard.state.connectionEvent === ConnectionEventEnum.Disconnect) ready.value = false
}

function handleHidDisconnect(event: HIDConnectionEvent) {
  if (event.device === keyboard.device) ready.value = false
}

onMounted(async () => {
  keyboard.addEventListener('connection', handleConnection)
  navigator.hid?.addEventListener('disconnect', handleHidDisconnect)
  // A permission granted on this origin survives a refresh. Restore the paired device
  // so responsive layout changes and theme switches do not require the chooser again.
  sessionStorage.removeItem('anxiu:cb75:auto-connect')
  const productId = Number(sessionStorage.getItem('anxiu:cb75:product-id'))
  sessionStorage.removeItem('anxiu:cb75:product-id')
  if (!navigator.hid) return
  try {
    const devices = await navigator.hid.getDevices()
    const device = devices.find((candidate) =>
      matchingDefinition(candidate) && (!productId || candidate.productId === productId))
    if (!device) return
    connecting.value = true
    await attach(device)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    connecting.value = false
  }
})

onBeforeUnmount(() => {
  keyboard.removeEventListener('connection', handleConnection)
  navigator.hid?.removeEventListener('disconnect', handleHidDisconnect)
  keyboard.removeEventListener(RK_DONGLE_EVENT_DEFINE.OnPasswordGotten, handlePassword)
  keyboard.removeEventListener(RK_DONGLE_EVENT_DEFINE.OnDongleStatusChanged, handleDongleStatus)
  void keyboard.close()
})
</script>

<template>
  <div class="rk-cb75-app">
    <header class="rk-cb75-header">
      <a class="rk-cb75-brand" href="/" aria-label="返回 Anxiu 设备中心">
        <span class="rk-cb75-brand-mark" aria-hidden="true">A</span>
        <span class="rk-cb75-brand-name"><strong>ANXIU</strong><small>DEVICE STUDIO</small></span>
      </a>
      <div class="rk-cb75-header-title">
        <strong>CB75 Keyboard</strong>
        <small>设备设置</small>
      </div>
      <div class="rk-cb75-header-actions">
        <span class="rk-cb75-status" :class="{ ready, connecting, error: !!error }" role="status">
          <i aria-hidden="true"></i>
          {{ ready ? '已连接' : connecting ? '连接中' : error ? '连接失败' : '未连接' }}
        </span>
        <button
          class="rk-cb75-theme-toggle"
          type="button"
          :aria-label="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
          :title="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.4 15.1A8.5 8.5 0 0 1 8.9 3.6 8.5 8.5 0 1 0 20.4 15.1Z" />
          </svg>
          <span>{{ theme === 'dark' ? '浅色' : '深色' }}</span>
        </button>
        <button v-if="!ready" class="rk-cb75-connect" type="button" :disabled="connecting" @click="connect">
          {{ connecting ? '连接中…' : '连接 CB75' }}
        </button>
      </div>
    </header>
    <main v-if="ready" class="rk-cb75-content"><CB75Home /></main>
    <main v-else class="rk-cb75-intro">
      <div class="rk-cb75-intro-copy">
        <span class="rk-cb75-eyebrow">ANXIU DEVICE STUDIO</span>
        <h1>CB75 <em>Keyboard</em></h1>
        <p>连接键盘，管理按键、灯效、宏、配置和固件。</p>
        <button class="rk-cb75-connect rk-cb75-connect-large" type="button" :disabled="connecting" @click="connect">
          {{ connecting ? '连接中…' : '连接 CB75' }}<b aria-hidden="true">↗</b>
        </button>
        <p v-if="error" role="alert" class="rk-cb75-error">{{ error }}</p>
        <small class="rk-cb75-requirements">需要支持 WebHID 的浏览器 · USB 或 2.4G 接收器</small>
      </div>
      <div class="rk-cb75-intro-visual" aria-hidden="true">
        <div class="rk-cb75-intro-orb"></div>
        <img :src="keyboardImage" alt="" />
      </div>
    </main>
  </div>
</template>
