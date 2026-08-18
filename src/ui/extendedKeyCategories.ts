import type { KeyDefinition } from '@/domain/keyboard'

export type ExtendedKeyCategory = 'system' | 'media' | 'lighting' | 'mouse' | 'shortcut' | 'more'

export const EXTENDED_KEY_CATEGORIES: readonly { id: ExtendedKeyCategory; label: string }[] = [
  { id: 'system', label: '系统功能' },
  { id: 'media', label: '媒体' },
  { id: 'lighting', label: '灯光' },
  { id: 'mouse', label: '鼠标' },
  { id: 'shortcut', label: '快捷指令' },
  { id: 'more', label: '更多' },
]

/**
 * UI 中允许选择的扩展按键白名单。
 *
 * 实机测试某个功能不可用时，直接注释对应的一整行即可把它从选择器隐藏。
 * 这里只控制 UI 是否展示，不删除官方键值表，因此设备返回该键码时仍能正确显示名称。
 */
const SELECTABLE_EXTENDED_KEY_CODES = new Set<number>([
  0, // 0x0000 △
  1, // 0x0001 Fn
  50, // 0x0032 no
  100, // 0x0064 no2
  102, // 0x0066 Power
  103, // 0x0067 =
  104, // 0x0068 F13
  105, // 0x0069 F14
  106, // 0x006A F15
  107, // 0x006B F16
  108, // 0x006C F17
  109, // 0x006D F18
  110, // 0x006E F19
  111, // 0x006F F20
  112, // 0x0070 F21
  113, // 0x0071 F22
  114, // 0x0072 F23
  115, // 0x0073 F24
  116, // 0x0074 Execute
  117, // 0x0075 Help
  118, // 0x0076 Menu
  119, // 0x0077 Select
  120, // 0x0078 Stop
  121, // 0x0079 Again
  122, // 0x007A Undo
  123, // 0x007B Cut
  124, // 0x007C Copy
  125, // 0x007D Paste
  126, // 0x007E Find
  127, // 0x007F Mute
  128, // 0x0080 Vol+
  129, // 0x0081 Vol-
  130, // 0x0082 Caps Lock
  131, // 0x0083 Num Lock
  132, // 0x0084 Scroll Lock
  133, // 0x0085 .
  134, // 0x0086 =
  135, // 0x0087 In1
  136, // 0x0088 In2
  137, // 0x0089 In3
  138, // 0x008A In4
  139, // 0x008B In5
  140, // 0x008C In6
  141, // 0x008D In7
  142, // 0x008E In8
  143, // 0x008F In9
  144, // 0x0090 Lang1
  145, // 0x0091 Lang2
  146, // 0x0092 Lang3
  147, // 0x0093 Lang4
  148, // 0x0094 Lang5
  149, // 0x0095 Lang6
  150, // 0x0096 Lang7
  151, // 0x0097 Lang8
  152, // 0x0098 Lang9
  153, // 0x0099 Alt Erase
  154, // 0x009A Sys Request
  155, // 0x009B Cancel
  156, // 0x009C Clear
  157, // 0x009D Prior
  158, // 0x009E Return
  159, // 0x009F Sepaeator
  160, // 0x00A0 Out
  161, // 0x00A1 Oper
  162, // 0x00A2 Clear Again
  163, // 0x00A3 Crsel
  164, // 0x00A4 Exsel
  165, // 0x00A5 Desktop Power Down
  166, // 0x00A6 Desktop Sleep
  173, // 0x00AD Play Pause
  174, // 0x00AE Next Track
  175, // 0x00AF Ptrack
  176, // 0x00B0 Stop
  177, // 0x00B1 Mute
  178, // 0x00B2 Vol+
  179, // 0x00B3 Vol-
  180, // 0x00B4 Media
  181, // 0x00B5 Email
  182, // 0x00B6 Calc
  183, // 0x00B7 PC
  184, // 0x00B8 WWW
  185, // 0x00B9 Search
  186, // 0x00BA AC Back
  187, // 0x00BB Forward
  188, // 0x00BC Refresh
  189, // 0x00BD Bookmarks
  190, // 0x00BE MACT
  191, // 0x00BF MACC
  192, // 0x00C0 SCDE
  193, // 0x00C1 SCIN
  199, // 0x00C7 主灯亮度+
  200, // 0x00C8 主灯亮度-
  4207, // 0x106F 屏幕亮度+
  4208, // 0x1070 屏幕亮度-
  4277, // 0x10B5 下一首
  4278, // 0x10B6 上一首
  4279, // 0x10B7 停止
  4301, // 0x10CD 播放
  4322, // 0x10E2 静音
  4329, // 0x10E9 声音+
  4330, // 0x10EA 声音-
  4483, // 0x1183 Media
  4490, // 0x118A Email
  4498, // 0x1192 Calc
  4500, // 0x1194 File
  4641, // 0x1221 search
  4643, // 0x1223 www
  4767, // 0x129F desktop
  25141, // 0x6235 ~
  29441, // 0x7301 鼠标左键
  29442, // 0x7302 鼠标右键
  29443, // 0x7303 鼠标滚轮点击
  29444, // 0x7304 鼠标左移
  29445, // 0x7305 鼠标右移
  29446, // 0x7306 鼠标上移
  29447, // 0x7307 鼠标下移
  29448, // 0x7308 滚轮+
  29449, // 0x7309 滚轮-
  61441, // 0xF001 Fn1
  61442, // 0xF002 Fn2
  61443, // 0xF003 Fn3
  61696, // 0xF100 恢复
  61697, // 0xF101 Win
  61698, // 0xF102 Mac
  61699, // 0xF103 校准
  61704, // 0xF108 配置1
  61705, // 0xF109 配置2
  61706, // 0xF10A 配置3
  61707, // 0xF10B WASD切换
  61708, // 0xF10C 配置4
  62217, // 0xF309 LockWin
  62224, // 0xF310 灯效模式+
  62225, // 0xF311 灯光方向
  62226, // 0xF312 主灯亮度+
  62227, // 0xF313 主灯亮度-
  62228, // 0xF314 主灯速度+
  62229, // 0xF315 主灯速度-
  62231, // 0xF317 主灯开关
  62245, // 0xF325 氛围灯模式+
  62246, // 0xF326 氛围灯开关
  62247, // 0xF327 氛围灯方向
  62248, // 0xF328 氛围灯速度+
  62249, // 0xF329 氛围灯速度-
  62250, // 0xF32A 氛围灯亮度+
  62251, // 0xF32B 氛围灯亮度-
  62252, // 0xF32C 氛围灯模式-
  62255, // 0xF32F 主灯模式-
  62262, // 0xF336 Static-Light-Change
  62265, // 0xF339 snap tap on
])

