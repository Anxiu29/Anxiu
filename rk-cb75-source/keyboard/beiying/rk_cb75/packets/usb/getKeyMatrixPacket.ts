import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Usb, KEY_MAXTRIX_LINE, KEY_MAXTRIX_COLOUMN, PACKET_HEAD_LENGTH } from "@/keyboard/beiying/rk_cb75/packets/packet";
import { KeyMatrix } from "@/keyboard/beiying/rk_cb75/keyMatrix";
import { KeyMatrixLayer, MatrixTable } from "@/keyboard/beiying/enum"

export class GetKeyMatrixPacket extends Packet_Usb {

    setReport: Uint8Array;
    getReport?: DataView;
    keyMatrix?: KeyMatrix;

    constructor(layer: KeyMatrixLayer,  table: MatrixTable, board: number) {
        super(0x83);
        this.cmdVal = 0x00;
        this.dataLength = KEY_MAXTRIX_LINE * KEY_MAXTRIX_COLOUMN * 4;
        this.setReport = new Uint8Array(519);
        this.setReport[0] = this.cmdId;
        this.setReport[1] = this.cmdVal | table << 2 | layer;
        this.setReport[2] = board;
        this.setReport[3] = 0x01;
        this.setReport[5] = this.dataLength & 0x00FF;
        this.setReport[6] = this.dataLength >> 8;
    }

    fromReportData(buffer: DataView) : IPacket {
        super.fromReportData(buffer);
        this.getReport = new DataView(buffer.buffer.slice(1, this.dataLength + PACKET_HEAD_LENGTH + 1));
        if (this.getReport.byteLength >= KEY_MAXTRIX_LINE * KEY_MAXTRIX_COLOUMN + PACKET_HEAD_LENGTH) {
            this.keyMatrix = KeyMatrix.fromReportData(new DataView(this.getReport.buffer.slice(PACKET_HEAD_LENGTH, this.getReport.byteLength)));
        }

        return this;
    }
}