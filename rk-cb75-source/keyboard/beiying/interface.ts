import { KeyDefineEnum } from "@/common/keyCode"
import { KeyMatrixLayer, MatrixTable } from "./enum"
import { KeyMappingType } from "@/common/enum"
import type { HidDeviceDefine } from "@/device/interface"
import type { State } from "@/device/state"

export interface KeyState {
    index: number,
    selected: boolean,
    KeyData: KeyTableData
  }
  
/**
 * Keyboard State
 * 
 * Stores information about the current Keyboard state, and its components.
 */
export interface KeyboardState extends State {
    fwVersion?: String,
    serialNo?: String,
    commandId: number,
    dataChangeFlag: number,
    keyTableData: Record<number,Record<number, Array<KeyTableData>>>,
    lightInfo: LightInfo
}

export interface KeyboardDefine extends HidDeviceDefine {
    image: string,
    keyText: Record<number, Array<String>>,
    keyMatrixLayer: Array<KeyMatrixLayer>,
    keyMatrixTable: Array<MatrixTable>,
    keyLayout: Record<number, Record<number, Array<number>>>,
    lightEffects: Array<LightEffect>,
    protocol: (state: KeyboardState, device: HIDDevice) => Promise<IProtocol>
}

export interface KeyMappingData {
    keyStr: Array<String>,
    keyCode: KeyDefineEnum | number,
    keyMappingType: KeyMappingType,
    keyMappingPara: number,
    keyRaw: number
}

export interface LedColor {
    red: number,
    green: number,
    blue: number,
    color: string
}

export interface LightEffect {
    effect: number,
    speed: boolean,
    brightness: boolean,
    color?: LedColor,
    mixColor: boolean,
    sleep: number
}

export interface LightInfo {
    lightOn: boolean,
    lightEffect: number,
    lightEffects: Array<LightEffect>
}

export interface KeyTableData {
    keyStr: Array<String>,
    keyCode: KeyDefineEnum,
    index: number,
    keyMappingData: KeyMappingData
}

export interface IProtocol {
    state: KeyboardState;
    device?: HIDDevice

    init: () => Promise<void> | null;
    destroy: () => Promise<void> | null;
}

export interface IPacket {
    fromReportData(buffer: DataView) : IPacket;
}

export interface Key {
    key: number, 
    style: string, 
    index: number, 
    keyData: KeyTableData | undefined,
    img?: string
}

export interface KeyLine {
    line: number,
    style: string,
    keys: Array<Key>
}