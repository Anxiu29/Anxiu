import type { IPacket } from "@/keyboard/beiying/interface";
import { LED_COLOR_LENGTH, LED_EFFECT_COLOR_COUNT, LED_EFFECT_COUNT } from "@/keyboard/beiying/rk_cb75/packets/packet";
import { Packet_Dongle_Get } from "@/keyboard/beiying/rk_cb75/packets/dongle/getPacket";
import { LedEffect } from "../../ledEffect";

export class GetLedEffectPacket extends Packet_Dongle_Get {

    constructor(callback: (event: any) => void) {
        super(0x49, callback);
    }

    fromReportData(buffer: DataView) : IPacket {
        super.fromReportData(buffer);

        if (this.packageNum - 1 == this.packageIndex) {
            if (this.buffer != undefined) {
                this.getReport = new DataView(this.buffer.buffer);
                if (this.getReport.byteLength >= LED_COLOR_LENGTH * LED_EFFECT_COLOR_COUNT * LED_EFFECT_COUNT) {
                    let ledEffect = LedEffect.fromReportData(new DataView(this.getReport.buffer.slice(0, LED_COLOR_LENGTH * LED_EFFECT_COLOR_COUNT * LED_EFFECT_COUNT)));
                    this.dispatchEvent(new CustomEvent('onReportDataRecvied', { detail: ledEffect }));
                }
            }
        }

        return this;
    }
}