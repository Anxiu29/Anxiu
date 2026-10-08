import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Dongle } from "@/keyboard/beiying/rk_cb75/packets/packet";

export class GetPasswordPacket extends Packet_Dongle {

    constructor(callback: (event: any) => void) {
        super(0x05, callback);
    }

    command(): Uint8Array {
        super.command();
        
        this.dataLength = 0x00;
        this.packageNum = 1;
        this.packageIndex = 0;

        this.setReport[1] = 0x01;
        this.setReport[this.setReport.length - 1] = this.crc();
        return this.setReport;
    }

    fromReportData(buffer: DataView) : IPacket {
        super.fromReportData(buffer);
        
        if (buffer.byteLength >= this.dataLength) {
            let pwd = buffer.getUint32(4)  + buffer.getUint16(8);
            let version = `${buffer.getUint8(12).toString(16).padStart(2, '0')}${buffer.getUint8(13).toString(16).padStart(2, '0')}`
            this.getReport = buffer;
            this.dispatchEvent(new CustomEvent('onReportDataRecvied', { detail: { pwd: pwd, version: version }}));
        }

        return this;
    }
}