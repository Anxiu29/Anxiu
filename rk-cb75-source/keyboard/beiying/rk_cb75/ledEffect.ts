import { type LightEffectEnum } from '../enum'
import { type LedColor } from '../interface'
import { LED_COLOR_LENGTH, LED_EFFECT_COLOR_COUNT, LED_EFFECT_COUNT, PACKET_HEAD_LENGTH } from "./packets/packet";

export const LED_EFFECT_DEFAULT_DATA: Uint8Array = new Uint8Array([8,0,47,0,55,0,39,0,14,77,0,97,0,99,0,114,0,111,0,32,0,49,0,128,0,30,7,0,0,30,7,128,0,30,6,0,0,30,6,128,0,30,5,0,0,30,5,128,0,30,4,0,0,30,4,14,77,0,97,0,99,0,114,0,111,0,32,0,50,0,128,0,30,6,0,0,30,6,128,0,30,5,0,0,30,5,128,0,30,4,0,0,30,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);

export class LedEffect {
    buffer: DataView;

    constructor(data: DataView) {
        this.buffer = data;
    }

    setLedColor(effect: LightEffectEnum, color: LedColor) {
        let offset = effect * (3 * 7);
        // 硬件为 GRB：写入时交换红绿通道，界面仍用 RGB
        this.buffer.setUint8(offset, color.green);
        this.buffer.setUint8(offset + 1, color.red);
        this.buffer.setUint8(offset + 2, color.blue);
    }

    getLedColor(effect: LightEffectEnum) : LedColor {
        let offset = effect * (3 * 7);
        let r = this.buffer.getUint8(offset + 1);
        let g = this.buffer.getUint8(offset);
        let b = this.buffer.getUint8(offset + 2);
        let color: LedColor = {
            red: r,
            green: g,
            blue: b,
            color: LedEffect.getColorString(r, g, b)
        }

        return color;
    }

    static getColorString(r: number, g: number, b: number) : string {
        return `#${r.toString(16).toUpperCase().padStart(2, '0')}${g.toString(16).toUpperCase().padStart(2, '0')}${b.toString(16).toUpperCase().padStart(2, '0')}`;
    }

    static fromReportData(data: DataView) : LedEffect | undefined {
        let colors = undefined;
        
        if (data.byteLength >= LED_COLOR_LENGTH * LED_EFFECT_COLOR_COUNT * LED_EFFECT_COUNT) {
            //let buffer = new DataView(data.buffer.slice(PACKET_HEAD_LENGTH, data.byteLength));
            colors = new LedEffect(data);
        }

        return colors;
    }
}