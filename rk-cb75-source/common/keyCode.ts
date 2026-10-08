import type { KeyCodeTable } from "./interface"

/**
 * Key code of keyboard
 */
export enum KeyCodeEnum {
    //
    // Summary:
    //     No key pressed.
    None = 0x00,
    //
    // Summary:
    //     The left mouse button.
    LButton = 0x01,
    //
    // Summary:
    //     The right mouse button.
    RButton = 0x02,
    //
    // Summary:
    //     The CANCEL key.
    Cancel = 0x03,
    //
    // Summary:
    //     The middle mouse button (three-button mouse).
    MButton = 0x04,
    //
    // Summary:
    //     The first x mouse button (five-button mouse).
    XButton1 = 0x05,
    //
    // Summary:
    //     The second x mouse button (five-button mouse).
    XButton2 = 0x06,
    //
    // Summary:
    //     The BACKSPACE key.
    Back = 0x08,
    //
    // Summary:
    //     The TAB key.
    Tab = 0x09,
    //
    // Summary:
    //     The LINEFEED key.
    LineFeed = 0x0A,
    //
    // Summary:
    //     The CLEAR key.
    Clear = 0x0C,
    //
    // Summary:
    //     The RETURN key.
    Return = 0x0D,
    //
    // Summary:
    //     The ENTER key.
    Enter = 0x0D,
    //
    // Summary:
    //     The SHIFT key.
    ShiftKey = 0x10,
    //
    // Summary:
    //     The CTRL key.
    ControlKey = 0x11,
    //
    // Summary:
    //     The ALT key.
    Menu = 0x12,
    //
    // Summary:
    //     The PAUSE key.
    Pause = 0x13,
    //
    // Summary:
    //     The CAPS LOCK key.
    Capital = 0x14,
    //
    // Summary:
    //     The CAPS LOCK key.
    CapsLock = 0x14,
    //
    // Summary:
    //     The IME Kana mode key.
    KanaMode = 0x15,
    //
    // Summary:
    //     The IME Hanguel mode key. (maintained for compatibility; use HangulMode)
    HanguelMode = 0x15,
    //
    // Summary:
    //     The IME Hangul mode key.
    HangulMode = 0x15,
    //
    // Summary:
    //     The IME Junja mode key.
    JunjaMode = 0x17,
    //
    // Summary:
    //     The IME final mode key.
    FinalMode = 0x18,
    //
    // Summary:
    //     The IME Hanja mode key.
    HanjaMode = 0x19,
    //
    // Summary:
    //     The IME Kanji mode key.
    KanjiMode = 0x19,
    //
    // Summary:
    //     The ESC key.
    Escape = 0x1B,
    //
    // Summary:
    //     The IME convert key.
    IMEConvert = 0x1C,
    //
    // Summary:
    //     The IME nonconvert key.
    IMENonconvert = 0x1D,
    //
    // Summary:
    //     The IME accept key, replaces System.Windows.Forms.Keys.IMEAceept.
    IMEAccept = 0x1E,
    //
    // Summary:
    //     The IME accept key. Obsolete, use System.Windows.Forms.Keys.IMEAccept instead.
    IMEAceept = 0x1E,
    //
    // Summary:
    //     The IME mode change key.
    IMEModeChange = 0x1F,
    //
    // Summary:
    //     The SPACEBAR key.
    Space = 0x20,
    //
    // Summary:
    //     The PAGE UP key.
    Prior = 0x21,
    //
    // Summary:
    //     The PAGE UP key.
    PageUp = 0x21,
    //
    // Summary:
    //     The PAGE DOWN key.
    Next = 0x22,
    //
    // Summary:
    //     The PAGE DOWN key.
    PageDown = 0x22,
    //
    // Summary:
    //     The END key.
    End = 0x23,
    //
    // Summary:
    //     The HOME key.
    Home = 0x24,
    //
    // Summary:
    //     The LEFT ARROW key.
    Left = 0x25,
    //
    // Summary:
    //     The UP ARROW key.
    Up = 0x26,
    //
    // Summary:
    //     The RIGHT ARROW key.
    Right = 0x27,
    //
    // Summary:
    //     The DOWN ARROW key.
    Down = 0x28,
    //
    // Summary:
    //     The SELECT key.
    Select = 0x29,
    //
    // Summary:
    //     The PRINT key.
    Print = 0x2A,
    //
    // Summary:
    //     The EXECUTE key.
    Execute = 0x2B,
    //
    // Summary:
    //     The PRINT SCREEN key.
    Snapshot = 0x2C,
    //
    // Summary:
    //     The PRINT SCREEN key.
    PrintScreen = 0x2C,
    //
    // Summary:
    //     The INS key.
    Insert = 0x2D,
    //
    // Summary:
    //     The DEL key.
    Delete = 0x2E,
    //
    // Summary:
    //     The HELP key.
    Help = 0x2F,
    //
    // Summary:
    //     The 0 key.
    D0 = 0x30,
    //
    // Summary:
    //     The 1 key.
    D1 = 0x31,
    //
    // Summary:
    //     The 2 key.
    D2 = 0x32,
    //
    // Summary:
    //     The 3 key.
    D3 = 0x33,
    //
    // Summary:
    //     The 4 key.
    D4 = 0x34,
    //
    // Summary:
    //     The 5 key.
    D5 = 0x35,
    //
    // Summary:
    //     The 6 key.
    D6 = 0x36,
    //
    // Summary:
    //     The 7 key.
    D7 = 0x37,
    //
    // Summary:
    //     The 8 key.
    D8 = 0x38,
    //
    // Summary:
    //     The 9 key.
    D9 = 0x39,
    //
    // Summary:
    //     The A key.
    A = 0x41,
    //
    // Summary:
    //     The B key.
    B = 0x42,
    //
    // Summary:
    //     The C key.
    C = 0x43,
    //
    // Summary:
    //     The D key.
    D = 0x44,
    //
    // Summary:
    //     The E key.
    E = 0x45,
    //
    // Summary:
    //     The F key.
    F = 0x46,
    //
    // Summary:
    //     The G key.
    G = 0x47,
    //
    // Summary:
    //     The H key.
    H = 0x48,
    //
    // Summary:
    //     The I key.
    I = 0x49,
    //
    // Summary:
    //     The J key.
    J = 0x4A,
    //
    // Summary:
    //     The K key.
    K = 0x4B,
    //
    // Summary:
    //     The L key.
    L = 0x4C,
    //
    // Summary:
    //     The M key.
    M = 0x4D,
    //
    // Summary:
    //     The N key.
    N = 0x4E,
    //
    // Summary:
    //     The O key.
    O = 0x4F,
    //
    // Summary:
    //     The P key.
    P = 0x50,
    //
    // Summary:
    //     The Q key.
    Q = 0x51,
    //
    // Summary:
    //     The R key.
    R = 0x52,
    //
    // Summary:
    //     The S key.
    S = 0x53,
    //
    // Summary:
    //     The T key.
    T = 0x54,
    //
    // Summary:
    //     The U key.
    U = 0x55,
    //
    // Summary:
    //     The V key.
    V = 0x56,
    //
    // Summary:
    //     The W key.
    W = 0x57,
    //
    // Summary:
    //     The X key.
    X = 0x58,
    //
    // Summary:
    //     The Y key.
    Y = 0x59,
    //
    // Summary:
    //     The Z key.
    Z = 0x5A,
    //
    // Summary:
    //     The left Windows logo key (Microsoft Natural Keyboard).
    LWin = 0x5B,
    //
    // Summary:
    //     The right Windows logo key (Microsoft Natural Keyboard).
    RWin = 0x5C,
    //
    // Summary:
    //     The application key (Microsoft Natural Keyboard).
    Apps = 0x5D,
    //
    // Summary:
    //     The computer sleep key.
    Sleep = 0x5F,
    //
    // Summary:
    //     The 0 key on the numeric keypad.
    NumPad0 = 0x60,
    //
    // Summary:
    //     The 1 key on the numeric keypad.
    NumPad1 = 0x61,
    //
    // Summary:
    //     The 2 key on the numeric keypad.
    NumPad2 = 0x62,
    //
    // Summary:
    //     The 3 key on the numeric keypad.
    NumPad3 = 0x63,
    //
    // Summary:
    //     The 4 key on the numeric keypad.
    NumPad4 = 0x64,
    //
    // Summary:
    //     The 5 key on the numeric keypad.
    NumPad5 = 0x65,
    //
    // Summary:
    //     The 6 key on the numeric keypad.
    NumPad6 = 0x66,
    //
    // Summary:
    //     The 7 key on the numeric keypad.
    NumPad7 = 0x67,
    //
    // Summary:
    //     The 8 key on the numeric keypad.
    NumPad8 = 0x68,
    //
    // Summary:
    //     The 9 key on the numeric keypad.
    NumPad9 = 0x69,
    //
    // Summary:
    //     The multiply key.
    Multiply = 0x6A,
    //
    // Summary:
    //     The add key.
    Add = 0x6B,
    //
    // Summary:
    //     The separator key.
    Separator = 0x6C,
    //
    // Summary:
    //     The subtract key.
    Subtract = 0x6D,
    //
    // Summary:
    //     The decimal key.
    Decimal = 0x6E,
    //
    // Summary:
    //     The divide key.
    Divide = 0x6F,
    //
    // Summary:
    //     The F1 key.
    F1 = 0x70,
    //
    // Summary:
    //     The F2 key.
    F2 = 0x71,
    //
    // Summary:
    //     The F3 key.
    F3 = 0x72,
    //
    // Summary:
    //     The F4 key.
    F4 = 0x73,
    //
    // Summary:
    //     The F5 key.
    F5 = 0x74,
    //
    // Summary:
    //     The F6 key.
    F6 = 0x75,
    //
    // Summary:
    //     The F7 key.
    F7 = 0x76,
    //
    // Summary:
    //     The F8 key.
    F8 = 0x77,
    //
    // Summary:
    //     The F9 key.
    F9 = 0x78,
    //
    // Summary:
    //     The F10 key.
    F10 = 0x79,
    //
    // Summary:
    //     The F11 key.
    F11 = 0x7A,
    //
    // Summary:
    //     The F12 key.
    F12 = 0x7B,
    //
    // Summary:
    //     The F13 key.
    F13 = 0x7C,
    //
    // Summary:
    //     The F14 key.
    F14 = 0x7D,
    //
    // Summary:
    //     The F15 key.
    F15 = 0x7E,
    //
    // Summary:
    //     The F16 key.
    F16 = 0x7F,
    //
    // Summary:
    //     The F17 key.
    F17 = 0x80,
    //
    // Summary:
    //     The F18 key.
    F18 = 0x81,
    //
    // Summary:
    //     The F19 key.
    F19 = 0x82,
    //
    // Summary:
    //     The F20 key.
    F20 = 0x83,
    //
    // Summary:
    //     The F21 key.
    F21 = 0x84,
    //
    // Summary:
    //     The F22 key.
    F22 = 0x85,
    //
    // Summary:
    //     The F23 key.
    F23 = 0x86,
    //
    // Summary:
    //     The F24 key.
    F24 = 0x87,
    //
    // Summary:
    //     The NUM LOCK key.
    NumLock = 0x90,
    //
    // Summary:
    //     The SCROLL LOCK key.
    Scroll = 0x91,
    //
    // Summary:
    //     The left SHIFT key.
    LShiftKey = 0xA0,
    //
    // Summary:
    //     The right SHIFT key.
    RShiftKey = 0xA1,
    //
    // Summary:
    //     The left CTRL key.
    LControlKey = 0xA2,
    //
    // Summary:
    //     The right CTRL key.
    RControlKey = 0xA3,
    //
    // Summary:
    //     The left ALT key.
    LMenu = 0xA4,
    //
    // Summary:
    //     The right ALT key.
    RMenu = 0xA5,
    //
    // Summary:
    //     The browser back key (Windows 2000 or later).
    BrowserBack = 0xA6,
    //
    // Summary:
    //     The browser forward key (Windows 2000 or later).
    BrowserForward = 0xA7,
    //
    // Summary:
    //     The browser refresh key (Windows 2000 or later).
    BrowserRefresh = 0xA8,
    //
    // Summary:
    //     The browser stop key (Windows 2000 or later).
    BrowserStop = 0xA9,
    //
    // Summary:
    //     The browser search key (Windows 2000 or later).
    BrowserSearch = 0xAA,
    //
    // Summary:
    //     The browser favorites key (Windows 2000 or later).
    BrowserFavorites = 0xAB,
    //
    // Summary:
    //     The browser home key (Windows 2000 or later).
    BrowserHome = 0xAC,
    //
    // Summary:
    //     The volume mute key (Windows 2000 or later).
    VolumeMute = 0xAD,
    //
    // Summary:
    //     The volume down key (Windows 2000 or later).
    VolumeDown = 0xAE,
    //
    // Summary:
    //     The volume up key (Windows 2000 or later).
    VolumeUp = 0xAF,
    //
    // Summary:
    //     The media next track key (Windows 2000 or later).
    MediaNextTrack = 0xB0,
    //
    // Summary:
    //     The media previous track key (Windows 2000 or later).
    MediaPreviousTrack = 0xB1,
    //
    // Summary:
    //     The media Stop key (Windows 2000 or later).
    MediaStop = 0xB2,
    //
    // Summary:
    //     The media play pause key (Windows 2000 or later).
    MediaPlayPause = 0xB3,
    //
    // Summary:
    //     The launch mail key (Windows 2000 or later).
    LaunchMail = 0xB4,
    //
    // Summary:
    //     The select media key (Windows 2000 or later).
    SelectMedia = 0xB5,
    //
    // Summary:
    //     The start application one key (Windows 2000 or later).
    LaunchApplication1 = 0xB6,
    //
    // Summary:
    //     The start application two key (Windows 2000 or later).
    LaunchApplication2 = 0xB7,
    //
    // Summary:
    //     The OEM Semicolon key on a US standard keyboard (Windows 2000 or later).
    OemSemicolon = 0xBA,
    //
    // Summary:
    //     The OEM 1 key.
    Oem1 = 0xBA,
    //
    // Summary:
    //     The OEM plus key on any country/region keyboard (Windows 2000 or later).
    Oemplus = 0xBB,
    //
    // Summary:
    //     The OEM comma key on any country/region keyboard (Windows 2000 or later).
    Oemcomma = 0xBC,
    //
    // Summary:
    //     The OEM minus key on any country/region keyboard (Windows 2000 or later).
    OemMinus = 0xBD,
    //
    // Summary:
    //     The OEM period key on any country/region keyboard (Windows 2000 or later).
    OemPeriod = 0xBE,
    //
    // Summary:
    //     The OEM question mark key on a US standard keyboard (Windows 2000 or later).
    OemQuestion = 0xBF,
    //
    // Summary:
    //     The OEM 2 key.
    Oem2 = 0xBF,
    //
    // Summary:
    //     The OEM tilde key on a US standard keyboard (Windows 2000 or later).
    Oemtilde = 0xC0,
    //
    // Summary:
    //     The OEM 3 key.
    Oem3 = 0xC0,
    //
    // Summary:
    //     The OEM open bracket key on a US standard keyboard (Windows 2000 or later).
    OemOpenBrackets = 0xDB,
    //
    // Summary:
    //     The OEM 4 key.
    Oem4 = 0xDB,
    //
    // Summary:
    //     The OEM pipe key on a US standard keyboard (Windows 2000 or later).
    OemPipe = 0xDC,
    //
    // Summary:
    //     The OEM 5 key.
    Oem5 = 0xDC,
    //
    // Summary:
    //     The OEM close bracket key on a US standard keyboard (Windows 2000 or later).
    OemCloseBrackets = 0xDD,
    //
    // Summary:
    //     The OEM 6 key.
    Oem6 = 0xDD,
    //
    // Summary:
    //     The OEM singled/double quote key on a US standard keyboard (Windows 2000 or later).
    OemQuotes = 0xDE,
    //
    // Summary:
    //     The OEM 7 key.
    Oem7 = 0xDE,
    //
    // Summary:
    //     The OEM 8 key.
    Oem8 = 0xDF,
    //
    // Summary:
    //     The OEM angle bracket or backslash key on the RT 102 key keyboard (Windows 2000
    //     or later).
    OemBackslash = 0xE2,
    //
    // Summary:
    //     The OEM 102 key.
    Oem102 = 0xE2,
    //
    // Summary:
    //     The PROCESS KEY key.
    ProcessKey = 0xE5,
    //
    // Summary:
    //     Used to pass Unicode characters as if they were keystrokes. The Packet key value
    //     is the low word of a 32-bit virtual-key value used for non-keyboard input methods.
    Packet = 0xE7,
    //
    // Summary:
    //     The FN1 key.
    Fn = 0xF5,
    //
    // Summary:
    //     The ATTN key.
    Attn = 0xF6,
    //
    // Summary:
    //     The CRSEL key.
    Crsel = 0xF7,
    //
    // Summary:
    //     The EXSEL key.
    Exsel = 0xF8,
    //
    // Summary:
    //     The ERASE EOF key.
    EraseEof = 0xF9,
    //
    // Summary:
    //     The PLAY key.
    Play = 0xFA,
    //
    // Summary:
    //     The ZOOM key.
    Zoom = 0xFB,
    //
    // Summary:
    //     A constant reserved for future use.
    NoName = 0xFC,
    //
    // Summary:
    //     The PA1 key.
    Pa1 = 0xFD,
    //
    // Summary:
    //     The CLEAR key.
    OemClear = 0xFE,
}

export const KeyCodeName: Record<number, String> = {
    0x00: "",
    0x01: "LButton",
    0x02: "RButton",
    0x03: "Cancel",
    0x04: "MButton",
    0x05: "XButton1",
    0x06: "XButton2",
    0x08: "Backspace",
    0x09: "Tab",
    0x0A: "LineFeed",
    0x0C: "Clear",
    0x0D: "Enter",
    0x10: "Shift",
    0x11: "Ctrl",
    0x12: "Alt",
    0x13: "Pause",
    0x14: "Caps",
    0x15: "KanaMode",
    0x17: "JunjaMode",
    0x18: "FinalMode",
    0x19: "HanjaMode",
    0x1B: "Esc",
    0x1C: "IMEConvert",
    0x1D: "IMENonconvert",
    0x1E: "IMEAccept",
    0x1F: "IMEModeChange",
    0x20: "Space",
    0x21: "PgUp",
    0x22: "PgDn",
    0x23: "End",
    0x24: "Home",
    0x25: "←",
    0x26: "↑",
    0x27: "→",
    0x28: "↓",
    0x29: "Select",
    0x2A: "Print",
    0x2B: "Execute",
    0x2C: "Snapshot",
    0x2D: "Insert",
    0x2E: "Delete",
    0x2F: "Help",
    0x30: "0",
    0x31: "1",
    0x32: "2",
    0x33: "3",
    0x34: "4",
    0x35: "5",
    0x36: "6",
    0x37: "7",
    0x38: "8",
    0x39: "9",
    0x41: "A",
    0x42: "B",
    0x43: "C",
    0x44: "D",
    0x45: "E",
    0x46: "F",
    0x47: "G",
    0x48: "H",
    0x49: "I",
    0x4A: "J",
    0x4B: "K",
    0x4C: "L",
    0x4D: "M",
    0x4E: "N",
    0x4F: "O",
    0x50: "P",
    0x51: "Q",
    0x52: "R",
    0x53: "S",
    0x54: "T",
    0x55: "U",
    0x56: "V",
    0x57: "W",
    0x58: "X",
    0x59: "Y",
    0x5A: "Z",
    0x5B: "L-Win",
    0x5C: "R-Win",
    0x5D: "Apps",
    0x5F: "Sleep",
    0x60: "NumPad0",
    0x61: "NumPad1",
    0x62: "NumPad2",
    0x63: "NumPad3",
    0x64: "NumPad4",
    0x65: "NumPad5",
    0x66: "NumPad6",
    0x67: "NumPad7",
    0x68: "NumPad8",
    0x69: "NumPad9",
    0x6A: "*",
    0x6B: "+",
    0x6C: "Enter",
    0x6D: "-",
    0x6E: ".",
    0x6F: "/",
    0x70: "F1",
    0x71: "F2",
    0x72: "F3",
    0x73: "F4",
    0x74: "F5",
    0x75: "F6",
    0x76: "F7",
    0x77: "F8",
    0x78: "F9",
    0x79: "F10",
    0x7A: "F11",
    0x7B: "F12",
    0x7C: "F13",
    0x7D: "F14",
    0x7E: "F15",
    0x7F: "F16",
    0x80: "F17",
    0x81: "F18",
    0x82: "F19",
    0x83: "F20",
    0x84: "F21",
    0x85: "F22",
    0x86: "F23",
    0x87: "F24",
    0x90: "NumLock",
    0x91: "Scroll",
    0xA0: "L-Shift",
    0xA1: "R-Shift",
    0xA2: "L-Ctrl",
    0xA3: "R-Ctrl",
    0xA4: "L-Alt",
    0xA5: "R-Alt",
    0xA6: "BrowserBack",
    0xA7: "BrowserForward",
    0xA8: "BrowserRefresh",
    0xA9: "BrowserStop",
    0xAA: "BrowserSearch",
    0xAB: "BrowserFavorites",
    0xAC: "BrowserHome",
    0xAD: "VolumeMute",
    0xAE: "VolumeDown",
    0xAF: "VolumeUp",
    0xB0: "MediaNextTrack",
    0xB1: "MediaPreviousTrack",
    0xB2: "MediaStop",
    0xB3: "MediaPlayPause",
    0xB4: "LaunchMail",
    0xB5: "SelectMedia",
    0xB6: "LaunchApplication1",
    0xB7: "LaunchApplication2",
    0xBA: ";:",
    0xBB: "=+",
    0xBC: ",<",
    0xBD: "-_",
    0xBE: ".>",
    0xBF: "/?",
    0xC0: "`~",
    0xDB: "[{",
    0xDC: "\\|",
    0xDD: "]}",
    0xDE: "'\"",
    0xDF: "Oem8",
    0xE2: "OemBackslash",
    0xE5: "ProcessKey",
    0xE7: "Packet",
    0xF5: "Fn",
    0xF6: "Attn",
    0xF7: "Crsel",
    0xF8: "Exsel",
    0xF9: "EraseEof",
    0xFA: "Play",
    0xFB: "Zoom",
    0xFC: "NoName",
    0xFD: "Pa1",
    0xFE: "OemClear",
}

