import type { IPacket } from "@/keyboard/beiying/interface";
import { LED_COLOR_LENGTH, LED_COLOR_COUNT } from "@/keyboard/beiying/rk_cb75/packets/packet";
import { Packet_Dongle_Get } from "@/keyboard/beiying/rk_cb75/packets/dongle/getPacket";
import { LedColors } from "../../ledColors";

export class GetLedColorsPacket extends Packet_Dongle_Get {

    constructor(callback: (event: any) => void) {
        super(0x42, callback);
    }

    fromReportData(buffer: DataView) : IPacket {
        super.fromReportData(buffer);

        if (this.packageNum - 1 == this.packageIndex) {
            if (this.buffer != undefined) {
                this.getReport = new DataView(this.buffer.buffer);
                if (this.getReport.byteLength >= LED_COLOR_LENGTH * LED_COLOR_COUNT) {
                    let ledEffect = LedColors.fromReportData(new DataView(this.getReport.buffer.slice(0, LED_COLOR_LENGTH * LED_COLOR_COUNT)));
                    this.dispatchEvent(new CustomEvent('onReportDataRecvied', { detail: ledEffect }));
                }
            }
        }

        return this;
    }
}