import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Usb } from "@/keyboard/beiying/rk_cb75/packets/packet";

export class SetProfilePacket extends Packet_Usb {

    setReport: Uint8Array;

    constructor(board: number) {
        super(0x04);
        this.cmdVal = 0x03 & board;
        this.dataLength = 0x80;
        this.setReport = new Uint8Array(519);
        this.setReport[0] = this.cmdId;
        this.setReport[2] = this.cmdVal;
        this.setReport[3] = 0x01;
        this.setReport[5] = this.dataLength;
    }

    setPayload(buffer: DataView) : IPacket {
        for (let i = 0; i < buffer.byteLength; i++) {
            this.setReport[i + 7] = buffer.getUint8(i);
        }

        return this;
    }
}