export enum KeyDefineEnum {
    NONE = 0x00,
    SPARKLINK_FN = 0x01,
    KEY_A = 0x04,
    KEY_B = 0x05,
    KEY_C = 0x06,
    KEY_D = 0x07,
    KEY_E = 0x08,
    KEY_F = 0x09,
    KEY_G = 0x0a,
    KEY_H = 0x0b,
    KEY_I = 0x0c,
    KEY_J = 0x0d,
    KEY_K = 0x0e,
    KEY_L = 0x0f,
    KEY_M = 0x10,
    KEY_N = 0x11,
    KEY_O = 0x12,
    KEY_P = 0x13,
    KEY_Q = 0x14,
    KEY_R = 0x15,
    KEY_S = 0x16,
    KEY_T = 0x17,
    KEY_U = 0x18,
    KEY_V = 0x19,
    KEY_W = 0x1a,
    KEY_X = 0x1b,
    KEY_Y = 0x1c,
    KEY_Z = 0x1d,

    KEY_ESC = 0x29,
    KEY_TAB = 0x2b,
    KEY_CAPSLOCK = 0x39,
    KEY_Backspace = 0x2a,
    KEY_ENTER = 0x28,
    KEY_SPACEBAR = 0x2c,

    KEY_TILDE = 0x35,   //bo lang
    KEY_Underscore = 0x2d,   //xia hua xian
    KEY_EqualSign = 0x2e,   //deng hao
    KEY_L_Brackets = 0x2f,   //zuo zhong kuo hao
    KEY_R_Brackets = 0x30,   //you zhong kuo hao
    KEY_Slash = 0x31,   //xie gang      //shu xian
    KEY_Semicolon = 0x33,   //fen hao
    KEY_Quotation = 0x34,   //yin hao
    KEY_COMMA = 0x36,   //dou hao
    KEY_PERIOD = 0x37,   //ju hao
    KEY_Interrogation = 0x38,   //dun hao
    //////////////////////////////
    KEY_1 = 0x1e,
    KEY_2 = 0x1f,
    KEY_3 = 0x20,
    KEY_4 = 0x21,
    KEY_5 = 0x22,
    KEY_6 = 0x23,
    KEY_7 = 0x24,
    KEY_8 = 0x25,
    KEY_9 = 0x26,
    KEY_0 = 0x27,
    ////////////////////////////////
    KEY_F1 = 0x3a,
    KEY_F2 = 0x3b,
    KEY_F3 = 0x3c,
    KEY_F4 = 0x3d,
    KEY_F5 = 0x3e,
    KEY_F6 = 0x3f,
    KEY_F7 = 0x40,
    KEY_F8 = 0x41,
    KEY_F9 = 0x42,
    KEY_F10 = 0x43,
    KEY_F11 = 0x44,
    KEY_F12 = 0x45,
    KEY_F13 = 0x68,
    KEY_F14 = 0x69,
    KEY_F15 = 0x6A,

    KEY_PRINT = 0x46,
    KEY_SCRLOCK = 0x47,
    KEY_PAUSE = 0x48,
    KEY_INS = 0x49,
    KEY_HOME = 0x4a,
    KEY_PGUP = 0x4b,
    KEY_DEL = 0x4c,
    KEY_END = 0x4d,
    KEY_PGDN = 0x4e,

    KEY_RightArrow = 0x4f,
    KEY_LeftArrow = 0x50,
    KEY_DownArrow = 0x51,
    KEY_UpArrow = 0x52,

    KEY_NUMLOCK = 0x53,
    KEY_NUM_DIV = 0x54,
    KEY_NUM_MUL = 0x55,
    KEY_NUM_MINUS = 0x56,
    KEY_NUM_PLUS = 0x57,
    KEY_NUM_ENTER = 0x58,
    KEY_NUM_DOT = 0x63,

    KEY_NUM_1 = 0x59,
    KEY_NUM_2 = 0x5a,
    KEY_NUM_3 = 0x5b,
    KEY_NUM_4 = 0x5c,
    KEY_NUM_5 = 0x5d,
    KEY_NUM_6 = 0x5e,
    KEY_NUM_7 = 0x5f,
    KEY_NUM_8 = 0x60,
    KEY_NUM_9 = 0x61,
    KEY_NUM_0 = 0x62,

    KEY_CODE29 = 0x31,
    KEY_CODE42 = 0x32,
    KEY_CODE45 = 0x64,
    KEY_APP = 0x65,
    KEY_CODE107 = 0x85,
    KEY_CODE56 = 0x87,
    KEY_CODE133 = 0x88,
    KEY_CODE14 = 0x89,
    KEY_CODE132 = 0x8a,
    KEY_CODE131 = 0x8b,
    KEY_CODE151 = 0x90,   //key_Hangul
    KEY_CODE150 = 0x91,   //Key_Hanja

    //****************************************************************
    //Modify key
    KEY_L_CTRL = 0x00010000,
    KEY_L_SHIFT = 0x00020000,
    KEY_L_ALT = 0x00040000,
    KEY_L_WIN = 0x00080000,
    KEY_R_CTRL = 0x00100000,
    KEY_R_SHIFT = 0x00200000,
    KEY_R_ALT = 0x00400000,
    KEY_R_WIN = 0x00800000,
    //****************************************************************
    //macro�е�modify key����
    CTRL_L = 0xe0,
    SHIFT_L = 0xe1,
    ALT_L = 0xe2,
    WIN_L = 0xe3,
    CTRL_R = 0xe4,
    SHIFT_R = 0xe5,
    ALT_R = 0xe6,
    WIN_R = 0xe7,
    //****************************************************************
    //macro�е�mouse key����
    MOUSE_L = 0x01,
    MOUSE_R = 0x02,
    MOUSE_M = 0x04,
    MOUSE_B4 = 0x08,
    MOUSE_B5 = 0x10,
    MOUSE_LT = 0xff,
    MOUSE_RT = 0x01,
    MOUSE_UP = 0xff,
    MOUSE_DN = 0x01,
    //****************************************************************
    //��ϼ�����? 
    KEY_win_shift_4 = 0x000a0000 | KEY_4,
    KEY_win_shift_3 = 0x000a0000 | KEY_3,
    KEY_win_shift_ctrl_4 = 0x000b0000 | KEY_4,
    KEY_WIN_D = 0x00080000 | KEY_D,
    KEY_WIN_L = 0x00080000 | KEY_L,
    KEY_WIN_SPACEBAR = 0x00080000 | KEY_SPACEBAR,//SIRI
    KEY_WIN_TAB = 0x00080000 | KEY_TAB,//�����񴰿�
    KEY_WIN_E = 0x00080000 | KEY_E,//�����б�    
    KEY_ALT_SPACEBAR = 0x00040000 | KEY_SPACEBAR,//SIRI    
    KEY_CTRL_UP = 0x00010000 | KEY_UpArrow,
    KEY_CTRL_DN = 0x00010000 | KEY_DownArrow,
    KEY_CTRL_C = 0x00010000 | KEY_C,
    KEY_CTRL_V = 0x00010000 | KEY_V,
    KEY_CTRL_A = 0x00010000 | KEY_A,
    KEY_CTRL_Z = 0x00010000 | KEY_Z,
    KEY_CTRL_X = 0x00010000 | KEY_X,
    KEY_CTRL_S = 0x00010000 | KEY_S,
    KEY_ALT_TAB = 0x0004002B,
    KEY_ALT_F4 = 0x0004003D,
    //****************************************************************
    //BYTE1:1�����?2�Ҽ���3�м���4ǰ������5���˼���6��ڡ�?7�Ұڡ�8�Ϲ��֡�9�¹��֡�10X����11X���ҡ�12Y���ϡ�13Y����
    //BYTE2:0xff��������0����һ�Σ����·������룬�ͷŷ��ͷ��룩��1˫����2������
    //BYTE3:�����ظ�ʱ�䣬0Ĭ�ϼ��ʱ��?
    //Mouse key
    KEY_L_BUTTON = 0x01010100,
    KEY_R_BUTTON = 0x01020100,
    KEY_M_BUTTON = 0x01030100,
    KEY_RB0_BUTTON = 0x01040100,
    KEY_RB1_BUTTON = 0x01050100,
    KEY_TL_BUTTON = 0x01060100,
    KEY_TR_BUTTON = 0x01070100,
    KEY_SCROLLUP_BUTTON = 0x01080100,
    KEY_SCROLLDN_BUTTON = 0x01090100,
    KEY_MS_X_L = 0x010A0000,
    KEY_MS_X_R = 0x010B0000,
    KEY_MS_Y_L = 0x010C0000,
    KEY_MS_Y_R = 0x010D0000,
    //****************************************************************
    //��ý���?
    KEY_SysBkBrigthInc = 0x0200006f,
    KEY_SysBkBrigthDec = 0x02000070,
    KEY_IOSBack = 0x02000040,//F7

    KEY_NextTr = 0x020000b5,//0xE8
    KEY_PrevTr = 0x020000b6,//0xE9
    KEY_Stop = 0x020000b7,//0xEA
    KEY_Eject = 0x020000b8,//0xEB
    KEY_PlayPause = 0x020000cd,//0xEC
    KEY_Mute = 0x020000E2,//0xED
    KEY_VolumI = 0x020000e9,//0xEE  //+
    KEY_VolumD = 0x020000ea,//0xEF  //-

    KEY_Media = 0x02000183,//F0
    KEY_Email = 0x0200018a,//F1
    KEY_Calculator = 0x02000192,//F2
    KEY_MyComputer = 0x02000194,//F3
    KEY_Search = 0x02000221,//F4
    KEY_WWW = 0x02000223,//F5
    KEY_Back = 0x02000224,//F6
    KEY_Forward = 0x02000225,//F7

    KEY_iStop = 0x02000226,
    KEY_Refresh = 0x02000227,
    KEY_Favorites = 0x0200022a,

    MAC_F3 = 0x0200029F,
    MAC_F4 = 0x020002A0,
    KEY_SIR = 0x020000CF,
    KEY_COM_X = 0x0008001B,
    KEY_COM_C = 0x00080006,
    KEY_COM_V = 0x00080019,
    KEY_COM_Z = 0x0008001D,
    KEY_SHIFT_COM_Z = 0x000A001D,
    KEY_COM_A = 0x00080004,
    KEY_COM_F = 0x00080009,
    KEY_COM_G = 0x0008000A,
    KEY_SHIFT_COM_G = 0x000A000A,
    KEY_COM_H = 0x0008000B,
    KEY_OPTION_COM_H = 0x000C000B,
    KEY_COM_M = 0x00080010,
    KEY_OPTION_COM_M = 0x000C0010,
    KEY_COM_O = 0x00080012,
    KEY_COM_P = 0x00080013,
    KEY_COM_S = 0x00080016,
    KEY_COM_T = 0x00080017,
    KEY_COM_W = 0x0008001A,
    KEY_OPTION_COM_W = 0x000C001A,
    KEY_OPTION_COM_ESC = 0x000C0029,
    KEY_COM_SPACEBAR = 0x0008002C,
    KEY_OPTION_COM_SPACEBAR = 0x000C002C,
    KEY_CTRL_COM_SPACEBAR = 0x0009002C,
    KEY_CTRL_COM_F = 0x00090009,
    KEY_COM_TAB = 0x0008002B,
    KEY_SHIFT_COM_5 = 0x000A0022,
    KEY_SHIFT_COM_3 = 0x000A0020,
    KEY_SHIFT_COM_4 = 0x000A0021,
    KEY_SHIFT_COM_N = 0x000A0011,
    KEY_COM_COMMA = 0x00080036,

    // 新增Mac快捷键
    KEY_COM_GRAVE = 0x00080035,        // Command-重音符 (`) - 在当前App的各个窗口之间切换
    KEY_CTRL_COM_Q = 0x00090014,       // Control-Command-Q - 立即锁定屏幕
    KEY_OPTION_COM_EJECT = 0x000C0045, // Option-Command-F12 - 将Mac置于睡眠状态
    KEY_CTRL_SHIFT_EJECT = 0x000A0045, // Control-Shift-F12 - 将显示器置于睡眠状态
    KEY_SHIFT_COM_C = 0x000A0006,      // Shift-Command-C - 打开"电脑"窗口
    KEY_COM_I = 0x0008000C,            // Command-I - 显示所选文件的"显示简介"窗口
    KEY_SHIFT_COM_D = 0x000A0007,      // Shift-Command-D - 打开"桌面"文件夹
    KEY_SHIFT_COM_I2 = 0x000A000C,     // Shift-Command-I - 打开iCloud云盘
    KEY_SHIFT_COM_R = 0x000A0015,      // Shift-Command-R - 打开"隔空投送"窗口
    KEY_COM_DELETE = 0x0008004C,       // Command-Delete - 将所选项目移到废纸篓
    KEY_SHIFT_COM_DELETE = 0x000A004C, // Shift-Command-Delete - 清倒废纸篓
    KEY_COM_B = 0x00080005,             // Command-B - 以粗体显示所选文本
    KEY_COM_U = 0x00080018,             // Command-U - 对所选文本加下划线
    //****************************************************************
    //byte3��0x03��ʾ��macro��byte2��������ʾmacro��ѭ����ʽ��byte1��ѭ������  byte0��������ʾmacro���?
    //byte2����ʱ��������
    //0x01	ָ��ѭ��������0x02ѭ������������£�?0x03ѭ������ǰ���ɿ�
    //Macro Key
    KEY_MACRO0 = 0x03000000,
    KEY_MACRO1 = 0x03000001,

    //****************************************************************
    //ͨ��ð�ݶ˿ڷ����Զ���ļ�ֵ�������������⹦�ܴ�����������?�̶������ӣ�
    //�Զ����?
    KEY_Define1 = 0x04000001,
    KEY_Define2 = 0x04000002,
    //****************************************************************
    DPI_SWITCH_I = 0x05010000,
    DPI_SWITCH_D = 0x05020000,
    DPI_SWITCH_L = 0x05040000,
    DPI_SWITCH_LOCK = 0x050A0000,
    PRFILE_SWITCH_I = 0x06010000,
    PRFILE_SWITCH_D = 0x06020000,
    PRFILE_SWITCH_L = 0x06040000,
    //****************************************************************
    //���⹦�ܼ�
    SP_SWAP_ASDW = 0x07000000,      //ȡ��ASWD�뷽��
    SP_Winlock = 0x07000001,      //WIN Lock
    SP_Allkeylock = 0x07000002,      //���м���ס
    SP_MACRO_REC0 = 0x07000003,      //MACRO¼�Ƽ�
    SP_ProfileReset = 0x07000004,      //���в����ָ�Ĭ�� 
    SP_BT_DEV0 = 0x07000005,      //����ģʽ0
    SP_BT_DEV1 = 0x07000006,      //����ģʽ1
    SP_BT_DEV2 = 0x07000007,      //����ģʽ2
    SP_BT_DEV3 = 0x07000008,      //2.4Gģʽ
    SP_BT_DEV4 = 0x07000009,      //USBģʽ
    SP_TEST_EMI = 0x0700000a,      //���߽������?    
    SP_LedOnOff = 0x0700000b,
    SP_BatView = 0x0700000c,      //电量显示
    SP_Power_Mode = 0x0700000c,      //电量显示  
    SP_WinMacMode = 0x0700000d,
    SP_Windows_Mode = 0x0700000e,      //����Windows
    SP_Mac_Mode = 0x0700000f,
    SP_KB_Mode = 0x07000010,
    SP_O_Mode = 0x07000022,
    SP_L_Mode = 0x07000023,
    SP_Touch_Mode = 0x07000024,
    SP_B6Key_Mode = 0x07000025,
    //****************************************************************
    //byte0���̶�0x08
    //byte1��0��Ч�л���1��Ч����2��ɫ�л���3�����л���4�ٶ��л���5������Ϸ����¼�ƣ�6��Ϸ���ֱ��棬7¼��/���棬8��λ��9��Чģʽָ��
    //byte2��0ѭ����1+/��2-/�ң����byte1Ϊ9����������ֵ������ǰģʽ
    //byte3��0��������1����1��2����2
    //�ƹ�ģʽ�趨
    KEY_LED_MODE0 = 0x08090000, //ֱ���趨Ϊģʽ0
    KEY_LED_MODE1 = 0x08090100, //ֱ���趨Ϊģʽ1
    KEY_LED_MODE2 = 0x08090200, //ֱ���趨Ϊģʽ2
    KEY_LED_MODE3 = 0x08090300, //ֱ���趨Ϊģʽ3
    KEY_LED_MODE4 = 0x08090400, //ֱ���趨Ϊģʽ0
    KEY_LED_MODE5 = 0x08090500, //ֱ���趨Ϊģʽ1
    KEY_LED_MODE6 = 0x08090600, //ֱ���趨Ϊģʽ2
    KEY_LED_MODE7 = 0x08090700, //ֱ���趨Ϊģʽ3
    KEY_LED_MODE8 = 0x08090800, //ֱ���趨Ϊģʽ0
    KEY_LED_MODE9 = 0x08090900, //ֱ���趨Ϊģʽ1
    KEY_LED_MODE10 = 0x08090A00, //ֱ���趨Ϊģʽ2
    KEY_LED_MODE11 = 0x08090B00, //ֱ���趨Ϊģʽ3
    KEY_LED_MODE12 = 0x08090C00, //ֱ���趨Ϊģʽ0
    KEY_LED_MODE13 = 0x08090D00, //ֱ���趨Ϊģʽ1
    KEY_LED_MODE14 = 0x08090E00, //ֱ���趨Ϊģʽ2
    KEY_LED_MODE15 = 0x08090F00, //ֱ���趨Ϊģʽ3
    KEY_LED_MODE16 = 0x08091000, //ֱ���趨Ϊģʽ0
    KEY_LED_MODE17 = 0x08091100, //ֱ���趨Ϊģʽ1
    KEY_LED_MODE18 = 0x08091200, //ֱ���趨Ϊģʽ2
    KEY_LED_MODE19 = 0x08091300, //ֱ���趨Ϊģʽ3\

    KEY_LED_MODE20 = 0x08092000, //ֱ���趨Ϊģʽ20
    KEY_LED_MODE21 = 0x08092100, //ֱ���趨Ϊģʽ21
    KEY_LED_MODE22 = 0x08092200, //ֱ���趨Ϊģʽ22
    KEY_LED_MODE31 = 0x08091F00, //ֱ���趨Ϊģʽ31
    KEY_LED_MODE32 = 0x08092000, //ֱ���趨Ϊģʽ32
    //��Ч�л�
    KEY_LED_MODEL = 0x08000000, //ֱ���趨Ϊģʽ+
    KEY_LED_MODEI = 0x08000100, //ֱ���趨Ϊģʽ-
    KEY_LED_MODED = 0x08000200, //ֱ���趨ΪģʽLOOP

    KEY_Define_LED_MODEL = 0x08000300, //ֱ���趨Ϊģʽ+
    KEY_Define_LED_MODEI = 0x08000400, //ֱ���趨Ϊģʽ-
    KEY_Define_LED_MODED = 0x08000500, //ֱ���趨ΪģʽLOOP


    //��Ч����
    KEY_LED_DirectionL = 0x08010000, //��Ч����LOOP
    KEY_LED_DirectionI = 0x08010100, //��Ч������
    KEY_LED_DirectionD = 0x08010200, //��Ч������

    //��ɫ�л�
    KEY_LED_COLOR_MODEI = 0x08020100, //ֱ���趨Ϊ��ɫ+
    KEY_LED_COLOR_MODED = 0x08020200, //ֱ���趨Ϊ��ɫ-
    KEY_LED_COLOR_MODEL = 0x08020000, //ֱ���趨Ϊ��ɫLOOP

    //��ɫ�л�
    KEY_LED_COLOR_LOGOI = 0x08020101, //ֱ���趨Ϊ��ɫ+
    KEY_LED_COLOR_LOGOD = 0x08020201, //ֱ���趨Ϊ��ɫ-
    KEY_LED_COLOR_LOGOL = 0x08020001, //ֱ���趨Ϊ��ɫLOOP

    //��ɫ�л�
    KEY_LED_COLOR_SIDEI = 0x08020102, //ֱ���趨Ϊ��ɫ+
    KEY_LED_COLOR_SIDED = 0x08020202, //ֱ���趨Ϊ��ɫ-
    KEY_LED_COLOR_SIDEL = 0x08020002, //ֱ���趨Ϊ��ɫLOOP

