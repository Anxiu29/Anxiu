import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Usb, PROFILE_LENGTH, PACKET_HEAD_LENGTH } from "@/keyboard/beiying/rk_cb75/packets/packet";

export class GetPasswordPacket extends Packet_Usb {

    setReport: Uint8Array;
    getReport?: DataView;
    fwVersion?: string;

    constructor() {
        super(0x82);
        this.cmdVal = 0x01;
        this.dataLength = 0x0A;
        this.setReport = new Uint8Array(519);
        this.setReport[0] = this.cmdId;
        this.setReport[1] = this.cmdVal;
        this.setReport[3] = 0x01;
        this.setReport[5] = this.dataLength;
    }

    fromReportData(buffer: DataView) : IPacket {
        console.log(`Password data received from device.`);
        super.fromReportData(buffer);
        this.getReport = new DataView(buffer.buffer.slice(1, this.dataLength + PACKET_HEAD_LENGTH + 1));
        if (this.getReport.byteLength >= 10 + PACKET_HEAD_LENGTH) {
            this.fwVersion = `${this.getReport.getUint8(15).toString(16).padStart(2, '0')}${this.getReport.getUint8(16).toString(16).padStart(2, '0')}`
        }
        return this;
    }
}