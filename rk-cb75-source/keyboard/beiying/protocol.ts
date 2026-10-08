import type { KeyboardState, IProtocol } from './interface'

export abstract class Protocol extends EventTarget implements IProtocol  {

    state: KeyboardState;
    device: HIDDevice

    constructor(state: KeyboardState, device: HIDDevice) {
        super();
        this.state = state;
        this.device = device;
    }

    abstract init(): Promise<void>;
    abstract destroy(): Promise<void>;
}