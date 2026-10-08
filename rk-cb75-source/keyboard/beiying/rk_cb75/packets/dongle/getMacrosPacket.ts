import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Dongle_Get } from "@/keyboard/beiying/rk_cb75/packets/dongle/getPacket";
import { Macros } from "../../macros";

export class GetMacrosPacket extends Packet_Dongle_Get {

    block: number;
    blockCount: number;
    bufferBlock?: Uint8Array;

    constructor(callback: (event: any) => void) {
        super(0x43, callback);
        this.block = 0;
        this.blockCount = 0;
    }

    command(): Uint8Array {
        super.command();

        this.setReport[3] = (0x0F & this.dataLength) | ((this.block << 4) & 0xF0);
        this.setReport[4] = 512 >> 8;
        this.setReport[5] = 512 & 0x00FF;
        this.setReport[this.setReport.length - 1] = this.crc();

        return this.setReport;
    }

    fromReportData(buffer: DataView) : IPacket {
        super.fromReportData(buffer);

        if (this.packageNum - 1 == this.packageIndex) {

            if (this.block == 0) {
                this.bufferBlock = this.buffer;
            } else if (this.bufferBlock != undefined &&  this.buffer != undefined) {
                let tmp = new Uint8Array(this.bufferBlock.length + this.buffer.length);
                if (this.buffer != undefined) {
                    tmp.set(this.bufferBlock, 0);
                    tmp.set(this.buffer, this.bufferBlock.length);
                }
                this.bufferBlock = tmp;
            }

            this.block += 1;
            if (this.block == this.blockCount && this.bufferBlock != undefined) {
                this.getReport = new DataView(this.bufferBlock.buffer);
                if (this.getReport.byteLength >= 4) {
                    let marcros = Macros.deserialize(this.getReport);
                    this.dispatchEvent(new CustomEvent('onReportDataRecvied', { detail: marcros }));
                }
            }
        }

        return this;
    }
}