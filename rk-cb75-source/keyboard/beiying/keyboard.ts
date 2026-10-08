import type { IProtocol, KeyTableData, LightEffect, LightInfo, KeyboardDefine } from './interface'
import { KeyMappingType } from '@/common/enum'
import { ConnectionType, ConnectionEventEnum, ConnectionStatusEnum } from '@/device/enum'
import { defaultState } from './state'
import { GetDongleStatusPacket } from './packets/getDongleStatusPacket';
import { GetPasswordPacket } from './packets/getPasswordPacket';
import type { HidDeviceDefine, IHidDevice } from '@/device/interface';
import { Device } from '@/device/device';

const REPORT_ID_DONGLE: number = 0x13;

const COMMAND_ID: {
    ActivelyReport: number;
    GetDongleStatus: number;
    GetPassword: number;
} = {
    ActivelyReport: 0x0A,
    GetDongleStatus: 0x07,
    GetPassword: 0x05,
}

export const RK_DONGLE_EVENT_DEFINE: {
    OnDongleStatusChanged: string;
    OnPasswordGotten: string;
} = {
    OnDongleStatusChanged: 'OnDongleStatusChanged',
    OnPasswordGotten: 'OnPasswordGotten',
}

/**
 * Main class.
 */
export class Keyboard extends Device {

    /** Device protocol */
    protocol?: IProtocol;

    /** Current keyboard state */
    state = defaultState;

    keyboardDefine?: KeyboardDefine;

    pktGetDongleStatus: GetDongleStatusPacket;
    pktGetPassword: GetPasswordPacket;

    callback = (e: HIDInputReportEvent) => this.onReport(e);

    constructor() {
        super();

        this.deviceState = this.state;
        this.pktGetDongleStatus = new GetDongleStatusPacket(this.dongleStatusReport.bind(this));
        this.pktGetPassword = new GetPasswordPacket(this.passwordReport.bind(this));
    }

    async init(deviceDefine: HidDeviceDefine) {
        if (this.device != undefined) {
            
            if (!this.device.opened) {
                await this.device.open();
            }

            if (this.device.opened) {
                this.state.deviceName = this.device.productName;
                this.state.connectType = ConnectionType.USB;
                this.state.connectionEvent = ConnectionEventEnum.Open;
                this.state.productId = this.device.productId;

                this.state.connectType = deviceDefine.connectType;

                // if (this.hid != undefined) {
                //     const connectionEventCallback = (event: HIDConnectionEvent) => {

                //         if (this.device != undefined) {
                //             this.device.removeEventListener("inputreport", this.callback);
                //         }

                //         event.device.close();
                //         this.protocol?.destroy();
                //         this.state.ConnectionStatus = ConnectionStatusEnum.Disconnected;
                //         this.state.connectionEvent = ConnectionEventEnum.Disconnect;
                //         this.dispatchEvent(new KeyboardEvent("connection", this));
                //         this.hid?.removeEventListener("disconnect", connectionEventCallback, false);
                //         this.device = undefined;
                //         this.protocol = undefined;
                //     };

                //     this.hid.addEventListener("disconnect", connectionEventCallback, false);
                // }
                
                this.dispatchEvent(new KeyboardEvent("connection", this));
            }
        }
    }

    /**
     * Close current opened device
     */
    async close() {
        if (this.device && this.device.opened) {
            this.device.removeEventListener("inputreport", this.callback);

            await this.device.close();
            await this.device.forget();

            this.protocol?.destroy();

            this.state.connectionEvent = ConnectionEventEnum.Close;
            this.state.ConnectionStatus = ConnectionStatusEnum.Disconnected;

            this.keyboardDefine = undefined;
            this.device = undefined;
            this.protocol = undefined;

            this.dispatchEvent(new KeyboardEvent("connection", this));
        }
    }

