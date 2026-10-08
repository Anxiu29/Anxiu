<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import {
  deviceService,
  deviceDriverRegistry,
  demoDevices,
  keyboardDriverService,
  getMousePresentation,
  getDevicePresentation,
  useDriverStore,
} from '@/composition/root'
import AppShell from '@/components/AppShell.vue'
import DemoDevicePicker from '@/components/DemoDevicePicker.vue'
import DeviceOverview from '@/components/DeviceOverview.vue'
import { useTheme } from '@/ui/theme'
import { useDeviceStore as useMouseDeviceStore } from '@/stores/mouse/deviceStore'
import type { MouseSession } from '@/application/MouseSession'
import type { AuthorizedDevice } from '@/application/DeviceService'
import { downloadText } from '@/ui/downloadText'

const KeymapWorkspace = defineAsyncComponent(() => import('@/components/KeymapWorkspace.vue'))
const LightingWorkspace = defineAsyncComponent(() => import('@/components/LightingWorkspace.vue'))
const AdvancedKeyWorkspace = defineAsyncComponent(
  () => import('@/components/AdvancedKeyWorkspace.vue'),
)
const PerformanceWorkspace = defineAsyncComponent(
  () => import('@/components/PerformanceWorkspace.vue'),
)
const KeyTestWorkspace = defineAsyncComponent(() => import('@/components/KeyTestWorkspace.vue'))
const MacroWorkspace = defineAsyncComponent(() => import('@/components/MacroWorkspace.vue'))

const MouseWorkspace = defineAsyncComponent(() => import('@/components/mouse/MouseWorkspace.vue'))
const mouseStore = useMouseDeviceStore()
const mouseSession = shallowRef<MouseSession>()
const mouseDriverId = ref('')
const demoPicker = ref(false)
const availableDemoDevices = demoDevices
const activeDemo = computed(() =>
  mouseSession.value ? !!mouseSession.value.identity.demo : !!profile.value && demo.value,
)
async function startDemo(id: string) {
  if (busy() || !confirmDiscard()) return
  const driver = deviceDriverRegistry.get(id)
  if (!driver.createDemoSession) return
  demoPicker.value = false
  if (driver.manifest.kind === 'keyboard') {
    await connect(true, id)
    return
  }
  connecting.value = true
  connectionError.value = ''
  try {
    syncKeyboardSession()
    await deviceService.disconnect()
    clearSession()
    const session = driver.createDemoSession()
    if (session.kind !== 'mouse') throw new Error('演示设备类型不匹配')
    deviceService.adopt(session)
    if (!(await mouseStore.attach(session))) throw new Error(mouseStore.error || '演示加载失败')
    mouseSession.value = session
    mouseDriverId.value = id
    authorizedChoices.value = []
    shellRevision.value++
  } catch (cause) {
    await deviceService.disconnect()
    clearSession()
    connectionError.value = cause instanceof Error ? cause.message : '演示加载失败'
  } finally {
    connecting.value = false
  }
}
let disposed = false
// 固件升级会重建键盘会话，切换前同步最新连接所有权。
function syncKeyboardSession() {
  if (!mouseSession.value && keyboardDriverService.session)
    deviceService.adopt(keyboardDriverService.session)
}
const connecting = ref(false),
  connectionError = ref('')
const authorizedChoices = shallowRef<AuthorizedDevice[]>([])
const mousePresentation = computed(() =>
  mouseDriverId.value ? getMousePresentation(mouseDriverId.value) : undefined,
)
const store = useDriverStore()
const { theme, setTheme, toggleTheme } = useTheme()
// storeToRefs 保留 Pinia 响应性；操作方法仍直接通过 store 调用。
const {
  status: keyboardStatus,
  profile,
  layer,
  mode,
  activeConfiguration,
  selectedPositionId,
  error: keyboardError,
  message,
  messageWarning,
  dirty: keyboardDirty,
  assignments,
  selectedAssignment,
  keyOptions,
  keyLabels,
  lighting,
  customLighting,
  customLightingLoading,
  advancedKey,
  advancedKeyLoading,
  advancedKeyTypes,
  performanceSettings,
  performanceLoading,
  performanceBySourceCode,
  performanceMapLoading,
  pollingRate,
  travelMatrix,
  travelReading,
  calibrationActive,
  macroSlots,
  selectedMacroSlot,
  macroLoading,
  demo,
  driverId,
} = storeToRefs(store)
// 当前驱动决定设备表现；共享 App 不包含型号名称、图片或配列判断。
const devicePresentation = computed(() => getDevicePresentation(driverId.value))
// 切换真机/演示或重新连接时重建工作区壳，清理旧页面内部的导航与弹窗状态。
const shellRevision = ref(0)
const labels: Record<string, string> = {
  idle: '待连接',
  connecting: '连接中',
  reading: '读取中',
  ready: '已就绪',
  writing: '写入中',
  disconnected: '已断开',
  error: '发生错误',
  unsupported: '不支持',
}
const status = computed(() =>
  connecting.value
    ? 'connecting'
    : mouseSession.value
      ? mouseStore.busy
        ? 'writing'
        : 'ready'
      : keyboardStatus.value,
)
const error = computed(
  () => connectionError.value || (mouseSession.value ? mouseStore.error : keyboardError.value),
)
const dirty = computed(() => keyboardDirty.value || mouseStore.dirty)
const busy = () =>
  connecting.value ||
  store.firmwareUpdating ||
  mouseStore.busy ||
  ['connecting', 'reading', 'writing'].includes(keyboardStatus.value)
