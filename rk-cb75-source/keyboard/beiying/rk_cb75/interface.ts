import type { Key as Key_Base, KeyLine as KeyLine_Base } from "@/keyboard/beiying/interface";

export interface Key extends Key_Base {
    offsetY: number;
    position: number,
    offset: number,
}

export interface KeyLine extends KeyLine_Base {
    keys: Array<Key>
}