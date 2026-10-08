<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import MouseDialog from './MouseDialog.vue'
import MouseMacroActions from './MouseMacroActions.vue'
import { validateMacro, insertMacroDelay } from '@/domain/mouse/macros'
import { useMacroStore } from '@/stores/mouse/macroStore'
import { useDeviceStore } from '@/stores/mouse/deviceStore'
import { useKeyStore } from '@/stores/mouse/keyStore'
import {
  MACRO_KEYBOARD_BINDINGS,
  MOUSE_BINDINGS,
  keyboardUsageFromEventCode,
} from '@/domain/mouse/settings'
import type { MacroAction } from '@/domain/mouse/model'
import { useMouseLabels } from '@/ui/mouseLabels'
const { t } = useMouseLabels(),
  library = useMacroStore(),
  device = useDeviceStore(),
  keys = useKeyStore()
const selected = ref(''),
  name = ref(`${t('macros')} 1`),
  actions = ref<MacroAction[]>([]),
  recording = ref(false),
  target = ref(
    keys.selectedIndex !== 0 && keys.indices.includes(keys.selectedIndex) ? keys.selectedIndex : 2,
  )
const textDialog = ref(false),
  actionText = ref(''),
  textError = ref(false)
function openText() {
  actionText.value = JSON.stringify(actions.value, null, 2)
  textError.value = false
  textDialog.value = true
}
function applyText() {
  try {
    const parsed = JSON.parse(actionText.value)
    const macro = validateMacro({ name: name.value, actions: parsed })
    actions.value = macro.actions
    selectedAction.value = -1
    textDialog.value = false
    textError.value = false
  } catch {
    textError.value = true
  }
}
function clearActions() {
  actions.value = []
  selectedAction.value = -1
}
function clearAndSave() {
  const id = library.save(
    {
      name: name.value,
      actions: [],
      playbackMode: playbackMode.value,
      playbackCount: playbackCount.value,
    },
    selected.value,
  )
  if (id) {
    clearActions()
    device.dirty = false
  }
}
const selectedAction = ref(-1),
  insertPosition = ref('after'),
  insertType = ref('keyboard'),
  insertKey = ref(4),
  insertMouse = ref(1)
const actionList = ref<HTMLElement>()
const draggedAction = ref(-1),
  dropBoundary = ref(-1)
function endActionDrag() {
  draggedAction.value = -1
  dropBoundary.value = -1
}
function startActionDrag(event: DragEvent, index: number) {
  if (recording.value || !event.dataTransfer) {
    event.preventDefault()
    return
  }
  draggedAction.value = index
  selectedAction.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(index))
}
function actionBoundary(event: DragEvent, index: number) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return index + (event.clientY >= bounds.top + bounds.height / 2 ? 1 : 0)
}
function overAction(event: DragEvent, index: number) {
  if (recording.value || draggedAction.value < 0) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dropBoundary.value = actionBoundary(event, index)
  const list = actionList.value
  if (!list) return
  const bounds = list.getBoundingClientRect()
  if (event.clientY < bounds.top + 36) list.scrollTop -= 18
  else if (event.clientY > bounds.bottom - 36) list.scrollTop += 18
}
function leaveActionList(event: DragEvent) {
  if (!(event.relatedTarget instanceof Node) || !actionList.value?.contains(event.relatedTarget))
    dropBoundary.value = -1
}
function dropAction(event: DragEvent, index: number) {
  const from = draggedAction.value
  if (recording.value || from < 0 || from >= actions.value.length) {
    endActionDrag()
    return
  }
  event.preventDefault()
  const boundary = actionBoundary(event, index)
  // Removing the source shifts every later insertion boundary left by one.
  const to = boundary > from ? boundary - 1 : boundary
  if (to !== from) {
    const [action] = actions.value.splice(from, 1)
    actions.value.splice(to, 0, action)
  }
  selectedAction.value = to
  endActionDrag()
}
watch(
  [selectedAction, () => actions.value.length],
  () => {
    const list = actionList.value
    const row = list?.querySelectorAll('.action-row').item(selectedAction.value)
    if (!list || !(row instanceof HTMLElement)) return
    // Run after Vue renders the new row, and scroll only the action list.
    const viewport = list.getBoundingClientRect()
    const bounds = row.getBoundingClientRect()
    if (bounds.bottom > viewport.bottom) list.scrollTop += bounds.bottom - viewport.bottom
    else if (bounds.top < viewport.top) list.scrollTop += bounds.top - viewport.top
  },
  { flush: 'post' },
)
const delayMode = ref('record'),
  fixedDelay = ref(30),
  insertDelay = ref(30)