    loadDefaultValue(keyTableDatas: Record<number, Record<number, Array<KeyTableData>>>, lightInfo: LightInfo) {
        var l:any, t:any, i:any;
        if (this.device != undefined && this.keyboardDefine != undefined) {
            for (t in this.keyboardDefine.keyMatrixTable) {
                let table = this.keyboardDefine.keyMatrixTable[t];
                if (!keyTableDatas.hasOwnProperty(table)) {
                    keyTableDatas[table] = {};
                }

                for (l in this.keyboardDefine.keyMatrixLayer) {
                    let layer = this.keyboardDefine.keyMatrixLayer[l];
                    if (!keyTableDatas[table].hasOwnProperty(layer)) {
                        keyTableDatas[table][layer] = [];
                    }

                    let layout = keyTableDatas[table][layer];
                    if (layout.length > 0) {
                        layout.splice(0, layout.length);
                    }
                    if (this.keyboardDefine.keyLayout[table] && this.keyboardDefine.keyLayout[table][layer]) {
                    for (i = 0; i < this.keyboardDefine.keyLayout[table][layer].length; i++) {
                        let code = this.keyboardDefine.keyLayout[table][layer][i];
                        // let keyStr = '';

                        // let strArray = this.keyboardDefine.keyText[code];
                        // if (strArray != undefined) {
                        //     let index = 0;
                        //     for (index = 0; index < this.keyboardDefine.keyText[code].length; index++) {
                        //         keyStr = `${keyStr}${this.keyboardDefine.keyText[code][index]}`
                        //     }
                        // } else {
                        //     keyStr = 'undefined';
                        // }

                        let key: KeyTableData = {
                            keyStr: this.keyboardDefine.keyText[code],
                            keyCode: code,
                            index: i,
                            keyMappingData: {
                                keyStr: this.keyboardDefine.keyText[code],
                                keyCode: code,
                                keyMappingType: KeyMappingType.KeyBoard,
                                keyMappingPara: 0,
                                keyRaw: code
                            }
                        }

                        layout.push(key);
                    }
                    }
                }
            }

            if (lightInfo.lightEffects.length > 0) {
                lightInfo.lightEffects.splice(0, this.state.lightInfo.lightEffects.length);
            }

            for (i = 0; i < this.keyboardDefine.lightEffects.length; i++) {
                let tmp: LightEffect = {
                    effect: this.keyboardDefine.lightEffects[i].effect,
                    speed: this.keyboardDefine.lightEffects[i].speed,
                    brightness: this.keyboardDefine.lightEffects[i].brightness,
                    color: this.keyboardDefine.lightEffects[i].color,
                    mixColor: this.keyboardDefine.lightEffects[i].mixColor,
                    sleep: this.keyboardDefine.lightEffects[i].sleep
                }
                lightInfo.lightEffects.push(tmp);
            }
        }
    }

    async onReport(report: HIDInputReportEvent) {
        let reportId = report.reportId;
        const { data } = report;

        try {
            let u8 = new Uint8Array(data.buffer, 0, data.buffer.byteLength);
            console.log(`GetReport [${data.byteLength}] bytes -> ${u8.toString()}`);
    
            if (data.byteLength == 19 && reportId == REPORT_ID_DONGLE) {
                let cmd = data.getUint8(0);
                //let packet: Packet_Dongle | null = null;
                switch (cmd) {
                    case COMMAND_ID.ActivelyReport:
                        await this.activelyReport(data);
                        break;
                    case COMMAND_ID.GetDongleStatus:
                        this.pktGetDongleStatus.fromReportData(data);
                        break;
                    case COMMAND_ID.GetPassword:
                        this.pktGetPassword.fromReportData(data);
                        break;
                }
            }
        } catch (e) {

        }
    };

    async activelyReport(data: DataView): Promise<void> {
        let id = data.getUint8(4);
        let val = data.getUint8(5);
        switch (id) {
            case 0x02:
                this.state.ConnectionStatus = val == 1 ? ConnectionStatusEnum.Connected : ConnectionStatusEnum.Disconnected;
                if (this.state.ConnectionStatus == ConnectionStatusEnum.Connected) {
                    setTimeout(this.getPassword.bind(this), 1000);
                }
                this.dispatchEvent(new CustomEvent(RK_DONGLE_EVENT_DEFINE.OnDongleStatusChanged, { detail: this.state.ConnectionStatus }));
                break;
        }
    }

    async getDongleStatus(): Promise<void> {
        if (this.device != undefined) {
            let data = this.pktGetDongleStatus.command();
            await this.device.sendReport(REPORT_ID_DONGLE, data);
            console.log(`SetReport [${data.byteLength}] bytes -> ${data.toString()}`);
        }
    }

    async getPassword() {
        if (this.device != undefined) {
            let data = this.pktGetPassword.command();
            await this.device.sendReport(REPORT_ID_DONGLE, data);
            console.log(`SetReport [${data.byteLength}] bytes -> ${data.toString()}`);
        }
    }

    private dongleStatusReport(event: any) {
        let status = event.detail as boolean ? ConnectionStatusEnum.Connected : ConnectionStatusEnum.Disconnected;
        this.state.ConnectionStatus = status;
        this.dispatchEvent(new CustomEvent(RK_DONGLE_EVENT_DEFINE.OnDongleStatusChanged, { detail: status }));
        if (status == ConnectionStatusEnum.Connected) {
            this.getPassword();
        }
    }

    private passwordReport(event: any) {
        let password = event.detail.pwd as number;
        let version = event.detail.version as string;
        this.state.fwVersion = version;
        this.dispatchEvent(new CustomEvent(RK_DONGLE_EVENT_DEFINE.OnPasswordGotten, { detail: password }));
    }
}

declare class KeyboardEvent extends CustomEvent<Keyboard> {
    constructor(type: string, keyboard: Keyboard);
    public readonly keyboard: Keyboard;
}

export const keyboard: Keyboard = new Keyboard();