import type { KeyboardDefine  } from '../interface'
import { KeyMatrixLayer, MatrixTable } from '../enum'
import { LightEffects  } from './layout'
import { KeyMap_FN1_Win, KeyMap_FN2_Win, KeyMap_Normal_Win, KeyMap_Tap_Win, KeyMap_FN1_Mac, KeyMap_FN2_Mac, KeyMap_Normal_Mac, KeyMap_Tap_Mac  } from './layout'
import { KeyText } from "@/common/keyCode_cb75"
import { RK_CB75_Usb } from './rk_cb75_usb'
import { RK_CB75_Dongle } from './rk_cb75_dongle'
import { ConnectionType, DeviceType, ProtocolType } from '@/device/enum'

export const RK_CB75_USB_DEFINE: KeyboardDefine = {
    name: "CB75-keyboard",
    image: "keyboard_rk-cb75.png",
    vendorId: 0x258A,
    productId: 0x02F1,
    usagePage: 0xFF00,
    usage: 0x0001,
    connectType: ConnectionType.USB,
    deviceType: DeviceType.Keyboard,
    protocolType: ProtocolType.BeiYing,
    keyText: KeyText,
    keyMatrixLayer: [
        KeyMatrixLayer.Nomal,
        KeyMatrixLayer.FN1,
        KeyMatrixLayer.FN2,
        KeyMatrixLayer.Tap
    ],
    keyMatrixTable: [
        MatrixTable.WIN,
        MatrixTable.MAC,
    ],
    keyLayout: { 
        0x00: {
            0x00: KeyMap_Normal_Win,
            0x01: KeyMap_FN1_Win,
            0x02: KeyMap_FN2_Win,
            0x03: KeyMap_Tap_Win,
        },
        0x01: {
            0x00: KeyMap_Normal_Mac,
            0x01: KeyMap_FN1_Mac,
            0x02: KeyMap_FN2_Mac,
            0x03: KeyMap_Tap_Mac,
        }
    },
    lightEffects: LightEffects,
    protocol: RK_CB75_Usb.create
}

export const RK_CB75_DONGLE_DEFINE: KeyboardDefine = {
    name: "CB75-keyboard",
    image: "keyboard_rk-cb75.png",
    vendorId: 0x3554,
    productId: 0xFA09,
    usagePage: 0xFF02,
    usage: 0x0002,
    connectType: ConnectionType.Dongle,
    deviceType: DeviceType.Keyboard,
    protocolType: ProtocolType.BeiYing,
    keyText: KeyText,
    keyMatrixLayer: [
        KeyMatrixLayer.Nomal,
        KeyMatrixLayer.FN1,
        KeyMatrixLayer.FN2,
        KeyMatrixLayer.Tap
    ],
    keyMatrixTable: [
        MatrixTable.WIN,
        MatrixTable.MAC,
    ],
    keyLayout: {
        0x00: {
            0x00: KeyMap_Normal_Win,
            0x01: KeyMap_FN1_Win,
            0x02: KeyMap_FN2_Win,
            0x03: KeyMap_Tap_Win,
        },
        0x01: {
            0x00: KeyMap_Normal_Mac,
            0x01: KeyMap_FN1_Mac,
            0x02: KeyMap_FN2_Mac,
            0x03: KeyMap_Tap_Mac,
        }
    },
    lightEffects: LightEffects,
    protocol: RK_CB75_Dongle.create
}