    //����
    KEY_LED_LUMINI = 0x08030100, //ֱ���趨Ϊģʽ+
    KEY_LED_LUMIND = 0x08030200, //ֱ���趨Ϊģʽ-
    KEY_LED_LUMINL = 0x08030000, //ֱ���趨ΪģʽLOOP

    //�ٶ�
    KEY_LED_BREATHI = 0x08040100, //  +
    KEY_LED_BREATHD = 0x08040200, //  -
    KEY_LED_BREATHL = 0x08040000, //  

    //¼��
    SP_LED_REC_Start = 0x08050000, //LED¼�Ƽ�����
    SP_LED_REC_Save = 0x08060000, //LED¼�Ƽ�����
    SP_LED_REC = 0x08070000, //LED¼�Ƽ�����/����
    SP_LED_REC_Reset = 0x08080000, //LED�ָ���������
    SP_KB_REC_Reset = 0x08ff0000,
    //logo
    KEY_LOG_MODEL = 0x08000001, //ֱ���趨Ϊģʽ+
    KEY_LOG_MODEI = 0x08000101, //ֱ���趨Ϊģʽ-
    KEY_LOG_MODED = 0x08000201, //ֱ���趨ΪģʽLOOP

    KEY_LOG_DirectionL = 0x08010001, //��Ч����LOOP
    KEY_LOG_DirectionI = 0x08010101, //��Ч������
    KEY_LOG_DirectionD = 0x08010201, //��Ч������

    KEY_LOG_COLOR_MODEI = 0x08020101, //ֱ���趨Ϊ��ɫ+
    KEY_LOG_COLOR_MODED = 0x08020201, //ֱ���趨Ϊ��ɫ-
    KEY_LOG_COLOR_MODEL = 0x08020001, //ֱ���趨Ϊ��ɫLOOP

    KEY_LOG_LUMINI = 0x08030101, //ֱ���趨Ϊģʽ+
    KEY_LOG_LUMIND = 0x08030201, //ֱ���趨Ϊģʽ-
    KEY_LOG_LUMINL = 0x08030001, //ֱ���趨ΪģʽLOOP

    KEY_LOG_BREATHI = 0x08040101, //ֱ���趨Ϊ�����ٶ�+
    KEY_LOG_BREATHD = 0x08040201, //ֱ���趨Ϊ�����ٶ�-
    KEY_LOG_BREATHL = 0x08040001, //ֱ���趨Ϊ�����ٶ�LOOP

    
    //������2
	KEY_LOG2_MODEL = 0x08000002,		//ֱ���趨Ϊģʽ+
   	KEY_LOG2_MODEI = 0x08000102,		//ֱ���趨Ϊģʽ-
    KEY_LOG2_MODED = 0x08000202,		//ֱ���趨ΪģʽLOOP

    KEY_LOG2_COLOR_MODEI = 0x08020102,		//ֱ���趨Ϊ��ɫ+
    KEY_LOG2_COLOR_MODED = 0x08020202,		//ֱ���趨Ϊ��ɫ-
    KEY_LOG2_COLOR_MODEL = 0x08020002,		//ֱ���趨Ϊ��ɫLOOP

    KEY_LOG2_LUMINI = 0x08030102,		//ֱ���趨Ϊģʽ+
    KEY_LOG2_LUMIND = 0x08030202,		//ֱ���趨Ϊģʽ-
    KEY_LOG2_LUMINL = 0x08030002,		//ֱ���趨ΪģʽLOOP

    KEY_LOG2_BREATHI = 0x08040102,		//ֱ���趨Ϊ�����ٶ�+
    KEY_LOG2_BREATHD = 0x08040202,		//ֱ���趨Ϊ�����ٶ�-
    KEY_LOG2_BREATHL = 0x08040002,		//ֱ���趨Ϊ�����ٶ�LOOP

    //ReportRate�趨
    KEY_REPORT_RATE0 = 0x09000000, //ֱ���趨Ϊ125
    KEY_REPORT_RATE1 = 0x09000001, //ֱ���趨Ϊ250
    KEY_REPORT_RATE2 = 0x09000002, //ֱ���趨Ϊ500
    KEY_REPORT_RATE3 = 0x09000003, //ֱ���趨Ϊ1000
    KEY_REPORT_RATEI = 0x09010000, //�ر��ʵ�λ��
    KEY_REPORT_RATED = 0x09020000, //�ر��ʵ�λ��
    KEY_REPORT_RATEL = 0x09030000, //�ر��ʵ�λѭ��

    //****************************************************************
    //FN��
    KEY_Fn1 = 0x0d000000,
    KEY_Fn2 = 0x0d010000,
    //****************************************************************
    //��Դ��
    KEY_Power = 0x10000001,
    KEY_Sleep = 0x10000002,
    KEY_WakeUp = 0x10000004,

    KEY_Tilde = 0x00020035,
    KEY_Exclamation = 0x0002001e,
    KEY_AtSign = 0x0002001f,
    KEY_Sharp = 0x00020020,
    KEY_Dollar = 0x00020021,
    KEY_Percent = 0x00020022,
    KEY_Circumflex = 0x00020023,
    KEY_Ampersand = 0x00020024,
    KEY_Asterisk = 0x00020025,
    KEY_LeftParenthesis = 0x00020026,
    KEY_RightParenthesis = 0x00020027,
    KEY_Underscore2 = 0x0002002D,
    KEY_Plus = 0x0002002E,
    KEY_LeftBrace = 0x0002002F,
    KEY_RightBrace = 0x00020030,
    KEY_Pipe = 0x00020031,
    KEY_Colon = 0x00020033,
    KEY_DoubleQuote = 0x00020034,
    KEY_LessSign = 0x00020036,
    KEY_GreaterSign = 0x00020037,
    KEY_Question = 0x00020038,

    KEY_RK_WWW = 0x0A000000,
    KEY_Fn_Ctrl  = 0x16000000,
}

export const KeyText: Record<number, Array<String>> = {
    0x00: [''],
    0x01: ['Fn'],
    0x04: ['A'],
    0x05: ['B'],
    0x06: ['C'],
    0x07: ['D'],
    0x08: ['E'],
    0x09: ['F'],
    0x0a: ['G'],
    0x0b: ['H'],
    0x0c: ['I'],
    0x0d: ['J'],
    0x0e: ['K'],
    0x0f: ['L'],
    0x10: ['M'],
    0x11: ['N'],
    0x12: ['O'],
    0x13: ['P'],
    0x14: ['Q'],
    0x15: ['R'],
    0x16: ['S'],
    0x17: ['T'],
    0x18: ['U'],
    0x19: ['V'],
    0x1a: ['W'],
    0x1b: ['X'],
    0x1c: ['Y'],
    0x1d: ['Z'],

    0x29: ['ESC'],
    0x2b: ['TAB'],
    0x39: ['CAPS'],
    0x2a: ['BackSpace'],
    0x28: ['ENTER'],
    0x2c: ['Space'],

    0x35: ['`~'],   //bo lang
    0x2d: ['_-'],   //xia hua xian
    0x2e: ['+='],   //deng hao
    0x2f: ['{['],   //zuo zhong kuo hao
    0x30: ['}]'],   //you zhong kuo hao
    0x31: ['|\\'],   //xie gang      //shu xian
    0x33: [':;'],   //fen hao
    0x34: ['"\''],   //yin hao
    0x36: ['<,'],   //dou hao
    0x37: ['>.'],   //ju hao
    0x38: ['?/'],   //dun hao
    //////[////////////////////////
    0x1e: ['1!'],
    0x1f: ['2@'],
    0x20: ['3#'],
    0x21: ['4$'],
    0x22: ['5%'],
    0x23: ['6^'],
    0x24: ['7&'],
    0x25: ['8*'],
    0x26: ['9('],
    0x27: ['0)'],
    //////[//////////////
    0x3a: ['F1'],
    0x3b: ['F2'],
    0x3c: ['F3'],
    0x3d: ['F4'],
    0x3e: ['F5'],
    0x3f: ['F6'],
    0x40: ['F7'],
    0x41: ['F8'],
    0x42: ['F9'],
    0x43: ['F10'],
    0x44: ['F11'],
    0x45: ['F12'],
    0x68: ['F13'],
    0x69: ['F14'],
    0x6A: ['F15'],

    0x46: ['Print'],
    0x47: ['ScrLock'],
    0x48: ['Pause'],
    0x49: ['Ins'],
    0x4a: ['Home'],
    0x4b: ['PgUp'],
    0x4c: ['Del'],
    0x4d: ['End'],
    0x4e: ['PgDn'],

    0x4f: ['→'],
    0x50: ['←'],
    0x51: ['↓'],
    0x52: ['↑'],

    0x53: ['NumLock'],
    0x54: ['/'],
    0x55: ['*'],
    0x56: ['-'],
    0x57: ['+'],
    0x58: ['Enter'],
    0x63: ['.'],

    0x59: ['1'],
    0x5a: ['2'],
    0x5b: ['3'],
    0x5c: ['4'],
    0x5d: ['5'],
    0x5e: ['6'],
    0x5f: ['7'],
    0x60: ['8'],
    0x61: ['9'],
    0x62: ['0'],

    //0x31[: '',
    0x32: ['K42'],
    0x64: ['|\\'],
    0x65: ['App'],
    0x85: ['K107'],
    0x87: ['K56'],
    0x88: ['K133'],
    0x89: ['K14'],
    0x8a: ['K132'],
    0x8b: ['K131'],
    0x90: ['K151'],   //key_Hangul
    0x91: ['K150'],   //Key_Hanja

    //****************************************************************
    //Modify key
    0x00010000: ['L-Ctrl'],
    0x00020000: ['L-Shift'],
    0x00040000: ['L-Alt'],
    0x00080000: ['L-Win'],
    0x00100000: ['R-Ctrl'],
    0x00200000: ['R-Shift'],
    0x00400000: ['R-Alt'],
    0x00800000: ['R-Win'],
    //****************************************************************
    //macro�е�modify key����
    0xe0: ['L-Ctrl'],
    0xe1: ['L-Shift'],
    0xe2: ['L-Alt'],
    0xe3: ['L-Win'],
    0xe4: ['R-Ctrl'],
    0xe5: ['R-Shift'],
    0xe6: ['R-Alt'],
    0xe7: ['R-Win'],
    //****************************************************************
    //macro�е�mouse key����
    //0x01: ['Mouse-L'],
    //0x02: ['Mouse-R'],
    //0x04: 'Mouse-M',
    //0x08: 'Mouse-B4',
    //0x10: 'Mouse-B5',
    //0xff: ['Mouse-LT'],
    //0x01: 'Mouse-RT',
    //0xff: 'Mouse-UP',
    //0x01: 'Mouse-DN',
    //****************************************************************
    //��ϼ�����? 
    //KEY_win_shift_4	  	  : 'Win + Shift + 4',
    //KEY_win_shift_3	  	  : 'Win + Shift + 4',
    //KEY_win_shift_ctrl_4  : 'Win + Shift + Ctrl + 4',
    //KEY_WIN_D	  		  : 'Win + D',
    //KEY_WIN_SPACEBAR	  : 'Win + Space',//SIRI
    //KEY_WIN_TAB	  		  : 'Win + Tab',//�����񴰿�
    //KEY_WIN_E	  		  : 'Win + E',//�����б�    
    //KEY_ALT_SPACEBAR	  : 'Alt + Space',//SIRI    
    //KEY_CTRL_UP	  		  : 'Ctrl + UP',
    //KEY_CTRL_DN	  		  : 'Ctrl + DN',
    //KEY_CTRL_C	  		  : 'Ctrl + C',
    //KEY_CTRL_V	  		  : 'Ctrl + V',
    //KEY_ALT_TAB	  		  : 'Alt + Tab',
    
    //****************************************************************
    //BYTE1:1�����?2�Ҽ���3�м���4ǰ������5���˼���6��ڡ�?7�Ұڡ�8�Ϲ��֡�9�¹��֡�10X����11X���ҡ�12Y���ϡ�13Y����
    //BYTE2:0xff��������0����һ�Σ����·������룬�ͷŷ��ͷ��룩��1˫����2������
    //BYTE3:�����ظ�ʱ�䣬0Ĭ�ϼ��ʱ��?
    //Mouse key
    0x01010100: ['mouseKey.leftKey'],
    0x01020100: ['mouseKey.rightKey'],
    0x01030100: ['mouseKey.middleKey'],
    0x01040100: ['mouseKey.forwardKey'],
    0x01050100: ['mouseKey.backKey'],
    0x01060100: ['mouseKey.leftShaft'],
    0x01070100: ['mouseKey.rightShaft'],
    0x01080100: ['mouseKey.wheelUp'],
    0x01090100: ['mouseKey.wheelDown'],
    0x010A0000: ['mouseKey.xAxleLeft'],
    0x010B0000: ['mouseKey.xAxleRight'],
    0x010C0000: ['mouseKey.yAxleUp'],
    0x010D0000: ['mouseKey.yAxleDown'],
    //****************************************************************
    //��ý���?
    0x0200006f: ['SysBkBrigthInc'],
    0x02000070: ['SysBkBrigthDec'],
    0x02000040: ['IOSBack'],//F7

    0x020000b5: ['NextTr'],//0xE8
    0x020000b6: ['PrevTr'],//0xE9
    0x020000b7: ['Stop'],//0xEA
    0x020000b8: ['Eject'],//0xEB
    0x020000cd: ['PlayPause'],//0xEC
    0x020000E2: ['Mute'],//0xED
    0x020000e9: ['VolumI'],//0xEE  //+
    0x020000ea: ['VolumD'],//0xEF  //-

    0x02000183: ['Media'],//F0
    0x0200018a: ['Email'],//F1
    0x02000192: ['Calculator'],//F2
    0x02000194: ['MyComputer'],//F3
    0x02000221: ['Search'],//F4
    0x02000223: ['WWW'],//F5
    0x02000224: ['Back'],//F6
    0x02000225: ['Forward'],//F7

    0x02000226: ['iStop'],
    0x02000227: ['Refresh'],
    0x0200022a: ['Favorites'],

    0x020000CF: ['Siri'],
    0x0200029F: ['MAC-F3'],
    0x020002A0: ['MAC-F4'],
    //****************************************************************
    //byte3��0x03��ʾ��macro��byte2��������ʾmacro��ѭ����ʽ��byte1��ѭ������  byte0��������ʾmacro���?
    //byte2����ʱ��������
    //0x01	ָ��ѭ��������0x02ѭ������������£�?0x03ѭ������ǰ���ɿ�
    //Macro Key
    0x03000000: ['Macro0'],
    0x03000001: ['Macro1'],

    //****************************************************************
    //ͨ��ð�ݶ˿ڷ����Զ���ļ�ֵ�������������⹦�ܴ�����������?�̶������ӣ�
    //�Զ����?
    0x04000001: ['Define1'],
    0x04000002: ['Define2'],
    0x05010000: ['dpiKey.increase'],
    0x05020000: ['dpiKey.decrease'],
    0x05040000: ['dpiKey.loop'],
    0x050A0000: ['dpiKey.lock'],
    0x06010000: ['ProfileSwitch+'],
    0x06020000: ['ProfileSwitch-'],
    0x06040000: ['ProfileSwitchLoop'],
    //****************************************************************
    0x07000000: ['InvertASWD'],      //ȡ��ASWD�뷽��
    0x07000001: ['WinLock'],      //WIN Lock
    0x07000002: ['AllLock'],      //���м���ס
    0x07000003: ['Macro'],      //MACRO¼�Ƽ�
    0x07000004: ['AllReset'],      //���в����ָ�Ĭ�� 
    0x07000005: ['BT0'],      //����ģʽ0
    0x07000006: ['BT1'],      //����ģʽ1
    0x07000007: ['BT2'],      //����ģʽ2
    0x07000008: ['2.4G'],      //2.4Gģʽ
    0x07000009: ['USB'],      //USBģʽ
    0x0700000a: ['EMI Test'],      //���߽������?    
    0x0700000b: ['LedOnOff'],
    0x0700000c: ['Battery'],      //电量显示 
    0x0700000d: ['WinMac'],
    0x0700000e: ['Win'], 
    0x0700000f: ['Mac'],          //����Mac
    0x07000020: ['Windows'],      //����Windows
    0x07000010: ['KB'],
    0x07000022: ['O_Mode'],
    0x07000023: ['L_Mode'],
    0x07000024: ['Touch_Mode'],
    0x07000025: ['B6Key_Mode'],
    //****************************************************************
    //byte0���̶�0x08
    //byte1��0��Ч�л���1��Ч����2��ɫ�л���3�����л���4�ٶ��л���5������Ϸ����¼�ƣ�6��Ϸ���ֱ��棬7¼��/���棬8��λ��9��Чģʽָ��
    //byte2��0ѭ����1+/��2-/�ң����byte1Ϊ9����������ֵ������ǰģʽ
    //byte3��0��������1����1��2����2
    //�ƹ�ģʽ�趨
    0x08090000: ['light.menu_0'], //ֱ���趨Ϊģʽ0
    0x08090100: ['light.menu_1'], //ֱ���趨Ϊģʽ1
    0x08090200: ['light.menu_2'], //ֱ���趨Ϊģʽ2
    0x08090300: ['light.menu_3'], //ֱ���趨Ϊģʽ3

    0x08092000: ['LedMode20'], //ֱ���趨Ϊģʽ20
    0x08092100: ['LedMode21'], //ֱ���趨Ϊģʽ21
    0x08092200: ['LedMode22'], //ֱ���趨Ϊģʽ22
    //��Ч�л�[
    0x08000000: ['LedMode+'], //ֱ���趨Ϊģʽ+
    0x08000100: ['LedMode-'], //ֱ���趨Ϊģʽ-
    0x08000200: ['LedModeLoop'], //ֱ���趨ΪģʽLOOP

    0x08000300: ['DefineLedModel+'], //ֱ���趨Ϊģʽ+
    0x08000400: ['DefineLedModel-'], //ֱ���趨Ϊģʽ-
    0x08000500: ['DefineLedModelLoop'], //ֱ���趨ΪģʽLOOP

    //��Ч����
    0x08010000: ['LedDirctionLoop'], //��Ч����LOOP
    0x08010100: ['LedDirction+'], //��Ч������
    0x08010200: ['LedDirction-'], //��Ч������

    //��ɫ�л�
    0x08020100: ['LedColorMode+'], //ֱ���趨Ϊ��ɫ+
    0x08020200: ['LedColorMode-'], //ֱ���趨Ϊ��ɫ-
    0x08020000: ['LedColorModeLoop'], //ֱ���趨Ϊ��ɫLOOP

    //����
    0x08030100: ['light.fun_1'], //ֱ���趨Ϊģʽ+
    0x08030200: ['light.fun_2'], //ֱ���趨Ϊģʽ-
    0x08030000: ['LedLuminLoop'], //ֱ���趨ΪģʽLOOP

    //�ٶ�
    0x08040100: ['light.fun_3'], //  +
    0x08040200: ['light.fun_4'], //  -
    0x08040000: ['LedBreathLoop'], //  

    //¼��
    0x08050000: ['LedRecStart'], //LED¼�Ƽ�����
    0x08060000: ['LedRecSave'], //LED¼�Ƽ�����
    0x08070000: ['LedRec'], //LED¼�Ƽ�����/����
    0x08080000: ['LedRecReset'], //LED�ָ���������
    0x08ff0000: ['SP_KB_REC_Reset'],	
    //logo
    0x08000001: ['LogoModelLoop'], //ֱ���趨Ϊģʽ+
    0x08000101: ['LogoModel+'], //ֱ���趨Ϊģʽ-
    0x08000201: ['LogoModel-'], //ֱ���趨ΪģʽLOOP

    0x08010001: ['LogoDirectionLoop'], //��Ч����LOOP
    0x08010101: ['LogoDirection+'], //��Ч������
    0x08010201: ['LogoDirection-'], //��Ч������

    0x08020101: ['LogoColorMode+'], //ֱ���趨Ϊ��ɫ+
    0x08020201: ['LogoColorMode-'], //ֱ���趨Ϊ��ɫ-
    0x08020001: ['LogoColorModeLoop'], //ֱ���趨Ϊ��ɫLOOP

    0x08030101: ['LogoLumin+'], //ֱ���趨Ϊģʽ+
    0x08030201: ['LogoLumin-'], //ֱ���趨Ϊģʽ-
    0x08030001: ['LogoLuminLoop'], //ֱ���趨ΪģʽLOOP

    0x08040101: ['LogoBreath+'], //ֱ���趨Ϊ�����ٶ�+
    0x08040201: ['LogoBreath-'], //ֱ���趨Ϊ�����ٶ�-
    0x08040001: ['LogoBreathLoop'], //ֱ���趨Ϊ�����ٶ�LOOP

    0x08000002: ['Log2Model'],


    //ReportRate�趨
    0x09000000: ['ReportRate125'], //ֱ���趨Ϊ125
    0x09000001: ['ReportRate250'], //ֱ���趨Ϊ250
    0x09000002: ['ReportRate500'], //ֱ���趨Ϊ500
    0x09000003: ['ReportRate1000'], //ֱ���趨Ϊ1000
    0x09010000: ['ReportRateI'], //�ر��ʵ�λ��
    0x09020000: ['ReportRateD'], //�ر��ʵ�λ��
    0x09030000: ['ReportRateLoop'], //�ر��ʵ�λѭ��

    0x0d000000: ['Fn1'],
    0x0d010000: ['Fn2'],
    //��Դ��
    0x10000001: ['Power'],
    0x10000002: ['Sleep'],
    0x10000004: ['WakeUp'],

    0x00020035: ['~'],
    0x0002001e: ['!'],
    0x0002001f: ['@'],
    0x00020020: ['#'],
    0x00020021: ['$'],
    0x00020022: ['%'],
    0x00020023: ['^'],
    0x00020024: ['&'],
    0x00020025: ['*'],
    0x00020026: ['('],
    0x00020027: [')'],
    0x0002002D: ['_'],
    0x0002002E: ['+'],
    0x0002002F: ['{'],
    0x00020030: ['}'],
    0x00020031: ['|'],
    0x00020033: [':'],
    0x00020034: ['"'],
    0x00020036: ['<'],
    0x00020037: ['>'],
    0x00020038: ['?'],

    0x08090400: ['light.menu_4'],
    0x08090500: ['light.menu_5'],
    0x08090600: ['light.menu_6'],
    0x08090700: ['light.menu_7'],
    0x08090800: ['light.menu_8'],
    0x08090900: ['light.menu_9'],
    0x08090A00: ['light.menu_10'],
    0x08090B00: ['light.menu_11'],
    0x08090C00: ['light.menu_12'],
    0x08090D00: ['light.menu_13'],
    0x08090E00: ['light.menu_14'],
    0x08090F00: ['light.menu_15'],
    0x08091000: ['light.menu_16'],
    0x08091100: ['light.menu_17'],
    0x08091200: ['light.menu_18'],
    0x08091300: ['light.menu_19'],

    0x0A000000: ['RK Web'],

    //0x00010006: 'Ctrl+C',
    //0x00010019: 'Ctrl+V',
    0x00010004: ['Ctrl+A'],
    //0x0001001b: 'Ctrl+X',
    0x0001001d: ['Ctrl+Z'],

    0x00010006: ['shortcuts.copy'],
    0x00010019: ['shortcuts.paste'],
    0x0001001b: ['shortcuts.cut'],
    0x00010016: ['shortcuts.save'],
    0x0004002b: ['shortcuts.switchApp'],
    0x00080007: ['shortcuts.desktop'],
    0x0008000f: ['shortcuts.lock'],
    0x0004003d: ['shortcuts.close'],
}

