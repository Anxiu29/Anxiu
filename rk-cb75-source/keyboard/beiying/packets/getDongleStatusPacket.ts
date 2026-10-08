import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Dongle } from "@/keyboard/beiying/packets/packet";

export class GetDongleStatusPacket extends Packet_Dongle {

    constructor(callback: (event: any) => void) {
        super(0x07, callback);
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
            let isConnected = buffer.getUint8(4) > 0;
            this.getReport = buffer;
            this.dispatchEvent(new CustomEvent('onReportDataRecvied', { detail: isConnected }));
        }

        return this;
    }
}