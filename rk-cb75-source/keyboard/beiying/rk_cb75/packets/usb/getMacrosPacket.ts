import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Usb, MACRO_PER_BLOCK_LENGTH,  PACKET_HEAD_LENGTH } from "@/keyboard/beiying/rk_cb75/packets/packet";
import { Macros } from "../../macros";

export class GetMacrosPacket extends Packet_Usb {

    setReport: Uint8Array;
    getReport?: DataView;
    buffer?: Uint8Array;

    constructor(block: number, blockCount: number) {
        super(0x85);

        this.cmdVal = 0x00;
        this.dataLength = MACRO_PER_BLOCK_LENGTH;
        this.setReport = new Uint8Array(519);
        this.setReport[0] = this.cmdId;
        this.setReport[2] = this.cmdVal;
        this.setReport[3] = 0x01;
        this.setReport[4] = block;
        this.setReport[5] = this.dataLength & 0x00FF;
        this.setReport[6] = this.dataLength >> 8;
    }

    fromReportData(buffer: DataView) : IPacket {
        super.fromReportData(buffer);
        this.getReport = new DataView(buffer.buffer.slice(1, this.dataLength + PACKET_HEAD_LENGTH + 1));
        if (this.getReport.byteLength >= MACRO_PER_BLOCK_LENGTH + PACKET_HEAD_LENGTH) {
            this.buffer = new Uint8Array(this.getReport.buffer.slice(PACKET_HEAD_LENGTH, this.getReport.byteLength));
            //this.macros = Macros.deserialize(new DataView(this.getReport.buffer.slice(PACKET_HEAD_LENGTH, this.getReport.byteLength)));
        }

        return this;
    }
}