export const KeyText_2: Record<number, Array<String>> = {
    0x00: [''],
    0x04: ['A'],
    0x05: ['B'],
    0x06: ['C'],
    0x07: ['D'],
    0x08: ['E'],
    0x09: ['F'],
    0x0a: ['G'],
    0x0b: ['H'],
    0x0c: ['I'],
    0x0d: ['J'],
    0x0e: ['K'],
    0x0f: ['L'],
    0x10: ['M'],
    0x11: ['N'],
    0x12: ['O'],
    0x13: ['P'],
    0x14: ['Q'],
    0x15: ['R'],
    0x16: ['S'],
    0x17: ['T'],
    0x18: ['U'],
    0x19: ['V'],
    0x1a: ['W'],
    0x1b: ['X'],
    0x1c: ['Y'],
    0x1d: ['Z'],

    0x29: ['ESE'],
    0x2b: ['TAB'],
    0x39: ['CAPS'],
    0x2a: ['BackSpace'],
    0x28: ['ENTER'],
    0x2c: ['Space'],

    0x35: ['`'],   //bo lang
    0x2d: ['_'],   //xia hua xian
    0x2e: ['+'],   //deng hao
    0x2f: ['{'],   //zuo zhong kuo hao
    0x30: ['}'],   //you zhong kuo hao
    0x31: ['|'],   //xie gang      //shu xian
    0x33: [':'],   //fen hao
    0x34: ['"'],   //yin hao
    0x36: ['<'],   //dou hao
    0x37: ['>'],   //ju hao
    0x38: ['?'],   //dun hao
    //////////////////////////////
    0x1e: ['1'],
    0x1f: ['2'],
    0x20: ['3'],
    0x21: ['4'],
    0x22: ['5'],
    0x23: ['6'],
    0x24: ['7'],
    0x25: ['8'],
    0x26: ['9'],
    0x27: ['0'],
    ////////////////////
    0x3a: ['F1'],
    0x3b: ['F2'],
    0x3c: ['F3'],
    0x3d: ['F4'],
    0x3e: ['F5'],
    0x3f: ['F6'],
    0x40: ['F7'],
    0x41: ['F8'],
    0x42: ['F9'],
    0x43: ['F10'],
    0x44: ['F11'],
    0x45: ['F12'],
    0x68: ['F13'],
    0x69: ['F14'],
    0x6A: ['F15'],

    0x46: ['Print'],
    0x47: ['ScrLock'],
    0x48: ['Pause'],
    0x49: ['Ins'],
    0x4a: ['Home'],
    0x4b: ['PgUp'],
    0x4c: ['Del'],
    0x4d: ['End'],
    0x4e: ['PgDn'],

    0x4f: ['→'],
    0x50: ['←'],
    0x51: ['↓'],
    0x52: ['↑'],

    0x53: ['NumLock'],
    0x54: ['/'],
    0x55: ['*'],
    0x56: ['-'],
    0x57: ['+'],
    0x58: ['Enter'],
    0x63: ['.'],

    0x59: ['1'],
    0x5a: ['2'],
    0x5b: ['3'],
    0x5c: ['4'],
    0x5d: ['5'],
    0x5e: ['6'],
    0x5f: ['7'],
    0x60: ['8'],
    0x61: ['9'],
    0x62: ['0'],

    //0x31: '',
    0x32: ['K42'],  
    0x64: ['|\\'],  
    0x65: ['App'],  
    0x85: ['K107'],  
    0x87: ['K56'],  
    0x88: ['K133'],  
    0x89: ['K14'],  
    0x8a: ['K132'],  
    0x8b: ['K131'],  
    0x90: ['K151'],  //key_Hangul
    0x91: ['K150'],  //Key_Hanja

    //****************************************************************
    //Modify key
    0x00010000: ['L-Ctrl'],
    0x00020000: ['L-Shift'],
    0x00040000: ['L-Alt'],
    0x00080000: ['L-Win'],
    0x00100000: ['R-Ctrl'],
    0x00200000: ['R-Shift'],
    0x00400000: ['R-Alt'],
    0x00800000: ['R-Win'],
    //****************************************************************
    //macro�е�modify key����
    0xe0: ['L-Ctrl'],
    0xe1: ['L-Shift'],
    0xe2: ['L-Alt'],
    0xe3: ['L-Win'],
    0xe4: ['R-Ctrl'],
    0xe5: ['R-Shift'],
    0xe6: ['R-Alt'],
    0xe7: ['R-Win'],
    //****************************************************************
    //macro�е�mouse key����
    0x01: ['Mouse-L'],
    0x02: ['Mouse-R'],
    //0x04: 'Mouse-M',
    //0x08: 'Mouse-B4',
    //0x10: 'Mouse-B5',
    0xff: ['Mouse-LT'],
    //0x01: 'Mouse-RT',
    //0xff: 'Mouse-UP',
    //0x01: 'Mouse-DN',
    //****************************************************************
    //��ϼ�����? 
    //KEY_win_shift_4	  	  : 'Win + Shift + 4',
    //KEY_win_shift_3	  	  : 'Win + Shift + 4',
    //KEY_win_shift_ctrl_4  : 'Win + Shift + Ctrl + 4',
    //KEY_WIN_D	  		  : 'Win + D',
    //KEY_WIN_SPACEBAR	  : 'Win + Space',//SIRI
    //KEY_WIN_TAB	  		  : 'Win + Tab',//�����񴰿�
    //KEY_WIN_E	  		  : 'Win + E',//�����б�    
    //KEY_ALT_SPACEBAR	  : 'Alt + Space',//SIRI    
    //KEY_CTRL_UP	  		  : 'Ctrl + UP',
    //KEY_CTRL_DN	  		  : 'Ctrl + DN',
    //KEY_CTRL_C	  		  : 'Ctrl + C',
    //KEY_CTRL_V	  		  : 'Ctrl + V',
    //KEY_ALT_TAB	  		  : 'Alt + Tab',
    //****************************************************************
    //BYTE1:1�����?2�Ҽ���3�м���4ǰ������5���˼���6��ڡ�?7�Ұڡ�8�Ϲ��֡�9�¹��֡�10X����11X���ҡ�12Y���ϡ�13Y����
    //BYTE2:0xff��������0����һ�Σ����·������룬�ͷŷ��ͷ��룩��1˫����2������
    //BYTE3:�����ظ�ʱ�䣬0Ĭ�ϼ��ʱ��?
    //Mouse key
    0x01010100: ['L-Button'],
    0x01020100: ['R-Button'],
    0x01030100: ['M-Button'],
    0x01040100: ['RB0-Button'],
    0x01050100: ['RB1-Button'],
    0x01060100: ['TL-Button'],
    0x01070100: ['TR-Button'],
    0x01080100: ['ScrollUp-Button'],
    0x01090100: ['ScrollDn-Button'],
    0x010A0000: ['MS-X-L'],
    0x010B0000: ['MX-X-R'],
    0x010C0000: ['MS-Y-L'],
    0x010D0000: ['MS-Y-R'],
    //****************************************************************
    //��ý���?
    0x0200006f: ['SysBkBrigthInc'],
    0x02000070: ['SysBkBrigthDec'],
    0x02000040: ['IOSBack'],//F7

    0x020000b5: ['NextTr'],//0xE8
    0x020000b6: ['PrevTr'],//0xE9
    0x020000b7: ['Stop'],//0xEA
    0x020000b8: ['Eject'],//0xEB
    0x020000cd: ['PlayPause'],//0xEC
    0x020000E2: ['Mute'],//0xED
    0x020000e9: ['Volum+'],//0xEE  //+
    0x020000ea: ['Volum-'],//0xEF  //-

    0x02000183: ['Media'],//F0
    0x0200018a: ['Email'],//F1
    0x02000192: ['Calculator'],//F2
    0x02000194: ['MyComputer'],//F3
    0x02000221: ['Search'],//F4
    0x02000223: ['WWW'],//F5
    0x02000224: ['Back'],//F6
    0x02000225: ['Forward'],//F7

    0x02000226: ['iStop'],
    0x02000227: ['Refresh'],
    0x0200022a: ['Favorites'],

    0x020000CF: ['Siri'],
    0x0200029F: ['MAC-F3'],
    0x020002A0: ['MAC-F4'],
    //****************************************************************
    //byte3��0x03��ʾ��macro��byte2��������ʾmacro��ѭ����ʽ��byte1��ѭ������  byte0��������ʾmacro���?
    //byte2����ʱ��������
    //0x01	ָ��ѭ��������0x02ѭ������������£�?0x03ѭ������ǰ���ɿ�
    //Macro Key
    0x03000000: ['Macro0'],
    0x03000001: ['Macro1'],

    //****************************************************************
    //ͨ��ð�ݶ˿ڷ����Զ���ļ�ֵ�������������⹦�ܴ�����������?�̶������ӣ�
    //�Զ����?
    0x04000001: ['Define1'],
    0x04000002: ['Define2'],
    //****************************************************************
    0x0d000000: ['Fn1'],
    0x0d010000: ['Fn2'],

    0x08092000: ['LED_MODE20'],
    0x08092100: ['LED_MODE21'],
    0x08092200: ['LED_MODE22'],

    0x08020000: ['LED_COLOR_MODEL'],
    0x08000200: ['LED_MODEL'],

    0x08070000: ['SP_LED_REC'],
    0x08000202: ['LOG2_MODEL'],

    0x07000004: ['SP_ProfileReset'],

    0x0A000000: ['RK Web'],
    0x00010006: ['Ctrl+C'],
    0x00010019: ['Ctrl+V'],
    0x00010004: ['Ctrl+A'],
    0x0001001b: ['Ctrl+X'],
    0x0001001d: ['Ctrl+Z'],
    0x00010016: ['Ctrl+S'],
}

export const KeyText_jp: Record<number, Array<String>> = {
    0x00: ['', '', '', ''],
    0x04: ['A', '', 'ち', ''],
    0x05: ['B', '', 'こ', ''],
    0x06: ['C', '', 'そ', ''],
    0x07: ['D', '', 'し', ''],
    0x08: ['E', '', 'い', 'ぃ'],
    0x09: ['F', '', 'は', ''],
    0x0a: ['G', '', 'き', ''],
    0x0b: ['H', '', 'く', ''],
    0x0c: ['I', '', 'に', ''],
    0x0d: ['J', '', 'ま', ''],
    0x0e: ['K', '', 'の', ''],
    0x0f: ['L', '', 'り', ''],
    0x10: ['M', '', 'も', ''],
    0x11: ['N', '', 'ゐ', ''],
    0x12: ['O', '', '', ''],
    0x13: ['P', '', 'せ', ''],
    0x14: ['Q', '', 'た', ''],
    0x15: ['R', '', 'す', ''],
    0x16: ['S', '', 'と', ''],
    0x17: ['T', '', 'か', ''],
    0x18: ['U', '', 'な', ''],
    0x19: ['V', '', 'ひ', ''],
    0x1a: ['W', '', 'て', ''],
    0x1b: ['X', '', 'さ', ''],
    0x1c: ['Y', '', 'ん', ''],
    0x1d: ['Z', '', 'つ', 'っ'],

    0x29: ['ESC'],
    0x2b: ['TAB'],
    0x39: ['CAPS'],
    0x2a: ['BackSpace'],
    0x28: ['ENTER'],
    0x2c: ['Space'],

    0x35: ['`~'],   //bo lang
    0x2d: ['-', '=', '', 'ほ'],   //xia hua xian
    0x2e: ['^', '~', '', 'へ'],   //deng hao
    0x2f: ['、','@', '゛', ''],   //zuo zhong kuo hao
    0x30: ['[','{', '゜', '「'],   //you zhong kuo hao
    0x31: [']', '}', 'む', '亅'],   //xie gang      //shu xian
    0x33: [';', '+', 'れ'],   //fen hao
    0x34: [':', '*', 'ゖ'],   //yin hao
    0x36: [',', '<', 'ね', 'ヽ'],   //dou hao
    0x37: ['.', '>', 'る', '・'],   //ju hao
    0x38: ['/', '?', 'め', '・'],   //dun hao
    //////////////////////////////
    0x1e: ['1', '!', 'ぬ', ''],
    0x1f: ['2', '〃', 'ふ', ''],
    0x20: ['3', '#', 'あ', 'ぁ'],
    0x21: ['4', '$', 'う', 'ぅ'],
    0x22: ['5', '%', 'え', 'ぇ'],
    0x23: ['6', '&', 'お', 'ぉ'],
    0x24: ['7', '', 'や', 'ゃ'],
    0x25: ['8', '(', 'ゆ', 'ゅ'],
    0x26: ['9', ')', 'よ', 'ょ'],
    0x27: ['0', '', 'わ', 'を'],
    ////////////////////
    0x3a: ['F1'],
    0x3b: ['F2'],
    0x3c: ['F3'],
    0x3d: ['F4'],
    0x3e: ['F5'],
    0x3f: ['F6'],
    0x40: ['F7'],
    0x41: ['F8'],
    0x42: ['F9'],
    0x43: ['F10'],
    0x44: ['F11'],
    0x45: ['F12'],
    0x68: ['F13'],
    0x69: ['F14'],
    0x6A: ['F15'],

    0x46: ['Print'],
    0x47: ['ScrLock'],
    0x48: ['Pause'],
    0x49: ['Ins'],
    0x4a: ['Home'],
    0x4b: ['PgUp'],
    0x4c: ['Del'],
    0x4d: ['End'],
    0x4e: ['PgDn'],

    0x4f: ['→'],
    0x50: ['←'],
    0x51: ['↓'],
    0x52: ['↑'],

    0x53: ['NumLock'],
    0x54: ['/'],
    0x55: ['*'],
    0x56: ['-'],
    0x57: ['+'],
    0x58: ['Enter'],
    0x63: ['.'],

    0x59: ['1'],
    0x5a: ['2'],
    0x5b: ['3'],
    0x5c: ['4'],
    0x5d: ['5'],
    0x5e: ['6'],
    0x5f: ['7'],
    0x60: ['8'],
    0x61: ['9'],
    0x62: ['0'],

    //0x31: '',
    0x32: ['K42'],
    0x64: ['|\\'],
    0x65: ['App'],
    0x85: ['K107'],
    0x87: ['\\', 'ー', 'ろ'],
    0x88: ['Kana'],
    0x89: ['￥', '|', '-', ''],
    0x8a: ['K132'],
    0x8b: ['K131'],
    0x90: ['K151'],   //key_Hangul
    0x91: ['K150'],   //Key_Hanja

    //****************************************************************
    //Modify key
    0x00010000: ['L-Ctrl'],
    0x00020000: ['L-Shift'],
    0x00040000: ['L-Alt'],
    0x00080000: ['L-Win'],
    0x00100000: ['R-Ctrl'],
    0x00200000: ['R-Shift'],
    0x00400000: ['R-Alt'],
    0x00800000: ['R-Win'],
    //****************************************************************
    //macro�е�modify key����
    0xe0: ['L-Ctrl'],
    0xe1: ['L-Shift'],
    0xe2: ['L-Alt'],
    0xe3: ['L-Win'],
    0xe4: ['R-Ctrl'],
    0xe5: ['R-Shift'],
    0xe6: ['R-Alt'],
    0xe7: ['R-Win'],
    //****************************************************************
    //macro�е�mouse key����
    0x01: ['Mouse-L'],
    0x02: ['Mouse-R'],
    //0x04: 'Mouse-M',
    //0x08: 'Mouse-B4',
    //0x10: 'Mouse-B5',
    0xff: ['Mouse-LT'],
    //0x01: 'Mouse-RT',
    //0xff: 'Mouse-UP',
    //0x01: 'Mouse-DN',
    //****************************************************************
    //��ϼ�����? 
    //KEY_win_shift_4	  	  : 'Win + Shift + 4',
    //KEY_win_shift_3	  	  : 'Win + Shift + 4',
    //KEY_win_shift_ctrl_4  : 'Win + Shift + Ctrl + 4',
    //KEY_WIN_D	  		  : 'Win + D',
    //KEY_WIN_SPACEBAR	  : 'Win + Space',//SIRI
    //KEY_WIN_TAB	  		  : 'Win + Tab',//�����񴰿�
    //KEY_WIN_E	  		  : 'Win + E',//�����б�    
    //KEY_ALT_SPACEBAR	  : 'Alt + Space',//SIRI    
    //KEY_CTRL_UP	  		  : 'Ctrl + UP',
    //KEY_CTRL_DN	  		  : 'Ctrl + DN',
    //KEY_CTRL_C	  		  : 'Ctrl + C',
    //KEY_CTRL_V	  		  : 'Ctrl + V',
    //KEY_ALT_TAB	  		  : 'Alt + Tab',
    0x00010006: ['shortcuts.copy'],
    0x00010019: ['shortcuts.paste'],
    0x0001001b: ['shortcuts.cut'],
    0x00010016: ['shortcuts.save'],
    0x0004002b: ['shortcuts.switchApp'],
    0x00080007: ['shortcuts.desktop'],
    0x0008000f: ['shortcuts.lock'],
    0x0004003d: ['shortcuts.close'],
    //****************************************************************
    //BYTE1:1�����?2�Ҽ���3�м���4ǰ������5���˼���6��ڡ�?7�Ұڡ�8�Ϲ��֡�9�¹��֡�10X����11X���ҡ�12Y���ϡ�13Y����
    //BYTE2:0xff��������0����һ�Σ����·������룬�ͷŷ��ͷ��룩��1˫����2������
    //BYTE3:�����ظ�ʱ�䣬0Ĭ�ϼ��ʱ��?
    //Mouse key
    0x01010100: ['mouseKey.leftKey'],
    0x01020100: ['mouseKey.rightKey'],
    0x01030100: ['mouseKey.middleKey'],
    0x01040100: ['mouseKey.forwardKey'],
    0x01050100: ['mouseKey.backKey'],
    0x01060100: ['mouseKey.leftShaft'],
    0x01070100: ['mouseKey.rightShaft'],
    0x01080100: ['mouseKey.wheelUp'],
    0x01090100: ['mouseKey.wheelDown'],
    0x010A0000: ['mouseKey.xAxleLeft'],
    0x010B0000: ['mouseKey.xAxleRight'],
    0x010C0000: ['mouseKey.yAxleUp'],
    0x010D0000: ['mouseKey.yAxleDown'],
    //****************************************************************
    //��ý���?
    0x0200006f: ['SysBkBrigthInc'],
    0x02000070: ['SysBkBrigthDec'],
    0x02000040: ['IOSBack'],//F7

    0x020000b5: ['NextTr'],//0xE8
    0x020000b6: ['PrevTr'],//0xE9
    0x020000b7: ['Stop'],//0xEA
    0x020000b8: ['Eject'],//0xEB
    0x020000cd: ['PlayPause'],//0xEC
    0x020000E2: ['Mute'],//0xED
    0x020000e9: ['VolumI'],//0xEE  //+
    0x020000ea: ['VolumD'],//0xEF  //-

    0x02000183: ['Media'],//F0
    0x0200018a: ['Email'],//F1
    0x02000192: ['Calculator'],//F2
    0x02000194: ['MyComputer'],//F3
    0x02000221: ['Search'],//F4
    0x02000223: ['WWW'],//F5
    0x02000224: ['Back'],//F6
    0x02000225: ['Forward'],//F7

    0x02000226: ['iStop'],
    0x02000227: ['Refresh'],
    0x0200022a: ['Favorites'],

    0x020000CF: ['Siri'],
    0x0200029F: ['MAC-F3'],
    0x020002A0: ['MAC-F4'],
    //****************************************************************
    //byte3��0x03��ʾ��macro��byte2��������ʾmacro��ѭ����ʽ��byte1��ѭ������  byte0��������ʾmacro���?
    //byte2����ʱ��������
    //0x01	ָ��ѭ��������0x02ѭ������������£�?0x03ѭ������ǰ���ɿ�
    //Macro Key
    0x03000000:  ['Macro0'],
    0x03000001:  ['Macro1'],

    //****************************************************************
    //ͨ��ð�ݶ˿ڷ����Զ���ļ�ֵ�������������⹦�ܴ�����������?�̶������ӣ�
    //�Զ����?
    0x04000001:  ['Define1'],
    0x04000002:  ['Define2'],
    0x05010000:  ['dpiKey.increase'],
    0x05020000:  ['dpiKey.decrease'],
    0x05040000:  ['dpiKey.loop'],
    0x050A0000:  ['dpiKey.lock'],
    0x06010000:  ['ProfileSwitch+'],
    0x06020000:  ['ProfileSwitch-'],
    0x06040000:  ['ProfileSwitchLoop'],
    //****************************************************************
    0x07000000: ['InvertASWD'],      //ȡ��ASWD�뷽��
    0x07000001: ['WinLock'],      //WIN Lock
    0x07000002: ['AllLock'],      //���м���ס
    0x07000003: ['Macro'],      //MACRO¼�Ƽ�
    0x07000004: ['AllReset'],      //���в����ָ�Ĭ�� 
    0x07000005: ['BT0'],      //����ģʽ0
    0x07000006: ['BT1'],      //����ģʽ1
    0x07000007: ['BT2'],      //����ģʽ2
    0x07000008: ['2.4G'],      //2.4Gģʽ
    0x07000009: ['USB'],      //USBģʽ
    0x0700000a: ['EMI Test'],      //���߽������?    
    0x0700000b: ['LedOnOff'],
    0x0700000c: ['Battery'],      //电量显示 
    0x0700000d: ['WinMac'],
    0x0700000e: ['Win'], 
    0x0700000f: ['Mac'],          //����Mac
    0x07000020: ['Windows'],      //����Windows
    0x07000010: ['KB'],
    0x07000022: ['O_Mode'],
    0x07000023: ['L_Mode'],
    0x07000024: ['Touch_Mode'],
    0x07000025: ['SP_B6Key_Mode'],
    //****************************************************************
    //byte0���̶�0x08
    //byte1��0��Ч�л���1��Ч����2��ɫ�л���3�����л���4�ٶ��л���5������Ϸ����¼�ƣ�6��Ϸ���ֱ��棬7¼��/���棬8��λ��9��Чģʽָ��
    //byte2��0ѭ����1+/��2-/�ң����byte1Ϊ9����������ֵ������ǰģʽ
    //byte3��0��������1����1��2����2
    //�ƹ�ģʽ�趨
    0x08090000: ['light.menu_0'], //ֱ���趨Ϊģʽ0
    0x08090100: ['light.menu_1'], //ֱ���趨Ϊģʽ1
    0x08090200: ['light.menu_2'], //ֱ���趨Ϊģʽ2
    0x08090300: ['light.menu_3'], //ֱ���趨Ϊģʽ3

    0x08092000: ['LedMode20'], //ֱ���趨Ϊģʽ20
    0x08092100: ['LedMode21'], //ֱ���趨Ϊģʽ21
    0x08092200: ['LedMode22'], //ֱ���趨Ϊģʽ22
    //��Ч�л�
    0x08000000: ['LedMode+'], //ֱ���趨Ϊģʽ+
    0x08000100: ['LedMode-'], //ֱ���趨Ϊģʽ-
    0x08000200: ['LedModeLoop'], //ֱ���趨ΪģʽLOOP

    0x08000300: ['DefineLedModel+'], //ֱ���趨Ϊģʽ+
    0x08000400: ['DefineLedModel-'], //ֱ���趨Ϊģʽ-
    0x08000500: ['DefineLedModelLoop'], //ֱ���趨ΪģʽLOOP

    //��Ч����
    0x08010000: ['LedDirctionLoop'], //��Ч����LOOP
    0x08010100: ['LedDirction+'], //��Ч������
    0x08010200: ['LedDirction-'], //��Ч������

    //��ɫ�л�
    0x08020100: ['LedColorMode+'], //ֱ���趨Ϊ��ɫ+
    0x08020200: ['LedColorMode-'], //ֱ���趨Ϊ��ɫ-
    0x08020000: ['LedColorModeLoop'], //ֱ���趨Ϊ��ɫLOOP

    //����[
    0x08030100: ['light.fun_1'], //ֱ���趨Ϊģʽ+
    0x08030200: ['light.fun_2'], //ֱ���趨Ϊģʽ-
    0x08030000: ['LedLuminLoop'], //ֱ���趨ΪģʽLOOP

    //�ٶ�[
    0x08040100: ['light.fun_3'], //  +
    0x08040200: ['light.fun_4'], //  -
    0x08040000: ['LedBreathLoop'], //  

    //¼��[
    0x08050000: ['LedRecStart'], //LED¼�Ƽ�����
    0x08060000: ['LedRecSave'], //LED¼�Ƽ�����
    0x08070000: ['LedRec'], //LED¼�Ƽ�����/����
    0x08080000: ['LedRecReset'], //LED�ָ���������
    0x08ff0000: ['SP_KB_REC_Reset'],	
    //logo
    0x08000001: ['LogoModelLoop'], //ֱ���趨Ϊģʽ+
    0x08000101: ['LogoModel+'], //ֱ���趨Ϊģʽ-
    0x08000201: ['LogoModel-'], //ֱ���趨ΪģʽLOOP

    0x08010001: ['LogoDirectionLoop'], //��Ч����LOOP
    0x08010101: ['LogoDirection+'], //��Ч������
    0x08010201: ['LogoDirection-'], //��Ч������

    0x08020101: ['LogoColorMode+'], //ֱ���趨Ϊ��ɫ+
    0x08020201: ['LogoColorMode-'], //ֱ���趨Ϊ��ɫ-
    0x08020001: ['LogoColorModeLoop'], //ֱ���趨Ϊ��ɫLOOP

    0x08030101: ['LogoLumin+'], //ֱ���趨Ϊģʽ+
    0x08030201: ['LogoLumin-'], //ֱ���趨Ϊģʽ-
    0x08030001: ['LogoLuminLoop'], //ֱ���趨ΪģʽLOOP

    0x08040101: ['LogoBreath+'], //ֱ���趨Ϊ�����ٶ�+
    0x08040201: ['LogoBreath-'], //ֱ���趨Ϊ�����ٶ�-
    0x08040001: ['LogoBreathLoop'], //ֱ���趨Ϊ�����ٶ�LOOP

    //ReportRate�趨
    0x09000000:  ['ReportRate125'], //ֱ���趨Ϊ125
    0x09000001:  ['ReportRate250'], //ֱ���趨Ϊ250
    0x09000002:  ['ReportRate500'], //ֱ���趨Ϊ500
    0x09000003:  ['ReportRate1000'], //ֱ���趨Ϊ1000
    0x09010000:  ['ReportRateI'], //�ر��ʵ�λ��
    0x09020000:  ['ReportRateD'], //�ر��ʵ�λ��
    0x09030000:  ['ReportRateLoop'], //�ر��ʵ�λѭ��

    0x0d000000: ['Fn1'],
    0x0d010000: ['Fn2'],
    //��Դ��
    0x10000001: ['Power'],
    0x10000002: ['Sleep'],
    0x10000004: ['WakeUp'],

    0x00020035:  ['~'],
    0x0002001e:  ['!'],
    0x0002001f:  ['@'],
    0x00020020:  ['#'],
    0x00020021:  ['$'],
    0x00020022:  ['%'],
    0x00020023:  ['^'],
    0x00020024:  ['&'],
    0x00020025:  ['*'],
    0x00020026:  ['('],
    0x00020027:  [')'],
    0x0002002D:  ['_'],
    0x0002002E:  ['+'],
    0x0002002F:  ['{'],
    0x00020030:  ['}'],
    0x00020031:  ['|'],
    0x00020033:  [':'],
    0x00020034:  ['"'],
    0x00020036:  ['<'],
    0x00020037:  ['>'],
    0x00020038:  ['?'],

    0x08090400: ['light.menu_4'],
    0x08090500: ['light.menu_5'],
    0x08090600: ['light.menu_6'],
    0x08090700: ['light.menu_7'],
    0x08090800: ['light.menu_8'],
    0x08090900: ['light.menu_9'],
    0x08090A00: ['light.menu_10'],
    0x08090B00: ['light.menu_11'],
    0x08090C00: ['light.menu_12'],
    0x08090D00: ['light.menu_13'],
    0x08090E00: ['light.menu_14'],
    0x08090F00: ['light.menu_15'],
    0x08091000: ['light.menu_16'],
    0x08091100: ['light.menu_17'],
    0x08091200: ['light.menu_18'],
    0x08091300: ['light.menu_19'],

    0x0A000000: ['RK Web'],
    
    //0x00010006: 'Ctrl+C',
    //0x00010019: 'Ctrl+V',
    0x00010004: ['Ctrl+A'],
    //0x0001001b: 'Ctrl+X',
    0x0001001d: ['Ctrl+Z'],
}



