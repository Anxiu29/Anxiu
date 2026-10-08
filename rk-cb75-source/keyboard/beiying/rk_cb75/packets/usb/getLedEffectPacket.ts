import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Usb, LED_COLOR_LENGTH, LED_EFFECT_COLOR_COUNT, LED_EFFECT_COUNT, PACKET_HEAD_LENGTH } from "@/keyboard/beiying/rk_cb75/packets/packet";
import { LedEffect } from "@/keyboard/beiying/rk_cb75/ledEffect";

export class GetLedEffectPacket extends Packet_Usb {

    setReport: Uint8Array;
    getReport?: DataView;
    ledEffect?: LedEffect;

    constructor(board: number) {
        super(0x8a);
        this.cmdVal = 0x03 & board;
        this.dataLength = LED_COLOR_LENGTH * LED_EFFECT_COLOR_COUNT * LED_EFFECT_COUNT;
        this.setReport = new Uint8Array(519);
        this.setReport[0] = this.cmdId;
        this.setReport[2] = this.cmdVal;
        this.setReport[3] = 0x01;
        this.setReport[5] = this.dataLength & 0x00FF;
        this.setReport[6] = this.dataLength >> 8;
    }

    fromReportData(buffer: DataView) : IPacket {
        super.fromReportData(buffer);
        this.getReport = new DataView(buffer.buffer.slice(1, this.dataLength + PACKET_HEAD_LENGTH + 1));
        if (this.getReport.byteLength >= LED_COLOR_LENGTH * LED_EFFECT_COLOR_COUNT * LED_EFFECT_COUNT + PACKET_HEAD_LENGTH) {
            this.ledEffect = LedEffect.fromReportData(new DataView(this.getReport.buffer.slice(PACKET_HEAD_LENGTH, this.getReport.byteLength)));
        }

        return this;
    }
}