const insertionIndex = computed(() =>
  selectedAction.value < 0
    ? insertPosition.value === 'before'
      ? 0
      : actions.value.length
    : selectedAction.value + (insertPosition.value === 'after' ? 1 : 0),
)
const canInsert = computed(() =>
  insertType.value !== 'delay'
    ? actions.value.length <= 748
    : insertionIndex.value > 0 &&
      Number.isInteger(insertDelay.value) &&
      insertDelay.value > 0 &&
      actions.value[insertionIndex.value - 1].delay + insertDelay.value <= 65535,
)
const mouseButtons = [
  { value: 1, label: 'mouse0' },
  { value: 2, label: 'mouse1' },
  { value: 4, label: 'mouse2' },
  { value: 8, label: 'mouse3' },
  { value: 16, label: 'mouse4' },
]
function actionDelay(elapsed = 30) {
  return delayMode.value === 'record'
    ? Math.min(65535, Math.max(0, Math.round(elapsed)))
    : delayMode.value === 'fixed'
      ? Math.min(65535, Math.max(0, Math.round(fixedDelay.value ?? 30)))
      : 30
}
function insertAction() {
  if (recording.value || !canInsert.value) return
  const index = insertionIndex.value
  if (insertType.value === 'delay') {
    insertMacroDelay(actions.value, index, insertDelay.value)
    selectedAction.value = index - 1
    return
  }
  const type = insertType.value === 'mouse' ? 1 : 10,
    code = insertType.value === 'mouse' ? insertMouse.value : insertKey.value
  actions.value.splice(
    index,
    0,
    { delay: actionDelay(), typeAndStatus: 0x80 | type, code },
    { delay: actionDelay(), typeAndStatus: type, code },
  )
  selectedAction.value = index + 1
}
function removeAction(index: number) {
  actions.value.splice(index, 1)
  selectedAction.value = Math.min(index, actions.value.length - 1)
}
const playbackMode = ref<0 | 1 | 2 | 3>(0),
  playbackCount = ref(1)
const playbackModes = ['playNormal', 'playRelease', 'playTrigger', 'playReleaseImmediately']
const playbackHints = ['', 'playReleaseHint', 'playTriggerHint', 'playReleaseImmediatelyHint']
const renameDialog = ref(false),
  renameName = ref(''),
  renameId = ref('')
