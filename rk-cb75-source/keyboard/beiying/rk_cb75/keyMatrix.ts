import { MatrixTable } from '../enum';
import { KeyMappingType } from '@/common/enum'
import type { KeyMappingData } from '../interface';
import type { KeyDefineEnum } from '@/common/keyCode_cb75';
import { KEY_MAXTRIX_LINE, KEY_MAXTRIX_COLOUMN, PACKET_HEAD_LENGTH } from "./packets/packet";

export class KeyMatrix {
    buffer: DataView;

    constructor(data: DataView) {
        this.buffer = data;
    }

    setKeyMapping(index: number, mappingData: KeyMappingData) {
        let offset = index * 4;
        let key = 0;
        key = key | (mappingData.keyMappingType << 24 & 0xFF000000);
        key = key | (mappingData.keyMappingPara << 16 & 0x00FF0000);
        key = key | (mappingData.keyCode & 0x0000FF00);
        key = key | (mappingData.keyCode & 0x000000FF);
        this.buffer.setUint32(offset, key);
    }

    setKeyMappingRaw(index: number, key: number) {
        let offset = index * 4;
        this.buffer.setUint32(offset, key);
    }

    getKeyMapping(index: number) : KeyMappingData {
        let offset = index * 4;
        let key = this.buffer.getUint32(offset);
        return {
            keyRaw: key,
            keyStr: [''],
            keyCode: key & 0x0000FFFF,
            keyMappingType: key >> 24,
            keyMappingPara: (key >> 16) & 0xFF
        };
    }

    fillKeyMappingData(index: number, mappingData: KeyMappingData) {
        let offset = index * 4;
        let key = this.buffer.getUint32(offset);
        mappingData.keyRaw = key;
        mappingData.keyCode = key & 0x0000FFFF;
        mappingData.keyMappingType = key >> 24;
        mappingData.keyMappingPara = (key >> 16) & 0xFF;
    }

    static fromReportData(data: DataView) : KeyMatrix | undefined {
        let colors = undefined;
        
        if (data.byteLength >= KEY_MAXTRIX_LINE * KEY_MAXTRIX_COLOUMN) {
            //let buffer = new DataView(data.buffer.slice(PACKET_HEAD_LENGTH, data.byteLength));
            colors = new KeyMatrix(data);
        }

        return colors;
    }
}