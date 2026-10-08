import { type LedColor } from '../interface'
import { LED_COLOR_LENGTH, LED_COLOR_COUNT } from "./packets/packet";

export class LedColors {
    buffer: DataView;

    constructor(data: DataView) {
        this.buffer = data;
    }

    setLedColor(index: number, color: LedColor) {
        let offset = index;
        // 硬件为 GRB：写入时交换红绿通道，界面仍用 RGB
        this.buffer.setUint8(offset, color.green);
        this.buffer.setUint8(offset + 126, color.red);
        this.buffer.setUint8(offset + 126 * 2, color.blue);
    }

    getLedColor(index: number) : LedColor {
        let offset = index;
        let r = this.buffer.getUint8(offset + 126);
        let g = this.buffer.getUint8(offset);
        let b = this.buffer.getUint8(offset + 126 * 2);
        let color: LedColor = {
            red: r,
            green: g,
            blue: b,
            color: LedColors.getColorString(r, g, b)
        }

        return color;
    }

    static getColorString(r: number, g: number, b: number) : string {
        return `#${r.toString(16).toUpperCase().padStart(2, '0')}${g.toString(16).toUpperCase().padStart(2, '0')}${b.toString(16).toUpperCase().padStart(2, '0')}`;
    }

    static fromReportData(data: DataView) : LedColors | undefined {
        let colors = undefined;
        
        if (data.byteLength >= LED_COLOR_LENGTH * LED_COLOR_COUNT) {
            //let buffer = new DataView(data.buffer.slice(PACKET_HEAD_LENGTH, data.byteLength));
            colors = new LedColors(data);
        }

        return colors;
    }
}