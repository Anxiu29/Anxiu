import { CompositeKeyCatalog, StaticKeyCatalog } from '@/domain/KeyCatalog'
import { HID_KEY_CATALOG, hidCategoryFor } from '@/domain/keycodes'
import type { KeyCategory, KeyDefinition } from '@/domain/keyboard'

const XSYD_KEY_MAP: Record<number, string> = {
  224:'L-Ctrl',225:'L-Shift',226:'L-Alt',227:'L-Win',228:'R-Ctrl',229:'R-Shift',230:'R-Alt',231:'R-Win',232:'-',
  4207:'屏幕亮度+',4208:'屏幕亮度-',4277:'下一首',4278:'上一首',4279:'停止',4301:'播放',4322:'静音',4329:'声音+',4330:'声音-',
  4483:'Media',4490:'Email',4498:'Calc',4500:'File',4641:'search',4643:'www',4767:'desktop',25141:'~',
  29441:'鼠标左键',29442:'鼠标右键',29443:'鼠标滚轮点击',29444:'鼠标左移',29445:'鼠标右移',29446:'鼠标上移',29447:'鼠标下移',29448:'滚轮+',29449:'滚轮-',
  61441:'Fn1',61442:'Fn2',61443:'Fn3',61696:'恢复出厂设置',61697:'Win',61698:'Mac',61699:'校准',61704:'配置1',61705:'配置2',61706:'配置3',61707:'WASD切换',61708:'配置4',62217:'LockWin',
  62224:'灯效模式+',62225:'灯光方向',62226:'主灯亮度+',62227:'主灯亮度-',62228:'主灯速度+',62229:'主灯速度-',62231:'主灯开关',
  62245:'氛围灯模式+',62246:'氛围灯开关',62247:'氛围灯方向',62248:'氛围灯速度+',62249:'氛围灯速度-',62250:'氛围灯亮度+',62251:'氛围灯亮度-',62252:'氛围灯模式-',
  62255:'主灯模式-',62262:'Static-Light-Change',62265:'snap tap on',
}

const xsydCategory = (code: number): KeyCategory => {
  if (code === 62217) return 'modifier'
  if (code >= 61441 && code <= 61443) return 'function'
  if (code >= 4207 && code < 5000) return 'media'
  return hidCategoryFor(code)
}

const extensions: KeyDefinition[] = Object.entries(XSYD_KEY_MAP).map(([rawCode, label]) => {
  const code = Number(rawCode)
  return { code, label, category: xsydCategory(code) }
})

export const XSYD_KEY_CATALOG = new CompositeKeyCatalog(
  HID_KEY_CATALOG,
  new StaticKeyCatalog(extensions),
)
