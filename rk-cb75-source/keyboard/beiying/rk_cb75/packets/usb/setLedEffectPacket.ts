import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Usb, LED_COLOR_LENGTH, LED_EFFECT_COLOR_COUNT, LED_EFFECT_COUNT, PACKET_HEAD_LENGTH } from "@/keyboard/beiying/rk_cb75/packets/packet";

export class SetLedEffectPacket extends Packet_Usb {

    setReport: Uint8Array;

    constructor(board: number) {
        super(0x0A);
        this.cmdVal = 0x03 & board;
        this.dataLength = LED_COLOR_LENGTH * LED_EFFECT_COLOR_COUNT * LED_EFFECT_COUNT;
        this.setReport = new Uint8Array(519);
        this.setReport[0] = this.cmdId;
        this.setReport[2] = this.cmdVal;
        this.setReport[3] = 0x01;
        this.setReport[5] = this.dataLength & 0x00FF;
        this.setReport[6] = this.dataLength >> 8;
    }

    setPayload(buffer: DataView) : IPacket {
        for (let i = 0; i < buffer.byteLength; i++) {
            this.setReport[i + 7] = buffer.getUint8(i);
        }

        return this;
    }
}