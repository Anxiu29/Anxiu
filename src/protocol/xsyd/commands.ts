export interface CommandDefinition {
  readonly name: string
  readonly code: number
  readonly responseCode: number
  readonly timeoutMs: number
  readonly responseStatus: 'zero' | 'none'
}

const command = (name: string, code: number, timeoutMs = 1200, responseStatus: CommandDefinition['responseStatus'] = 'zero'): CommandDefinition => ({
  name, code, responseCode: code | 0x80, timeoutMs, responseStatus,
})

export const XSYD_COMMANDS = {
  sync: command('sync', 0x01),
  action: command('action', 0x00),
  keymap: command('keymap', 0x23),
  defaultKeymap: command('default-keymap', 0x2b),
} as const

export const XSYD_ACTIONS = {
  protocolVersion: 0x01, save: 0x02, reload: 0x03, restoreFactory: 0x11,
} as const

export const XSYD_FAILURE_RESPONSE = 0xff
