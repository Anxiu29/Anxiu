import { Packet_Dongle_Set } from "@/keyboard/beiying/rk_cb75/packets/dongle/setPacket";
import { KeyMatrixLayer, MatrixTable } from "@/keyboard/beiying/enum"
import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Dongle, REPORT_PAYLOAD_LENGTH, MACRO_PER_BLOCK_LENGTH, REPORT_MAX_RETRY } from "@/keyboard/beiying/rk_cb75/packets/packet";

export class BufferPackage {
    buffer?: Uint8Array;
    layer: KeyMatrixLayer = KeyMatrixLayer.Nomal;
    table: MatrixTable = MatrixTable.WIN;
    board: number = 0;
}

export class SetKeyMatrixPacket extends Packet_Dongle_Set {

    layer: KeyMatrixLayer = KeyMatrixLayer.Nomal;
    table: MatrixTable = MatrixTable.WIN;
    bufferPackages: Array<BufferPackage>;
    isRunning: boolean = false;

    constructor(callback: (event: any) => void, pktFinish: (event: any) => void) {
        super(0x01, callback, pktFinish);
        this.bufferPackages = new Array<BufferPackage>();
    }

    command(): Uint8Array {
        super.command();

        this.setReport[2] = (0x7F & this.packageIndex) | (this.table << 7);
        this.setReport[3] = (0x0F & this.dataLength) | ((this.layer << 4) & 0x30) | ((this.board << 6) & 0xC0);
        this.setReport[this.setReport.length - 1] = this.crc();

        return this.setReport;
    }

    fromReportData(buffer: DataView) : IPacket {
        let success = buffer.getUint8(1) >> 7;
     
        if (success == 0) {
            this.packageIndex += 1;
        } else {
            this.retry -= 1;
        }
     
        if (this.packageIndex < this.packageNum && this.retry > 0) {
            this.dispatchEvent(new CustomEvent('onReportDataRecvied', { detail: this }));
        } else if (this.bufferPackages != undefined && this.bufferPackages.length > 0) {
            let pkg = this.bufferPackages[0];
            if (pkg != undefined) {
                this.bufferPackages.splice(0, 1);
                this.layer = pkg.layer;
                this.table = pkg.table;
                this.packageIndex = 0;
                this.board = pkg.board;
                this.buffer = pkg.buffer;
                this.retry = REPORT_MAX_RETRY;
                console.log(`Set Key Matrix [board:${this.board}] [table:${this.table}] [layer:${this.layer}]`);
                this.dispatchEvent(new CustomEvent('onReportDataRecvied', { detail: this }));
            } else {
                this.isRunning = false;
                this.dispatchEvent(new CustomEvent('onReportPacketFinish', { detail: this }));
            }
        } else {
            this.isRunning = false;
            this.buffer = undefined;
            this.dispatchEvent(new CustomEvent('onReportPacketFinish', { detail: this }));
        }
     
        return this;
    }
}