export const KeyText_fr: Record<number, Array<String>> = {
    0x00: [''],
    0x04: ['Q'],
    0x05: ['B'],
    0x06: ['C'],
    0x07: ['D'],
    0x08: ['E','€'],
    0x09: ['F'],
    0x0a: ['G'],
    0x0b: ['H'],
    0x0c: ['I'],
    0x0d: ['J'],
    0x0e: ['K'],
    0x0f: ['L'],
    0x10: [',','?'],
    0x11: ['N'],
    0x12: ['O'],
    0x13: ['P'],
    0x14: ['A'],
    0x15: ['R'],
    0x16: ['S'],
    0x17: ['T'],
    0x18: ['U'],
    0x19: ['V'],
    0x1a: ['Z'],
    0x1b: ['X'],
    0x1c: ['Y'],
    0x1d: ['W'],

    0x29: ['Echap'],
    0x2b: ['TAB'],
    0x39: ['CAPS'],
    0x2a: ['BackSpace'],
    0x28: ['Entrée'],
    0x2c: ['Space'],

    0x35: ['2'],   //bo lang
    0x2d: [')','。',']'],    //xia hua xian
    0x2e: ['=','+','}'],   //deng hao
    0x2f: ['^','..'],   //zuo zhong kuo hao
    0x30: ['$','','£'],   //you zhong kuo hao
    0x31: ['|','\\'],   //xie gang      //shu xian
    0x33: ['M'],   //fen hao
    0x34: ['ù','%'],   //yin hao
    0x36: [';','.'],   //dou hao
    0x37: [':','/'],   //ju hao
    0x38: ['!','§'],   //dun hao
    //////////////////////////////
    0x1e: ['1','','&'],
    0x1f: ['2','@','~','é'],
    0x20: ['3','"','#'],
    0x21: ['4','`','{'],
    0x22: ['5','(','['],
    0x23: ['6','-','¦'],
    0x24: ['7','è','、'],
    0x25: ['8','-','\\'],
    0x26: ['9','ç','^'],
    0x27: ['0','à ','@'],
    ////////////////////
    0x3a: ['F1'],
    0x3b: ['F2'],
    0x3c: ['F3'],
    0x3d: ['F4'],
    0x3e: ['F5'],
    0x3f: ['F6'],
    0x40: ['F7'],
    0x41: ['F8'],
    0x42: ['F9'],
    0x43: ['F10'],
    0x44: ['F11'],
    0x45: ['F12'],
    0x68: ['F13'],
    0x69: ['F14'],
    0x6A: ['F15'],

    0x46: ['Imprécransyst'],
    0x47: ['Arrêtdefil'],
    0x48: ['PauseAttn'],
    0x49: ['Inser'],
    0x4a: ['Orig'],
    0x4b: ['PgPr'],
    0x4c: ['Suppr'],
    0x4d: ['Fin'],
    0x4e: ['PgSv'],

    0x4f: ['→'],
    0x50: ['←'],
    0x51: ['↓'],
    0x52: ['↑'],

    0x53: ['VerrNum'],
    0x54: ['/'],
    0x55: ['*'],
    0x56: ['-'],
    0x57: ['+'],
    0x58: ['Entrée'],
    0x63: ['.'],

    0x59: ['1'],
    0x5a: ['2'],
    0x5b: ['3'],
    0x5c: ['4'],
    0x5d: ['5'],
    0x5e: ['6'],
    0x5f: ['7'],
    0x60: ['8'],
    0x61: ['9'],
    0x62: ['0'],

    //0x31: '',
    0x32: ['μ','*'],  
    0x64: ['<','>'],  
    0x65: ['App'],  
    0x85: ['K107'],  
    0x87: ['K56'],  
    0x88: ['K133'],  
    0x89: ['K14'],  
    0x8a: ['K132'],  
    0x8b: ['K131'],  
    0x90: ['K151'],  //key_Hangul
    0x91: ['K150'],  //Key_Hanja

    //****************************************************************
    //Modify key
    0x00010000: ['L-Ctrl'],
    0x00020000: ['L-Shift'],
    0x00040000: ['L-Alt'],
    0x00080000: ['L-Win'],
    0x00100000: ['R-Ctrl'],
    0x00200000: ['R-Shift'],
    0x00400000: ['Alt Gr'],
    0x00800000: ['R-Win'],
    //****************************************************************
    //macro�е�modify key����
    0xe0: ['L-Ctrl'],
    0xe1: ['L-Shift'],
    0xe2: ['L-Alt'],
    0xe3: ['L-Win'],
    0xe4: ['R-Ctrl'],
    0xe5: ['R-Shift'],
    0xe6: ['R-Alt'],
    0xe7: ['R-Win'],
    //****************************************************************
    //macro�е�mouse key����
    0x01: ['Mouse-L'],
    0x02: ['Mouse-R'],
    //0x04: 'Mouse-M',
    //0x08: 'Mouse-B4',
    //0x10: 'Mouse-B5',
    0xff: ['Mouse-LT'],
    //0x01: 'Mouse-RT',
    //0xff: 'Mouse-UP',
    //0x01: 'Mouse-DN',
    //****************************************************************
    //��ϼ�����? 
    //KEY_win_shift_4	  	  : 'Win + Shift + 4',
    //KEY_win_shift_3	  	  : 'Win + Shift + 4',
    //KEY_win_shift_ctrl_4  : 'Win + Shift + Ctrl + 4',
    //KEY_WIN_D	  		  : 'Win + D',
    //KEY_WIN_SPACEBAR	  : 'Win + Space',//SIRI
    //KEY_WIN_TAB	  		  : 'Win + Tab',//�����񴰿�
    //KEY_WIN_E	  		  : 'Win + E',//�����б�    
    //KEY_ALT_SPACEBAR	  : 'Alt + Space',//SIRI    
    //KEY_CTRL_UP	  		  : 'Ctrl + UP',
    //KEY_CTRL_DN	  		  : 'Ctrl + DN',
    //KEY_CTRL_C	  		  : 'Ctrl + C',
    //KEY_CTRL_V	  		  : 'Ctrl + V',
    //KEY_ALT_TAB	  		  : 'Alt + Tab',

    //****************************************************************
    //��ý���?
    0x0200006f: ['SysBkBrigthInc'],
    0x02000070: ['SysBkBrigthDec'],
    0x02000040: ['IOSBack'],//F7

    0x020000b5: ['NextTr'],//0xE8
    0x020000b6: ['PrevTr'],//0xE9
    0x020000b7: ['Stop'],//0xEA
    0x020000b8: ['Eject'],//0xEB
    0x020000cd: ['PlayPause'],//0xEC
    0x020000E2: ['Mute'],//0xED
    0x020000e9: ['Volum+'],//0xEE  //+
    0x020000ea: ['Volum-'],//0xEF  //-

    0x02000183: ['Media'],//F0
    0x0200018a: ['Email'],//F1
    0x02000192: ['Calculator'],//F2
    0x02000194: ['MyComputer'],//F3
    0x02000221: ['Search'],//F4
    0x02000223: ['WWW'],//F5
    0x02000224: ['Back'],//F6
    0x02000225: ['Forward'],//F7

    0x02000226: ['iStop'],
    0x02000227: ['Refresh'],
    0x0200022a: ['Favorites'],

    0x020000CF: ['Siri'],
    0x0200029F: ['MAC-F3'],
    0x020002A0: ['MAC-F4'],
    //****************************************************************
    //byte3��0x03��ʾ��macro��byte2��������ʾmacro��ѭ����ʽ��byte1��ѭ������  byte0��������ʾmacro���?
    //byte2����ʱ��������
    //0x01	ָ��ѭ��������0x02ѭ������������£�?0x03ѭ������ǰ���ɿ�
    //Macro Key
    0x03000000: ['Macro0'],
    0x03000001: ['Macro1'],

    //****************************************************************
    //ͨ��ð�ݶ˿ڷ����Զ���ļ�ֵ�������������⹦�ܴ�����������?�̶������ӣ�
    //�Զ����?
    0x04000001: ['Define1'],
    0x04000002: ['Define2'],
    //****************************************************************
    0x0d000000: ['Fn1'],
    0x0d010000: ['Fn2'],

        0x10000001: ['Power'],
    0x10000002: ['Sleep'],
    0x10000004: ['WakeUp'],

    0x00020035: ['~'],
    0x0002001e: ['!'],
    0x0002001f: ['@'],
    0x00020020: ['#'],
    0x00020021: ['$'],
    0x00020022: ['%'],
    0x00020023: ['^'],
    0x00020024: ['&'],
    0x00020025: ['*'],
    0x00020026: ['('],
    0x00020027: [')'],
    0x0002002D: ['_'],
    0x0002002E: ['+'],
    0x0002002F: ['{'],
    0x00020030: ['}'],
    0x00020031: ['|'],
    0x00020033: [':'],
    0x00020034: ['"'],
    0x00020036: ['<'],
    0x00020037: ['>'],
    0x00020038: ['?'],


    0x08090400: ['light.menu_4'],
    0x08090500: ['light.menu_5'],
    0x08090600: ['light.menu_6'],
    0x08090700: ['light.menu_7'],
    0x08090800: ['light.menu_8'],
    0x08090900: ['light.menu_9'],
    0x08090A00: ['light.menu_10'],
    0x08090B00: ['light.menu_11'],
    0x08090C00: ['light.menu_12'],
    0x08090D00: ['light.menu_13'],
    0x08090E00: ['light.menu_14'],
    0x08090F00: ['light.menu_15'],
    0x08091000: ['light.menu_16'],
    0x08091100: ['light.menu_17'],
    0x08091200: ['light.menu_18'],
    0x08091300: ['light.menu_19'],

    0x0A000000: ['RK Web'],
    
    0x00010004: ['Ctrl+A'],
    
    0x0001001d: ['Ctrl+Z'],
    0x00010006: ['shortcuts.copy'],
    0x00010019: ['shortcuts.paste'],
    0x0001001b: ['shortcuts.cut'],
    0x00010016: ['shortcuts.save'],
    0x0004002b: ['shortcuts.switchApp'],
    0x00080007: ['shortcuts.desktop'],
    0x0008000f: ['shortcuts.lock'],
    0x0004003d: ['shortcuts.close'],
}

