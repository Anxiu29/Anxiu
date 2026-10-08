import type { IPacket } from "@/keyboard/beiying/interface";
import { PROFILE_LENGTH } from "@/keyboard/beiying/rk_cb75/packets/packet";
import { Packet_Dongle_Get } from "@/keyboard/beiying/rk_cb75/packets/dongle/getPacket";
import { BoardProfile } from "../../boardProfile";

export class GetProfilePacket extends Packet_Dongle_Get {

    constructor(callback: (event: any) => void) {
        super(0x44, callback);
    }

    fromReportData(buffer: DataView) : IPacket {
        super.fromReportData(buffer);

        if (this.packageNum - 1 == this.packageIndex) {
            if (this.buffer != undefined) {
                this.getReport = new DataView(this.buffer.buffer);
                if (this.getReport.byteLength >= PROFILE_LENGTH) {
                    let boardProfile = BoardProfile.fromReportData(this.getReport);
                    this.dispatchEvent(new CustomEvent('onReportDataRecvied', { detail: boardProfile }));
                }
            }
        }

        return this;
    }
}