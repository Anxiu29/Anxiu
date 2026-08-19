/**
 * 浏览器 KeyboardEvent.code 到 USB HID Keyboard/Keypad Usage ID 的稳定映射。
 * 使用 code 而不是 key，避免中文输入法、Shift 状态和键帽字符改变物理按键含义。
 */
const fixedCodes: Record<string, number> = {
  Enter: 0x28, Escape: 0x29, Backspace: 0x2a, Tab: 0x2b, Space: 0x2c,
  Minus: 0x2d, Equal: 0x2e, BracketLeft: 0x2f, BracketRight: 0x30, Backslash: 0x31,
  Semicolon: 0x33, Quote: 0x34, Backquote: 0x35, Comma: 0x36, Period: 0x37, Slash: 0x38, CapsLock: 0x39,
  PrintScreen: 0x46, ScrollLock: 0x47, Pause: 0x48, Insert: 0x49, Home: 0x4a, PageUp: 0x4b,
  Delete: 0x4c, End: 0x4d, PageDown: 0x4e, ArrowRight: 0x4f, ArrowLeft: 0x50, ArrowDown: 0x51, ArrowUp: 0x52,
  NumLock: 0x53, NumpadDivide: 0x54, NumpadMultiply: 0x55, NumpadSubtract: 0x56, NumpadAdd: 0x57,
  NumpadEnter: 0x58, Numpad1: 0x59, Numpad2: 0x5a, Numpad3: 0x5b, Numpad4: 0x5c, Numpad5: 0x5d,
  Numpad6: 0x5e, Numpad7: 0x5f, Numpad8: 0x60, Numpad9: 0x61, Numpad0: 0x62, NumpadDecimal: 0x63,
  IntlBackslash: 0x64, ContextMenu: 0x65, NumpadEqual: 0x67,
  ControlLeft: 0xe0, ShiftLeft: 0xe1, AltLeft: 0xe2, MetaLeft: 0xe3,
  ControlRight: 0xe4, ShiftRight: 0xe5, AltRight: 0xe6, MetaRight: 0xe7,
}

export function keyboardEventCodeToHidUsage(code: string): number | undefined {
  if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3) - 65 + 0x04
  if (/^Digit[1-9]$/.test(code)) return Number(code[5]) - 1 + 0x1e
  if (code === 'Digit0') return 0x27
  const functionMatch = /^F(\d{1,2})$/.exec(code)
  if (functionMatch) {
    const number = Number(functionMatch[1])
    if (number >= 1 && number <= 12) return 0x3a + number - 1
    if (number >= 13 && number <= 24) return 0x68 + number - 13
  }
  return fixedCodes[code]
}