export const KeyText_de: Record<number, Array<String>> = {
    0x00: ['', '', '', ''],
    0x04: ['A', '', '', ''],
    0x05: ['B', '', '', ''],
    0x06: ['C', '', '', ''],
    0x07: ['D', '', '', ''],
    0x08: ['E', '', '€', ''],
    0x09: ['F', '', '', ''],
    0x0a: ['G', '', '', ''],
    0x0b: ['H', '', '', ''],
    0x0c: ['I', '', '', ''],
    0x0d: ['J', '', '', ''],
    0x0e: ['K', '', '', ''],
    0x0f: ['L', '', '', ''],
    0x10: ['M', '', 'μ', ''],
    0x11: ['N', '', '', ''],
    0x12: ['O', '', '', ''],
    0x13: ['P', '', '', ''],
    0x14: ['Q', '', '@', ''],
    0x15: ['R', '', '', ''],
    0x16: ['S', '', '', ''],
    0x17: ['T', '', '', ''],
    0x18: ['U', '', '', ''],
    0x19: ['V', '', '', ''],
    0x1a: ['W', '', '', ''],
    0x1b: ['X', '', '', ''],
    0x1c: ['Z', '', '', ''],
    0x1d: ['Y', '', '', ''],

    0x29: ['ESC'],
    0x2b: ['TAB'],
    0x39: ['CAPS'],
    0x2a: ['BackSpace'],
    0x28: ['ENTER'],
    0x2c: ['Space'],

    0x35: ['^ °'],   //bo lang
    0x2d: ['?', 'ß', '\\', ''],   //xia hua xian
    0x2e: ['´', '', '', '`'],   //deng hao
    0x2f: ['Ü','', '', ''],   //zuo zhong kuo hao
    0x30: ['+','~', '', '*'],   //you zhong kuo hao
    0x31: ['|', '', '', ''],   //xie gang      //shu xian
    0x33: ['Ö ', '', ''],   //fen hao
    0x34: ['Ä', '', ''],   //yin hao
    0x36: [',', ';', '', ''],   //dou hao
    0x37: ['.', ':', '', ''],   //ju hao
    0x38: ['-', '_', '', ''],   //dun hao
    //////////////////////////////
    0x1e: ['1', '!'],
    0x1f: ['2', '〃', '2', ''],
    0x20: ['3', '§', '3', ''],
    0x21: ['4', '$', '', ''],
    0x22: ['5', '%', '', ''],
    0x23: ['6', '&', '', ''],
    0x24: ['7', '/', '{', ''],
    0x25: ['8', '(', '[', ''],
    0x26: ['9', ')', ']', ''],
    0x27: ['0', '=', '}', ''],
    ////////////////////
    0x3a: ['F1'],
    0x3b: ['F2'],
    0x3c: ['F3'],
    0x3d: ['F4'],
    0x3e: ['F5'],
    0x3f: ['F6'],
    0x40: ['F7'],
    0x41: ['F8'],
    0x42: ['F9'],
    0x43: ['F10'],
    0x44: ['F11'],
    0x45: ['F12'],
    0x68: ['F13'],
    0x69: ['F14'],
    0x6A: ['F15'],

    0x46: ['Druck'],
    0x47: ['Rollen'],
    0x48: ['Pause'],
    0x49: ['Einfg'],
    0x4a: ['Pos1'],
    0x4b: ['Bild↑'],
    0x4c: ['Entf'],
    0x4d: ['Ende'],
    0x4e: ['Bild↓'],

    0x4f: ['→'],
    0x50: ['←'],
    0x51: ['↓'],
    0x52: ['↑'],

    0x53: ['NumLock'],
    0x54: ['/'],
    0x55: ['*'],
    0x56: ['-'],
    0x57: ['+'],
    0x58: ['Enter'],
    0x63: ['.'],

    0x59: ['1'],
    0x5a: ['2'],
    0x5b: ['3'],
    0x5c: ['4'],
    0x5d: ['5'],
    0x5e: ['6'],
    0x5f: ['7'],
    0x60: ['8'],
    0x61: ['9'],
    0x62: ['0'],

    //0x31: '',
    0x32: ['#', ',', '', ''],
    0x64: ['<', '>', '|', ''],
    0x65: ['App'],
    0x85: ['K107'],
    0x87: ['\\', 'ー', 'ろ'],
    0x88: ['Kana'],
    0x89: ['￥', '|', '-', ''],
    0x8a: ['K132'],
    0x8b: ['K131'],
    0x90: ['K151'],   //key_Hangul
    0x91: ['K150'],   //Key_Hanja

    //****************************************************************
    //Modify key
    0x00010000: ['L-Strg'],
    0x00020000: ['L-Shift'],
    0x00040000: ['L-Alt'],
    0x00080000: ['L-Win'],
    0x00100000: ['R-Strg'],
    0x00200000: ['R-Shift'],
    0x00400000: ['Alt Gr'],
    0x00800000: ['R-Win'],
    //****************************************************************
    //macro�е�modify key����
    0xe0: ['L-Strg'],
    0xe1: ['L-Shift'],
    0xe2: ['L-Alt'],
    0xe3: ['L-Win'],
    0xe4: ['R-Strg'],
    0xe5: ['R-Shift'],
    0xe6: ['R-AltGr'],
    0xe7: ['R-Win'],
    //****************************************************************
    //macro�е�mouse key����
    0x01: ['Mouse-L'],
    0x02: ['Mouse-R'],
    //0x04: 'Mouse-M',
    //0x08: 'Mouse-B4',
    //0x10: 'Mouse-B5',
    0xff: ['Mouse-LT'],
    //0x01: 'Mouse-RT',
    //0xff: 'Mouse-UP',
    //0x01: 'Mouse-DN',
    //****************************************************************
    //��ϼ�����? 
    //KEY_win_shift_4	  	  : 'Win + Shift + 4',
    //KEY_win_shift_3	  	  : 'Win + Shift + 4',
    //KEY_win_shift_ctrl_4  : 'Win + Shift + Ctrl + 4',
    //KEY_WIN_D	  		  : 'Win + D',
    //KEY_WIN_SPACEBAR	  : 'Win + Space',//SIRI
    //KEY_WIN_TAB	  		  : 'Win + Tab',//�����񴰿�
    //KEY_WIN_E	  		  : 'Win + E',//�����б�    
    //KEY_ALT_SPACEBAR	  : 'Alt + Space',//SIRI    
    //KEY_CTRL_UP	  		  : 'Ctrl + UP',
    //KEY_CTRL_DN	  		  : 'Ctrl + DN',
    //KEY_CTRL_C	  		  : 'Ctrl + C',
    //KEY_CTRL_V	  		  : 'Ctrl + V',
    //KEY_ALT_TAB	  		  : 'Alt + Tab',
    
    //****************************************************************

    //��ý���?
    0x0200006f: ['SysBkBrigthInc'],
    0x02000070: ['SysBkBrigthDec'],
    0x02000040: ['IOSBack'],//F7

    0x020000b5: ['NextTr'],//0xE8
    0x020000b6: ['PrevTr'],//0xE9
    0x020000b7: ['Stop'],//0xEA
    0x020000b8: ['Eject'],//0xEB
    0x020000cd: ['PlayPause'],//0xEC
    0x020000E2: ['Mute'],//0xED
    0x020000e9: ['VolumI'],//0xEE  //+
    0x020000ea: ['VolumD'],//0xEF  //-

    0x02000183: ['Media'],//F0
    0x0200018a: ['Email'],//F1
    0x02000192: ['Calculator'],//F2
    0x02000194: ['MyComputer'],//F3
    0x02000221: ['Search'],//F4
    0x02000223: ['WWW'],//F5
    0x02000224: ['Back'],//F6
    0x02000225: ['Forward'],//F7

    0x02000226: ['iStop'],
    0x02000227: ['Refresh'],
    0x0200022a: ['Favorites'],

    0x020000CF: ['Siri'],
    0x0200029F: ['MAC-F3'],
    0x020002A0: ['MAC-F4'],
    //****************************************************************
    //byte3��0x03��ʾ��macro��byte2��������ʾmacro��ѭ����ʽ��byte1��ѭ������  byte0��������ʾmacro���?
    //byte2����ʱ��������
    //0x01	ָ��ѭ��������0x02ѭ������������£�?0x03ѭ������ǰ���ɿ�
    //Macro Key
    0x03000000:  ['Macro0'],
    0x03000001:  ['Macro1'],

    //****************************************************************
    //ͨ��ð�ݶ˿ڷ����Զ���ļ�ֵ�������������⹦�ܴ�����������?�̶������ӣ�
    //�Զ����?
    0x04000001:  ['Define1'],
    0x04000002:  ['Define2'],
    0x05010000:  ['dpiKey.increase'],
    0x05020000:  ['dpiKey.decrease'],
    0x05040000:  ['dpiKey.loop'],
    0x050A0000:  ['dpiKey.lock'],
    0x06010000:  ['ProfileSwitch+'],
    0x06020000:  ['ProfileSwitch-'],
    0x06040000:  ['ProfileSwitchLoop'],
    //****************************************************************
    0x07000000: ['InvertASWD'],      //ȡ��ASWD�뷽��
    0x07000001: ['WinLock'],      //WIN Lock
    0x07000002: ['AllLock'],      //���м���ס
    0x07000003: ['Macro'],      //MACRO¼�Ƽ�
    0x07000004: ['AllReset'],      //���в����ָ�Ĭ�� 
    0x07000005: ['BT0'],      //����ģʽ0
    0x07000006: ['BT1'],      //����ģʽ1
    0x07000007: ['BT2'],      //����ģʽ2
    0x07000008: ['2.4G'],      //2.4Gģʽ
    0x07000009: ['USB'],      //USBģʽ
    0x0700000a: ['EMI Test'],      //���߽������?    
    0x0700000b: ['LedOnOff'],
    0x0700000c: ['Battery'],      //电量显示 
    0x0700000d: ['WinMac'],
    0x0700000e: ['Win'], 
    0x0700000f: ['Mac'],          //����Mac
    0x07000020: ['Windows'],      //����Windows
    0x07000010: ['KB'],
    0x07000022: ['O_Mode'],
    0x07000023: ['L_Mode'],
    0x07000024: ['Touch_Mode'],
    0x07000025: ['SP_B6Key_Mode'],
    //****************************************************************
    //byte0���̶�0x08
    //byte1��0��Ч�л���1��Ч����2��ɫ�л���3�����л���4�ٶ��л���5������Ϸ����¼�ƣ�6��Ϸ���ֱ��棬7¼��/���棬8��λ��9��Чģʽָ��
    //byte2��0ѭ����1+/��2-/�ң����byte1Ϊ9����������ֵ������ǰģʽ
    //byte3��0��������1����1��2����2
    //�ƹ�ģʽ�趨
    0x08090000: ['light.menu_0'], //ֱ���趨Ϊģʽ0
    0x08090100: ['light.menu_1'], //ֱ���趨Ϊģʽ1
    0x08090200: ['light.menu_2'], //ֱ���趨Ϊģʽ2
    0x08090300: ['light.menu_3'], //ֱ���趨Ϊģʽ3

    0x08092000: ['LedMode20'], //ֱ���趨Ϊģʽ20
    0x08092100: ['LedMode21'], //ֱ���趨Ϊģʽ21
    0x08092200: ['LedMode22'], //ֱ���趨Ϊģʽ22
    //��Ч�л�
    0x08000000: ['LedMode+'], //ֱ���趨Ϊģʽ+
    0x08000100: ['LedMode-'], //ֱ���趨Ϊģʽ-
    0x08000200: ['LedModeLoop'], //ֱ���趨ΪģʽLOOP

    0x08000300: ['DefineLedModel+'], //ֱ���趨Ϊģʽ+
    0x08000400: ['DefineLedModel-'], //ֱ���趨Ϊģʽ-
    0x08000500: ['DefineLedModelLoop'], //ֱ���趨ΪģʽLOOP

    //��Ч����
    0x08010000: ['LedDirctionLoop'], //��Ч����LOOP
    0x08010100: ['LedDirction+'], //��Ч������
    0x08010200: ['LedDirction-'], //��Ч������

    //��ɫ�л�
    0x08020100: ['LedColorMode+'], //ֱ���趨Ϊ��ɫ+
    0x08020200: ['LedColorMode-'], //ֱ���趨Ϊ��ɫ-
    0x08020000: ['LedColorModeLoop'], //ֱ���趨Ϊ��ɫLOOP

    //����[
    0x08030100: ['light.fun_1'], //ֱ���趨Ϊģʽ+
    0x08030200: ['light.fun_2'], //ֱ���趨Ϊģʽ-
    0x08030000: ['LedLuminLoop'], //ֱ���趨ΪģʽLOOP

    //�ٶ�[
    0x08040100: ['light.fun_3'], //  +
    0x08040200: ['light.fun_4'], //  -
    0x08040000: ['LedBreathLoop'], //  

    //¼��[
    0x08050000: ['LedRecStart'], //LED¼�Ƽ�����
    0x08060000: ['LedRecSave'], //LED¼�Ƽ�����
    0x08070000: ['LedRec'], //LED¼�Ƽ�����/����
    0x08080000: ['LedRecReset'], //LED�ָ���������
    0x08ff0000: ['SP_KB_REC_Reset'],	
    //logo
    0x08000001: ['LogoModelLoop'], //ֱ���趨Ϊģʽ+
    0x08000101: ['LogoModel+'], //ֱ���趨Ϊģʽ-
    0x08000201: ['LogoModel-'], //ֱ���趨ΪģʽLOOP

    0x08010001: ['LogoDirectionLoop'], //��Ч����LOOP
    0x08010101: ['LogoDirection+'], //��Ч������
    0x08010201: ['LogoDirection-'], //��Ч������

    0x08020101: ['LogoColorMode+'], //ֱ���趨Ϊ��ɫ+
    0x08020201: ['LogoColorMode-'], //ֱ���趨Ϊ��ɫ-
    0x08020001: ['LogoColorModeLoop'], //ֱ���趨Ϊ��ɫLOOP

    0x08030101: ['LogoLumin+'], //ֱ���趨Ϊģʽ+
    0x08030201: ['LogoLumin-'], //ֱ���趨Ϊģʽ-
    0x08030001: ['LogoLuminLoop'], //ֱ���趨ΪģʽLOOP

    0x08040101: ['LogoBreath+'], //ֱ���趨Ϊ�����ٶ�+
    0x08040201: ['LogoBreath-'], //ֱ���趨Ϊ�����ٶ�-
    0x08040001: ['LogoBreathLoop'], //ֱ���趨Ϊ�����ٶ�LOOP

    //ReportRate�趨
    0x09000000:  ['ReportRate125'], //ֱ���趨Ϊ125
    0x09000001:  ['ReportRate250'], //ֱ���趨Ϊ250
    0x09000002:  ['ReportRate500'], //ֱ���趨Ϊ500
    0x09000003:  ['ReportRate1000'], //ֱ���趨Ϊ1000
    0x09010000:  ['ReportRateI'], //�ر��ʵ�λ��
    0x09020000:  ['ReportRateD'], //�ر��ʵ�λ��
    0x09030000:  ['ReportRateLoop'], //�ر��ʵ�λѭ��

    0x0d000000: ['Fn1'],
    0x0d010000: ['Fn2'],
    //��Դ��
    0x10000001: ['Power'],
    0x10000002: ['Sleep'],
    0x10000004: ['WakeUp'],

    0x00020035:  ['~'],
    0x0002001e:  ['!'],
    0x0002001f:  ['@'],
    0x00020020:  ['#'],
    0x00020021:  ['$'],
    0x00020022:  ['%'],
    0x00020023:  ['^'],
    0x00020024:  ['&'],
    0x00020025:  ['*'],
    0x00020026:  ['('],
    0x00020027:  [')'],
    0x0002002D:  ['_'],
    0x0002002E:  ['+'],
    0x0002002F:  ['{'],
    0x00020030:  ['}'],
    0x00020031:  ['|'],
    0x00020033:  [':'],
    0x00020034:  ['"'],
    0x00020036:  ['<'],
    0x00020037:  ['>'],
    0x00020038:  ['?'],

    0x08090400: ['light.menu_4'],
    0x08090500: ['light.menu_5'],
    0x08090600: ['light.menu_6'],
    0x08090700: ['light.menu_7'],
    0x08090800: ['light.menu_8'],
    0x08090900: ['light.menu_9'],
    0x08090A00: ['light.menu_10'],
    0x08090B00: ['light.menu_11'],
    0x08090C00: ['light.menu_12'],
    0x08090D00: ['light.menu_13'],
    0x08090E00: ['light.menu_14'],
    0x08090F00: ['light.menu_15'],
    0x08091000: ['light.menu_16'],
    0x08091100: ['light.menu_17'],
    0x08091200: ['light.menu_18'],
    0x08091300: ['light.menu_19'],

    0x0A000000: ['RK Web'],
    
    //0x00010006: 'Ctrl+C',
    //0x00010019: 'Ctrl+V',
    0x00010004: ['Ctrl+A'],
    //0x0001001b: 'Ctrl+X',
    0x0001001d: ['Ctrl+Z'],
    0x00010006: ['shortcuts.copy'],
    0x00010019: ['shortcuts.paste'],
    0x0001001b: ['shortcuts.cut'],
    0x00010016: ['shortcuts.save'],
    0x0004002b: ['shortcuts.switchApp'],
    0x00080007: ['shortcuts.desktop'],
    0x0008000f: ['shortcuts.lock'],
    0x0004003d: ['shortcuts.close'],
}

