import { ref, watch } from 'vue'

export type AppTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'anxiu-theme'

export function resolveInitialTheme(
  storedTheme: string | null = typeof localStorage === 'undefined' ? null : localStorage.getItem(THEME_STORAGE_KEY),
  prefersDark = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true,
): AppTheme {
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  return prefersDark ? 'dark' : 'light'
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#090b10' : '#f4f7f8')
}

export function useTheme() {
  const theme = ref<AppTheme>(resolveInitialTheme())

  watch(theme, (value) => {
    applyTheme(value)
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_STORAGE_KEY, value)
  }, { immediate: true })

  const setTheme = (value: AppTheme) => { theme.value = value }
  const toggleTheme = () => { theme.value = theme.value === 'dark' ? 'light' : 'dark' }

  return { theme, setTheme, toggleTheme }
}