function rename(id: string, value: string) {
  renameId.value = id
  renameName.value = value
  renameDialog.value = true
}
function saveName() {
  if (recording.value || device.busy || !renameName.value.trim()) return
  const id = renameId.value
    ? library.rename(renameId.value, renameName.value)
    : library.save({ name: renameName.value, actions: [], playbackMode: 0, playbackCount: 1 })
  if (!id) return
  if (!renameId.value) select(id)
  else if (selected.value === id) name.value = renameName.value.trim()
  renameDialog.value = false
}
function removeMacro(id: string) {
  if (selected.value === id && device.dirty && !window.confirm('当前宏有未保存修改，确定移除吗？'))
    return
  const removingSelected = selected.value === id
  library.remove(id)
  if (removingSelected) {
    device.dirty = false
    select(library.macros[0]?.id ?? '')
  }
}
const fileInput = ref<HTMLInputElement>()
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) {
    const id = await library.importFile(input.files[0])
    if (id) select(id)
  }
  input.value = ''
}
let lastTime = 0
const held = new Set<number>()
function keyName(index: number) {
  const code = device.config?.defaultKeys[index]?.join(',')
  const i = MOUSE_BINDINGS.findIndex((b) => b.value.join(',') === code)
  return i < 0 ? `${t('key')} ${index + 1}` : t(`mouse${i}`)
}
function select(id: string) {
  if (id === selected.value) return
  if (
    selected.value &&
    id !== selected.value &&
    device.dirty &&
    !window.confirm('当前宏有未保存修改，确定放弃吗？')
  )
    return
  selectedAction.value = -1
  selected.value = id
  library.selectedId = id
  const m = library.macros.find((m) => m.id === id)
  name.value = m?.name ?? `${t('macros')} ${library.macros.length + 1}`
  playbackMode.value = m?.playbackMode ?? 0
  playbackCount.value = m?.playbackCount ?? 1
  actions.value = m?.actions.map((a) => ({ ...a })) ?? []
  device.dirty = false
}
function createMacro() {
  if (recording.value || device.busy) return
  let number = 1
  while (library.macros.some((macro) => macro.name === t('macros') + ' ' + number)) number++
  renameId.value = ''
  renameName.value = t('macros') + ' ' + number
  renameDialog.value = true
}
async function save(bindToDevice = true) {
  if ((bindToDevice && device.busy) || recording.value) return
  const id = library.save(
    {
      name: name.value,
      actions: actions.value,
      playbackMode: playbackMode.value,
      playbackCount: playbackCount.value,
    },
    selected.value || undefined,
  )
  if (!id) return
  selected.value = id
  library.selectedId = id
  device.dirty = false
  if (bindToDevice && actions.value.length) {
    await library.bind(id, target.value)
  } else {
    device.saved = true
    device.completedOperation = 'tlw.saveMacro'
  }
}
function remove() {
  library.remove(selected.value)
  select('')
}
function move(index: number, direction: number) {
  const to = index + direction
  if (to >= 0 && to < actions.value.length) {
    ;[actions.value[index], actions.value[to]] = [actions.value[to], actions.value[index]]
    selectedAction.value = to
  }
}
function stop() {
  if (!recording.value) return
  cleanupRecording()
  void save(false)
}
function cleanupRecording() {
  recording.value = false
  window.removeEventListener('keydown', capture, true)
  window.removeEventListener('keyup', capture, true)
  window.removeEventListener('blur', stop)
  for (const code of held) actions.value.push({ delay: 0, typeAndStatus: 0x0a, code })
  if (held.size) selectedAction.value = actions.value.length - 1
  held.clear()
}
function capture(event: KeyboardEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (event.repeat) return
  const code = keyboardUsageFromEventCode(event.code)
  if (code === undefined) return
  const down = event.type === 'keydown'
  if (!down && !held.has(code)) return
  if (actions.value.length + held.size >= 740) {
    stop()
    return
  }
  const now = performance.now()
  if (lastTime && actions.value.length)
    actions.value[actions.value.length - 1].delay = actionDelay(now - lastTime)
  actions.value.push({ delay: 0, typeAndStatus: down ? 0x8a : 0x0a, code })
  if (down) held.add(code)
  else held.delete(code)
  selectedAction.value = actions.value.length - 1
  lastTime = now
}
function toggleRecording() {
  if (recording.value) {
    stop()
    return
  }
  recording.value = true
  lastTime = 0
  window.addEventListener('keydown', capture, true)
  window.addEventListener('keyup', capture, true)
  window.addEventListener('blur', stop)
}
select(library.selectedId || library.macros[0]?.id || '')
onBeforeUnmount(cleanupRecording)

