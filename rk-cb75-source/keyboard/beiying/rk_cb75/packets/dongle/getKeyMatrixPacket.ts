import type { IPacket } from "@/keyboard/beiying/interface";
import { KEY_MAXTRIX_LINE, KEY_MAXTRIX_COLOUMN } from "@/keyboard/beiying/rk_cb75/packets/packet";
import { Packet_Dongle_Get } from "@/keyboard/beiying/rk_cb75/packets/dongle/getPacket";
import { KeyMatrix } from "../../keyMatrix";
import { KeyMatrixLayer, MatrixTable } from "@/keyboard/beiying/enum"

export class GetKeyMatrixPacket extends Packet_Dongle_Get {

    layer: KeyMatrixLayer = KeyMatrixLayer.Nomal;
    table: MatrixTable = MatrixTable.WIN;

    constructor(callback: (event: any) => void) {
        super(0x41, callback);
    }

    command(): Uint8Array {
        super.command();

        this.setReport[2] = (0x7F & this.packageIndex) | (this.table << 7);
        this.setReport[3] = (0x0F & this.dataLength) | ((this.layer << 4) & 0x30) | ((this.board << 6) & 0xC0);
        this.setReport[this.setReport.length - 1] = this.crc();

        return this.setReport;
    }

    fromReportData(buffer: DataView): IPacket {
        super.fromReportData(buffer);

        if (this.packageNum - 1 == this.packageIndex) {
            if (this.buffer != undefined) {
                this.getReport = new DataView(this.buffer.buffer);
                if (this.getReport.byteLength >= KEY_MAXTRIX_LINE * KEY_MAXTRIX_COLOUMN) {
                    let keyMatrix = KeyMatrix.fromReportData(this.getReport);
                    this.dispatchEvent(new CustomEvent('onReportDataRecvied', { detail: { layer: this.layer, table: this.table, data: keyMatrix } }));
                }
            }
        }

        return this;
    }
}