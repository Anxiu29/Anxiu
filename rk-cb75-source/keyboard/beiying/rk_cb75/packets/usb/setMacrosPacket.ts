import type { IPacket } from "@/keyboard/beiying/interface";
import { Packet_Usb } from "@/keyboard/beiying/rk_cb75/packets/packet";

export class SetMacrosPacket extends Packet_Usb {

    setReport: Uint8Array;

    constructor() {
        super(0x05);
        this.setReport = new Uint8Array(519);
        this.setReport[0] = this.cmdId;
    }

    setPayload(buffer: DataView) : IPacket {

        this.setReport[3] = this.packageNum;
        this.setReport[4] = this.packageIndex;
        this.setReport[5] = buffer.byteLength & 0x00FF;
        this.setReport[6] = buffer.byteLength >> 8;
        
        for (let i = 0; i < buffer.byteLength; i++) {
            this.setReport[i + 7] = buffer.getUint8(i);
        }

        return this;
    }
}