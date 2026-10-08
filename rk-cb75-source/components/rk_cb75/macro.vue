<template>
    <div class="macro-page d-flex h-100 min-h-0 overflow-hidden">
    <div v-show="playing" class="macro-recording-mask" aria-hidden="true"></div>
    <div class="macro-list-panel">
        <div class="bg-grey d-flex flex-column h-100 min-h-0">
            <div class="p-3 bg-white-1 fw-b fs-xxl flex-shrink-0">{{ $t('macro.title') }}</div>
            <div class="macro-list-scroll flex-1 min-h-0">
                <el-scrollbar class="macro-list-scrollbar">
                    <div style="padding-left: 16%"
                        :class="[`module_box d-flex p-3 my-2 text-grey-1 jc-between`, isSelected(macro)]"
                        v-for=" macro in macros?.get()" @click="clickMacro(macro)">
                        <div class="d-flex">
                            <span class="pr-4 d-flex ai-center">
                                <img src="../../assets/images/dot.png" />
                            </span>
                            <span>
                                {{ macro.name }}
                            </span>
                        </div>
                        <div>
                            <el-dropdown>
                                <el-icon :size="18" color="#ffffff">
                                    <MoreFilled />
                                </el-icon>
                                <template #dropdown>
                                    <el-dropdown-menu style="padding: 0px;">
                                        <el-dropdown-item @click="renameMacro(macro)">
                                            <img src="../../assets/images/title/edit.png" class="img-title" />
                                            {{ $t("macro.but_9") }}
                                        </el-dropdown-item>
                                        <el-dropdown-item @click="deleteMacro(macro)">
                                            <img src="../../assets/images/title/del.png" class="img-title" />
                                            {{ $t("macro.but_10") }}
                                        </el-dropdown-item>
                                        <el-dropdown-item @click="useMacro.exportMacro(macro)">
                                            <img src="../../assets/images/title/export.png" class="img-title" />
                                            {{ $t("macro.but_11") }}
                                        </el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                    </div>
                </el-scrollbar>
            </div>
            <div class="bg-white macro-list-footer flex-shrink-0">
                <div class="d-flex jc-center text-white">
                    <div class="d-flex py-1 m-2 px-3 but-blue c-p" @click="newMacro">
                        <img src="../../assets/images/title/new.png" class="img-but" />{{ $t('macro.but_1') }}
                    </div>
                    <div class="d-flex py-1 m-2 px-3 but-green c-p">
                        <el-upload :before-upload="beforeAvatarUpload" :show-file-list="false">
                            <img src="../../assets/images/title/import.png" class="img-but" />
                            {{ $t("macro.but_2") }}
                        </el-upload>
                    </div>
                </div>
            </div>
            <el-dialog v-model="state.nameEditorDisplay" top="min(12vh, 72px)" width="min(680px, calc(100vw - 24px))" :lock-scroll="true">
                <div class="d-flex ai-center">
                    <el-input v-model="state.name" placeholder="Please input" maxlength="10" />
                </div>
                <div class="d-flex jc-end">
                    <div class="py-1 px-4 but-green text-white c-p mt-4" @click="saveName">{{ $t('macro.but_7') }}</div>
                </div>
            </el-dialog>
        </div>
    </div>
    <div class="d-flex flex-1 macro-main min-h-0">
        <el-dialog v-model="state.actionTextShow" top="min(12vh, 72px)" width="min(680px, calc(100vw - 24px))" :lock-scroll="true">
            <div class="d-flex">
                <div class="py-1 px-4 but-green text-white c-p mb-4" @click="saveAction()">
                    {{ $t('macro.but_7') }}
                </div>
            </div>
            <div class="d-flex ai-center mb-4">
                <el-input v-model="state.actionText" placeholder="Please input" :rows="8" type="textarea" />
            </div>
            <div class="d-flex flex-column">
                <span>{{ $t('macro.desc_1') }}</span>
                <span>{{ $t('macro.desc_2') }}</span>
                <span>{{ $t('macro.desc_3') }}</span>
                <span>{{ $t('macro.desc_4') }}</span>
                <span>{{ $t('macro.desc_5') }}</span>
                <span>{{ $t('macro.desc_6') }}</span>
            </div>
        </el-dialog>
        <div class="d-flex flex-column flex-1 ml-4 my-4 macro-settings-panel">
            <div class="bg-white p-2 flex-shrink-0" style="border-radius: 10px 10px 0px 0px;line-height: 30px;">
                {{ $t('macro.title_1') }}
            </div>
            <div class="flex-1 bg-white-1 macro-settings-body" style="border-radius: 0px 0px 10px 10px">
                <div class="m-5" style="border-bottom: 1px solid #E7EAF2;">
                    <div class="m-4">{{ $t('macro.title_3') }}</div>
                    <div class="m-4">
                        <el-select v-model="state.eventVal" placeholder="Select" style="width: 100%;">
                            <el-option v-for="item in state.eventList" :key="item.value" :label="$t(item.label)"
                                :value="item.value" />
                        </el-select>
                    </div>
                    <div class="m-4">
                        <el-radio-group v-model="actVal" text-color="#00ffff" fill="#ffff00" :disabled="playing">
                            <el-radio v-for="item in state.actList" :value="$t(item.value)" :label="$t(item.label)">
                                {{ $t(item.label) }}
                            </el-radio>
                        </el-radio-group>
                    </div>
                    <div class="m-4" v-if="!playing">
                        <span v-if="actVal === $t('macro.menu_1')"><el-input style="width: 100%" v-model="state.key"
                                aria-placeholder="Please input" :readonly="false" maxlength="1" /></span>
                        <span v-else-if="actVal === $t('macro.menu_3')"><el-input style="width: 100%" v-model="state.key"
                                aria-placeholder="请点击鼠标按键" :readonly="true" /></span>
                        <span v-else><el-input-number style="width: 150px" v-model="delay" :min="1"
                                aria-placeholder="Please input delay" type="number" />ms</span>
                    </div>
                    <div class="m-4 d-flex">
                        <div class="py-1 px-4 but-green text-white c-p" @click="insert" @mousedown.stop @mouseup.stop>
                            {{ $t('macro.but_3') }}
                        </div>
                    </div>
                </div>
                <div class="m-5"></div>
                <div class="m-5">
                    <div class="m-4 d-flex ai-center">
                        <div>{{ $t('macro.title_4') }}</div>
                        <div class="ml-3" v-if="!playing">
                            <el-input-number v-model="repeat" :min="1" :max="10" />
                        </div>
                    </div>
                    <div class="m-4 d-flex ai-center">
                        <el-radio-group v-model="delayVal" text-color="#00ffff" fill="#ffff00" :disabled="playing"
                            @change="delayChanged">
                            <el-radio v-for="item in state.delayList" :value="$t(item.value)" :label="$t(item.label)"
                                style="width: 100%;">
                                {{ $t(item.label) }}
                                <span class="ml-3"
                                    v-if="delayVal === $t('macro.menu_6') && $t(item.value) === $t('macro.menu_6') && !playing"><el-input-number
                                        style="width: 150px" v-model="delayFix" aria-placeholder="Please input delay"
                                        type="number" :min="1" />ms</span>
                            </el-radio>
                        </el-radio-group>
                    </div>
                    <div class="m-4 d-flex" :class="{ 'macro-stop-btn-wrap': playing }">
                        <div class="macro-start-btn py-1 px-5 text-white c-p" @click="record"
                            :class="[playing ? 'but-red' : 'but-blue']">
                            {{ playTitle }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="d-flex flex-column flex-1 mx-4 my-4 macro-record-panel min-h-0" style="box-shadow: 0px 0px 24px 0px #E9EBF3;">
            <div class="d-flex jc-between bg-white p-2 flex-shrink-0" style="border-radius: 10px 10px 0px 0px;line-height: 30px;">
                <div>
                    {{ $t('macro.title_2') }}
                </div>
                <div class="d-flex">
                    <div class="px-1 b-grey-1 mx-2 br-1 c-p" @click="upAction(actionVal as Action)">↑</div>
                    <div class="px-1 b-grey-1 mx-2 br-1 c-p" @click="downAction(actionVal as Action)">↓</div>
                </div>
            </div>
            <div class="d-flex flex-column flex-1 bg-white-1 macro-record-body" style="border-radius: 0px 0px 10px 10px;">
                <div class="list flex-1 macro-record-list bg-warn-1">
                    <el-scrollbar ref="elActionScrollbar" class="macro-record-scroll">
                        <div :class="['p-1 c-p', selectedAction(action)]" v-for=" action in state.macro?.actions"
                            @click="clickAction(action)">
                            {{ action?.toString() }}
                        </div>
                    </el-scrollbar>
                </div>
                <div class="d-flex flex-column bg-white p-4 macro-record-footer" style="border-radius: 0px 0px 10px 10px">
                    <div v-if="isDirty" class="macro-unsaved-hint" role="status">{{ $t('macro.title_12') }}</div>
                    <div class="d-flex jc-center macro-record-actions">
                    <div class="py-1 px-4 but-blue text-white mx-3 c-p" @click="textAction()">
                        {{ $t('macro.but_12') }}
                    </div>
                    <div class="py-1 px-4 but-grey text-white mx-3 c-p" @click="clearAction()">
                        {{ $t('macro.but_5') }}
                    </div>
                    <div class="py-1 px-4 but-red text-white mx-3 c-p" @click="deleteAction(actionVal as Action)">
                        {{ $t('macro.but_6') }}
                    </div>
                    <div class="py-1 px-4 but-green text-white mx-3 c-p" :class="{ 'macro-save-btn--dirty': isDirty }" @click="saveMacro()">
                        {{ $t('macro.but_7') }}
                    </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>
</template>

<style lang="scss" scoped>
.macro-page {
    width: 100%;
    min-height: 0;
    min-width: 0;
}

.macro-list-panel {
    min-width: 210px;
    width: 260px;
    flex-shrink: 0;
    height: 100%;
    min-height: 0;
}

.macro-list-scroll {
    min-height: 0;
    overflow: hidden;
}

.macro-list-scrollbar {
    height: 100%;
}

.macro-list-scrollbar :deep(.el-scrollbar__wrap) {
    max-height: 100%;
}

.macro-list-footer {
    padding: 4px 0;
}

.macro-settings-panel {
    min-height: 0;
    overflow: hidden;
}

.macro-settings-body {
    min-height: 0;
    overflow-y: auto;
}

.macro-main {
    min-height: 0;
    height: 100%;
    overflow: hidden;
}

.macro-record-panel {
    min-height: 0;
    overflow: hidden;
}

.macro-record-body {
    min-height: 0;
    overflow: hidden;
}

.macro-record-list {
    min-height: 0;
    overflow: hidden;
}

.macro-record-scroll {
    height: 100%;
}

.macro-record-scroll :deep(.el-scrollbar__wrap) {
    max-height: 100%;
}

.macro-record-footer {
    flex-shrink: 0;
}

.macro-record-actions {
    flex-wrap: wrap;
    gap: 8px;
}

.macro-recording-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
}

