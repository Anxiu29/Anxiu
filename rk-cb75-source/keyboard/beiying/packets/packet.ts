import type { IPacket } from "../interface";

const PACKET_HEAD_LENGTH: number = 7;
const MACRO_PER_BLOCK_LENGTH: number = 512;
const MACRO_MAX_LENGTH: number = 4096;
const REPORT_ID_LENGTH: number = 1;
const REPORT_ID_DONGLE: number = 0x13;
const REPORT_PAYLOAD_LENGTH: number = 0x0E;
const REPORT_MAX_RETRY: number = 0x0A;

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
        for (i = 0; i < this.setReport.length - 2; i++) {
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