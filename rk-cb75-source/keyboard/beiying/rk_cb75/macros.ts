import { KeyDefineEnum, KeyText_2 } from "@/common/keyCode_cb75";

const MACRO_HEAD_ADDRESS_LENGTH = 4;
const MACRO_ACTION_LENGTH = 4;
const MACRO_CAPACITY = 4096

export enum ActionType {
    Up = 1,
    Down = 0,
    Delay = -1,
}

export enum KeyType {
    NormalKey = 0,
    ModifyKey = 1,
    MouseKey = 2,
    MouseCursorX = 3,
    MouseCursorY = 4,
    MouseWheel = 5
}

export const ModifyKeyText: Record<number, String> = {
    0xe0: 'L-Ctrl',
    0xe1: 'L-Shift',
    0xe2: 'L-Alt',
    0xe3: 'L-Win',
    0xe4: 'R-Ctrl',
    0xe5: 'R-Shift',
    0xe6: 'R-Alt',
    0xe7: 'R-Win',
}

export const MouseKeyText: Record<number, String> = {
    0x01: 'Mouse-L',
    0x02: 'Mouse-R',
    0x04: 'Mouse-M',
    0x08: 'Mouse-B4',
    0x10: 'Mouse-B5',
    0xff: 'Mouse-LT',
}

export class Action {
    action = ActionType.Down;
    type = KeyType.NormalKey;
    delay = 1;
    key = KeyDefineEnum.NONE;
    index = 0;

    constructor(key: KeyDefineEnum | number, delay: number = 50, action: ActionType = ActionType.Down, type: KeyType = KeyType.NormalKey) {
        if (type === KeyType.NormalKey) {
            switch (key) {
                case KeyDefineEnum.CTRL_L:
                case KeyDefineEnum.SHIFT_L:
                case KeyDefineEnum.ALT_L:
                case KeyDefineEnum.WIN_L:
                case KeyDefineEnum.CTRL_R:
                case KeyDefineEnum.SHIFT_R:
                case KeyDefineEnum.ALT_R:
                case KeyDefineEnum.WIN_R:
                    type = KeyType.ModifyKey;
                    break;
            }
        }

        this.action = action;
        this.type = type;
        this.delay = Number.isFinite(delay) ? Math.max(0, delay) : 0;
        this.key = key;
    }

    serialize(): Uint8Array {
        let u8 = new Uint8Array(4);
        const delay = Math.max(0, this.delay);
        u8[0] = ((this.action << 7) & 0xFF) | ((this.type << 4) & 0xFF) | ((delay & 0x000F0000) >> 16);
        u8[1] = (delay & 0x0000FF00) >> 8;
        u8[2] = delay & 0xFF;
        u8[3] = this.key & 0xFF;

        return u8;
    }

    toString(): string {
        let text = '';

        switch (this.type) {
            case KeyType.NormalKey:
                text = `Key: [${KeyText_2[this.key].valueOf()}]`;
                break;
            case KeyType.ModifyKey:
                text = `Key: [${ModifyKeyText[this.key].valueOf()}]`;
                break;
            case KeyType.MouseKey:
                text = `Key: [${MouseKeyText[this.key].valueOf()}]`;
                break;
            case KeyType.MouseCursorX:
                text = `CursorX: [${this.key}]`
                break;
            case KeyType.MouseCursorY:
                text = `CursorY: [${this.key}]`
                break;
            case KeyType.MouseWheel:
                text = `Wheel: [${this.key}]`
                break;
        }

        return `${this.action == ActionType.Down ? '↓' : (this.action == ActionType.Delay ? '==' : '↑')} ${text} delay:${this.delay}`
    }

    static deserialize(data: Uint8Array): Action | undefined {
        if (data.byteLength != 4) return undefined;

        let action = data[0] >> 7;
        let type = data[0] >> 4 & 0x07;
        let delay = (data[0] << 16 & 0x000F0000) | (data[1] << 8) | (data[2]);
        let key = data[3];

        return new Action(key, delay, action, type);
    }
}

export interface Head {
    offset: number;
    length: number;
}

export class Macro {
    name: string;
    actions: Array<Action>;
    index = 0;
    repeat = 1;

    constructor(name: string) {
        this.name = name;
        this.actions = new Array<Action>();
    }

    add(action: Action) {
        this.actions.push(action);
    }

    clear() {
        this.actions.splice(0, this.actions.length);
    }

    insert(index: number, action: Action) {
        this.actions.splice(index, 0, action);
    }

    remove(action: Action): number {
        let index = this.actions.findIndex(obj => obj.index === action?.index);
        if (index == -1)
            return -1
        this.actions.splice(index, 1);
        this.refresh()
        return index;
    }
    removeUp(action: Action) {
        let index = this.remove(action)
        if (index == -1)
            return
        this.insert(index <= 0 ? 0 : index - 1, action)
        this.refresh()
    }
    removeDown(action: Action) {
        let index = this.remove(action)
        if (index == -1)
            return
        this.insert(index + 1, action)
        this.refresh()
    }
    refresh() {
        let index = 0;
        this.actions.forEach((p) => {
            p.index = index++;
        });
    }

    addKeyPress(key: KeyDefineEnum, delay: number = 50) {
        this.actions.push(new Action(key, delay));
        this.actions.push(new Action(key, delay));
    }

    addKeyDown(key: KeyDefineEnum, delay: number = 50) {
        this.actions.push(new Action(key, delay, ActionType.Down));
    }

