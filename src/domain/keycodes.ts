import type { KeyCategory, KeyDefinition } from './keyboard'

// 键值由设备协议直接使用，因此保留数字键码作为唯一标识；显示名称可以重复。
const STANDARD_LABELS = [
  '△','Fn','','','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  '1','2','3','4','5','6','7','8','9','0','Enter','ESC','BackSpace','Tab','Space','-','=','[',']','\\','no',';',"'",'`',',','.','/','Cap',
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','Print Screen','Scroll Lock','Pause','Insert','Home','PgUp','Del','End','PgDn','→','←','↓','↑',
  'Num Lock','/','*','-','+','Enter','Pad1','Pad2','Pad3','Pad4','Pad5','Pad6','Pad7','Pad8','Pad9','Pad0','.','no2','App','Power','=',
  'F13','F14','F15','F16','F17','F18','F19','F20','F21','F22','F23','F24','Execute','Help','Menu','Select','Stop','Again','Undo','Cut','Copy','Paste','Find',
  'Mute','Vol+','Vol-','Caps Lock','Num Lock','Scroll Lock','.','=','In1','In2','In3','In4','In5','In6','In7','In8','In9','Lang1','Lang2','Lang3','Lang4','Lang5','Lang6','Lang7','Lang8','Lang9',
  'Alt Erase','Sys Request','Cancel','Clear','Prior','Return','Sepaeator','Out','Oper','Clear Again','Crsel','Exsel','Desktop Power Down','Desktop Sleep',
  '-','-','-','-','-','-','Play Pause','Next Track','Ptrack','Stop','Mute','Vol+','Vol-','Media','Email','Calc','PC','WWW','Search','AC Back','Forward','Refresh','Bookmarks','MACT','MACC','SCDE','SCIN',
  '-','-','-','-','-','主灯亮度+','主灯亮度-','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-','-',
  'L-Ctrl','L-Shift','L-Alt','L-Win','R-Ctrl','R-Shift','R-Alt','R-Win','-',
] as const

const CUSTOM_KEY_MAP: Record<number, string> = {
  224:'L-Ctrl',225:'L-Shift',226:'L-Alt',227:'L-Win',228:'R-Ctrl',229:'R-Shift',230:'R-Alt',231:'R-Win',232:'-',
  4207:'屏幕亮度+',4208:'屏幕亮度-',4277:'下一首',4278:'上一首',4279:'停止',4301:'播放',4322:'静音',4329:'声音+',4330:'声音-',
  4483:'Media',4490:'Email',4498:'Calc',4500:'File',4641:'search',4643:'www',4767:'desktop',25141:'~',
  29441:'鼠标左键',29442:'鼠标右键',29443:'鼠标滚轮点击',29444:'鼠标左移',29445:'鼠标右移',29446:'鼠标上移',29447:'鼠标下移',29448:'滚轮+',29449:'滚轮-',
  61441:'Fn1',61442:'Fn2',61443:'Fn3',61696:'恢复',61697:'Win',61698:'Mac',61699:'校准',61704:'配置1',61705:'配置2',61706:'配置3',61707:'WASD切换',61708:'配置4',62217:'LockWin',
  62224:'灯效模式+',62225:'灯光方向',62226:'主灯亮度+',62227:'主灯亮度-',62228:'主灯速度+',62229:'主灯速度-',62231:'主灯开关',
  62245:'氛围灯模式+',62246:'氛围灯开关',62247:'氛围灯方向',62248:'氛围灯速度+',62249:'氛围灯速度-',62250:'氛围灯亮度+',62251:'氛围灯亮度-',62252:'氛围灯模式-',
  62255:'主灯模式-',62262:'Static-Light-Change',62265:'snap tap on',
}

const categoryFor = (code: number): KeyCategory => {
  if ((code >= 0xe0 && code <= 0xe7) || code === 0x39 || code === 62217) return 'modifier'
  if ((code >= 0x3a && code <= 0x48) || (code >= 0x68 && code <= 0x73) || (code >= 61441 && code <= 61443)) return 'function'
  if (code >= 0x49 && code <= 0x63) return 'navigation'
  if ((code >= 0xad && code <= 0xbf) || (code >= 4207 && code < 5000)) return 'media'
  if ((code >= 0x04 && code <= 0x38) || (code >= 0x64 && code <= 0xa4)) return 'basic'
  return 'special'
}

const standardKeys: KeyDefinition[] = STANDARD_LABELS.flatMap((label, code) =>
  label === '' ? [] : [{ code, label, category: categoryFor(code) }],
)
const customKeys: KeyDefinition[] = Object.entries(CUSTOM_KEY_MAP).map(([code, label]) => ({
  code: Number(code), label, category: categoryFor(Number(code)),
}))

export const KEYCODES: KeyDefinition[] = [...standardKeys, ...customKeys]
export const KEY_MAP: Readonly<Record<number, string>> = Object.freeze(Object.fromEntries(KEYCODES.map(({ code, label }) => [code, label])))
const KEY_INDEX = new Map(KEYCODES.map((key) => [key.code, key]))

export const keyDefinition = (code: number): KeyDefinition =>
  KEY_INDEX.get(code) ?? { code, label: `0x${code.toString(16).padStart(4, '0').toUpperCase()}`, category: 'special' }