const MEDIA_CODES = new Set([127, 128, 129, 173, 174, 175, 176, 177, 178, 179, 180, 4207, 4208, 4277, 4278, 4279, 4301, 4322, 4329, 4330, 4483])
const SYSTEM_CODES = new Set([102, 165, 166, 61441, 61442, 61443, 61696, 61697, 61698, 61699, 61704, 61705, 61706, 61707, 61708, 62217, 62265])
const SHORTCUT_CODES = new Set([101, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 4490, 4498, 4500, 4641, 4643, 4767])

/** 官方占位值和未列入 UI 白名单的键码都不显示，但仍保留在协议目录中供读取解析。 */
export const isSelectableExtendedKey = ({ code, label }: KeyDefinition) =>
  SELECTABLE_EXTENDED_KEY_CODES.has(code) && label.trim() !== '' && label.trim() !== '-'

/**
 * 分类仅用于 UI 浏览，不改变 KeyDefinition.category 或协议键码。
 * 优先使用文档中稳定的厂商键码范围，名称规则只作为未来新增同类键值的补充。
 */
export const extendedCategoryFor = ({ code, label }: KeyDefinition): ExtendedKeyCategory => {
  const normalized = label.trim().toLowerCase()
  if ((code >= 62224 && code <= 62262) || code === 199 || code === 200 || /灯|light/.test(normalized)) return 'lighting'
  if (code >= 29441 && code <= 29449 || /鼠标|滚轮|mouse/.test(normalized)) return 'mouse'
  if (MEDIA_CODES.has(code) || /播放|静音|声音|音量|下一首|上一首|track|media|vol[+-]/.test(normalized)) return 'media'
  if (SYSTEM_CODES.has(code) || /^(fn\d|win|mac|lockwin|恢复|校准|配置\d|wasd切换|power|desktop sleep)/.test(normalized)) return 'system'
  if (SHORTCUT_CODES.has(code) || /email|calc|file|search|www|desktop|undo|cut|copy|paste|find|bookmarks|refresh/.test(normalized)) return 'shortcut'
  return 'more'
}
