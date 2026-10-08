import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Usb, PROFILE_LENGTH, PACKET_HEAD_LENGTH } from "@/keyboard/beiying/rk_cb75/packets/packet";
import { BoardProfile } from "@/keyboard/beiying/rk_cb75/boardProfile";

export class GetProfilePacket extends Packet_Usb {

    setReport: Uint8Array;
    getReport?: DataView;
    boardProfile?: BoardProfile;

    constructor(board: number) {
        super(0x84);
        this.cmdVal = 0x03 & board;
        this.dataLength = 0x80;
        this.setReport = new Uint8Array(519);
        this.setReport[0] = this.cmdId;
        this.setReport[2] = this.cmdVal;
        this.setReport[3] = 0x01;
        this.setReport[5] = this.dataLength;
    }

    fromReportData(buffer: DataView) : IPacket {
        super.fromReportData(buffer);
        this.getReport = new DataView(buffer.buffer.slice(1, this.dataLength + PACKET_HEAD_LENGTH + 1));
        if (this.getReport.byteLength >= PROFILE_LENGTH + PACKET_HEAD_LENGTH) {
            this.boardProfile = BoardProfile.fromReportData(new DataView(this.getReport.buffer.slice(PACKET_HEAD_LENGTH, PROFILE_LENGTH + PACKET_HEAD_LENGTH)));
        }

        return this;
    }
}