export const KeyText_es: Record<number, Array<String>> = {
    0x00: [''],
    0x04: ['A'],
    0x05: ['B'],
    0x06: ['C'],
    0x07: ['D'],
    0x08: ['E'],
    0x09: ['F'],
    0x0a: ['G'],
    0x0b: ['H'],
    0x0c: ['I'],
    0x0d: ['J'],
    0x0e: ['K'],
    0x0f: ['L'],
    0x10: ['M'],
    0x11: ['N'],
    0x12: ['O'],
    0x13: ['P'],
    0x14: ['Q'],
    0x15: ['R'],
    0x16: ['S'],
    0x17: ['T'],
    0x18: ['U'],
    0x19: ['V'],
    0x1a: ['W'],
    0x1b: ['X'],
    0x1c: ['Y'],
    0x1d: ['Z'],

    0x29: ['ESC'],
    0x2b: ['TAB'],
    0x39: ['CBloq Mayus'],
    0x2a: ['BackSpace'],
    0x28: ['Intro'],
    0x2c: ['Space'],

    0x35: ['º','ª','\\'],   //bo lang
    0x2d: ['‘','?'],   //xia hua xian
    0x2e: ['¡','¿'],   //deng hao
    0x2f: ['`','^','['],   //zuo zhong kuo hao
    0x30: ['+','*',']'],   //you zhong kuo hao
    0x31: ['|','\\'],   //xie gang      //shu xian
    0x33: ['ñ'],   //fen hao
    0x34: ['´','¨','{'],   //yin hao
    0x36: [',',';'],   //dou hao
    0x37: ['.',':'],   //ju hao
    0x38: ['-','_'],   //dun hao
    //////[////////////////////////
    0x1e: ['1','!','|'],
    0x1f: ['2','@','"'],
    0x20: ['3','#','·'],
    0x21: ['4','$','~'],
    0x22: ['5','%'],
    0x23: ['6','&','¬'],
    0x24: ['7','/'],
    0x25: ['8','('],
    0x26: ['9',')'],
    0x27: ['0','='],
    //////[//////////////
    0x3a: ['F1'],
    0x3b: ['F2'],
    0x3c: ['F3'],
    0x3d: ['F4'],
    0x3e: ['F5'],
    0x3f: ['F6'],
    0x40: ['F7'],
    0x41: ['F8'],
    0x42: ['F9'],
    0x43: ['F10'],
    0x44: ['F11'],
    0x45: ['F12'],
    0x68: ['F13'],
    0x69: ['F14'],
    0x6A: ['F15'],

    0x46: ['Print'],
    0x47: ['ScrLock'],
    0x48: ['Pause'],
    0x49: ['Ins'],
    0x4a: ['Inicio'],
    0x4b: ['RePág'],
    0x4c: ['Supr'],
    0x4d: ['End'],
    0x4e: ['AvPág'],

    0x4f: ['→'],
    0x50: ['←'],
    0x51: ['↓'],
    0x52: ['↑'],

    0x53: ['Bloq Num'],
    0x54: ['/'],
    0x55: ['*'],
    0x56: ['-'],
    0x57: ['+'],
    0x58: ['Enter'],
    0x63: ['.'],

    0x59: ['1'],
    0x5a: ['2'],
    0x5b: ['3'],
    0x5c: ['4'],
    0x5d: ['5'],
    0x5e: ['6'],
    0x5f: ['7'],
    0x60: ['8'],
    0x61: ['9'],
    0x62: ['0'],

    //0x31[: '',
    0x32: ['Ç','}'],
    0x64: ['<','>'],
    0x65: ['App'],
    0x85: ['K107'],
    0x87: ['K56'],
    0x88: ['K133'],
    0x89: ['K14'],
    0x8a: ['K132'],
    0x8b: ['K131'],
    0x90: ['K151'],   //key_Hangul
    0x91: ['K150'],   //Key_Hanja

    //****************************************************************
    //Modify key
    0x00010000: ['L-Ctrl'],
    0x00020000: ['L-Shift'],
    0x00040000: ['L-Alt'],
    0x00080000: ['L-Win'],
    0x00100000: ['R-Ctrl'],
    0x00200000: ['R-Shift'],
    0x00400000: ['Alt Gr'],
    0x00800000: ['R-Win'],
    //****************************************************************
    //macro�е�modify key����
    0xe0: ['L-Ctrl'],
    0xe1: ['L-Shift'],
    0xe2: ['L-Alt'],
    0xe3: ['L-Win'],
    0xe4: ['R-Ctrl'],
    0xe5: ['R-Shift'],
    0xe6: ['Alt Gr'],
    0xe7: ['R-Win'],
    //****************************************************************
    //macro�е�mouse key����
    0x01: ['Mouse-L'],
    0x02: ['Mouse-R'],
    //0x04: 'Mouse-M',
    //0x08: 'Mouse-B4',
    //0x10: 'Mouse-B5',
    0xff: ['Mouse-LT'],
    //0x01: 'Mouse-RT',
    //0xff: 'Mouse-UP',
    //0x01: 'Mouse-DN',
    //****************************************************************
    //��ϼ�����? 
    //KEY_win_shift_4	  	  : 'Win + Shift + 4',
    //KEY_win_shift_3	  	  : 'Win + Shift + 4',
    //KEY_win_shift_ctrl_4  : 'Win + Shift + Ctrl + 4',
    //KEY_WIN_D	  		  : 'Win + D',
    //KEY_WIN_SPACEBAR	  : 'Win + Space',//SIRI
    //KEY_WIN_TAB	  		  : 'Win + Tab',//�����񴰿�
    //KEY_WIN_E	  		  : 'Win + E',//�����б�    
    //KEY_ALT_SPACEBAR	  : 'Alt + Space',//SIRI    
    //KEY_CTRL_UP	  		  : 'Ctrl + UP',
    //KEY_CTRL_DN	  		  : 'Ctrl + DN',
    //KEY_CTRL_C	  		  : 'Ctrl + C',
    //KEY_CTRL_V	  		  : 'Ctrl + V',
    //KEY_ALT_TAB	  		  : 'Alt + Tab',
    
    //****************************************************************
    //BYTE1:1�����?2�Ҽ���3�м���4ǰ������5���˼���6��ڡ�?7�Ұڡ�8�Ϲ��֡�9�¹��֡�10X����11X���ҡ�12Y���ϡ�13Y����
    //BYTE2:0xff��������0����һ�Σ����·������룬�ͷŷ��ͷ��룩��1˫����2������
    //BYTE3:�����ظ�ʱ�䣬0Ĭ�ϼ��ʱ��?
    //Mouse key
    0x01010100: ['mouseKey.leftKey'],
    0x01020100: ['mouseKey.rightKey'],
    0x01030100: ['mouseKey.middleKey'],
    0x01040100: ['mouseKey.forwardKey'],
    0x01050100: ['mouseKey.backKey'],
    0x01060100: ['mouseKey.leftShaft'],
    0x01070100: ['mouseKey.rightShaft'],
    0x01080100: ['mouseKey.wheelUp'],
    0x01090100: ['mouseKey.wheelDown'],
    0x010A0000: ['mouseKey.xAxleLeft'],
    0x010B0000: ['mouseKey.xAxleRight'],
    0x010C0000: ['mouseKey.yAxleUp'],
    0x010D0000: ['mouseKey.yAxleDown'],
    //****************************************************************
    //��ý���?
    0x0200006f: ['SysBkBrigthInc'],
    0x02000070: ['SysBkBrigthDec'],
    0x02000040: ['IOSBack'],//F7

    0x020000b5: ['NextTr'],//0xE8
    0x020000b6: ['PrevTr'],//0xE9
    0x020000b7: ['Stop'],//0xEA
    0x020000b8: ['Eject'],//0xEB
    0x020000cd: ['PlayPause'],//0xEC
    0x020000E2: ['Mute'],//0xED
    0x020000e9: ['VolumI'],//0xEE  //+
    0x020000ea: ['VolumD'],//0xEF  //-

    0x02000183: ['Media'],//F0
    0x0200018a: ['Email'],//F1
    0x02000192: ['Calculator'],//F2
    0x02000194: ['MyComputer'],//F3
    0x02000221: ['Search'],//F4
    0x02000223: ['WWW'],//F5
    0x02000224: ['Back'],//F6
    0x02000225: ['Forward'],//F7

    0x02000226: ['iStop'],
    0x02000227: ['Refresh'],
    0x0200022a: ['Favorites'],

    0x020000CF: ['Siri'],
    0x0200029F: ['MAC-F3'],
    0x020002A0: ['MAC-F4'],
    //****************************************************************
    //byte3��0x03��ʾ��macro��byte2��������ʾmacro��ѭ����ʽ��byte1��ѭ������  byte0��������ʾmacro���?
    //byte2����ʱ��������
    //0x01	ָ��ѭ��������0x02ѭ������������£�?0x03ѭ������ǰ���ɿ�
    //Macro Key
    0x03000000: ['Macro0'],
    0x03000001: ['Macro1'],

    //****************************************************************
    //ͨ��ð�ݶ˿ڷ����Զ���ļ�ֵ�������������⹦�ܴ�����������?�̶������ӣ�
    //�Զ����?
    0x04000001: ['Define1'],
    0x04000002: ['Define2'],
    0x05010000: ['dpiKey.increase'],
    0x05020000: ['dpiKey.decrease'],
    0x05040000: ['dpiKey.loop'],
    0x050A0000: ['dpiKey.lock'],
    0x06010000: ['ProfileSwitch+'],
    0x06020000: ['ProfileSwitch-'],
    0x06040000: ['ProfileSwitchLoop'],
    //****************************************************************
    0x07000000: ['InvertASWD'],      //ȡ��ASWD�뷽��
    0x07000001: ['WinLock'],      //WIN Lock
    0x07000002: ['AllLock'],      //���м���ס
    0x07000003: ['Macro'],      //MACRO¼�Ƽ�
    0x07000004: ['AllReset'],      //���в����ָ�Ĭ�� 
    0x07000005: ['BT0'],      //����ģʽ0
    0x07000006: ['BT1'],      //����ģʽ1
    0x07000007: ['BT2'],      //����ģʽ2
    0x07000008: ['2.4G'],      //2.4Gģʽ
    0x07000009: ['USB'],      //USBģʽ
    0x0700000a: ['EMI Test'],      //���߽������?    
    0x07000015: ['KB_Mode'],      //电量显示 
    0x0700000b: ['Screen_Left'],
    0x0700000c: ['Screen_Right'],
    0x0700000d: ['SP_Home'],
    0x07000021: ['Mac'],          //����Mac
    0x07000020: ['Windows'],      //����Windows
    0x07000022: ['Speed_SaveTime'],
    0x07000010: ['KB'],
    0x07000012: ['O_Mode'],
    0x0700000f: ['L_Mode'],
    0x07000013: ['LED_OFF'],
    //****************************************************************
    //byte0���̶�0x08
    //byte1��0��Ч�л���1��Ч����2��ɫ�л���3�����л���4�ٶ��л���5������Ϸ����¼�ƣ�6��Ϸ���ֱ��棬7¼��/���棬8��λ��9��Чģʽָ��
    //byte2��0ѭ����1+/��2-/�ң����byte1Ϊ9����������ֵ������ǰģʽ
    //byte3��0��������1����1��2����2
    //�ƹ�ģʽ�趨
    0x08090000: ['light.menu_0'], //ֱ���趨Ϊģʽ0
    0x08090100: ['light.menu_1'], //ֱ���趨Ϊģʽ1
    0x08090200: ['light.menu_2'], //ֱ���趨Ϊģʽ2
    0x08090300: ['light.menu_3'], //ֱ���趨Ϊģʽ3

    0x08092000: ['LedMode20'], //ֱ���趨Ϊģʽ20
    0x08092100: ['LedMode21'], //ֱ���趨Ϊģʽ21
    0x08092200: ['LedMode22'], //ֱ���趨Ϊģʽ22
    //��Ч�л�[
    0x08000000: ['LedMode+'], //ֱ���趨Ϊģʽ+
    0x08000100: ['LedMode-'], //ֱ���趨Ϊģʽ-
    0x08000200: ['LedModeLoop'], //ֱ���趨ΪģʽLOOP

    0x08000300: ['DefineLedModel+'], //ֱ���趨Ϊģʽ+
    0x08000400: ['DefineLedModel-'], //ֱ���趨Ϊģʽ-
    0x08000500: ['DefineLedModelLoop'], //ֱ���趨ΪģʽLOOP

    //��Ч����
    0x08010000: ['LedDirctionLoop'], //��Ч����LOOP
    0x08010100: ['LedDirction+'], //��Ч������
    0x08010200: ['LedDirction-'], //��Ч������

    //��ɫ�л�
    0x08020100: ['LedColorMode+'], //ֱ���趨Ϊ��ɫ+
    0x08020200: ['LedColorMode-'], //ֱ���趨Ϊ��ɫ-
    0x08020000: ['LedColorModeLoop'], //ֱ���趨Ϊ��ɫLOOP

    //����
    0x08030100: ['light.fun_1'], //ֱ���趨Ϊģʽ+
    0x08030200: ['light.fun_2'], //ֱ���趨Ϊģʽ-
    0x08030000: ['LedLuminLoop'], //ֱ���趨ΪģʽLOOP

    //�ٶ�
    0x08040100: ['light.fun_3'], //  +
    0x08040200: ['light.fun_4'], //  -
    0x08040000: ['LedBreathLoop'], //  

    //¼��
    0x08050000: ['LedRecStart'], //LED¼�Ƽ�����
    0x08060000: ['LedRecSave'], //LED¼�Ƽ�����
    0x08070000: ['LedRec'], //LED¼�Ƽ�����/����
    0x08080000: ['LedRecReset'], //LED�ָ���������
    0x08ff0000: ['SP_KB_REC_Reset'],	
    //logo
    0x08000001: ['LogoModelLoop'], //ֱ���趨Ϊģʽ+
    0x08000101: ['LogoModel+'], //ֱ���趨Ϊģʽ-
    0x08000201: ['LogoModel-'], //ֱ���趨ΪģʽLOOP

    0x08010001: ['LogoDirectionLoop'], //��Ч����LOOP
    0x08010101: ['LogoDirection+'], //��Ч������
    0x08010201: ['LogoDirection-'], //��Ч������

    0x08020101: ['LogoColorMode+'], //ֱ���趨Ϊ��ɫ+
    0x08020201: ['LogoColorMode-'], //ֱ���趨Ϊ��ɫ-
    0x08020001: ['LogoColorModeLoop'], //ֱ���趨Ϊ��ɫLOOP

    0x08030101: ['LogoLumin+'], //ֱ���趨Ϊģʽ+
    0x08030201: ['LogoLumin-'], //ֱ���趨Ϊģʽ-
    0x08030001: ['LogoLuminLoop'], //ֱ���趨ΪģʽLOOP

    0x08040101: ['LogoBreath+'], //ֱ���趨Ϊ�����ٶ�+
    0x08040201: ['LogoBreath-'], //ֱ���趨Ϊ�����ٶ�-
    0x08040001: ['LogoBreathLoop'], //ֱ���趨Ϊ�����ٶ�LOOP

    //ReportRate�趨
    0x09000000: ['ReportRate125'], //ֱ���趨Ϊ125
    0x09000001: ['ReportRate250'], //ֱ���趨Ϊ250
    0x09000002: ['ReportRate500'], //ֱ���趨Ϊ500
    0x09000003: ['ReportRate1000'], //ֱ���趨Ϊ1000
    0x09010000: ['ReportRateI'], //�ر��ʵ�λ��
    0x09020000: ['ReportRateD'], //�ر��ʵ�λ��
    0x09030000: ['ReportRateLoop'], //�ر��ʵ�λѭ��

    0x0d000000: ['Fn1'],
    0x0d010000: ['Fn2'],
    //��Դ��
    0x10000001: ['Power'],
    0x10000002: ['Sleep'],
    0x10000004: ['WakeUp'],

    0x00020035: ['~'],
    0x0002001e: ['!'],
    0x0002001f: ['@'],
    0x00020020: ['#'],
    0x00020021: ['$'],
    0x00020022: ['%'],
    0x00020023: ['^'],
    0x00020024: ['&'],
    0x00020025: ['*'],
    0x00020026: ['('],
    0x00020027: [')'],
    0x0002002D: ['_'],
    0x0002002E: ['+'],
    0x0002002F: ['{'],
    0x00020030: ['}'],
    0x00020031: ['|'],
    0x00020033: [':'],
    0x00020034: ['"'],
    0x00020036: ['<'],
    0x00020037: ['>'],
    0x00020038: ['?'],

    0x08090400: ['light.menu_4'],
    0x08090500: ['light.menu_5'],
    0x08090600: ['light.menu_6'],
    0x08090700: ['light.menu_7'],
    0x08090800: ['light.menu_8'],
    0x08090900: ['light.menu_9'],
    0x08090A00: ['light.menu_10'],
    0x08090B00: ['light.menu_11'],
    0x08090C00: ['light.menu_12'],
    0x08090D00: ['light.menu_13'],
    0x08090E00: ['light.menu_14'],
    0x08090F00: ['light.menu_15'],
    0x08091000: ['light.menu_16'],
    0x08091100: ['light.menu_17'],
    0x08091200: ['light.menu_18'],
    0x08091300: ['light.menu_19'],

    0x0A000000: ['RK Web'],

    
    0x00010004: ['Ctrl+A'],
    
    0x0001001d: ['Ctrl+Z'],
    0x00010006: ['shortcuts.copy'],
    0x00010019: ['shortcuts.paste'],
    0x0001001b: ['shortcuts.cut'],
    0x00010016: ['shortcuts.save'],
    0x0004002b: ['shortcuts.switchApp'],
    0x00080007: ['shortcuts.desktop'],
    0x0008000f: ['shortcuts.lock'],
    0x0004003d: ['shortcuts.close'],
}