const confirmDiscard = () =>
  !dirty.value || window.confirm('当前设备有未保存修改，确定放弃并切换吗？')
function clearSession() {
  store.detachSession()
  mouseStore.reset()
  mouseSession.value = undefined
  mouseDriverId.value = ''
}
async function disconnect() {
  if (busy() || !confirmDiscard()) return
  syncKeyboardSession()
  await deviceService.disconnect()
  clearSession()
}
async function navigateToRKCB75(device: HIDDevice, path: string) {
  syncKeyboardSession()
  await deviceService.disconnect()
  clearSession()
  sessionStorage.setItem('anxiu:cb75:auto-connect', '1')
  sessionStorage.setItem('anxiu:cb75:product-id', String(device.productId))
  window.location.assign(path)
}
async function activate(device: HIDDevice) {
  const external = deviceService.externalMatch(device)
  if (external) {
    await navigateToRKCB75(device, external.path)
    return
  }
  syncKeyboardSession()
  const result = await deviceService.connect(device, () => {
    if (profile.value && !mouseSession.value) {
      // 保留键盘既有的拔出草稿和固件升级保护语义。
      store.handleDeviceDisconnect()
      return
    }
    clearSession()
    connectionError.value = '设备已断开'
  })
  clearSession()
  try {
    if (result.session.kind === 'keyboard')
      await store.adoptSession(result.session, result.driverId)
    else {
      if (!(await mouseStore.attach(result.session)))
        throw new Error(mouseStore.error || '读取鼠标失败')
      mouseSession.value = result.session
      mouseDriverId.value = result.driverId
    }
    authorizedChoices.value = []
    shellRevision.value++
  } catch (cause) {
    await deviceService.disconnect()
    clearSession()
    throw cause
  }
}
async function chooseAuthorized(device: HIDDevice) {
  if (busy() || !confirmDiscard()) return
  connecting.value = true
  connectionError.value = ''
  try {
    await activate(device)
  } catch (cause) {
    await deviceService.disconnect()
    clearSession()
    connectionError.value = cause instanceof Error ? cause.message : '连接失败'
  } finally {
    connecting.value = false
  }
}
async function connect(useDemo = false, driverId?: string) {
  if (busy()) return
  connecting.value = true
  connectionError.value = ''
  try {
    if (useDemo) {
      if (!confirmDiscard()) return
      syncKeyboardSession()
      await deviceService.disconnect()
      clearSession()
      await store.connect(useDemo, driverId)
      if (keyboardDriverService.session) deviceService.adopt(keyboardDriverService.session)
      shellRevision.value++
    } else {
      const devices = await deviceService.request()
      if (disposed || !devices[0] || !confirmDiscard()) return
      await activate(devices[0])
    }
  } catch (cause) {
    // 取消浏览器授权不破坏原会话；初始化失败才清理新连接。
    connectionError.value = cause instanceof Error ? cause.message : '连接失败'
    if (!deviceService.session) clearSession()
  } finally {
    connecting.value = false
  }
}
async function loadAuthorizedDevices() {
  if (profile.value) {
    if (keyboardDriverService.session) deviceService.adopt(keyboardDriverService.session)
    return
  }
  try {
    const choices = await deviceService.authorized()
    if (disposed || connecting.value || deviceService.session) return
    authorizedChoices.value = choices
  } catch (cause) {
    connectionError.value = cause instanceof Error ? cause.message : '读取授权设备失败'
  }
}
const prepareWorkspace = (view: string) => {
  if (view === 'advanced' || view === 'performance') selectedPositionId.value = undefined
}
// 未保存草稿及尚未结束的固件升级需要关闭保护。
const beforeUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value || store.firmwareUpdating || mouseStore.firmwareUpdating) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  void loadAuthorizedDevices()
})
onBeforeUnmount(() => {
  disposed = true
  syncKeyboardSession()
  window.removeEventListener('beforeunload', beforeUnload)
  void deviceService.disconnect()
})
</script>

