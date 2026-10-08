import type { ConnectionType, ConnectionEventEnum, ConnectionStatusEnum, ProtocolType } from './enum'

export interface State {
  connectType: ConnectionType
  connectionEvent: ConnectionEventEnum
  ConnectionStatus: ConnectionStatusEnum
  protocolType: ProtocolType
  productId?: number
  deviceName?: String
}