watch(
  [name, actions, playbackMode, playbackCount, recording],
  () => {
    const original = library.macros.find((item) => item.id === selected.value)
    device.dirty =
      recording.value ||
      !original ||
      JSON.stringify([name.value, actions.value, playbackMode.value, playbackCount.value]) !==
        JSON.stringify([
          original.name,
          original.actions,
          original.playbackMode ?? 0,
          original.playbackCount ?? 1,
        ])
  },
  { deep: true, flush: 'sync' },
)
onBeforeUnmount(() => {
  device.dirty = false
})
</script>
<template>
  <section class="mouse-workspace mouse-macros">
    <header class="mouse-macro-intro">
      <h2>宏设置</h2>
      <p>停止录制后自动保存到本地，拖动序号调整顺序，点击保存并绑定写入鼠标。</p>
    </header>
    <div class="mouse-macro-layout">
      <aside class="mouse-panel mouse-library">
        <h3>宏库</h3>
        <div class="mouse-macro-items">
          <div
            v-for="m in library.macros"
            :key="m.id"
            class="mouse-macro-item"
            :class="{ active: selected === m.id }"
          >
            <button
              class="mouse-macro-name"
              :aria-pressed="selected === m.id"
              :disabled="recording"
              @click="select(m.id)"
            >
              {{ m.name }}
            </button>
            <MouseMacroActions
              :name="m.name"
              :disabled="recording || device.busy"
              @rename="rename(m.id, m.name)"
              @export="library.exportFile(m.id)"
              @delete="removeMacro(m.id)"
            />
          </div>
        </div>
        <div class="mouse-toolbar">
          <button class="ghost" :disabled="recording" @click="createMacro">新建</button>
          <button class="ghost" :disabled="recording" @click="fileInput?.click()">导入</button>
          <input ref="fileInput" hidden type="file" accept=".json" @change="importFile" />
        </div>
      </aside>
      <div class="mouse-macro-editor">
        <section class="mouse-panel mouse-macro-controls">
          <h3 class="mouse-macro-title">
            {{ name }}
            <span v-if="device.dirty" class="mouse-draft">未保存</span>
          </h3>
          <div class="mouse-fields">
            <label class="mouse-field">
              播放方式
              <select v-model="playbackMode" :disabled="recording">
                <option v-for="(mode, index) in playbackModes" :key="mode" :value="index">
                  {{ t(mode) }}
                </option>
              </select>
            </label>
            <label v-if="playbackMode === 0" class="mouse-field">
              播放次数
              <input
                v-model.number="playbackCount"
                type="number"
                min="1"
                max="255"
                :disabled="recording"
              />
            </label>
          </div>
          <p v-if="playbackHints[playbackMode]">{{ t(playbackHints[playbackMode]) }}</p>

          <section class="mouse-macro-insert">
            <h3>插入动作</h3>
            <div class="mouse-fields">
              <label class="mouse-field">
                位置
                <select v-model="insertPosition" :disabled="recording">
                  <option value="before">选中动作之前</option>
                  <option value="after">选中动作之后</option>
                </select>
              </label>
              <label class="mouse-field">
                类型
                <select v-model="insertType" :disabled="recording">
                  <option value="keyboard">键盘</option>
                  <option value="mouse">鼠标</option>
                  <option value="delay">延迟</option>
                </select>
              </label>
              <label v-if="insertType === 'keyboard'" class="mouse-field">
                按键
                <select v-model="insertKey" :disabled="recording">
                  <option
                    v-for="key in MACRO_KEYBOARD_BINDINGS"
                    :key="key.eventCode ?? key.label"
                    :value="key.value[2]"
                  >
                    {{ key.label }}
                  </option>
                </select>
              </label>
              <label v-else-if="insertType === 'mouse'" class="mouse-field">
                按键
                <select v-model="insertMouse" :disabled="recording">
                  <option v-for="button in mouseButtons" :key="button.value" :value="button.value">
                    {{ t(button.label) }}
                  </option>
                </select>
              </label>
              <label v-else class="mouse-field">
                延迟（ms）
                <input v-model.number="insertDelay" type="number" min="1" max="65535" />
              </label>
            </div>
            <button class="ghost" :disabled="recording || !canInsert" @click="insertAction">
              插入
            </button>
          </section>

          <section class="mouse-macro-recording">
            <div class="mouse-fields">
              <label class="mouse-field">
                录制延迟
                <select v-model="delayMode" :disabled="recording">
                  <option value="record">记录实际间隔</option>
                  <option value="default">默认 30 ms</option>
                  <option value="fixed">固定间隔</option>
                </select>
              </label>
              <label v-if="delayMode === 'fixed'" class="mouse-field">
                延迟（ms）
                <input v-model.number="fixedDelay" type="number" min="0" max="65535" />
              </label>
            </div>
            <button class="primary" :disabled="device.busy" @click="toggleRecording">
              {{ recording ? '停止录制' : '开始录制' }}
            </button>
          </section>
        </section>
        <section class="mouse-panel mouse-action-panel">
          <h3>动作列表 · {{ actions.length }}</h3>
          <p>设备共用一个宏存储区，写入新宏或火力键会影响已绑定到该存储区的其他按键。</p>
          <div
            ref="actionList"
            class="mouse-actions"
            @dragleave="leaveActionList"
            @dragend="endActionDrag"
          >
            <div class="mouse-action-columns" aria-hidden="true">
              <span>序号</span>
              <span>按键</span>
              <span>动作</span>
              <span>延迟 ms</span>
              <span class="mouse-action-operations">调整顺序 / 删除</span>
            </div>
            <div
              v-for="(action, index) in actions"
              :key="index"
              class="action-row"
              :class="{
                active: selectedAction === index,
                'drop-before': dropBoundary === index,
                'drop-after': dropBoundary === index + 1 && index === actions.length - 1,
              }"
              @click="selectedAction = index"
              @dragover="overAction($event, index)"
              @drop="dropAction($event, index)"
            >
              <button
                class="action-index ghost"
                :draggable="!recording"
                :disabled="recording"
                :aria-label="'拖动动作 ' + (index + 1)"
                :aria-pressed="selectedAction === index"
                @dragstart="startActionDrag($event, index)"
              >
                ⠿ {{ index + 1 }}
              </button>
              <select
                v-if="(action.typeAndStatus & 0x7f) === 10"
                v-model="action.code"
                aria-label="动作按键"
                :disabled="recording"
              >
                <option
                  v-for="key in MACRO_KEYBOARD_BINDINGS"
                  :key="key.eventCode ?? key.label"
                  :value="key.value[2]"
                >
                  {{ key.label }}
                </option>
              </select>
              <select v-else v-model="action.code" aria-label="鼠标动作" :disabled="recording">
                <option v-for="button in mouseButtons" :key="button.value" :value="button.value">
                  {{ t(button.label) }}
                </option>
              </select>
              <select v-model="action.typeAndStatus" aria-label="按下或抬起" :disabled="recording">
                <option :value="0x80 | (action.typeAndStatus & 0x7f)">按下</option>
                <option :value="action.typeAndStatus & 0x7f">抬起</option>
              </select>
              <input
                v-model.number="action.delay"
                type="number"
                min="0"
                max="65535"
                aria-label="动作延迟（ms）"
                :disabled="recording"
              />
              <button
                class="ghost"
                aria-label="上移"
                :disabled="recording || index === 0"
                @click.stop="move(index, -1)"
              >
                ↑
              </button>
              <button
                class="ghost"
                aria-label="下移"
                :disabled="recording || index === actions.length - 1"
                @click.stop="move(index, 1)"
              >
                ↓
              </button>
              <button class="ghost" :disabled="recording" @click.stop="removeAction(index)">
                删除
              </button>
            </div>
            <p v-if="!actions.length">尚无动作，开始录制或手动插入。</p>
          </div>
          <div class="mouse-toolbar mouse-macro-footer">
            <label class="mouse-field">
              绑定按键
              <select v-model="target" :disabled="recording">
                <option v-for="index in keys.indices" :key="index" :value="index">
                  {{ keyName(index) }}
                </option>
              </select>
            </label>
            <div class="mouse-toolbar mouse-action-tools">
              <button class="ghost" :disabled="recording" @click="openText">文本编辑</button>
              <button class="ghost" :disabled="recording" @click="clearActions">清空草稿</button>
              <button
                class="ghost danger"
                :disabled="recording || device.busy"
                @click="clearAndSave"
              >
                删除当前宏
              </button>
            </div>

            <div class="mouse-toolbar">
              <button
                class="primary"
                :disabled="recording || device.busy || !actions.length"
                @click="save(true)"
              >
                保存并绑定
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
    <MouseDialog
      v-if="renameDialog"
      :title="renameId ? '重命名宏' : '新建宏'"
      @close="renameDialog = false"
    >
      <div class="mouse-workspace">
        <input v-model="renameName" maxlength="80" aria-label="宏名称" @keydown.enter="saveName" />
        <div class="mouse-toolbar">
          <button class="primary" :disabled="!renameName.trim()" @click="saveName">保存</button>
        </div>
      </div>
    </MouseDialog>
    <MouseDialog v-if="textDialog" title="编辑动作 JSON" @close="textDialog = false">
      <div class="mouse-workspace">
        <textarea v-model="actionText" rows="14" aria-label="动作 JSON"></textarea>
        <p v-if="textError" role="alert">动作格式或参数无效。</p>
        <div class="mouse-toolbar">
          <button class="ghost" @click="textDialog = false">取消</button>
          <button class="primary" @click="applyText">应用到草稿</button>
        </div>
      </div>
    </MouseDialog>
  </section>
</template>
