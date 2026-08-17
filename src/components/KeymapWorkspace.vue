<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { KeyboardMode, KeyAssignment, KeyDefinition, KeyboardProfile, SessionStatus } from '@/domain/keyboard'
import KeyboardCanvas from '@/components/KeyboardCanvas.vue'
import KeyPicker from '@/components/KeyPicker.vue'

const props = defineProps<{
  profile: KeyboardProfile
  status: SessionStatus
  layer: number
  mode: KeyboardMode
  selectedPositionId?: string
  dirty: boolean
  assignments: KeyAssignment[]
  selectedAssignment?: KeyAssignment
  keyOptions: readonly KeyDefinition[]
  keyLabels: Record<number, string>
}>()

const emit = defineEmits<{
  'select-layer': [layer: number]
  'select-mode': [mode: KeyboardMode]
  'select-position': [positionId: string]
  'assign-key': [keyCode: number]
  'restore-defaults': []
  'restore-key': [positionId: string, layer: number]
}>()

const viewportWidth = ref(window.innerWidth)
const keyContextMenu = ref<{ positionId: string; layer: number; x: number; y: number }>()
const keyboardUnit = computed(() => viewportWidth.value <= 1200 ? 38 : viewportWidth.value <= 1500 ? 53 : 58)
const layerDefaults = computed(() => props.profile.defaultAssignments.filter((item) => item.layer === props.layer))
const busy = () => ['connecting', 'reading', 'writing'].includes(props.status)
const remapDisabled = () => busy() || props.status === 'disconnected' || props.status === 'unsupported'
const updateViewportWidth = () => { viewportWidth.value = window.innerWidth }
const closeKeyContextMenu = () => { keyContextMenu.value = undefined }
const openKeyContextMenu = (payload: { positionId: string; clientX: number; clientY: number }) => {
  if (remapDisabled()) return
  emit('select-position', payload.positionId)
  keyContextMenu.value = {
    positionId: payload.positionId,
    layer: props.layer,
    x: Math.max(8, Math.min(payload.clientX, window.innerWidth - 156)),
    y: Math.max(8, Math.min(payload.clientY, window.innerHeight - 52)),
  }
}
const restoreContextKey = () => {
  if (!keyContextMenu.value || remapDisabled()) return
  emit('restore-key', keyContextMenu.value.positionId, keyContextMenu.value.layer)
  closeKeyContextMenu()
}
const selectLayer = (targetLayer: number) => {
  closeKeyContextMenu()
  emit('select-layer', targetLayer)
}
const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeKeyContextMenu() }
const confirmRestoreAllKeys = () => {
  const confirmed = window.confirm('这会把全部层的按键映射恢复为设备默认值并立即写入键盘。灯光等其他设置不会改变，是否继续？')
  if (confirmed) emit('restore-defaults')
}
onMounted(() => {
  window.addEventListener('resize', updateViewportWidth)
  window.addEventListener('resize', closeKeyContextMenu)
  window.addEventListener('click', closeKeyContextMenu)
  window.addEventListener('keydown', closeOnEscape)
  window.addEventListener('scroll', closeKeyContextMenu, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportWidth)
  window.removeEventListener('resize', closeKeyContextMenu)
  window.removeEventListener('click', closeKeyContextMenu)
  window.removeEventListener('keydown', closeOnEscape)
  window.removeEventListener('scroll', closeKeyContextMenu, true)
})
</script>

<template>
  <div class="keymap-workspace">
    <section class="editor panel compact-keymap-editor">
      <div class="current-keyboard-pane">
        <KeyboardCanvas :positions="profile.positions" :assignments="assignments" :default-assignments="layerDefaults" :key-labels="keyLabels" :selected="selectedPositionId" :unit="keyboardUnit" @select="emit('select-position', $event)" @contextmenu="openKeyContextMenu" />
      </div>

      <aside class="keymap-side-controls">
        <div><span class="eyebrow">KEYMAP</span><h2>改键设置</h2></div>
        <div class="side-control-group"><small>系统模式</small><div class="layer-tabs side-layer-tabs"><button :class="{ active: mode === 'win' }" :disabled="busy()" @click="emit('select-mode', 'win')">WIN</button><button :class="{ active: mode === 'mac' }" :disabled="busy()" @click="emit('select-mode', 'mac')">MAC</button></div></div>
        <div class="side-control-group"><small>{{ mode === 'mac' ? 'Mac 键盘层级' : '键盘层级' }}</small><div class="layer-tabs side-layer-tabs"><button v-for="index in profile.capabilities.layers" :key="index" :class="{ active: layer === index - 1 }" :disabled="busy()" @click="selectLayer(index - 1)">FN {{ index }}</button></div></div>
        <button v-if="profile.capabilities.remap" class="ghost danger side-restore" :disabled="remapDisabled()" title="恢复全部层的按键映射，不改变灯光等其他设置" @click="confirmRestoreAllKeys">恢复默认</button>
        <div class="side-write-status" :class="{ dirty }"><span v-if="status === 'writing'" class="spinner"></span><i v-else></i><span>{{ status === 'writing' ? '正在写入…' : dirty ? '写入失败' : '即时写入' }}</span></div>
      </aside>
    </section>

    <KeyPicker :current="selectedAssignment?.keyCode" hint="先选上方物理键，再选下方的新键值。" :keys="keyOptions" :disabled="remapDisabled()" @select="emit('assign-key', $event)" />

    <div v-if="keyContextMenu" class="key-context-menu" :style="{ left: `${keyContextMenu.x}px`, top: `${keyContextMenu.y}px` }" role="menu" @click.stop>
      <button type="button" role="menuitem" @click="restoreContextKey">恢复此键默认</button>
    </div>
  </div>
</template>
