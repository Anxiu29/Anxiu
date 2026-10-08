import type { HidDeviceDefine, IHidDevice } from "./interface";
import type { State } from "./state";

export abstract class Device extends EventTarget implements IHidDevice {

    /** Internal WebHID device */
    device?: HIDDevice;

    hid?: HID;

    deviceState?: State;

    abstract init(deviceDefine: HidDeviceDefine): Promise<void>;
    abstract close(): Promise<void>;
}