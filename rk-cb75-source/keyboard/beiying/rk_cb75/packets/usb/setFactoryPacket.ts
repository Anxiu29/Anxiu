import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Usb } from "@/keyboard/beiying/rk_cb75/packets/packet";

export class SetFactoryPacket extends Packet_Usb {

    setReport: Uint8Array;

    constructor() {
        super(0x11);
        this.dataLength = 1;
        this.setReport = new Uint8Array(519);
        this.setReport[0] = this.cmdId;
        this.setReport[1] = this.cmdVal;
        this.setReport[2] = 0;
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