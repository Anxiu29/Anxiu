import { MOUSE_FILE_FORMAT } from '@/domain/mouse/types'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { downloadBlob } from '@/ui/downloadBlob'
import { validateProfile as validateProfileFile, type MouseProfile } from '@/domain/mouse/profiles'
import { useDeviceStore } from './deviceStore'

export const useProfileStore = defineStore('mouse_profile', () => {
  const device = useDeviceStore()
  const profileModel = computed(() => device.identity?.profileModel ?? MOUSE_FILE_FORMAT)
  const validateProfile = (value: unknown) => validateProfileFile(value, profileModel.value)
  const storageKey = computed(() => device.identity?.storage.profiles)
  type ProfileRecord = MouseProfile & {
    id: string
    isDefault?: boolean
    baseline?: { functions: number[]; keys: number[]; macro?: MouseProfile['macro'] }
  }
  const profiles = ref<ProfileRecord[]>([])
  const selected = ref('')
  const error = ref('')
  // 切换配置写入设备时，读回结果先不要写进切换前的那份配置。
  let holdSync = false
  let alignedFor = ''
  // 改设置时，只更新当前这份配置，不跳回其它配置。
  watch(
    () => device.config,
    () => {
      // Do not treat the first read after reconnect as an edit to a saved profile.
      if (!device.config) alignedFor = ''
      else if (!holdSync && alignedFor === storageKey.value) syncSelectedProfile()
    },
    { flush: 'sync' },
  )
  watch(
    storageKey,
    (key) => {
      alignedFor = ''
      error.value = ''
      profiles.value = []
      selected.value = ''
      if (!key) return
      try {
        const raw = JSON.parse(localStorage.getItem(storageKey.value!) ?? '[]')
        const stored = Array.isArray(raw) ? raw : raw.profiles
        if (!Array.isArray(stored) || stored.length > 100) throw new Error('Invalid profiles')
        const seen = new Set<string>()
        profiles.value = stored.map((p) => {
          const id = p.isDefault === true ? 'default' :
            typeof p.id === 'string' && p.id.trim() && p.id !== 'default' && !seen.has(p.id)
              ? p.id : crypto.randomUUID()
          seen.add(id)
          const profile: ProfileRecord = {
            ...validateProfile(p),
            id,
            isDefault: p.isDefault === true,
          }
          const baseline = readBaseline(p.baseline) ?? (profile.isDefault ? snapshot(profile) : undefined)
          return baseline ? { ...profile, baseline } : profile
        })
        const storedSelected = Array.isArray(raw) ? '' : String(raw.selected ?? '')
        selected.value = profiles.value.some((profile) => profile.id === storedSelected)
          ? storedSelected
          : ''
      } catch {
        error.value = 'fileError'
      }
    },
    { immediate: true },
  )
  function snapshot(profile: { functions: number[]; keys: number[]; macro?: MouseProfile['macro'] }) {
    return {
      functions: [...profile.functions],
      keys: [...profile.keys],
      ...(profile.macro ? { macro: profile.macro } : {}),
    }
  }
  function readBaseline(value: unknown) {
    if (!value || typeof value !== 'object') return
    try {
      return snapshot(
        validateProfile({
          version: 1,
          model: profileModel.value,
          name: 'baseline',
          ...(value as object),
        }),
      )
    } catch {
      return
    }
  }
  function writeStorage(next: ProfileRecord[], selection = selected.value) {
    if (next.length > 100) throw new Error('Too many profiles')
    localStorage.setItem(
      storageKey.value!,
      JSON.stringify({ profiles: next, selected: selection }),
    )
    profiles.value = next
    selected.value = selection
    error.value = ''
  }
  function persist(next: ProfileRecord[], selection = selected.value) {
    try {
      writeStorage(next, selection)
      return true
    } catch {
      error.value = 'fileError'
      return false
    }
  }
  function remember(id: string) {
    if (!storageKey.value) {
      selected.value = id
      return true
    }
    return persist(profiles.value, id)
  }
  function save(name: string) {
    if (device.busy || !name.trim()) return
    const base = profiles.value.find((profile) => profile.isDefault)
    const source = base?.baseline ?? (base ? snapshot(base) : undefined)
    if (!source) return
    try {
      const p: ProfileRecord = {
        ...validateProfile({
          version: 1,
          model: profileModel.value,
          name: name.trim(),
          functions: [...source.functions],
          keys: [...source.keys],
          ...(source.macro ? { macro: source.macro } : {}),
        }),
        id: crypto.randomUUID(),
      }
      persist([...profiles.value, p])
    } catch {
      error.value = 'profileMissingMacro'
    }
  }
  function rename(id: string, name: string) {
    if (id === 'default') return
    if (!name.trim() || name.length > 80) return
    persist(profiles.value.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)))
  }
  async function remove(id: string) {
    if (id === 'default') return
    const wasSelected = selected.value === id
    if (!persist(profiles.value.filter((profile) => profile.id !== id))) return
    if (wasSelected) await switchTo('default')
  }
  function profileFromDevice(name: string, id: string, isDefault: boolean) {
    const c = device.config
    if (!c) return
    try {
      return {
        ...validateProfile({
          version: 1,
          model: profileModel.value,
          name,
          functions: [...c.functions],
          keys: [...c.keysRaw],
          ...(c.macro ? { macro: c.macro } : {}),
        }),
        id,
        isDefault,
      }
    } catch {
      return
    }
  }
  function sameContent(
    profile: { functions: number[]; keys: number[]; macro?: MouseProfile['macro'] },
    next: { functions: number[]; keys: number[]; macro?: MouseProfile['macro'] },
  ) {
    return (
      profile.functions.every((value, index) => value === next.functions[index]) &&
      profile.functions.length === next.functions.length &&
      profile.keys.every((value, index) => value === next.keys[index]) &&
      profile.keys.length === next.keys.length &&
      JSON.stringify(profile.macro ?? null) === JSON.stringify(next.macro ?? null)
    )
  }
  function matchesDevice(profile: ProfileRecord) {
    const live = profileFromDevice(profile.name, profile.id, !!profile.isDefault)
    return !!live && sameContent(profile, live)
  }
  function syncSelectedProfile() {
    if (!device.config || !storageKey.value) return
    const target = profiles.value.find((profile) => profile.id === selected.value)
    if (!target) return
    const next = profileFromDevice(target.name, target.id, !!target.isDefault)
    if (!next || sameContent(target, next)) return
    persist(
      profiles.value.map((profile) =>
        profile.id === target.id
          ? { ...next, ...(profile.baseline ? { baseline: profile.baseline } : {}) }
          : profile,
      ),
    )
  }
  function ensureDefault(name: string) {
    if (!device.config || !storageKey.value) return
    if (!profiles.value.some((profile) => profile.isDefault)) {
      const created = profileFromDevice(name, 'default', true)
      if (
        !created ||
        !persist([{ ...created, baseline: snapshot(created) }, ...profiles.value], 'default')
      )
        return
    } else if (selected.value && !profiles.value.some((profile) => profile.id === selected.value)) {
      remember('')
    }
    if (alignedFor === storageKey.value) return
    alignedFor = storageKey.value
    const current = profiles.value.find((profile) => profile.id === selected.value)
    // Keep the hardware state. The user can explicitly choose a saved profile to apply it.
    if (current && !matchesDevice(current)) remember('')
  }
  async function switchTo(id: string) {
    const p = profiles.value.find((profile) => profile.id === id)
    if (!p || device.busy) return
    if (selected.value === id && matchesDevice(p)) return
    holdSync = true
    try {
      if (
        await device.run((protocol) => protocol.applyProfile(p), true, !!p.macro, 'tlw.currentConfig')
      )
        remember(id)
    } finally {
      holdSync = false
    }
    syncSelectedProfile()
  }
  async function importFile(file: File) {
    try {
      if (file.size > 100000) throw new Error('File too large')
      const p = { ...validateProfile(JSON.parse(await file.text())), id: crypto.randomUUID() }
      persist([...profiles.value, p])
    } catch {
      error.value = 'fileError'
    }
  }
  function exportFile(id: string) {
    const p = profiles.value.find((p) => p.id === id)
    if (p)
      downloadBlob(
        new Blob([JSON.stringify(validateProfile(p), null, 2)], {
          type: 'application/json',
        }),
        `${p.name.replace(/[<>:"/\\|?*]/g, '_')}.rk`,
      )
  }
  function clearLocal() {
    localStorage.removeItem(storageKey.value!)
    profiles.value = []
    selected.value = ''
    error.value = ''
  }
  return {
    profiles,
    selected,
    error,
    ensureDefault,
    clearLocal,
    save,
    rename,
    remove,
    switchTo,
    importFile,
    exportFile,
  }
})
