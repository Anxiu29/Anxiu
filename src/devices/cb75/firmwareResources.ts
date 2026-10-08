import type { MousePresentation } from '@/ui/MousePresentation'

const base = `${import.meta.env.BASE_URL}firmware/cb75-mouse/`
export const CB75_FIRMWARE_RESOURCES: NonNullable<MousePresentation['firmware']> = {
  online: {
    url: `${base}cb75-mouse-20260922.bin`,
    version: '2026-09-22 抓包固件',
    fileName: 'cb75-mouse-20260922.bin',
    sha256: '0e50fe5838ddb08c53272ccd9c951e63b7d0d48a260705f8a98032e434e9b355',
  },
  executable: {
    url: `${base}cb75-mouse-V0110-20260921.exe`,
    version: 'V0110 · 2026-09-21 测试升级包',
    versionCode: 'V0110',
    fileName: 'cb75-mouse-V0110-20260921.exe',
  },
}