.macro-stop-btn-wrap {
    position: relative;
    z-index: 1001;
    background: transparent;
}

.macro-start-btn {
    height: 30px;
    box-sizing: border-box;
}

.macro-unsaved-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, #e8b463 45%, var(--cb75-border, #29333d));
    border-radius: 10px;
    background: color-mix(in srgb, #e8b463 10%, var(--cb75-surface, #11151d));
    color: #c58d44;
    font-size: 13px;
    line-height: 1.4;
}

.macro-unsaved-hint::before {
    content: "";
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f59e0b;
}

.macro-save-btn--dirty {
    animation: macro-save-pulse 1.6s ease-in-out infinite;
}

@media (max-width: 1180px) {
    .macro-page {
        overflow-x: hidden !important;
        overflow-y: auto !important;
    }

    .macro-list-panel {
        width: 210px;
        min-width: 210px;
        position: sticky;
        top: 0;
        align-self: flex-start;
    }

    .macro-main {
        min-width: 0;
        height: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow: visible;
    }

    .macro-settings-panel,
    .macro-record-panel {
        min-width: 0;
        width: 100%;
        margin: 0 !important;
        flex: none;
    }

    .macro-settings-body {
        flex: none !important;
        overflow: visible;
    }

    .macro-record-body {
        height: 360px;
    }
}

