import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Usb, KEY_MAXTRIX_LINE, KEY_MAXTRIX_COLOUMN, PACKET_HEAD_LENGTH } from "@/keyboard/beiying/rk_cb75/packets/packet";
import { KeyMatrixLayer, MatrixTable } from "@/keyboard/beiying/enum"

export class SetKeyMatrixPacket extends Packet_Usb {

    setReport: Uint8Array;

    constructor(layer: KeyMatrixLayer,  table: MatrixTable, board: number) {
        super(0x03);
        this.dataLength = KEY_MAXTRIX_LINE * KEY_MAXTRIX_COLOUMN * 4;
        this.setReport = new Uint8Array(519);
        this.setReport[0] = this.cmdId;
        this.setReport[1] = this.cmdVal | (table << 2) | layer ;
        this.setReport[2] = board;
        this.setReport[3] = 0x01;
        this.setReport[5] = this.dataLength & 0x00FF;
        this.setReport[6] = this.dataLength >> 8;
    }

    setPayload(buffer: DataView) : IPacket {
        for (let i = 0; i < buffer.byteLength; i++) {
            this.setReport[i + 7] = buffer.getUint8(i);
        }

        return this;
    }
}