import { defineStore } from "pinia";
import { reactive, ref } from 'vue';
import { keyboard } from '@/keyboard/beiying/keyboard'
import { RK_CB75, RK_CB75_EVENT_DEFINE } from '@/keyboard/beiying/rk_cb75/rk_cb75';
import { BoardProfile, FieldEnum } from '@/keyboard/beiying/rk_cb75/boardProfile';
import { LedEffect } from '@/keyboard/beiying/rk_cb75/ledEffect';
import { LedColors } from '@/keyboard/beiying/rk_cb75/ledColors';
import { LightEffectEnum, KeyMatrixLayer, MatrixTable } from '@/keyboard/beiying/enum'
import { ConnectionEventEnum, ConnectionStatusEnum, ConnectionType} from '@/device/enum'
import { type LedColor } from '@/keyboard/beiying/interface';
import { KeyDefineEnum } from '@/common/keyCode_cb75';
import { type KeyTableData } from '@/keyboard/beiying/interface'
import { ps } from '@/keyboard/beiying/rk_cb75/profiles';

export const uselightStore = defineStore('lightinfo_rk_cb75', () => {
    const rgb = ref({ r: 0, g: 0, b: 0, color: '#000000' });
    const boardProfile = ref<BoardProfile>();
    const ledEffect = ref<LedEffect>();
    const ledColors = ref<LedColors>();
    const rk_cb75 = ref<RK_CB75>();
    const profileIndex = ref(0);
    const connectType = ref<ConnectionType>()

    const getKeyData = (index: number, table: MatrixTable = MatrixTable.WIN, layer: KeyMatrixLayer = KeyMatrixLayer.Nomal): KeyTableData | undefined => {
        let keyData = undefined;
        if (layer in keyboard.state.keyTableData &&
            index < keyboard.state.keyTableData[table][layer].length) {
            keyData = keyboard.state.keyTableData[table][layer][index];
        }
        return keyData;
    }

    const getIndex = (l: number, c: number) => {
        return l + 6 * c;
    }

    const state = reactive({
        lightEffects: [
            { light: LightEffectEnum.FixedOn, label: 'light.menu_1' },
            { light: LightEffectEnum.Respire, label: 'light.menu_2' },
            { light: LightEffectEnum.Rainbow, label: 'light.menu_3' },
            { light: LightEffectEnum.FlashAway, label: 'light.menu_4' },
            { light: LightEffectEnum.Raindrops, label: 'light.menu_5' },
            { light: LightEffectEnum.RainbowWheel, label: 'light.menu_6' },
            { light: LightEffectEnum.RippleShining, label: 'light.menu_7' },
            { light: LightEffectEnum.StarsTwinkle, label: 'light.menu_8' },
            { light: LightEffectEnum.ShadowDisappear, label: 'light.menu_9' },
            { light: LightEffectEnum.RetroSnake, label: 'light.menu_10' },
            { light: LightEffectEnum.NeonStream, label: 'light.menu_11' },
            { light: LightEffectEnum.Reaction, label: 'light.menu_12' },
            { light: LightEffectEnum.SineWave, label: 'light.menu_13' },
            { light: LightEffectEnum.RotatingWindmill, label: 'light.menu_14' },
            { light: LightEffectEnum.ColorfulWaterfall, label: 'light.menu_15' },
            { light: LightEffectEnum.Blossoming, label: 'light.menu_17' },
            { light: LightEffectEnum.SelfDefine, label: 'light.menu_18' },
            { light: LightEffectEnum.OFF, label: 'light.menu_0' },
            //{ light: LightEffectEnum.Music, label: 'Music' },
        ],
        keyMatrix: [
            { key: KeyDefineEnum.KEY_ESC, index: getIndex(0, 0), },
            { key: KeyDefineEnum.KEY_F1, index: getIndex(0, 2), },
            { key: KeyDefineEnum.KEY_F2, index: getIndex(0, 3), },
            { key: KeyDefineEnum.KEY_F3, index: getIndex(0, 4), },
            { key: KeyDefineEnum.KEY_F4, index: getIndex(0, 5), },
            { key: KeyDefineEnum.KEY_F5, index: getIndex(0, 6), },
            { key: KeyDefineEnum.KEY_F6, index: getIndex(0, 7), },
            { key: KeyDefineEnum.KEY_F7, index: getIndex(0, 8), },
            { key: KeyDefineEnum.KEY_F8, index: getIndex(0, 9), },
            { key: KeyDefineEnum.KEY_F9, index: getIndex(0, 10), },
            { key: KeyDefineEnum.KEY_F10, index: getIndex(0, 11), },
            { key: KeyDefineEnum.KEY_F11, index: getIndex(0, 12), },
            { key: KeyDefineEnum.KEY_F12, index: getIndex(0, 13), },
            { key: KeyDefineEnum.KEY_DEL, index: getIndex(0, 14), },
            { key: KeyDefineEnum.KEY_TILDE, index: getIndex(1, 0), },
            { key: KeyDefineEnum.KEY_1, index: getIndex(1, 1), },
            { key: KeyDefineEnum.KEY_2, index: getIndex(1, 2), },
            { key: KeyDefineEnum.KEY_3, index: getIndex(1, 3), },
            { key: KeyDefineEnum.KEY_4, index: getIndex(1, 4), },
            { key: KeyDefineEnum.KEY_5, index: getIndex(1, 5), },
            { key: KeyDefineEnum.KEY_6, index: getIndex(1, 6), },
            { key: KeyDefineEnum.KEY_7, index: getIndex(1, 7), },
            { key: KeyDefineEnum.KEY_8, index: getIndex(1, 8), },
            { key: KeyDefineEnum.KEY_9, index: getIndex(1, 9), },
            { key: KeyDefineEnum.KEY_0, index: getIndex(1, 10), },
            { key: KeyDefineEnum.KEY_Underscore, index: getIndex(1, 11), },
            { key: KeyDefineEnum.KEY_EqualSign, index: getIndex(1, 12), },
            { key: KeyDefineEnum.KEY_Backspace, index: getIndex(1, 13), },
            { key: KeyDefineEnum.KEY_HOME, index: getIndex(1, 15), },
            { key: KeyDefineEnum.KEY_TAB, index: getIndex(2, 0), },
            { key: KeyDefineEnum.KEY_Q, index: getIndex(2, 1), },
            { key: KeyDefineEnum.KEY_W, index: getIndex(2, 2), },
            { key: KeyDefineEnum.KEY_E, index: getIndex(2, 3), },
            { key: KeyDefineEnum.KEY_R, index: getIndex(2, 4), },
            { key: KeyDefineEnum.KEY_T, index: getIndex(2, 5), },
            { key: KeyDefineEnum.KEY_Y, index: getIndex(2, 6), },
            { key: KeyDefineEnum.KEY_U, index: getIndex(2, 7), },
            { key: KeyDefineEnum.KEY_I, index: getIndex(2, 8), },
            { key: KeyDefineEnum.KEY_O, index: getIndex(2, 9), },
            { key: KeyDefineEnum.KEY_P, index: getIndex(2, 10), },
            { key: KeyDefineEnum.KEY_L_Brackets, index: getIndex(2, 11), },
            { key: KeyDefineEnum.KEY_R_Brackets, index: getIndex(2, 12), },
            { key: KeyDefineEnum.KEY_CODE29, index: getIndex(2, 13), },
            { key: KeyDefineEnum.KEY_END, index: getIndex(2, 15), },
            { key: KeyDefineEnum.KEY_CAPSLOCK, index: getIndex(3, 0), },
            { key: KeyDefineEnum.KEY_A, index: getIndex(3, 1), },
            { key: KeyDefineEnum.KEY_S, index: getIndex(3, 2), },
            { key: KeyDefineEnum.KEY_D, index: getIndex(3, 3), },
            { key: KeyDefineEnum.KEY_F, index: getIndex(3, 4), },
            { key: KeyDefineEnum.KEY_G, index: getIndex(3, 5), },
            { key: KeyDefineEnum.KEY_H, index: getIndex(3, 6), },
            { key: KeyDefineEnum.KEY_J, index: getIndex(3, 7), },
            { key: KeyDefineEnum.KEY_K, index: getIndex(3, 8), },
            { key: KeyDefineEnum.KEY_L, index: getIndex(3, 9), },
            { key: KeyDefineEnum.KEY_Semicolon, index: getIndex(3, 10), },
            { key: KeyDefineEnum.KEY_Quotation, index: getIndex(3, 11), },
            { key: KeyDefineEnum.KEY_ENTER, index: getIndex(3, 13), },
            { key: KeyDefineEnum.KEY_PGUP, index: getIndex(3, 15), },
            { key: KeyDefineEnum.SHIFT_L, index: getIndex(4, 0), },
            { key: KeyDefineEnum.KEY_Z, index: getIndex(4, 1), },
            { key: KeyDefineEnum.KEY_X, index: getIndex(4, 2), },
            { key: KeyDefineEnum.KEY_C, index: getIndex(4, 3), },
            { key: KeyDefineEnum.KEY_V, index: getIndex(4, 4), },
            { key: KeyDefineEnum.KEY_B, index: getIndex(4, 5), },
            { key: KeyDefineEnum.KEY_N, index: getIndex(4, 6), },
            { key: KeyDefineEnum.KEY_M, index: getIndex(4, 7), },
            { key: KeyDefineEnum.KEY_COMMA, index: getIndex(4, 8), },
            { key: KeyDefineEnum.KEY_PERIOD, index: getIndex(4, 9), },
            { key: KeyDefineEnum.KEY_Interrogation, index: getIndex(4, 10), },
            { key: KeyDefineEnum.SHIFT_R, index: getIndex(4, 13), },
            { key: KeyDefineEnum.KEY_UpArrow, index: getIndex(4, 14), },
            { key: KeyDefineEnum.KEY_PGDN, index: getIndex(4, 15), },
            { key: KeyDefineEnum.CTRL_L, index: getIndex(5, 0), },
            { key: KeyDefineEnum.WIN_L, index: getIndex(5, 1), },
            { key: KeyDefineEnum.ALT_L, index: getIndex(5, 2), },
            { key: KeyDefineEnum.KEY_SPACEBAR, index: getIndex(5, 5), },
            { key: KeyDefineEnum.ALT_R, index: getIndex(5, 8), },
            { key: KeyDefineEnum.KEY_Fn1, index: getIndex(5, 9), },
            { key: KeyDefineEnum.CTRL_R, index: getIndex(5, 10), },
            { key: KeyDefineEnum.KEY_LeftArrow, index: getIndex(5, 13), },
            { key: KeyDefineEnum.KEY_DownArrow, index: getIndex(5, 14), },
            { key: KeyDefineEnum.KEY_RightArrow, index: getIndex(5, 15), }
        ],
        keyColors: [
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF',
            '#FFFFFF'
        ],
        lightProps: {
            light: LightEffectEnum.OFF,
            brightness: 0,
            speed: 0,
            mixing: false,
            sleep: 0
        },
        keyColor:
        {
            index: 0,
            keyStr: "",
            key: KeyDefineEnum.KEY_ESC,
            color: "",
        },
        layer: 0,
        debounce: 0
    });

    const isInited = ref(false);

    const init = async () => {
        connectType.value = keyboard.state.connectType;
        if (rk_cb75.value == undefined) {
            rk_cb75.value = (keyboard.protocol as RK_CB75);
            keyboard.addEventListener("connection", connectionEventCallback);
        }

        if (rk_cb75.value != undefined && !isInited.value) {
            rk_cb75.value.addEventListener(RK_CB75_EVENT_DEFINE.OnProfileGotten, profileGotten, false);
            rk_cb75.value.addEventListener(RK_CB75_EVENT_DEFINE.OnLedEffectGotten, ledEffectGotten, false);
            rk_cb75.value.addEventListener(RK_CB75_EVENT_DEFINE.OnLedColorsGotten, ledColorsGotten, false);
            boardProfile.value = rk_cb75.value.data.boardProfile
            ledEffect.value = rk_cb75.value.data.ledEffect
            ledColors.value = rk_cb75.value.data.ledColors
            isInited.value = true;
        }

        if (boardProfile.value == undefined) {
            await getLightData();
        } else {
            state.layer = boardProfile.value.getFieldValue(FieldEnum.TapDelay)
            state.debounce = boardProfile.value.getFieldValue(FieldEnum.Debounce)
            state.lightProps.light = boardProfile.value.getFieldValue(FieldEnum.LedMode);
            let ledParam = boardProfile.value.getLedParam(state.lightProps.light);
            if (ledParam != undefined && boardProfile.value.getFieldValue(FieldEnum.LedParameterType) == 0) {
                state.lightProps.brightness = ledParam.brightness + 1;
                state.lightProps.mixing = ledParam.color > 0;
                state.lightProps.speed = ledParam.speed;
            } else {
                state.lightProps.brightness = boardProfile.value.getFieldValue(FieldEnum.LedBrightness) + 1;
                state.lightProps.speed = boardProfile.value.getFieldValue(FieldEnum.LedSpeed);
            }

            state.lightProps.sleep = boardProfile.value.getFieldValue(FieldEnum.SleepTime) == 0 ? 0 : (boardProfile.value.getFieldValue(FieldEnum.SleepTime) * 30) / 60;
        }

        if (ledColors.value != undefined) {
            let index: number;
            for (index = 0; index < state.keyColors.length; index++) {
                var color = ledColors.value.getLedColor(index);
                state.keyColors[index] = color.color;
            }

            keyChanged(state.keyColor.index);
        }

        if (ledEffect.value != undefined) {
            let c = ledEffect.value.getLedColor(state.lightProps.light);
            rgb.value.r = c.red;
            rgb.value.g = c.green;
            rgb.value.b = c.blue;
            rgb.value.color = c.color;
        }
    };

    const connectionEventCallback = async (event: Event) => {
        switch (keyboard.state.connectionEvent) {
            case ConnectionEventEnum.Disconnect:
            case ConnectionEventEnum.Close:
                destroy();
                break;
        }
    };

    const destroy = () => {
        if (rk_cb75.value != undefined) {
            rk_cb75.value.removeEventListener(RK_CB75_EVENT_DEFINE.OnProfileGotten, profileGotten, false);
            rk_cb75.value.removeEventListener(RK_CB75_EVENT_DEFINE.OnLedEffectGotten, ledEffectGotten, false);
            rk_cb75.value.removeEventListener(RK_CB75_EVENT_DEFINE.OnLedColorsGotten, ledColorsGotten, false);
        }

        if (keyboard.state.ConnectionStatus != ConnectionStatusEnum.Connected) {
            keyboard.removeEventListener("connection", connectionEventCallback);
            isInited.value = false;
            rk_cb75.value = undefined;
        }
    };

    const setProfile = () => {
        if (boardProfile.value != undefined) {
            const dataView = new DataView(boardProfile.value.buffer.buffer)
            ps.initProfile(new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength))
        }
    }
    const setledEffect = () => {
        if (ledEffect.value != undefined) {
            const dataView = new DataView(ledEffect.value.buffer.buffer)
            ps.initledEffect(new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength))
        }
    }
    const setledColors = () => {
        if (ledColors.value != undefined) {
            const dataView = new DataView(ledColors.value.buffer.buffer)
            ps.initledColors(new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength))
        }
    }

    const DebounceChanged = (mode: number) => {
        state.debounce = mode;
        if (boardProfile.value != undefined && rk_cb75.value != undefined) {
            boardProfile.value.setFieldValue(FieldEnum.Debounce, mode);
            rk_cb75.value.setProfile(profileIndex.value);
        }
    };

    const setLayer = (layer: number) => {
        // 0 关闭 TAP。滑条 1 写入 3：(1 << 1) | 1。
        state.layer = layer > 0 ? ((layer << 1) | 0x01) : 0;
        if (boardProfile.value != undefined && rk_cb75.value != undefined) {
            boardProfile.value.setFieldValue(FieldEnum.TapDelay, state.layer );
            rk_cb75.value.setProfile(profileIndex.value);
        }
    };

    const getLightData = async () => {
        await rk_cb75.value?.getProfile(profileIndex.value);
    }

    const profileGotten = async (event: any) => {
        boardProfile.value = event.detail as BoardProfile;
        boardProfile.value.setFieldValue(FieldEnum.LedModeSelection, 0x00);
        boardProfile.value.setFieldValue(FieldEnum.LedMode, LightEffectEnum.NeonStream);
        await rk_cb75.value?.getLedEffect(profileIndex.value);
        setProfile()
    };

    const ledEffectGotten = async (event: any) => {
        ledEffect.value = event.detail as LedEffect;
        await rk_cb75.value?.getLedColors(profileIndex.value);
        setledEffect()
    };

    const ledColorsGotten = async (event: any) => {
        ledColors.value = event.detail as LedColors;
        if (ledColors.value != undefined) {
            let color: LedColor = {
                red: 0xFF,
                green: 0xFF,
                blue: 0xFF,
                color: '#FFFFFF'
            }
            // ledColors.value?.setLedColor(0, color);
            // ledColors.value?.setLedColor(14, color);
            // ledColors.value?.setLedColor(15, color);
            // ledColors.value?.setLedColor(21, color);
            // ledColors.value?.setLedColor(9, color);
            // ledColors.value?.setLedColor(94, color);
            // ledColors.value?.setLedColor(89, color);
            // ledColors.value?.setLedColor(95, color);
            // ledColors.value?.setLedColor(101, color);
        }
        setledColors()
        await refresh();
    };

    const refresh = async () => {
        // if (rk_cb75.value != undefined) {
        //     profile.value = rk_cb75.value.data.profile
        //     ledEffect.value = rk_cb75.value.data.ledEffect
        //     ledColors.value = rk_cb75.value.data.ledColors
        // }

        if (boardProfile.value != undefined) {
            state.lightProps.light = boardProfile.value.getFieldValue(FieldEnum.LedMode);
            let ledParam = boardProfile.value.getLedParam(state.lightProps.light);
            if (ledParam != undefined && boardProfile.value.getFieldValue(FieldEnum.LedParameterType) == 0) {
                state.lightProps.brightness = ledParam.brightness + 1;
                state.lightProps.mixing = ledParam.color > 0;
                state.lightProps.speed = ledParam.speed;
            } else {
                state.lightProps.brightness = boardProfile.value.getFieldValue(FieldEnum.LedBrightness) + 1;
                state.lightProps.speed = boardProfile.value.getFieldValue(FieldEnum.LedSpeed);
            }

            state.lightProps.sleep = boardProfile.value.getFieldValue(FieldEnum.SleepTime) == 0 ? 0 : (boardProfile.value.getFieldValue(FieldEnum.SleepTime) * 30) / 60;
        }

        if (state.lightProps.light == LightEffectEnum.SelfDefine) {
            if (ledColors.value != undefined) {
                await rk_cb75.value?.setLedColors(profileIndex.value);
            }
            // } else if (state.lightProps.light != LightEffectEnum.OFF && state.lightProps.light != LightEffectEnum.Music) {
            //     if (ledEffect.value != undefined) {
            //         await rk_cb75.value?.setLedEffect(profileIndex.value);
            //     }
        }

        if (ledColors.value != undefined) {
            let index: number;
            for (index = 0; index < state.keyColors.length; index++) {
                var color = ledColors.value.getLedColor(index);
                state.keyColors[index] = color.color;
            }

            keyChanged(state.keyColor.index);
        }

        // if (state.lightProps.light == LightEffectEnum.SelfDefine) {
        //     let color = ledColors.value?.getLedColor(state.keyColor.index);
        //     if (color != undefined) {
        //         rgb.value.r = color.red;
        //         rgb.value.g = color.green;
        //         rgb.value.b = color.blue;
        //         rgb.value.color = color.color;
        //     }
        // } else {
        //     let color = ledEffect.value?.getLedColor(state.lightProps.light);
        //     if (color != undefined) {
        //         rgb.value.r = color.red;
        //         rgb.value.g = color.green;
        //         rgb.value.b = color.blue;
        //         rgb.value.color = color.color;
        //     }
        // }
    };

    const ligtChanged = async () => {
        if (boardProfile.value != undefined && rk_cb75.value != undefined) {
            boardProfile.value.setLedParam(state.lightProps.light, {
                brightness: state.lightProps.brightness - 1,
                speed: state.lightProps.speed,
                color: state.lightProps.mixing ? 0x07 : 0x00
            });
            boardProfile.value.setFieldValue(FieldEnum.SleepTime, (state.lightProps.sleep * 60) / 30);
            await rk_cb75.value.setProfile(profileIndex.value);
            await refresh();
        }
    };

    const saveBoardProfileToDevice = async () => {
        if (rk_cb75.value != undefined) {
            await rk_cb75.value.setProfile(profileIndex.value);
        }
    };

    const SelfDefineDefaultAll = () => {
        if (ledColors.value != undefined) {
            let index: number;
            for (index = 0; index < state.keyColors.length; index++) {
                onPicking(0, 0, 0, index);
            }
        }
        onPicked();
    }


    const SelfDefineDefault = () => {
        if (state.lightProps.light != LightEffectEnum.SelfDefine) {
            return
        }
        onPicking(0, 0, 0);
        onPicked();
    }

    const onPicking = (r: any, g: any, b: any, index: number = state.keyColor.index) => {
        let color: LedColor = {
            red: r,
            green: g,
            blue: b,
            color: LedColors.getColorString(r, g, b)
        }
        if (state.lightProps.light == LightEffectEnum.SelfDefine) {
            state.keyColor.color = color.color;
            state.keyColors[index] = color.color;
            ledColors.value?.setLedColor(index, color);
        } else if (state.lightProps.light != LightEffectEnum.OFF && state.lightProps.light != LightEffectEnum.Music) {
            ledEffect.value?.setLedColor(state.lightProps.light, color);
        }
    };

    const onPicked = async () => {
        // if (rk_cb75.value != undefined) {
        //     if (state.lightProps.light == LightEffectEnum.SelfDefine) {
        //         if (ledColors.value != undefined) {
        //             await rk_cb75.value.setLedColors(profileIndex.value);
        //         }
        //     } else if (state.lightProps.light != LightEffectEnum.OFF && state.lightProps.light != LightEffectEnum.Music) {
        //         if (ledEffect.value != undefined) {
        //             await rk_cb75.value.setLedEffect(profileIndex.value);
        //         }
        //     }
        await refresh();
        if (state.lightProps.light != LightEffectEnum.OFF && state.lightProps.light != LightEffectEnum.Music) {
            if (ledEffect.value != undefined) {
                await rk_cb75.value?.setLedEffect(profileIndex.value);
            }
        }
        //}
    };

    const lightClick = async (light: LightEffectEnum) => {
        if (boardProfile.value != undefined && rk_cb75.value != undefined) {
            state.lightProps.light = light;
            if (ledEffect.value != undefined) {
                let c = ledEffect.value.getLedColor(state.lightProps.light);
                rgb.value.r = c.red;
                rgb.value.g = c.green;
                rgb.value.b = c.blue;
                rgb.value.color = c.color;
            }
            // 0x01: Gaming
            boardProfile.value.setFieldValue(FieldEnum.LedModeSelection, (light == LightEffectEnum.SelfDefine) ? 0x01 : 0x00);
            boardProfile.value.setFieldValue(FieldEnum.LedMode, light);
            await rk_cb75.value.setProfile(profileIndex.value);
            await refresh();
        }
    };

    const selectd = (light: LightEffectEnum) => {
        let style = '';
        if (boardProfile.value != undefined && light == state.lightProps.light) {
            style = 'module_active';
        }

        return style;
    };

    const selectdCustom = (light: LightEffectEnum) => {
        let style = '';
        if (boardProfile.value != undefined && light == state.lightProps.light) {
            style = 'active';
        }

        return style;
    };
    const keyChanged = (index: any) => {
        state.keyColor.index = index;
        state.keyColor.color = state.keyColors[index];
        let str = getKeyData(index)?.keyStr;
        if (str != undefined) {
            state.keyColor.keyStr = str[0].valueOf();
        }
    };

    const keyTextColor = (index: number): string => {
        return state.keyColors[index];
    };

    const setSelectedKeyColor = (index: number = state.keyColor.index) => {
        let color: LedColor = {
            red: rgb.value.r,
            green: rgb.value.g,
            blue: rgb.value.b,
            color: LedColors.getColorString(rgb.value.r, rgb.value.g, rgb.value.b)
        }
        state.keyColor.color = color.color;
        state.keyColors[index] = color.color;
        ledColors.value?.setLedColor(index, color);
    }

    const saveLedColorsToDevice = async () => {
        if (ledColors.value != undefined) {
            await rk_cb75.value?.setLedColors(profileIndex.value);
        }
    }

    return { connectType, state, rgb, ligtChanged, onPicking, onPicked, selectd, lightClick, selectdCustom, keyChanged, keyTextColor, init, destroy, SelfDefineDefault, setLayer, DebounceChanged, SelfDefineDefaultAll, refresh, saveBoardProfileToDevice, setSelectedKeyColor, saveLedColorsToDevice }
})