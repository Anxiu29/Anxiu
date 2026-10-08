import type { IPacket } from "../../interface";

export const PROFILE_LENGTH: number = 128;
export const LED_COLOR_COUNT: number = 126;
export const LED_COLOR_LENGTH: number = 3;
export const LED_EFFECT_COLOR_COUNT: number = 7;
export const LED_EFFECT_COUNT: number = 20;
export const KEY_MAXTRIX_LINE: number = 6;
export const KEY_MAXTRIX_COLOUMN: number = 21;
export const PACKET_HEAD_LENGTH: number = 7;
export const MACRO_PER_BLOCK_LENGTH: number = 512;
export const MACRO_MAX_LENGTH: number = 4096;
export const REPORT_ID_LENGTH: number = 1;
export const REPORT_ID_USB: number = 0x06;
export const REPORT_ID_DONGLE: number = 0x13;
export const REPORT_PAYLOAD_LENGTH: number = 0x0E;
export const REPORT_MAX_RETRY: number = 0x0A;

/**
 * Abstract class of packet base
 */
export abstract class Packet_Usb implements IPacket {
    cmdId: number;
    cmdVal: number;
    packageNum: number;
    packageIndex: number;
    dataLength: number;

    constructor(cmdId: number) {
        this.cmdId = cmdId;
        this.cmdVal = 0;
        this.packageNum = 0;
        this.packageIndex = 0;
        this.dataLength = 0;
    }

    fromReportData(buffer: DataView) : IPacket {
        //this.cmdVal = buffer.getUint8(1);
        this.packageNum = buffer.getUint8(4);
        this.packageIndex = buffer.getUint8(5);
        this.dataLength = buffer.getUint8(6) | buffer.getUint8(7) << 8;

        return this;
    }
}

/**
 * Abstract class of packet base
 */
export abstract class Packet_Dongle extends EventTarget implements IPacket {

    setReport: Uint8Array;
    getReport?: DataView;

    cmdId: number;
    cmdVal: number;
    packageNum: number;
    packageIndex: number;
    dataLength: number;
    callback?: (event: any) => void

    constructor(cmdId: number, callback: (event: any) => void) {
        super();
        this.setReport = new Uint8Array(19);
        this.cmdId = cmdId;
        this.cmdVal = 0;
        this.packageNum = 0;
        this.packageIndex = 0;
        this.dataLength = 0;

        this.callback = callback;
        this.addEventListener('onReportDataRecvied', this.callback, false);
    }

    command(): Uint8Array {
        this.setReport.fill(0x00, 0, this.setReport.length - 1);
        this.setReport[0] = this.cmdId;

        return this.setReport;
    }

    fromReportData(buffer: DataView) : IPacket {
        // this.cmdVal = buffer.getUint8(1);
        // this.packageNum = buffer.getUint8(4);
        // this.packageIndex = buffer.getUint8(5);
        // this.dataLength = buffer.getUint8(6) | buffer.getUint8(7) << 8;

        return this;
    }

    crc(): number {
        let crc = REPORT_ID_DONGLE;
        let i: any;
        for (i = 0; i < this.setReport.length - 1; i++) {
            crc = crc + this.setReport[i];
        }

        return crc & 0xFF;
    }

    async destroy(): Promise<void> {
        if (this.callback != undefined) {
            this.removeEventListener("inputreport", this.callback);
        }
    }
}