<template>
  <main>
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">A</span>
        <div>
          <strong>ANXIU</strong>
          <small>DEVICE STUDIO</small>
        </div>
      </div>
      <div class="top-actions">
        <span class="status-pill" :class="mouseStore.firmwareNeedsReconnect ? 'reconnect' : status">
          <i></i>
          {{ mouseStore.firmwareNeedsReconnect ? '需重新连接' : activeDemo ? '演示模式' : labels[status] }}
        </span>
        <button
          class="ghost theme-toggle"
          type="button"
          :aria-label="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
          :title="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path
              d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.4 15.1A8.5 8.5 0 0 1 8.9 3.6 8.5 8.5 0 1 0 20.4 15.1Z" />
          </svg>
          <span>{{ theme === 'dark' ? '浅色' : '深色' }}</span>
        </button>
        <button class="ghost" :disabled="busy()" @click="demoPicker = true">演示模式</button>
        <button v-if="activeDemo" class="ghost" :disabled="busy()" @click="disconnect">
          退出演示
        </button>
        <button class="primary" :disabled="busy()" @click="connect(false)">
          {{ profile || mouseSession ? '切换设备' : '连接设备' }}
        </button>
      </div>
    </header>
    <DemoDevicePicker
      v-if="demoPicker"
      :devices="availableDemoDevices"
      @select="startDemo"
      @close="demoPicker = false"
    />

    <div
      v-if="connectionError && (profile || mouseSession)"
      class="notice error connection-error"
      role="alert"
    >
      {{ connectionError }}
    </div>
    <MouseWorkspace
      v-if="mouseSession && mousePresentation"
      :key="shellRevision"
      :presentation="mousePresentation"
      :connecting="connecting"
      :theme="theme"
      @update:theme="setTheme"
      @disconnect="disconnect"
    />
    <section v-else-if="!profile" class="hero">
      <div class="hero-orb"></div>
      <span class="eyebrow">WEBHID · KEYBOARD / MOUSE</span>
      <h1>
        把每一次触发，
        <br />
        <em>调成你的手感。</em>
      </h1>
      <p>连接键盘或鼠标，自动识别设备并调整按键、灯光与性能。配置写入后会自动回读验证。</p>
      <div class="hero-actions">
        <button class="primary large" :disabled="busy()" @click="connect(false)">
          连接我的设备
        </button>
        <button class="text-button" :disabled="busy()" @click="demoPicker = true">
          没有设备？体验演示
        </button>
      </div>
      <div v-if="authorizedChoices.length" class="authorized-devices">
        <p>发现已授权设备，请点击连接本次要管理的设备。</p>
        <button
          v-for="(choice, index) in authorizedChoices"
          :key="index"
          class="ghost"
          :disabled="busy()"
          @click="chooseAuthorized(choice.device)"
        >
          {{ choice.name }} · {{ choice.device.productName }} · {{ index + 1 }}
        </button>
      </div>
      <div class="requirements">
        <span>● Chrome 89+</span>
        <span>● Edge 89+</span>
        <span>● USB HID</span>
        <span>● HTTPS</span>
      </div>
      <div v-if="error || message" class="notice" :class="{ error }">{{ error || message }}</div>
    </section>

    <AppShell
      v-else
      :firmware-log-available="store.firmwareLogAvailable"
      @export-firmware-log="downloadText(store.exportFirmwareLog(), 'firmware-diagnostics.json')"
      :can-upgrade-firmware="store.canUpgradeFirmware"
      :firmware-progress="store.firmwareProgress"
      @upgrade-firmware="store.upgradeFirmware"
      @authorize-firmware="store.authorizeFirmwareDevice"
      @cancel-firmware-authorization="store.cancelFirmwareAuthorization"
      :key="shellRevision"
      :profile="profile"
      :active-configuration="activeConfiguration"
      :navigation-disabled="busy()"
      :error="error"
      :message="message"
      :message-warning="messageWarning"
      :sidebar-image-url="devicePresentation.sidebarImageUrl"
      :firmware-download="devicePresentation.firmwareDownload"
      :theme="theme"
      @update:theme="setTheme"
      @navigate="prepareWorkspace"
      @select-configuration="store.selectConfiguration"
      @reload="store.reload"
      @restore-factory="store.restoreFactory"
    >
      <template #device="{ openKeymap }">
        <DeviceOverview
          :profile="profile"
          :busy="busy()"
          :image-url="devicePresentation.overviewImageUrl"
          :image-alt="devicePresentation.overviewImageAlt"
          :solution-name="devicePresentation.solutionName"
          @reload="store.reload"
          @open-keymap="openKeymap"
        />
      </template>
      <template #keymap>
        <KeymapWorkspace
          :profile="profile"
          :status="status"
          :layer="layer"
          :mode="mode"
          :active-configuration="activeConfiguration"
          :selected-position-id="selectedPositionId"
          :dirty="dirty"
          :assignments="assignments"
          :selected-assignment="selectedAssignment"
          :key-options="keyOptions"
          :extended-key-codes="devicePresentation.extendedKeyCodes"
          :key-labels="keyLabels"
          :key-geometry="devicePresentation.keyGeometry"
          @select-layer="store.selectLayer"
          @select-mode="store.selectMode"
          @select-configuration="store.selectConfiguration"
          @select-position="selectedPositionId = $event"
          @assign-key="store.assignKey"
        />
      </template>
      <template #lighting>
        <LightingWorkspace
          :settings="lighting"
          :custom-lighting="customLighting"
          :custom-lighting-loading="customLightingLoading"
          :status="status"
          :profile="profile"
          :assignments="assignments"
          :key-labels="keyLabels"
          :key-geometry="devicePresentation.keyGeometry"
          :lighting-modes="devicePresentation.lightingModes"
          :lighting-ranges="devicePresentation.lightingRanges"
          @update="store.updateLighting"
          @reload="store.reloadLighting"
          @load-custom="store.loadCustomLighting"
          @update-custom="store.updateCustomLighting"
        />
      </template>
      <template #advanced>
        <AdvancedKeyWorkspace
          :profile="profile"
          :status="status"
          :selected-position-id="selectedPositionId"
          :settings="advancedKey"
          :loading="advancedKeyLoading"
          :advanced-key-types="advancedKeyTypes"
          :assignments="assignments"
          :key-options="keyOptions"
          :key-labels="keyLabels"
          :key-geometry="devicePresentation.keyGeometry"
          @select-position="selectedPositionId = $event"
          @load="store.loadAdvancedKey"
          @load-all="store.loadAdvancedKeyTypes"
          @update="store.updateAdvancedKey"
          @delete="store.deleteAdvancedKey"
        />
      </template>
      <template #performance>
        <PerformanceWorkspace
          :profile="profile"
          :status="status"
          :selected-position-id="selectedPositionId"
          :settings="performanceSettings"
          :settings-by-source-code="performanceBySourceCode"
          :loading="performanceLoading"
          :map-loading="performanceMapLoading"
          :polling-rate="pollingRate"
          :travel-matrix="travelMatrix"
          :travel-reading="travelReading"
          :calibration-active="calibrationActive"
          :assignments="assignments"
          :key-labels="keyLabels"
          :key-geometry="devicePresentation.keyGeometry"
          @select-position="selectedPositionId = $event"
          @load="store.loadPerformance"
          @load-all="store.loadPerformanceMap"
          @update="store.updatePerformance"
          @update-many="store.updatePerformances"
          @load-polling-rate="store.loadPollingRate"
          @update-polling-rate="store.updatePollingRate"
          @read-travel="store.readTravelMatrix"
          @start-calibration="store.startCalibration"
          @finish-calibration="store.finishCalibration"
        />
      </template>
      <template #macro>
        <MacroWorkspace
          :profile="profile"
          :status="status"
          :selected-slot="selectedMacroSlot"
          :macro-slots="macroSlots"
          :loading="macroLoading"
          :assignments="assignments"
          :key-options="keyOptions"
          :key-labels="keyLabels"
          :extended-key-codes="devicePresentation.extendedKeyCodes"
          :key-geometry="devicePresentation.keyGeometry"
          @select-slot="store.selectMacroSlot"
          @load="store.loadMacrosFromDevice"
          @clear="store.deleteMacro"
          @update="store.updateMacro"
        />
      </template>
      <template #key-test>
        <KeyTestWorkspace
          :profile="profile"
          :assignments="assignments"
          :key-labels="keyLabels"
          :key-geometry="devicePresentation.keyGeometry"
        />
      </template>
    </AppShell>
  </main>
</template>

<style scoped>
.connection-error {
  position: fixed;
  top: 64px;
  right: 20px;
  max-width: min(480px, calc(100vw - 40px));
  z-index: 20;
}
</style>
