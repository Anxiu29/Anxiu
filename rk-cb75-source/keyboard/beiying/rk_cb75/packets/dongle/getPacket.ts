import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Dongle } from "@/keyboard/beiying/rk_cb75/packets/packet";

export class Packet_Dongle_Get extends Packet_Dongle {
    buffer?: Uint8Array;
    board: number = 0;

    constructor(cmdId: number, callback: (event: any) => void) {
        super(cmdId, callback);
    }

    command(): Uint8Array {
        super.command();

        this.cmdVal = 0x00;
        this.dataLength = 0x00;
        this.packageNum = 1;
        this.packageIndex = 0;
        
        this.setReport[1] = 0x7F & this.packageNum;
        this.setReport[2] = 0x7F & this.packageIndex;
        this.setReport[3] = (0x0F & this.dataLength) | ((this.board << 4) & 0xF0);
        this.setReport[this.setReport.length - 1] = this.crc();

        return this.setReport;
    }

    fromReportData(buffer: DataView) : IPacket {
        super.fromReportData(buffer);

        let success = buffer.getUint8(1) >> 7;
        this.packageNum = buffer.getUint8(1) & 0x7F;
        this.packageIndex = buffer.getUint8(2) & 0x7F;
        let dataLength = buffer.getUint8(3) & 0x0F;

        let u8 = new Uint8Array(buffer.buffer.slice(4, 4 + dataLength));

        if (this.packageIndex == 0) {
            this.dataLength = dataLength;
            this.buffer = u8;
        } else {
            this.dataLength += dataLength;
            let tmp = new Uint8Array(this.dataLength);
            if (this.buffer != undefined) {
                tmp.set(this.buffer, 0);
                tmp.set(u8, this.buffer?.length);
            }
            this.buffer = tmp;
        }

        return this;
    }
}