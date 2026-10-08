import { MOUSE_FILE_FORMAT } from '@/domain/mouse/types'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { validateMacro, type MouseMacro } from '@/domain/mouse/macros'
import { useDeviceStore } from './deviceStore'
import { downloadBlob } from '@/ui/downloadBlob'
import { TEMPORARILY_DISABLED_KEY_INDEX } from '@/domain/mouse/settings'

export const useMacroStore = defineStore('mouse_macro', () => {
  const device = useDeviceStore()
  const storageKey = computed(() => device.identity?.storage.macros)
  const fileModel = computed(() => device.identity?.profileModel ?? MOUSE_FILE_FORMAT)
  const macros = ref<(MouseMacro & { id: string; isDefault?: boolean })[]>([])
  const error = ref('')
  const selectedId = ref('')
  watch(
    storageKey,
    (key) => {
      error.value = ''
      macros.value = []
      selectedId.value = ''
      if (!key) return
      try {
        const data = JSON.parse(localStorage.getItem(storageKey.value!) ?? '[]')
        if (!Array.isArray(data) || data.length > 100) throw new Error('Invalid macros')
        macros.value = data.map((m) => ({
          ...validateMacro(m),
          id: m.isDefault === true ? 'default' : crypto.randomUUID(),
          isDefault: m.isDefault === true,
        }))
      } catch {
        error.value = 'fileError'
      }
    },
    { immediate: true },
  )
  function save(macro: MouseMacro, id?: string) {
    try {
      const m = {
        ...validateMacro(macro),
        id: id ?? crypto.randomUUID(),
        isDefault: id === 'default',
      }
      const next = id
        ? macros.value.map((item) => (item.id === id ? m : item))
        : [...macros.value, m]
      if (next.length > 100) throw new Error('Too many macros')
      localStorage.setItem(storageKey.value!, JSON.stringify(next))
      macros.value = next
      error.value = ''
      return m.id
    } catch {
      error.value = 'macroError'
    }
  }
  function create(baseName: string) {
    let number = 1
    while (macros.value.some((macro) => macro.name === baseName + ' ' + number)) number++
    return save({
      name: baseName + ' ' + number,
      actions: [],
      playbackMode: 0,
      playbackCount: 1,
    })
  }
  function remove(id: string) {
    try {
      const next = macros.value.filter((m) => m.id !== id)
      localStorage.setItem(storageKey.value!, JSON.stringify(next))
      macros.value = next
    } catch {
      error.value = 'fileError'
    }
  }
  function ensureDefault(name: string) {
    if (macros.value.some((m) => m.isDefault)) return
    const macro: MouseMacro = { name, actions: [] }
    try {
      const next = [{ ...macro, id: 'default', isDefault: true }, ...macros.value]
      localStorage.setItem(storageKey.value!, JSON.stringify(next))
      macros.value = next
    } catch {
      error.value = 'fileError'
    }
  }
  function rename(id: string, name: string) {
    const macro = macros.value.find((m) => m.id === id)
    if (macro) return save({ ...macro, name }, id)
  }
  function clearLocal() {
    localStorage.removeItem(storageKey.value!)
    macros.value = []
    selectedId.value = ''
    error.value = ''
  }
  async function importFile(file: File) {
    try {
      if (file.size > 100000) throw new Error('File too large')
      const data = JSON.parse(await file.text())
      if (data.model !== fileModel.value || data.version !== 1 || data.kind !== 'macro')
        throw new Error('Invalid macro file')
      return save(validateMacro(data.macro))
    } catch {
      error.value = 'fileError'
    }
  }
  function exportFile(id: string) {
    const macro = macros.value.find((m) => m.id === id)
    if (macro)
      downloadBlob(
        new Blob(
          [
            JSON.stringify(
              {
                version: 1,
                model: fileModel.value,
                kind: 'macro',
                macro: validateMacro(macro),
              },
              null,
              2,
            ),
          ],
          { type: 'application/json' },
        ),
        `${macro.name.replace(/[<>:"/\\|?*]/g, '_')}.macro.json`,
      )
  }
  const bind = (id: string, key: number) => {
    if (key === TEMPORARILY_DISABLED_KEY_INDEX) return
    const macro = macros.value.find((m) => m.id === id)
    if (macro)
      return device.run((protocol) => protocol.bindMacro(key, macro), true, true, 'tlw.saveMacro')
  }
  return {
    macros,
    selectedId,
    error,
    ensureDefault,
    clearLocal,
    rename,
    importFile,
    exportFile,
    save,
    create,
    remove,
    bind,
  }
})
