import type { LightInfo, KeyboardState, KeyboardDefine } from './interface'
import { ConnectionType, ConnectionEventEnum, ConnectionStatusEnum, ProtocolType } from '@/device/enum'
import { RK_CB75_USB_DEFINE, RK_CB75_DONGLE_DEFINE } from './rk_cb75'

export const lightInfo: LightInfo = {
  lightOn: false,
  lightEffect: 0x00,
  lightEffects: [],
}

export const defaultState: KeyboardState = {
  connectType: ConnectionType.None,
  connectionEvent: ConnectionEventEnum.Disconnect,
  ConnectionStatus: ConnectionStatusEnum.Disconnected,
  protocolType: ProtocolType.BeiYing,
  deviceName: undefined,
  fwVersion: undefined,
  commandId: 0x00,
  dataChangeFlag: 0,
  keyTableData: {},
  lightInfo,
}

export const KeyboardDefineList: Record<string, KeyboardDefine> = {
  'cb75 keyboard wire': RK_CB75_USB_DEFINE,
  'cb75 keyboard 24G': RK_CB75_DONGLE_DEFINE,
}

export const DonglePwdDefineList: Record<number, string> = {
  0x0300055b: 'cb75 keyboard 24G',
}