@media (max-width: 760px) {
    .macro-page {
        display: block;
    }

    .macro-list-panel {
        position: static;
        width: 100%;
        min-width: 0;
        height: 210px;
    }

    .macro-main {
        width: 100%;
        padding: 10px;
    }

    .macro-settings-body .m-5 {
        margin: 14px !important;
    }

    .macro-settings-body .m-4 {
        margin: 10px !important;
    }

    .macro-record-footer {
        padding: 12px !important;
    }

    .macro-record-actions > div {
        margin: 0 !important;
    }
}

@keyframes macro-save-pulse {
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(223, 8, 50, 0.35);
    }
    50% {
        box-shadow: 0 0 0 6px rgba(223, 8, 50, 0);
    }
}

.action_selected {
    background-color: var(--cb75-accent-soft, #173a39) !important;
    color: var(--cb75-accent, #45e6d0) !important;
}

.list :nth-child(2n+1) {
    background-color: var(--cb75-surface, #11151d);
}

.list :nth-child(2n) {
    background-color: var(--anxiu-panel-soft, #141922);
    border-top: 1px solid var(--cb75-border, #29333d);
}

.macro_selected {
    border: 1px solid var(--cb75-accent, #45e6d0);
    padding: 1px;
}

.input {
    .el-input__wrapper.is-focus {
        box-shadow: 0 0 0 3px var(--el-input-focus-border-color) inset !important;
    }
}
</style>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { RK_CB75 } from '@/keyboard/beiying/rk_cb75/rk_cb75';
import { Macro, Action, ActionType } from '@/keyboard/beiying/rk_cb75/macros';
import { KeyCodeMap } from '@/common/keyCode_cb75'
import { type KeyCodeTable } from '@/common/interface';
import { storage } from '@/common/storage';
import { useMacroStore } from "@/stores/rk_cb75/macroStore";
import { storeToRefs } from "pinia";
import { useI18n } from 'vue-i18n';
import { KeyDefineEnum } from '@/common/keyCode_cb75'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { Action as ElAction } from 'element-plus';
import type { UploadProps } from 'element-plus'
import { keyboard } from '@/keyboard/beiying/keyboard';
import { KeyType } from '@/keyboard/beiying/rk_cb75/macros';

// 解构出t方法
const { t } = useI18n();
const useMacro = useMacroStore();
const { state, macros, actions, isDirty } = storeToRefs(useMacro);

const actVal = ref(t('macro.menu_1'));
const rk_cb75 = ref<RK_CB75>();
//const macros = ref<Macros>();

//const key = ref<string>('');
const delay = ref<number>(30);
//const macro = ref<Macro>();
const elAction = ref<any>(null);
const elMacro = ref<any>(null);
const elActionScrollbar = ref<any>(null);
const keyCodeTable = ref<KeyCodeTable>();
const actionVal = ref<Action>();
const delayVal = ref(t('macro.menu_4'));
const delayFix = ref<number>(30);
const keyDate = ref<any>();
const keyDelay = ref<number>(0);
const repeat = ref<number>(0)
const playing = ref<boolean>(false);
const playTitle = computed(() => playing.value ? t('macro.but_8') : t('macro.but_4'));
const lastKey = ref<string>('');
const isNew = ref<boolean>(false);
watch(() => ({
    index: state.value.macro?.index,
    repeat: repeat.value,
    actions: (state.value.macro?.actions ?? []).map((action) => ({ action: action.action, type: action.type, delay: action.delay, key: action.key, index: action.index })),
}), (current) => {
    useMacro.syncDirty(current.repeat);
}, { deep: true });
const lastMouseButton = ref<number>(-1);
const mouseCodeTable = ref<{ hid: number; key: string } | undefined>();
const ignoreNextMouseEvent = ref<boolean>(false);

// 鼠标按键映射表
const MouseCodeMap: Record<number, { hid: number; key: string }> = {
    0: { hid: KeyDefineEnum.MOUSE_L, key: 'Mouse-L' },  // 左键
    1: { hid: KeyDefineEnum.MOUSE_M, key: 'Mouse-M' },  // 中键
    2: { hid: KeyDefineEnum.MOUSE_R, key: 'Mouse-R' },  // 右键
    3: { hid: KeyDefineEnum.MOUSE_B4, key: 'Mouse-B4' }, // 侧键4
    4: { hid: KeyDefineEnum.MOUSE_B5, key: 'Mouse-B5' }, // 侧键5
};

// const state = reactive({
//     macros: macros,
//     macro: macro,
//     name: '',
//     nameEditorDisplay: false,
//     key: key,
// });

const isPlaying = (done: Function, cancel = () => { }) => {
    if (!playing.value) {
        done();
        return;
    }
    ElMessageBox.alert(t('macro.title_5'), 'Tip', {
        confirmButtonText: 'OK'
    }).then(() => {
        cancel();
    }).catch((action: ElAction) => {
        cancel();
    });
};

const clearAction = () => {
    isPlaying(() => {
        if (state.value.macro != undefined) state.value.macro.actions = [];
    })
};

const textAction = () => {
    isPlaying(() => {
        state.value.actionTextShow = true
        state.value.actionText = JSON.stringify(state.value.macro?.actions)
    })
};
const saveAction = () => {
    isPlaying(() => {
        state.value.actionTextShow = false
        useMacro.saveAction();
    })
};

const selectedAction = (obj: Action): string => {
    return obj?.index == actionVal.value?.index ? 'action_selected' : '';
}
const clickAction = (obj: Action) => {
    isPlaying(() => {
        actionVal.value = obj;
    })
}

const onContextMenu = (event: MouseEvent) => {
    // 录制或选择“鼠标”选项时，阻止右键菜单
    if (playing.value || actVal.value === t('macro.menu_3')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
};

onMounted(async () => {
    await useMacro.init();
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('contextmenu', onContextMenu, false);

    repeat.value = useMacro.restoreEditState();

    // 切换键盘/鼠标/延迟模式时，清空显示，让后续输入实时更新
    watch(actVal, () => {
        state.value.key = '';
    });
});

onBeforeUnmount(() => {
    useMacro.destroy();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('contextmenu', onContextMenu);
});

const onKeyUp = async (event: KeyboardEvent) => {
    console.log('Key pressed:', `${event.key} | ${event.code} | ${event.keyCode}`);

    // 在“鼠标”模式下，忽略键盘释放事件（不更新显示/不记录）
    if (actVal.value === t('macro.menu_3')) return;

    if (state.value.nameEditorDisplay && event.key == "Enter") {
        if (event.key == "Enter") {
            await saveName();
        } else if (event.key == "Esc") {
            state.value.nameEditorDisplay = false;
        }

        return;
    }

    keyCodeTable.value = KeyCodeMap[event.code];

    if (keyCodeTable.value != undefined) {
        keyDelay.value = ComputeTimeDiff(keyDate.value);
    }

    //录制中
    if (playing.value) {
        if (delayVal.value == t('macro.menu_4')) {
            delay.value = keyDelay.value;
        } else if (delayVal.value == t('macro.menu_5')) {
            delay.value = 30;
        } else if (delayVal.value == t('macro.menu_6')) {
            delay.value = delayFix.value;
        }

        if (state.value.macro != undefined && keyCodeTable.value != undefined) {

            let index = state.value.macro.actions.length;
            index = index < 0 ? 0 : index

            if (delay.value > 0 && index > 0) {
                state.value.macro.actions[index - 1].delay = delay.value;
            }

            if (keyCodeTable.value != undefined) {
                state.value.macro.insert(index, new Action(keyCodeTable.value.hid, 0, ActionType.Up, KeyType.NormalKey));
            }

            state.value.macro.refresh();
            elActionScrollbar.value.setScrollTop(50000);
        }
    }

    keyDate.value = new Date();
    lastKey.value = '';
};

const record = () => {
    playing.value = !playing.value;
    keyDate.value = new Date();
    lastKey.value = '';
};

//计算剩余时间差
const ComputeTimeDiff = (date: any): number => {
    var strDate = new Date(date);
    var endDate = new Date(); // 结束时间
    var diffDate = endDate.getTime() - strDate.getTime() // 时间差的毫秒数
    return diffDate
}

const onKeyDown = (event: KeyboardEvent) => {
    console.log('Key pressed:', `${event.key} | ${event.code} | ${event.keyCode}`);
    if (state.value.nameEditorDisplay) return;

    // 在“鼠标”模式下，忽略键盘按下事件（不更新显示/不记录）
    if (actVal.value === t('macro.menu_3')) return;

    //event.preventDefault();

    keyCodeTable.value = KeyCodeMap[event.code];

    if (keyCodeTable.value != undefined) {
        keyDelay.value = ComputeTimeDiff(keyDate.value);
    }

    if (keyCodeTable.value != undefined) {
        state.value.key = keyCodeTable.value.key;
    }

    if (playing.value && keyCodeTable.value != undefined && keyCodeTable.value.key != lastKey.value) {

        keyDate.value = new Date();

        if (delayVal.value == t('macro.menu_4')) {
            delay.value = keyDelay.value;
        } else if (delayVal.value == t('macro.menu_5')) {
            delay.value = 30;
        } else if (delayVal.value == t('macro.menu_6')) {
            delay.value = delayFix.value;
        }

        if (state.value.macro != undefined && keyCodeTable.value != undefined) {
            let index = state.value.macro.actions.length;
            index = index < 0 ? 0 : index

            if (delay.value > 0 && index > 0) {
                state.value.macro.actions[index - 1].delay = delay.value;
            }

            if (keyCodeTable.value != undefined) {
                state.value.macro.insert(index, new Action(keyCodeTable.value.hid, 0, ActionType.Down, KeyType.NormalKey));
            }

            state.value.macro.refresh();
            elActionScrollbar.value.setScrollTop(50000);
            lastKey.value = keyCodeTable.value.key;
        }
    }
};

const onMouseDown = (event: MouseEvent) => {
    if (state.value.nameEditorDisplay) return;
    
    const button = event.button;
    
    // 在录制或选择“鼠标”选项时，阻止右键与侧键（避免系统/浏览器行为）
    if ((playing.value || actVal.value === t('macro.menu_3')) && (button === 2 || button === 3 || button === 4)) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // 检查事件目标是否是按钮或其子元素，如果是则忽略（避免点击按钮时误捕获）
    const target = event.target as HTMLElement;
    if (target) {
        // 检查是否是任何可点击按钮或其子元素（包括插入、保存、清空、删除等按钮）
        const clickableButton = target.closest('.c-p') || target.closest('button') || target.closest('[role="button"]');
        if (clickableButton) {
            // 如果选择了鼠标选项，在点击按钮时暂时忽略鼠标事件
            if (actVal.value === t('macro.menu_3') || 
                actVal.value === t('macro.menu_1') || 
                actVal.value === t('macro.menu_2')) {
                ignoreNextMouseEvent.value = true;
                // 在下一个事件循环中重置标志
                setTimeout(() => {
                    ignoreNextMouseEvent.value = false;
                }, 200);
                return;
            }
        }
    }
    
    // 如果设置了忽略标志，则忽略此次事件
    if (ignoreNextMouseEvent.value) {
        return;
    }
    
    mouseCodeTable.value = MouseCodeMap[button];
    
    if (mouseCodeTable.value != undefined) {
        keyDelay.value = ComputeTimeDiff(keyDate.value);
        // 如果选择了鼠标选项，更新显示
        if (actVal.value === t('macro.menu_3')) {
            state.value.key = mouseCodeTable.value.key;
        }
    }

    // 录制中
    if (playing.value && mouseCodeTable.value != undefined && button != lastMouseButton.value) {
        keyDate.value = new Date();

        if (delayVal.value == t('macro.menu_4')) {
            delay.value = keyDelay.value;
        } else if (delayVal.value == t('macro.menu_5')) {
            delay.value = 30;
        } else if (delayVal.value == t('macro.menu_6')) {
            delay.value = delayFix.value;
        }

        if (state.value.macro != undefined && mouseCodeTable.value != undefined) {
            let index = state.value.macro.actions.length;
            index = index < 0 ? 0 : index

            if (delay.value > 0 && index > 0) {
                state.value.macro.actions[index - 1].delay = delay.value;
            }

            state.value.macro.insert(index, new Action(mouseCodeTable.value.hid, 0, ActionType.Down, KeyType.MouseKey));

            state.value.macro.refresh();
            elActionScrollbar.value.setScrollTop(50000);
            lastMouseButton.value = button;
        }
    }
};

const onMouseUp = (event: MouseEvent) => {
    if (state.value.nameEditorDisplay) return;

    // 在录制或选择“鼠标”选项时，阻止右键与侧键（避免系统/浏览器行为）
    const btn = event.button;
    if ((playing.value || actVal.value === t('macro.menu_3')) && (btn === 2 || btn === 3 || btn === 4)) {
        event.preventDefault();
        event.stopPropagation();
    }

    // 检查事件目标是否是按钮或其子元素，如果是则忽略（避免点击按钮时误捕获）
    const target = event.target as HTMLElement;
    if (target) {
        // 检查是否是任何可点击按钮或其子元素（包括插入、保存、清空、删除等按钮）
        const clickableButton = target.closest('.c-p') || target.closest('button') || target.closest('[role="button"]');
        if (clickableButton) {
            // 如果选择了鼠标选项，在点击按钮时暂时忽略鼠标事件
            if (actVal.value === t('macro.menu_3')) {
                return;
            }
        }
    }
    
    // 如果设置了忽略标志，则忽略此次事件
    if (ignoreNextMouseEvent.value) {
        return;
    }

    const button = event.button;
    mouseCodeTable.value = MouseCodeMap[button];

    if (mouseCodeTable.value != undefined) {
        keyDelay.value = ComputeTimeDiff(keyDate.value);
    }

    // 录制中
    if (playing.value) {
        if (delayVal.value == t('macro.menu_4')) {
            delay.value = keyDelay.value;
        } else if (delayVal.value == t('macro.menu_5')) {
            delay.value = 30;
        } else if (delayVal.value == t('macro.menu_6')) {
            delay.value = delayFix.value;
        }

        if (state.value.macro != undefined && mouseCodeTable.value != undefined) {
            let index = state.value.macro.actions.length;
            index = index < 0 ? 0 : index

            if (delay.value > 0 && index > 0) {
                state.value.macro.actions[index - 1].delay = delay.value;
            }

            if (mouseCodeTable.value != undefined) {
                state.value.macro.insert(index, new Action(mouseCodeTable.value.hid, 0, ActionType.Up, KeyType.MouseKey));
            }

            state.value.macro.refresh();
            elActionScrollbar.value.setScrollTop(50000);
        }
    }

    keyDate.value = new Date();
    lastMouseButton.value = -1;
};

// const handleOpen = (e: boolean, id: string) => {
//     if (e) {
//         let elaction = elAction.value as Array<DropdownInstance>;
//         var index: any;
//         for (index in elaction) {
//             if ((elaction[index] as DropdownInstance).id != id) {
//                 (elaction[index] as DropdownInstance).handleClose();
//             }
//         }

//         let els = elMacro.value as Array<DropdownInstance>;
//         var index: any;
//         for (index in els) {
//             if ((els[index] as DropdownInstance).id != id) {
//                 (els[index] as DropdownInstance).handleClose();
//             }
//         }
//     }
// };

const deleteAction = (obj: Action) => {
    isPlaying(() => {
        if (state.value.macro != undefined) state.value.macro.remove(obj);
    })
};

const upAction = (obj: Action) => {
    isPlaying(() => {
        if (state.value.macro != undefined) state.value.macro.removeUp(obj);
    })
};
const downAction = (obj: Action) => {
    isPlaying(() => {
        if (state.value.macro != undefined) state.value.macro.removeDown(obj);
    })
};
const deleteMacro = (obj: Macro) => {
    isPlaying(async () => {
        if (macros.value != undefined) {
            macros.value.remove(obj);
            if (macros.value.get().length > 0) {
                state.value.macro = macros.value.get()[0];
            } else {
                state.value.macro = undefined;
            }

            await saveMacro();
        }
    })
};

const clickMacro = (obj: Macro) => {
    isPlaying(() => {
        if (isDirty.value && state.value.macro?.index !== obj.index) {
            ElMessage({ type: 'warning', message: t('macro.title_12') });
        }
        state.value.macro = obj;
        repeat.value = state.value.macro.repeat;
        useMacro.resetSavedSnapshot(repeat.value);
    });
}

const renameMacro = (obj: Macro) => {
    isPlaying(() => {
        if (macros.value != undefined) {
            state.value.macro = obj;
            state.value.name = obj.name;
            state.value.nameEditorDisplay = true;
            isNew.value = false;
            //document.removeEventListener('keydown', onKeyDown, false);
            //document.removeEventListener('keyup', onKeyUp, false);
        }
    })
};

const newMacro = () => {
    isPlaying(() => {
        if (macros.value != undefined) {
            delayVal.value = t('macro.menu_4');
            state.value.macro = new Macro(`Macro ${macros.value.get().length + 1}`);
            state.value.name = state.value.macro.name;
            state.value.nameEditorDisplay = true;
            isNew.value = true;
            //document.removeEventListener('keydown', onKeyDown, false);
            //document.removeEventListener('keyup', onKeyUp, false);
        }
    })
};

const insert = () => {
    isPlaying(() => {
        if (state.value.macro != undefined) {
            let index = state.value.macro.actions.findIndex(obj => obj.index === actionVal.value?.index);

            if (state.value.eventVal == 2) {
                index = index < 0 ? state.value.macro.actions.length : index + 1;
            } else {
                index = index < 0 ? 0 : index;
            }

            if (actVal.value === t('macro.menu_1')) {
                if (keyCodeTable.value != undefined && keyCodeTable.value.hid != KeyDefineEnum.NONE) {
                    state.value.macro.insert(index, new Action(keyCodeTable.value.hid, 30, ActionType.Down, KeyType.NormalKey));
                    state.value.macro.insert(index + 1, new Action(keyCodeTable.value.hid, 30, ActionType.Up, KeyType.NormalKey));
                }
            }
            else if (actVal.value === t('macro.menu_3')) {
                if (mouseCodeTable.value != undefined && mouseCodeTable.value.hid != KeyDefineEnum.NONE) {
                    state.value.macro.insert(index, new Action(mouseCodeTable.value.hid, 30, ActionType.Down, KeyType.MouseKey));
                    state.value.macro.insert(index + 1, new Action(mouseCodeTable.value.hid, 30, ActionType.Up, KeyType.MouseKey));
                }
            }
            else if (delay.value > 0) {
                state.value.macro.insert(index, new Action(KeyDefineEnum.NONE, delay.value, ActionType.Delay));
            }
            state.value.macro.refresh();
            elActionScrollbar.value.setScrollTop(50000);
        }
    })
};

const isSelected = (obj: Macro): string => {
    return obj.index == state.value.macro?.index ? 'module_active' : '';
}

const saveMacro = async () => {
    isPlaying(async () => {
        if (macros.value != undefined && state.value.macro != undefined) {
            state.value.macro.repeat = repeat.value;
            storage.set(`${keyboard.keyboardDefine?.name}_macro`, macros.value);
            await useMacro.setMacroData();
            useMacro.resetSavedSnapshot(repeat.value);
            ElMessage({
                type: 'info',
                message: t("macro.title_6"),
            })
        }
    })
}

const loadMacro = async () => {
    await useMacro.getMacroData();
}

const delayChanged = () => {
    if (delayVal.value === t('macro.menu_6')) {
        delayFix.value = 30
    }
}

const beforeAvatarUpload: UploadProps['beforeUpload'] = (rawFile) => {
    console.log(rawFile)
    // if (rawFile.type !== 'application/json') {
    //     ElMessage.error('File format error')
    //     return false
    // }
    const reader = new FileReader();
    reader.onload = async (e) => {
        // 在这里可以处理文件内容，例如验证或转换
        useMacro.importProfile(e.target?.result)
        await saveMacro();
    };
    reader.readAsText(rawFile); // 读取文件内容为文本
    return false
}

const saveName = async () => {
    if (state.value.macro != undefined) {
        state.value.macro.name = state.value.name;
        if (macros.value != undefined && isNew.value) {
            macros.value.add(state.value.macro);
        }
        await saveMacro();
    }

    state.value.nameEditorDisplay = false;
}
</script>
