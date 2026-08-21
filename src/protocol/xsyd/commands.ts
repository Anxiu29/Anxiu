export interface CommandDefinition {
  readonly name: string
  readonly code: number
  readonly responseCode: number
  readonly timeoutMs: number
  readonly responseStatus: 'zero' | 'none'
  /** Action 响应会在 data[1] 回显请求的 order，可用于排除同为 0x80 的主动上报。 */
  readonly responseEchoesOrder: boolean
}

const command = (name: string, code: number, timeoutMs = 1200, responseStatus: CommandDefinition['responseStatus'] = 'zero', responseEchoesOrder = false): CommandDefinition => ({
  name, code, responseCode: code | 0x80, timeoutMs, responseStatus, responseEchoesOrder,
})

export const XSYD_COMMANDS = {
  sync: command('sync', 0x01),
  action: command('action', 0x00, 1200, 'zero', true),
  keymap: command('keymap', 0x23),
  defaultKeymap: command('default-keymap', 0x2b),
  lighting: command('main-lighting', 0x18),
  customLighting: command('custom-key-lighting', 0x2a),
  mt: command('advanced-mt', 0x24),
  tgl: command('advanced-tgl', 0x25),
  dks: command('advanced-dks', 0x26),
  mpt: command('advanced-mpt', 0x27),
  end: command('advanced-end', 0x28),
  socd: command('advanced-socd', 0x2c),
  macroData: command('macro-data', 0x20),
  macroMode: command('macro-mode', 0x21),
} as const

export const XSYD_ACTIONS = {
  protocolVersion: 0x01, save: 0x02, reload: 0x03, restoreFactory: 0x11,
  queryWinMode: 0x21, queryMacMode: 0x22,
  switchToWin: 0x30, switchToMac: 0x31, switchConfiguration: 0x70,
} as const

export const XSYD_FAILURE_RESPONSE = 0xff