export const KeyText_Mac: Record<number, Array<String>> = {
    0x00: [''],
    0x04: ['A'],
    0x05: ['B'],
    0x06: ['C'],
    0x07: ['D'],
    0x08: ['E'],
    0x09: ['F'],
    0x0a: ['G'],
    0x0b: ['H'],
    0x0c: ['I'],
    0x0d: ['J'],
    0x0e: ['K'],
    0x0f: ['L'],
    0x10: ['M'],
    0x11: ['N'],
    0x12: ['O'],
    0x13: ['P'],
    0x14: ['Q'],
    0x15: ['R'],
    0x16: ['S'],
    0x17: ['T'],
    0x18: ['U'],
    0x19: ['V'],
    0x1a: ['W'],
    0x1b: ['X'],
    0x1c: ['Y'],
    0x1d: ['Z'],

    0x29: ['ESC'],
    0x2b: ['TAB'],
    0x39: ['CAPS'],
    0x2a: ['BackSpace'],
    0x28: ['ENTER'],
    0x2c: ['Space'],

    0x35: ['`~'],   //bo lang
    0x2d: ['_-'],   //xia hua xian
    0x2e: ['+='],   //deng hao
    0x2f: ['{['],   //zuo zhong kuo hao
    0x30: ['}]'],   //you zhong kuo hao
    0x31: ['|\\'],   //xie gang      //shu xian
    0x33: [':;'],   //fen hao
    0x34: ['"\''],   //yin hao
    0x36: ['<,'],   //dou hao
    0x37: ['>.'],   //ju hao
    0x38: ['?/'],   //dun hao
    //////////////////////////////
    0x1e: ['1!'],
    0x1f: ['2@'],
    0x20: ['3#'],
    0x21: ['4$'],
    0x22: ['5%'],
    0x23: ['6^'],
    0x24: ['7&'],
    0x25: ['8*'],
    0x26: ['9('],
    0x27: ['0)'],
    ////////////////////
    0x3a: ['F1'],
    0x3b: ['F2'],
    0x3c: ['F3'],
    0x3d: ['F4'],
    0x3e: ['F5'],
    0x3f: ['F6'],
    0x40: ['F7'],
    0x41: ['F8'],
    0x42: ['F9'],
    0x43: ['F10'],
    0x44: ['F11'],
    0x45: ['F12'],
    0x68: ['F13'],
    0x69: ['F14'],
    0x6A: ['F15'],

    0x46: ['Print'],
    0x47: ['ScrLock'],
    0x48: ['Pause'],
    0x49: ['Ins'],
    0x4a: ['Home'],
    0x4b: ['PgUp'],
    0x4c: ['Del'],
    0x4d: ['End'],
    0x4e: ['PgDn'],

    0x4f: ['→'],
    0x50: ['←'],
    0x51: ['↓'],
    0x52: ['↑'],

    0x53: ['NumLock'],
    0x54: ['/'],
    0x55: ['*'],
    0x56: ['-'],
    0x57: ['+'],
    0x58: ['Enter'],
    0x63: ['.'],

    0x59: ['1'],
    0x5a: ['2'],
    0x5b: ['3'],
    0x5c: ['4'],
    0x5d: ['5'],
    0x5e: ['6'],
    0x5f: ['7'],
    0x60: ['8'],
    0x61: ['9'],
    0x62: ['0'],

    //0x31[: '',
    0x32: ['K42'],
    0x64: ['|\\'],
    0x65: ['App'],
    0x85: ['K107'],
    0x87: ['ー', '\\', 'ろ'],
    0x88: ['Kana'],
    0x89: ['￥', '|', '-', ''],
    0x8a: ['<img class="keyimg_noinvert" src="/src/assets/images/keys/K132.png" />'],
    0x8b: ['<img class="keyimg_noinvert" src="/src/assets/images/keys/K131.png" />'],
    0x90: ['K151'],//key_Hangul
    0x91: ['K150'],//Key_Hanja

    //****************************************************************
    //Modify key
    0x00010000: ['<img class="keyimg" src="/src/assets/images/mac/control.png" />'],
    0x00020000: ['<img class="keyimg" src="/src/assets/images/mac/shift.png" />'],
    0x00040000: ['<img class="keyimg" src="/src/assets/images/mac/option.png" />'],
    0x00080000: ['<img class="keyimg" src="/src/assets/images/mac/command.png" />'],
    0x00100000: ['<img class="keyimg" src="/src/assets/images/mac/control.png" />'],
    0x00200000: ['<img class="keyimg" src="/src/assets/images/mac/shift.png" />'],
    0x00400000: ['<img class="keyimg" src="/src/assets/images/mac/option.png" />'],
    0x00800000: ['<img class="keyimg" src="/src/assets/images/mac/command.png" />'],
    //****************************************************************
    //macro�е�modify key����
    0xe0: ['Control'],
    0xe1: ['L-Shift'],
    0xe2: ['Option'],
    0xe3: ['Command'],
    0xe4: ['Control'],
    0xe5: ['R-Shift'],
    0xe6: ['Option'],
    0xe7: ['Command'],
    //****************************************************************
    //macro�е�mouse key����
    0x01: ['Mouse-L'],
    0x02: ['Mouse-R'],
    //0x04: 'Mouse-M',
    //0x08: 'Mouse-B4',
    //0x10: 'Mouse-B5',
    0xff: ['Mouse-LT'],
    //0x01: 'Mouse-RT',
    //0xff: 'Mouse-UP',
    //0x01: 'Mouse-DN',
    //****************************************************************
    //��ϼ�����? 
    //KEY_win_shift_4	  	  : 'Win + Shift + 4',
    //KEY_win_shift_3	  	  : 'Win + Shift + 4',
    //KEY_win_shift_ctrl_4  : 'Win + Shift + Ctrl + 4',
    //KEY_WIN_D	  		  : 'Win + D',
    //KEY_WIN_SPACEBAR	  : 'Win + Space',//SIRI
    //KEY_WIN_TAB	  		  : 'Win + Tab',//�����񴰿�
    //KEY_WIN_E	  		  : 'Win + E',//�����б�    
    //KEY_ALT_SPACEBAR	  : 'Alt + Space',//SIRI    
    0x00010052: ['<img class="keyimg" src="/src/assets/images/mac/control.png" /> + Up'],  //KEY_CTRL_UP	  		  : 'Ctrl + UP',
    //KEY_CTRL_DN	  		  : 'Ctrl + DN',
    //KEY_CTRL_C	  		  : 'Ctrl + C',
    //KEY_CTRL_V	  		  : 'Ctrl + V',
    //KEY_ALT_TAB	  		  : 'Alt + Tab',
    0x0080002c: ['<img class="keyimg" src="/src/assets/images/mac/command.png" /> + Space'],
    //****************************************************************
    //BYTE1:1�����?2�Ҽ���3�м���4ǰ������5���˼���6��ڡ�?7�Ұڡ�8�Ϲ��֡�9�¹��֡�10X����11X���ҡ�12Y���ϡ�13Y����
    //BYTE2:0xff��������0����һ�Σ����·������룬�ͷŷ��ͷ��룩��1˫����2������
    //BYTE3:�����ظ�ʱ�䣬0Ĭ�ϼ��ʱ��?
    //Mouse key
    0x01010100: ['L-Button'],
    0x01020100: ['R-Button'],
    0x01030100: ['M-Button'],
    0x01040100: ['RB0-Button'],
    0x01050100: ['RB1-Button'],
    0x01060100: ['TL-Button'],
    0x01070100: ['TR-Button'],
    0x01080100: ['ScrollUp-Button'],
    0x01090100: ['ScrollDn-Button'],
    0x010A0000: ['MS-X-L'],
    0x010B0000: ['MX-X-R'],
    0x010C0000: ['MS-Y-L'],
    0x010D0000: ['MS-Y-R'],
    //****************************************************************
    //��ý���?
    0x0200006f: [`<img class="keyimg keyimg1" src="/src/assets/images/mac/brightness_i.png" />`],
    0x02000070: [`<img class="keyimg" src="/src/assets/images/mac/brightness_d.png" />`],
    0x02000040: ['IOSBack'],//F7

    0x020000b5: ['NextTr'],//0xE8
    0x020000b6: ['PrevTr'],//0xE9
    0x020000b7: ['Stop'],//0xEA
    0x020000b8: ['Eject'],//0xEB
    0x020000cd: ['PlayPause'],//0xEC
    0x020000E2: ['Mute'],//0xED
    0x020000e9: ['VolumI'],//0xEE  //+
    0x020000ea: ['VolumD'],//0xEF  //-

    0x02000183: ['Media'],//F0
    0x0200018a: ['Email'],//F1
    0x02000192: ['Calculator'],//F2
    0x02000194: ['MyComputer'],//F3
    0x02000221: ['Search'],//F4
    0x02000223: ['WWW'],//F5
    0x02000224: ['Back'],//F6
    0x02000225: ['Forward'],//F7

    0x02000226: ['iStop'],
    0x02000227: ['Refresh'],
    0x0200022a: ['Favorites'],

    0x020000CF: ['Siri'],
    0x0200029F: [`<img class="keyimg" src="/src/assets/images/mac/mission.png" />`],
    0x020002A0: [`<img class="keyimg" src="/src/assets/images/mac/launchpad.png" />`],
    0x000A001D: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + Z`],
    0x000A000A: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + G`],
    0x000C000B: [`<img class="keyimg" src="/src/assets/images/mac/option.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + H`],
    0x000C0010: [`<img class="keyimg" src="/src/assets/images/mac/option.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + M`],
    0x000C001A: [`<img class="keyimg" src="/src/assets/images/mac/option.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + W`],
    0x000C0029: [`<img class="keyimg" src="/src/assets/images/mac/option.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + ESC`],
    0x000C002C: [`<img class="keyimg" src="/src/assets/images/mac/option.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + Space`],
    0x0009002C: [`<img class="keyimg" src="/src/assets/images/mac/control.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + Space`],
    0x00090009: [`<img class="keyimg" src="/src/assets/images/mac/control.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + F`],
    0x000A0022: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + 5`],
    0x000A0020: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + 3`],
    0x000A0021: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + 4`],
    0x000A0011: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + N`],

    // 新增Mac快捷键映射
    0x00080004: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + A`], // Command-A - 全选
    0x00080005: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + B`], // Command-B - 以粗体显示所选文本
    0x00080006: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + C`], // Command-C - 复制
    0x00080009: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + F`], // Command-F - 查找
    0x0008000A: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + G`], // Command-G - 查找下一个
    0x0008000B: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + H`], // Command-H - 隐藏当前App
    0x0008000C: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + I`], // Command-I - 显示所选文件的"显示简介"窗口
    0x00080010: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + M`], // Command-M - 最小化当前窗口
    0x00080012: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + O`], // Command-O - 打开文件
    0x00080013: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + P`], // Command-P - 打印
    0x00080016: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + S`], // Command-S - 保存
    0x00080017: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + T`], // Command-T - 新建标签页
    0x00080018: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + U`], // Command-U - 对所选文本加下划线
    0x00080019: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + V`], // Command-V - 粘贴
    0x0008001A: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + W`], // Command-W - 关闭当前窗口
    0x0008001B: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + X`], // Command-X - 剪切
    0x0008001D: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + Z`], // Command-Z - 撤销
    0x0008002B: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + TAB`], // Command-TAB - 切换App
    0x0008002C: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + Space`], // Command-Space - 切换输入法
    0x00080035: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + \``], // Command-重音符 - 在当前App的各个窗口之间切换
    0x00080036: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + ,`], // Command-逗号 - 打开偏好设置
    0x0008004C: [`<img class="keyimg" src="/src/assets/images/mac/command.png" /> + Delete`], // Command-Delete - 将所选项目移到废纸篓
    0x00090014: [`<img class="keyimg" src="/src/assets/images/mac/control.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + Q`], // Control-Command-Q - 立即锁定屏幕
    0x000C0045: [`<img class="keyimg" src="/src/assets/images/mac/option.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + F12`], // Option-Command-F12 - 将Mac置于睡眠状态
    0x000A0045: [`<img class="keyimg" src="/src/assets/images/mac/control.png" /> + <img class="keyimg" src="/src/assets/images/mac/shift.png" /> + F12`], // Control-Shift-F12 - 将显示器置于睡眠状态
    0x000A0004: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + A`], // Shift-Command-A - 打开"应用程序"文件夹
    0x000A0006: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + C`], // Shift-Command-C - 打开"电脑"窗口
    0x000A0007: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + D`], // Shift-Command-D - 打开"桌面"文件夹
    0x000A0029: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + ESC`], // Shift-Command-ESC - 强制退出
    0x000A002B: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + TAB`], // Shift-Command-TAB - 向后切换App
    0x000A002C: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + Space`], // Shift-Command-Space - 显示字符检视器
    0x000A004C: [`<img class="keyimg" src="/src/assets/images/mac/shift.png" /> + <img class="keyimg" src="/src/assets/images/mac/command.png" /> + Delete`], // Shift-Command-Delete - 清倒废纸篓
    //****************************************************************
    //byte3��0x03��ʾ��macro��byte2��������ʾmacro��ѭ����ʽ��byte1��ѭ������  byte0��������ʾmacro���?
    //byte2����ʱ��������
    //0x01	ָ��ѭ��������0x02ѭ������������£�?0x03ѭ������ǰ���ɿ�
    //Macro Key
    0x03000000: ['Macro0'],
    0x03000001: ['Macro1'],

    //****************************************************************
    //ͨ��ð�ݶ˿ڷ����Զ���ļ�ֵ�������������⹦�ܴ�����������?�̶������ӣ�
    //�Զ����?
    0x04000001:  ['Define1'],
    0x04000002:  ['Define2'],
    0x05010000:  ['DpiSwitch+'],
    0x05020000:  ['DpiSwitch-'],
    0x05040000:  ['DpiSwitchLoop'],
    0x06010000:  ['ProfileSwitch+'],
    0x06020000:  ['ProfileSwitch-'],
    0x06040000:  ['ProfileSwitchLoop'],
    //****************************************************************
    0x07000000: ['InvertASWD'],      //ȡ��ASWD�뷽��
    0x07000001: ['WinLock'],      //WIN Lock
    0x07000002: ['AllLock'],      //���м���ס
    0x07000003: ['Macro'],      //MACRO¼�Ƽ�
    0x07000004: ['AllReset'],      //���в����ָ�Ĭ�� 
    0x07000005: ['BT0'],      //����ģʽ0
    0x07000006: ['BT1'],      //����ģʽ1
    0x07000007: ['BT2'],      //����ģʽ2
    0x07000008: ['2.4G'],      //2.4Gģʽ
    0x07000009: ['USB'],      //USBģʽ
    0x0700000a: ['EMI Test'],      //���߽������?    
    0x0700000b: ['LedOnOff'],
    0x0700000c: ['Battery'],      //电量显示 
    0x0700000d: ['WinMac'],
    0x0700000e: ['Win'], 
    0x0700000f: ['Mac'],          //����Mac
    0x07000020: ['Windows'],      //����Windows
    0x07000010: ['KB'],
    0x07000022: ['O_Mode'],
    0x07000023: ['L_Mode'],
    0x07000024: ['Touch_Mode'],
    0x07000025: ['SP_B6Key_Mode'],
    //****************************************************************
    //byte0���̶�0x08
    //byte1��0��Ч�л���1��Ч����2��ɫ�л���3�����л���4�ٶ��л���5������Ϸ����¼�ƣ�6��Ϸ���ֱ��棬7¼��/���棬8��λ��9��Чģʽָ��
    //byte2��0ѭ����1+/��2-/�ң����byte1Ϊ9����������ֵ������ǰģʽ
    //byte3��0��������1����1��2����2
    //�ƹ�ģʽ�趨
    0x08090000: ['light.menu_0'], //ֱ���趨Ϊģʽ0
    0x08090100: ['light.menu_1'], //ֱ���趨Ϊģʽ1
    0x08090200: ['light.menu_2'], //ֱ���趨Ϊģʽ2
    0x08090300: ['light.menu_3'], //ֱ���趨Ϊģʽ3

    0x08092000: ['LedMode20'], //ֱ���趨Ϊģʽ20
    0x08092100: ['LedMode21'], //ֱ���趨Ϊģʽ21
    0x08092200: ['LedMode22'], //ֱ���趨Ϊģʽ22
    //��Ч�л�[
    0x08000000: ['LedMode+'], //ֱ���趨Ϊģʽ+
    0x08000100: ['LedMode-'], //ֱ���趨Ϊģʽ-
    0x08000200: ['LedModeLoop'], //ֱ���趨ΪģʽLOOP

    0x08000300: ['DefineLedModel+'], //ֱ���趨Ϊģʽ+
    0x08000400: ['DefineLedModel-'], //ֱ���趨Ϊģʽ-
    0x08000500: ['DefineLedModelLoop'], //ֱ���趨ΪģʽLOOP

    //��Ч����[
    0x08010000: ['LedDirctionLoop'], //��Ч����LOOP
    0x08010100: ['LedDirction+'], //��Ч������
    0x08010200: ['LedDirction-'], //��Ч������

    //��ɫ�л�[
    0x08020100: ['LedColorMode+'], //ֱ���趨Ϊ��ɫ+
    0x08020200: ['LedColorMode-'], //ֱ���趨Ϊ��ɫ-
    0x08020000: ['LedColorModeLoop'], //ֱ���趨Ϊ��ɫLOOP

    //����[
    0x08030100: [`<img class="keyimg keyimg1" src="/src/assets/images/mac/backlight_i.png" />`], //ֱ���趨Ϊģʽ+
    0x08030200: [`<img class="keyimg" src="/src/assets/images/mac/backlight_d.png" />`], //ֱ���趨Ϊģʽ-
    0x08030000: ['LedLuminLoop'], //ֱ���趨ΪģʽLOOP

    //�ٶ�[
    0x08040100: ['light.fun_3'], //  +
    0x08040200: ['light.fun_4'], //  -
    0x08040000: ['LedBreathLoop'], //  

    //¼��
    0x08050000: ['LedRecStart'], //LED¼�Ƽ�����
    0x08060000: ['LedRecSave'], //LED¼�Ƽ�����
    0x08070000: ['LedRec'], //LED¼�Ƽ�����/����
    0x08080000: ['LedRecReset'], //LED�ָ���������
    0x08ff0000: ['SP_KB_REC_Reset'],		
    //logo
    0x08000001: ['LogoModelLoop'], //ֱ���趨Ϊģʽ+
    0x08000101: ['LogoModel+'], //ֱ���趨Ϊģʽ-
    0x08000201: ['LogoModel-'], //ֱ���趨ΪģʽLOOP

    0x08010001: ['LogoDirectionLoop'], //��Ч����LOOP
    0x08010101: ['LogoDirection+'], //��Ч������
    0x08010201: ['LogoDirection-'], //��Ч������

    0x08020101: ['LogoColorMode+'], //ֱ���趨Ϊ��ɫ+
    0x08020201: ['LogoColorMode-'], //ֱ���趨Ϊ��ɫ-
    0x08020001: ['LogoColorModeLoop'], //ֱ���趨Ϊ��ɫLOOP

    0x08030101: ['LogoLumin+'], //ֱ���趨Ϊģʽ+
    0x08030201: ['LogoLumin-'], //ֱ���趨Ϊģʽ-
    0x08030001: ['LogoLuminLoop'], //ֱ���趨ΪģʽLOOP

    0x08040101: ['LogoBreath+'], //ֱ���趨Ϊ�����ٶ�+
    0x08040201: ['LogoBreath-'], //ֱ���趨Ϊ�����ٶ�-
    0x08040001: ['LogoBreathLoop'], //ֱ���趨Ϊ�����ٶ�LOOP



    //ReportRate�趨
    0x09000000: ['ReportRate125'], //ֱ���趨Ϊ125
    0x09000001: ['ReportRate250'], //ֱ���趨Ϊ250
    0x09000002: ['ReportRate500'], //ֱ���趨Ϊ500
    0x09000003: ['ReportRate1000'], //ֱ���趨Ϊ1000
    0x09010000: ['ReportRate+'], //�ر��ʵ�λ��
    0x09020000: ['ReportRate-'], //�ر��ʵ�λ��
    0x09030000: ['ReportRateLoop'], //�ر��ʵ�λѭ��

    0x0d000000: ['Fn1'],
    0x0d010000: ['Fn2'],
    //��Դ��
    0x10000001: ['Power'],
    0x10000002: ['Sleep'],
    0x10000004: ['WakeUp'],

    0x00020035: ['~'],
    0x0002001e: ['!'],
    0x0002001f: ['@'],
    0x00020020: ['#'],
    0x00020021: ['$'],
    0x00020022: ['%'],
    0x00020023: ['^'],
    0x00020024: ['&'],
    0x00020025: ['*'],
    0x00020026: ['('],
    0x00020027: [')'],
    0x0002002D: ['_'],
    0x0002002E: ['+'],
    0x0002002F: ['{'],
    0x00020030: ['}'],
    0x00020031: ['|'],
    0x00020033: [':'],
    0x00020034: ['"'],
    0x00020036: ['<'],
    0x00020037: ['>'],
    0x00020038: ['?'],

    0x08090400: ['light.menu_4'],
    0x08090500: ['light.menu_5'],
    0x08090600: ['light.menu_6'],
    0x08090700: ['light.menu_7'],
    0x08090800: ['light.menu_8'],
    0x08090900: ['light.menu_9'],
    0x08090A00: ['light.menu_10'],
    0x08090B00: ['light.menu_11'],
    0x08090C00: ['light.menu_12'],
    0x08090D00: ['light.menu_13'],
    0x08090E00: ['light.menu_14'],
    0x08090F00: ['light.menu_15'],
    0x08091000: ['light.menu_16'],
    0x08091100: ['light.menu_17'],
    0x08091200: ['light.menu_18'],
    0x08091300: ['light.menu_19'],

    0x0A000000: ['RK Web'],
    0x00010006: ['Ctrl+C'],
    0x00010019: ['Ctrl+V'],
    0x00010004: ['Ctrl+A'],
    0x0001001b: ['Ctrl+X'],
    0x0001001d: ['Ctrl+Z']
}

export const KeyCodeMap: Record<string, KeyCodeTable> = {

    'Escape': { key: 'Escape', hid: 0X29, vk: 0x1B },
    'F1': { key: 'F1', hid: 0X3a, vk: 0x70 },
    'F2': { key: 'F2', hid: 0X3b, vk: 0x71 },
    'F3': { key: 'F3', hid: 0X3c, vk: 0x72 },
    'F4': { key: 'F4', hid: 0X3d, vk: 0x73 },
    'F5': { key: 'F5', hid: 0X3e, vk: 0x74 },
    'F6': { key: 'F6', hid: 0X3f, vk: 0x75 },
    'F7': { key: 'F7', hid: 0X40, vk: 0x76 },
    'F8': { key: 'F8', hid: 0X41, vk: 0x77 },
    'F9': { key: 'F9', hid: 0X42, vk: 0x78 },
    'F10': { key: 'F10', hid: 0X43, vk: 0x79 },
    'F11': { key: 'F11', hid: 0X44, vk: 0x7A },
    'F12': { key: 'F12', hid: 0X45, vk: 0x7B },
    'Backspace': { key: 'Backspace', hid: 0X2a, vk: 0x08 },
    'Tab': { key: 'Tab', hid: 0X2b, vk: 0x09 },
    'CapsLock': { key: 'CapsLock', hid: 0X39, vk: 0x14 },
    'Enter': { key: 'Enter', hid: 0X28, vk: 0x0D },
    'Space': { key: 'Space', hid: 0X2c, vk: 0x20 },
    'ScrollLock': { key: 'ScrollLock', hid: 0X47, vk: 0x91 },
    'Pause': { key: 'Pause', hid: 0X48, vk: 0x13 },
    'Insert': { key: 'Insert', hid: 0X49, vk: 0x2D },
    'PrintScreen': { key: 'PrintScreen', hid: 0X46, vk: 0x2C },
    'Delete': { key: 'Delete', hid: 0X4c, vk: 0x2E },
    'Home': { key: 'Home', hid: 0X4a, vk: 0x24 },
    'End': { key: 'End', hid: 0X4d, vk: 0x23 },
    'PageUp': { key: 'PageUp', hid: 0X4b, vk: 0x21 },
    'PageDown': { key: 'PageDown', hid: 0X4e, vk: 0x22 },
    'ArrowLeft': { key: 'ArrowLeft', hid: 0X50, vk: 0x25 },
    'ArrowUp': { key: 'ArrowUp', hid: 0X52, vk: 0x26 },
    'ArrowRight': { key: 'ArrowRight', hid: 0X4f, vk: 0x27 },
    'ArrowDown': { key: 'ArrowDown', hid: 0X51, vk: 0x28 },
    'Numpad0': { key: '0', hid: 0X62, vk: 0x60 },
    'Numpad1': { key: '1', hid: 0X59, vk: 0x61 },
    'Numpad2': { key: '2', hid: 0X5a, vk: 0x62 },
    'Numpad3': { key: '3', hid: 0X5b, vk: 0x63 },
    'Numpad4': { key: '4', hid: 0X5c, vk: 0x64 },
    'Numpad5': { key: '5', hid: 0X5d, vk: 0x65 },
    'Numpad6': { key: '6', hid: 0X5e, vk: 0x66 },
    'Numpad7': { key: '7', hid: 0X5f, vk: 0x67 },
    'Numpad8': { key: '8', hid: 0X60, vk: 0x68 },
    'Numpad9': { key: '9', hid: 0X61, vk: 0x69 },
    'NumpadAdd ': { key: '+', hid: 0X57, vk: 0x6B },
    'NumpadSubtract': { key: '-', hid: 0X56, vk: 0x6D },
    'NumpadMultiply': { key: '*', hid: 0X55, vk: 0x6A },
    'NumpadDivide': { key: '/', hid: 0X54, vk: 0x6F },
    'NumpadDecimal': { key: '.', hid: 0X63, vk: 0x6E },
    'NumLock': { key: 'NumLock', hid: 0X53, vk: 0x90 },
    'ControlLeft': { key: 'ControlRight', hid: 0XE0, vk: 0x11 },
    'ControlRight': { key: 'ControlRight', hid: 0XE4, vk: 0x11 },
    'ShiftLeft': { key: 'ShiftLeft', hid: 0XE1, vk: 0x10 },
    'ShiftRight': { key: 'ShiftRight', hid: 0XE5, vk: 0x10 },
    'AltLeft': { key: 'AltLeft', hid: 0XE2, vk: 0x12 },
    'AltRight': { key: 'AltRight', hid: 0XE6, vk: 0x12 },
    'ContextMenu': { key: 'ContextMenu', hid: 0x65, vk: 0x5D },
    'LWIN': { key: 'LWin', hid: 0xE3, vk: 0x5B },
    'RWIN': { key: 'RWin', hid: 0xE7, vk: 0x5C },
    'KeyA': { key: 'A', hid: 0X04, vk: 0x41 },
    'KeyB': { key: 'B', hid: 0X05, vk: 0x42 },
    'KeyC': { key: 'C', hid: 0X06, vk: 0x43 },
    'KeyD': { key: 'D', hid: 0X07, vk: 0x44 },
    'KeyE': { key: 'E', hid: 0X08, vk: 0x45 },
    'KeyF': { key: 'F', hid: 0X09, vk: 0x46 },
    'KeyG': { key: 'G', hid: 0X0a, vk: 0x47 },
    'KeyH': { key: 'H', hid: 0X0b, vk: 0x48 },
    'KeyI': { key: 'I', hid: 0X0c, vk: 0x49 },
    'KeyJ': { key: 'J', hid: 0X0d, vk: 0x4A },
    'KeyK': { key: 'K', hid: 0X0e, vk: 0x4B },
    'KeyL': { key: 'L', hid: 0X0f, vk: 0x4C },
    'KeyM': { key: 'M', hid: 0X10, vk: 0x4D },
    'KeyN': { key: 'N', hid: 0X11, vk: 0x4E },
    'KeyO': { key: 'O', hid: 0X12, vk: 0x4F },
    'KeyP': { key: 'P', hid: 0X13, vk: 0x50 },
    'KeyQ': { key: 'Q', hid: 0X14, vk: 0x51 },
    'KeyR': { key: 'R', hid: 0X15, vk: 0x52 },
    'KeyS': { key: 'S', hid: 0X16, vk: 0x53 },
    'KeyT': { key: 'T', hid: 0X17, vk: 0x54 },
    'KeyU': { key: 'U', hid: 0X18, vk: 0x55 },
    'KeyV': { key: 'V', hid: 0X19, vk: 0x56 },
    'KeyW': { key: 'W', hid: 0X1a, vk: 0x57 },
    'KeyX': { key: 'X', hid: 0X1b, vk: 0x58 },
    'KeyY': { key: 'Y', hid: 0X1c, vk: 0x59 },
    'KeyZ': { key: 'Z', hid: 0X1d, vk: 0x5A },
    'Digit0': { key: '0', hid: 0X27, vk: 0x30 },
    'Digit1': { key: '1', hid: 0X1e, vk: 0x31 },
    'Digit2': { key: '2', hid: 0X1f, vk: 0x32 },
    'Digit3': { key: '3', hid: 0X20, vk: 0x33 },
    'Digit4': { key: '4', hid: 0X21, vk: 0x34 },
    'Digit5': { key: '5', hid: 0X22, vk: 0x35 },
    'Digit6': { key: '6', hid: 0X23, vk: 0x36 },
    'Digit7': { key: '7', hid: 0X24, vk: 0x37 },
    'Digit8': { key: '8', hid: 0X25, vk: 0x38 },
    'Digit9': { key: '9', hid: 0X26, vk: 0x39 },
    'Minus': { key: '-', hid: 0x2d, vk: 0xBD },
    'Equal': { key: '=', hid: 0x2e, vk: 0xBB },
    'Comma': { key: ',', hid: 0x36, vk: 0xBC },
    'Period': { key: '.', hid: 0x37, vk: 0xBE },
    'Semicolon': { key: ';', hid: 0x33, vk: 0xBA },
    'Backquote': { key: '`', hid: 0x35, vk: 0xC0 },
    'Quote': { key: '\'', hid: 0x34, vk: 0xDE },
    'BracketLeft': { key: '[', hid: 0x2f, vk: 0xDB },
    'BracketRight': { key: ']', hid: 0x30, vk: 0xDD },
    'Backslash': { key: '\\', hid: 0x31, vk: 0xDC },
    'Slash': { key: '/', hid: 0x38, vk: 0xBF },
}