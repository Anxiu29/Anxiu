export interface MouseButtonPresentation {
  index: number
  path: string
  line: string
  x: number
  y: number
}
export interface MousePresentation {
  firmware?: {
    online?: { url: string; version: string; fileName: string; sha256: string; versionCode?: string }
    executable?: { url: string; version: string; fileName: string; versionCode?: string }
  }
  image: string
  buttonLayout: readonly MouseButtonPresentation[]
  solutionName: string
}
