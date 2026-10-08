import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Dongle, REPORT_PAYLOAD_LENGTH, MACRO_PER_BLOCK_LENGTH, REPORT_MAX_RETRY } from "@/keyboard/beiying/rk_cb75/packets/packet";

export class Packet_Dongle_Set extends Packet_Dongle {
    buffer?: Uint8Array;
    board: number = 0;
    retry: number = 10;

    pktFinish?: (event: any) => void

    constructor(cmdId: number, callback: (event: any) => void, pktFinish: (event: any) => void) {
        super(cmdId, callback);

        this.pktFinish = pktFinish;
        this.addEventListener('onReportPacketFinish', this.pktFinish, false);
    }

    command(): Uint8Array {
        super.command();

        if (this.buffer != undefined) {
            this.packageNum = Math.floor(this.buffer.length / REPORT_PAYLOAD_LENGTH) + ((this.buffer.length % REPORT_PAYLOAD_LENGTH) > 0 ? 1 : 0);
            this.dataLength = (this.packageIndex + 1) * REPORT_PAYLOAD_LENGTH > this.buffer.length ? this.buffer.length - (this.packageIndex * REPORT_PAYLOAD_LENGTH) : REPORT_PAYLOAD_LENGTH;
            let i: any;
            for (i = 0; i < this.dataLength; i++) {
                this.setReport[i + 4] = this.buffer[i + this.packageIndex * REPORT_PAYLOAD_LENGTH];
            }
        }
        
        this.setReport[1] = 0x7F & this.packageNum;
        this.setReport[2] = 0x7F & this.packageIndex;
        this.setReport[3] = (0x0F & this.dataLength) | ((this.board << 4) & 0xF0);

        this.setReport[this.setReport.length - 1] = this.crc();

        return this.setReport;
    }

    fromReportData(buffer: DataView) : IPacket {
        super.fromReportData(buffer);

        let success = buffer.getUint8(1) >> 7;

        if (buffer.getUint8(2) < this.packageIndex) return this;

        if (success == 0) {
            this.packageIndex += 1;
        } else {
            this.retry -= 1;
        }

        if (this.packageIndex < this.packageNum && this.retry > 0) {
            this.dispatchEvent(new CustomEvent('onReportDataRecvied', { detail: this }));
        } else {
            this.dispatchEvent(new CustomEvent('onReportPacketFinish', { detail: this }));
        }

        return this;
    }
}

export class Packet_Dongle_Block_Set extends Packet_Dongle_Set {

    block: number;
    blockCount: number;

    nextBlock?: (event: any) => void

    constructor(cmdId: number, callback: (event: any) => void, nextBlock: (event: any) => void, pktFinish: (event: any) => void) {
        super(cmdId, callback, pktFinish);

        this.block = 0;
        this.blockCount = 0;
        
        this.nextBlock = nextBlock;
        this.addEventListener('onBlockFinish', this.nextBlock, false);
    }

    command(): Uint8Array {
        super.command();

        if (this.buffer != undefined) {
            let pkgLen = this.block < (this.blockCount - 1) ? MACRO_PER_BLOCK_LENGTH : this.buffer.length - (this.block * MACRO_PER_BLOCK_LENGTH);
            this.packageNum = Math.ceil(pkgLen / REPORT_PAYLOAD_LENGTH);
            this.dataLength = (this.packageIndex + 1) * REPORT_PAYLOAD_LENGTH > pkgLen ? pkgLen - (this.packageIndex * REPORT_PAYLOAD_LENGTH) : REPORT_PAYLOAD_LENGTH;
            let i: any;
            for (i = 0; i < this.dataLength; i++) {
                this.setReport[i + 4] = this.buffer[i + this.packageIndex * REPORT_PAYLOAD_LENGTH + this.block * MACRO_PER_BLOCK_LENGTH];
            }
        }
        
        this.setReport[1] = 0x7F & this.packageNum;
        this.setReport[2] = 0x7F & this.packageIndex;
        this.setReport[3] = (0x0F & this.dataLength) | (0xF0 & this.block << 4);
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
        } else if (this.block < this.blockCount - 1 && this.retry > 0) {
            this.block += 1;
            this.packageIndex = 0;
            this.retry = REPORT_MAX_RETRY;
            this.dispatchEvent(new CustomEvent('onReportDataRecvied', { detail: this }));
        } else {
            this.dispatchEvent(new CustomEvent('onReportPacketFinish', { detail: this }));
        }

        return this;
    }

    async destroy(): Promise<void> {
        super.destroy()
        if (this.nextBlock != undefined) {
            this.removeEventListener("onBlockFinish", this.nextBlock);
        }
    }
}