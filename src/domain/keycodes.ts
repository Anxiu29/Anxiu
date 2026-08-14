import type { KeyCategory, KeyDefinition } from './keyboard'
import { StaticKeyCatalog } from './KeyCatalog'

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

export const hidCategoryFor = (code: number): KeyCategory => {
  if ((code >= 0xe0 && code <= 0xe7) || code === 0x39 || code === 62217) return 'modifier'
  if ((code >= 0x3a && code <= 0x48) || (code >= 0x68 && code <= 0x73) || (code >= 61441 && code <= 61443)) return 'function'
  if (code >= 0x49 && code <= 0x63) return 'navigation'
  if ((code >= 0xad && code <= 0xbf) || (code >= 4207 && code < 5000)) return 'media'
  if ((code >= 0x04 && code <= 0x38) || (code >= 0x64 && code <= 0xa4)) return 'basic'
  return 'special'
}

const standardKeys: KeyDefinition[] = STANDARD_LABELS.flatMap((label, code) =>
  label === '' ? [] : [{ code, label, category: hidCategoryFor(code) }],
)

export const HID_KEY_CATALOG = new StaticKeyCatalog(standardKeys)