    addKeyUp(key: KeyDefineEnum, delay: number = 50) {
        this.actions.push(new Action(key, delay, ActionType.Up));
    }

    addMouseCursorX(move: number, delay: number = 50) {
        this.actions.push(new Action(move, delay, ActionType.Down, KeyType.MouseCursorX));
    }

    addMouseCursorY(move: number, delay: number = 50) {
        this.actions.push(new Action(move, delay, ActionType.Down, KeyType.MouseCursorY));
    }

    addMouseWheelUp(delay: number = 50) {
        this.actions.push(new Action(0, delay, ActionType.Up, KeyType.MouseWheel));
    }

    addMouseWheelDown(delay: number = 50) {
        this.actions.push(new Action(0, delay, ActionType.Down, KeyType.MouseWheel));
    }

    serialize(): Uint8Array {
        let u8Name = Macro.strToUnicode(this.name);
        let len = 1 + u8Name.length + this.actions.length * MACRO_ACTION_LENGTH;
        let u8 = new Uint8Array(len);
        let index = 0;
        u8[index++] = u8Name.length;
        u8.set(u8Name, index);
        index += u8Name.length;
        for (let act of this.actions) {
            u8.set(act.serialize(), index);
            index += MACRO_ACTION_LENGTH;
        }

        return u8;
    }

    static deserialize(data: Uint8Array): Macro | undefined {
        if (data.byteLength < 3) return undefined;

        const decoder = new TextDecoder('unicode');
        let nameLen = data[0];
        let name = decoder.decode(data.subarray(1, 1 + nameLen));
        let macro = new Macro(name);
        let actionCount = (data.length - nameLen - 1) / MACRO_ACTION_LENGTH;

        let index, i: number;
        for (i = 0; i < actionCount; i++) {
            index = nameLen + 1 + i * MACRO_ACTION_LENGTH;
            let action = Action.deserialize(data.subarray(index, index + MACRO_ACTION_LENGTH));
            if (action != undefined) {
                action.index = i;
                macro.add(action);
            }
        }

        return macro;
    }

    static uint8ArrayToChineseString(uint8Array: Uint8Array): string {
        let result = '';
        for (let i = 0; i < uint8Array.length / 2; i++) {
            let code = uint8Array[(i * 2) + 1] << 8 | uint8Array[i * 2];
            result += String.fromCharCode(code);
        }
        return result;
    }

    static strToUnicode(str: string): Uint8Array {
        let tmp: number | undefined;
        let i = 0;
        let u8 = new Uint8Array(str.length * 2);

        for (let val of str) {
            tmp = val.codePointAt(0);
            if (tmp != undefined) {
                u8[i * 2] = tmp & 0x00FF;
                u8[i * 2 + 1] = tmp >> 8;
            }
            i++;
        }

        return u8;
    }
}

export class Macros {
    macroList: Array<Macro>;

    constructor() {
        this.macroList = new Array<Macro>();
    }

    add(macro: Macro) {
        macro.index = this.macroList.length;
        this.macroList.push(macro);
    }

    remove(macro: Macro) {
        let index = this.macroList.findIndex(obj => obj.index === macro.index);
        if (index !== -1) {
            this.macroList.splice(index, 1);
        }

        index = 0;
        this.macroList.forEach((p) => {
            p.index = index++;
        });
    }

    get(): Array<Macro> {
        return this.macroList;
    }

    serialize(): Uint8Array {
        let offset = this.macroList.length * MACRO_HEAD_ADDRESS_LENGTH;
        let heads = new Array<Head>();
        let u8Macros = new Array<Uint8Array>();

        for (let macro of this.macroList) {
            let u8Macro = macro.serialize();
            heads.push({ offset: offset, length: u8Macro.length });
            u8Macros.push(u8Macro);
            offset += u8Macro.length;
        }

        let u8 = new Uint8Array(offset);
        offset = 0;

        for (let head of heads) {
            u8[offset++] = head.offset & 0x00FF;
            u8[offset++] = head.offset >> 8;
            u8[offset++] = head.length & 0x00FF;
            u8[offset++] = head.length >> 8;
        }

        for (let u8Macro of u8Macros) {
            u8.set(u8Macro, offset);
            offset += u8Macro.length;
        }

        return u8;
    }

    setData(buffer: DataView) {
        if (buffer.byteLength <= 4) return;

        let headLen = buffer.getUint8(0) | buffer.getUint8(1) << 8;

        if (headLen > 0) {
            let heads = new Array<Head>();
            let i: any, headCount = headLen / MACRO_HEAD_ADDRESS_LENGTH;

            for (i = 0; i < headCount; i++) {
                heads.push({
                    offset: buffer.getUint8(i * MACRO_HEAD_ADDRESS_LENGTH) | buffer.getUint8(i * MACRO_HEAD_ADDRESS_LENGTH + 1) << 8,
                    length: buffer.getUint8(i * MACRO_HEAD_ADDRESS_LENGTH + 2) | buffer.getUint8(i * MACRO_HEAD_ADDRESS_LENGTH + 3) << 8,
                });
            }

            for (i in heads) {
                let u8 = new Uint8Array(buffer.buffer.slice(heads[i].offset, heads[i].length + heads[i].offset));
                let macro = Macro.deserialize(u8);
                if (macro != undefined) {
                    macro.index = i;
                    this.add(macro);
                }
            }
        }
    }

    static deserialize(data: DataView): Macros | undefined {
        let macros = undefined;

        if (data.byteLength <= MACRO_CAPACITY) {
            macros = new Macros();
            macros.setData(data);
        }

        return macros;
    }
}
