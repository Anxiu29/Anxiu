import type { ConnectionEventEnum, ConnectionStatusEnum, ConnectionType, DeviceType, ProtocolType } from "./enum";
import type { State } from "./state";

export interface HidDeviceDefine {
    name: String,
    vendorId: number,
    productId: number,
    usagePage: number,
    usage: number,
    connectType: ConnectionType,
    deviceType: DeviceType,
    protocolType: ProtocolType
}

export interface IHidDevice {
    device?: HIDDevice;
    hid?: HID;
    deviceState?: State;
    
    init: (deviceDefine: HidDeviceDefine) => Promise<void>;
    close: () => Promise<void>;
}

export interface ConnectionState {
    connectType: ConnectionType.None,
    connectionEvent: ConnectionEventEnum.Disconnect,
    ConnectionStatus: ConnectionStatusEnum.Disconnected,
}