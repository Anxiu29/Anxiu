<template>
    <div ref="keyboardViewport" class="cb75-keyboard-viewport">
        <div class="cb75-keyboard-content">
            <div class="cb75-keyboard-frame" :style="keyboardFrameStyle">
            <div class="keybox bg d-flex flex-column" :class="{ 'cb75-light-keyboard': meunid === 3 }" :style="[bgBoxStyle, bgStyle]" style="position: relative; padding: 0; border-radius: 25px;"
                @contextmenu.prevent @mousedown="handleMouseDown"
                v-if="useLight.state.lightProps.light == LightEffectEnum.SelfDefine && meunid == 3">
                <div class="d-flex" v-for="line in useKey.state.keyMatrix as Array<KeyLine>" :class="[`${line.style}`]">
                    <div :i="key.index" class="item d-flex ai-center jc-center c-p p-r"
                        :class="[`d-flex p-2 pl-3 ${key.style}`, useKey.keyColor(key.keyData), useKey.isSelected(key.index)]"
                        :style="`${keyPositionStyle(line, key)}`"
                        v-for="key in (line as KeyLine).keys" @click="keyClick(key.index)">
                        <div :class="[`text-white-1`, keyTextColorClass(key.keyData)]"
                            :style="`z-index:1;word-wrap: break-word;overflow: hidden;text-align: center;${keyTextColorStyle(key.keyData)}`">
                            <span style="word-wrap: break-word;" v-html="getDisplayText(key.keyData)"
                                v-if="key.img == undefined || isKeyRemapped(key.keyData)"></span>
                            <span v-else v-html="key.img" class="d-flex"></span>
                        </div>
                    </div>
                    
                </div>
                <div :style="'width:' + mask_width + 'left:' + mask_left + 'height:' + mask_height + 'top:' + mask_top"
                        class="mask">
                    </div>
            </div>
            <div class="keybox bg d-flex flex-column" :class="{ 'cb75-light-keyboard': meunid === 3 }" :style="[bgBoxStyle, bgStyle]" style="position: relative; padding: 0; border-radius:  25px;" v-else>
                <div class="d-flex" v-for="line in useKey.state.keyMatrix as Array<KeyLine>" :class="[`${line.style}`]">
                    <el-tooltip effect="light" :disabled="true" :content="''" placement="top" popper-class="tip_font"
                        v-for="key in (line as KeyLine).keys" v-if="meunid == 1">
                        <el-dropdown :id="`key${key.index}`" trigger="contextmenu" ref="keyMapping"
                            @visible-change="handleOpen($event, `key${key.index}`)">
                            <div @click="keyClick(key.index)" class="d-flex ai-center jc-center c-p p-r"
                                :class="[`d-flex p-2 pl-3 ${key.style}`, useKey.keyColor(key.keyData), useKey.isSelected(key.index)]"
                                :style="`${keyPositionStyle(line, key)}`">
                                <div :class="[``, 'key-label', keyTextColorClass(key.keyData)]"
                                    :style="`z-index:1;word-wrap: break-word;overflow: hidden;text-align: center;${keyTextColorStyle(key.keyData)}`">
                                    <span style="word-wrap: break-word;" v-html="getDisplayText(key.keyData)"
                                        v-if="key.img == undefined || isKeyRemapped(key.keyData)"></span>
                                    <span v-else v-html="key.img" class="d-flex"></span>
                                </div>
                            </div>
                            <template #dropdown>
                                    <el-dropdown-menu style="padding: 0px;">
                                        <el-dropdown-item @click="keySetToDefault(key.index)" style="height: min-content;">
                                            {{ $t('key.menu_1') }}
                                        </el-dropdown-item>
                                        <el-dropdown-item @click="useKey.keySetMacro(key.index)" style="height: min-content;">
                                            {{ $t('key.menu_2') }}
                                        </el-dropdown-item>
                                        <el-dropdown-item @click="useKey.setCombineKey(key.index)" style="height: min-content;">
                                            {{ $t('key.menu_3') }}
                                        </el-dropdown-item>
                                        <el-dropdown-item @click="useKey.setMediaKey(key.index)" style="height: min-content;">
                                            {{ $t('key.menu_4') }}
                                        </el-dropdown-item>
                                        <el-dropdown-item @click="useKey.setShortcutKey(key.index)" style="height: min-content;">
                                            {{ $t('key.menu_5') }}
                                        </el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                        </el-dropdown>
                    </el-tooltip>
                    <div :i="key.index" class="item d-flex ai-center jc-center c-p p-r"
                        :class="[`d-flex p-2 pl-3 ${key.style}`, useKey.keyColor(key.keyData), useKey.isSelected(key.index)]"
                        :style="`${keyPositionStyle(line, key)}`"
                        v-for="key in line.keys" v-else @click="keyClick(key.index)">
                        <div :class="[`text-white-1`, 'key-label', keyTextColorClass(key.keyData)]"
                            :style="`z-index:1;word-wrap: break-word;overflow: hidden;text-align: center;${keyTextColorStyle(key.keyData)}`">
                            <span style="word-wrap: break-word;" v-html="getDisplayText(key.keyData)"
                                v-if="key.img == undefined || isKeyRemapped(key.keyData)"></span>
                            <span v-else v-html="key.img" class="d-flex"></span>
                        </div>
                    </div>
                    <div :style="'width:' + mask_width + 'left:' + mask_left + 'height:' + mask_height + 'top:' + mask_top"
                        class="mask">
                    </div>
                </div>
            </div>
            </div>
            <el-dialog v-model="useKey.state.macroDialogShow" top="18vh" width="680px"
                    style="--el-dialog-padding-primary:3px;">
                    <div class="d-flex flex-column" style="margin-top: 35px;">
                        <div class="d-flex flex-column flex-1 bg-white-1"
                            style="border-radius: 0px 0px 10px 10px;height: 100%;">
                            <div class="list flex-1 bg-warn-1">
                                <div style="height: 30vh">
                                    <el-scrollbar>
                                        <div :class="['p-1 c-p', useKey.isMacroSelected(macro)]"
                                            v-for=" macro in useKey.state.macros?.get()"
                                            @click="useKey.clickMacro(macro)">
                                            {{ macro.name }}
                                        </div>
                                    </el-scrollbar>
                                </div>
                            </div>
                            <div class="m-3">
                                <span class="mr-3">{{ $t('key.title_1') }}</span>
                                <el-select v-model="useKey.state.cycleType" placeholder="Select" style="width: 240px;">
                                    <el-option v-for="item in useKey.state.cycleTypes" :key="item.value"
                                        :label="$t(item.strKey)" :value="item.value" />
                                </el-select>
                            </div>
                            <div class="m-3">
                                <span class="mr-3">{{ $t('key.title_2') }}</span>
                                <el-input-number v-model="useKey.state.cycleCount" style="width: 150px" type="number" :min="1"/>
                            </div>
                            <div class="d-flex p-4 jc-center" style="border-radius: 0px 0px 10px 10px">
                                <div class="py-1 px-5 but-green text-white mx-3 c-p" @click="useKey.confirmSetMacro">
                                    {{ $t('key.but_3') }}
                                </div>
                            </div>
                        </div>
                    </div>
                </el-dialog>
                <el-dialog v-model="useKey.state.combineKeyDialogShow" top="20vh" width="480px"
                    style="--el-dialog-padding-primary:3px;" @opened="dialogOpened" @closed="dialogClosed" :close-on-press-escape="false" :close-on-click-modal="false">
                    <div class="d-flex flex-column ml-4">
                        <div class="m-3" id="input">
                            <span class="mr-3">Input</span>
                            <el-input style="width: 150px" v-model="useKey.state.keyStr" aria-placeholder="Please input"
                                :readonly="true" maxlength="1" />
                        </div>
                        <div class="d-flex m-3">
                            <el-checkbox v-model="useKey.state.shiftKey" label="Shift" />
                            <el-checkbox v-model="useKey.state.ctrlKey" label="Ctrl" />
                            <el-checkbox v-model="useKey.state.winKey" label="Win" />
                            <el-checkbox v-model="useKey.state.altKey" label="Alt" />
                        </div>
                        <div class="d-flex p-4 jc-center" style="border-radius: 0px 0px 10px 10px">
                            <div class="py-1 px-5 but-green text-white mx-3 c-p" @click="useKey.confirmSetCombineKey">
                                {{ $t('key.but_3') }}
                            </div>
                        </div>
                    </div>
                </el-dialog>
                <el-dialog v-model="useKey.state.mediaKeyDialogShow" top="24vh" width="380px"
                    style="--el-dialog-padding-primary:3px;" @opened="dialogOpened" @closed="dialogClosed" :close-on-press-escape="false" :close-on-click-modal="false">
                    <div class="d-flex flex-column ml-4">
                        <div class="m-3" id="input">
                            <el-select
                                v-model="useKey.state.mediaKey"
                                :placeholder="$t('key.select')"
                                size="large"
                                style="width: 240px"
                                >
                                <el-option class="fs-xxxl"
                                    v-for="item in useKey.state.mediaKeyOptions"
                                    :key="item.key"
                                    :label="$t(mediaStrKey(item.text))"
                                    :value="item.key"
                                />
                                </el-select>
                        </div>
                        <div class="d-flex p-4 " style="border-radius: 0px 0px 10px 10px">
                            <div class="py-1 px-5 but-green text-white mx-3 c-p" @click="useKey.confirmMediaKey(useKey.state.mediaKey)">
                                {{ $t('key.but_3') }}
                            </div>
                        </div>
                    </div>
                </el-dialog>
                <el-dialog v-model="useKey.state.shortcutsKeyDialogShow" top="24vh" width="380px"
                    style="--el-dialog-padding-primary:3px;" @opened="dialogOpened" @closed="dialogClosed" :close-on-press-escape="false" :close-on-click-modal="false">
                    <div class="d-flex flex-column ml-4">
                        <div class="m-3" id="input">
                            <el-select
                                v-model="useKey.state.shortcutsKey"
                                :placeholder="$t('key.select')"
                                size="large"
                                style="width: 240px"
                                >
                                <el-option class="fs-xxxl"
                                    v-for="item in useKey.state.shortcutsKeyOptions"
                                    :key="item.key"
                                    :label="$t(shortcutStrKey(item.text))"
                                    :value="item.key"
                                />
                                </el-select>
                        </div>
                        <div class="d-flex p-4 " style="border-radius: 0px 0px 10px 10px">
                            <div class="py-1 px-5 but-green text-white mx-3 c-p" @click="useKey.confirmShortcutKey(useKey.state.shortcutsKey)">
                                {{ $t('key.but_3') }}
                            </div>
                        </div>
                    </div>
                </el-dialog>
            <div class="d-flex jc-center mt-3" v-if="meunid == 1">
                <div class="py-1 px-3 but-red text-white c-p" @click="useKey.keySetToDefaultAll">
                    {{ $t('light.title_8') }}
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { useKeyStore } from "@/stores/rk_cb75/keyStore";
import { useMenuStore } from "@/stores/rk_cb75/menuStore";
import { uselightStore } from "@/stores/rk_cb75/lightStore";
import { ref, onMounted, onBeforeUnmount, reactive, computed } from 'vue';
import type { DropdownInstance } from 'element-plus'
import { storeToRefs } from "pinia";
import type { KeyState, KeyTableData } from "@/keyboard/beiying/interface";
import type { Key, KeyLine } from "@/keyboard/beiying/rk_cb75/interface";
import { LightEffectEnum, MatrixTable } from '@/keyboard/beiying/enum'
import { useMacroStore } from "@/stores/rk_cb75/macroStore";
import { keyboard } from "@/keyboard/beiying/keyboard";


const useMacro = useMacroStore();
const useMenu = useMenuStore();
const { meunid } = storeToRefs(useMenu);

const useKey = useKeyStore();
const useLight = uselightStore();

// 检查键位是否被重新映射
const isKeyRemapped = (keyData: KeyTableData | undefined): boolean => {
  if (!keyData) return false;
  return keyData.keyCode !== keyData.keyMappingData.keyRaw;
};

// RK's key coordinates use a 1050 × 380 box, while the copied photo is
// 1036 × 480. Render the photo at its own aspect ratio and convert only Y
// coordinates; this keeps key labels from being stretched.
const keyboardDesignWidth = 1050;
const keyboardDesignHeight = 380;
const keyboardPhotoHeight = keyboardDesignWidth * 480 / 1036;
const photoYScale = keyboardPhotoHeight / keyboardDesignHeight;

// 统一以设计尺寸为基准，通过容器 transform 同步缩放背景与按键
const keyboardViewport = ref<HTMLElement | null>(null);
const availableWidth = ref(1050);
const availableHeight = ref(Number.POSITIVE_INFINITY);
let viewportObserver: ResizeObserver | undefined;
let stageObserver: ResizeObserver | undefined;
// Keep keys usable on small screens. The remaining width scrolls inside the keyboard stage.
const displayScale = computed(() => Math.max(0.58, Math.min(
  1,
  (availableWidth.value - 16) / keyboardDesignWidth,
  (availableHeight.value - 68) / keyboardPhotoHeight,
)));
const keyboardFrameStyle = computed(() => ({
  width: `${keyboardDesignWidth * displayScale.value}px`,
  height: `${keyboardPhotoHeight * displayScale.value}px`,
}));
const bgBoxStyle = computed(() => {
  return {
    width: `${keyboardDesignWidth}px`,
    height: `${keyboardPhotoHeight}px`,
    '--cb75-row-height': `${27 * photoYScale}px`,
    '--cb75-key-height': `${45 * photoYScale}px`,
    transform: `scale(${displayScale.value})`,
    transformOrigin: 'top left'
  }
})

// 已移除按键的二次缩放，按键将跟随容器统一缩放



// 过滤HTML字符串，保留图片和字母，确保在同一水平线
const getDisplayText = (keyData: KeyTableData | undefined): string => {
  if (!keyData) return '';
  
  const text = useKey.keyText(keyData).toString();
  
  // 检查是否被重新映射了
  const isRemapped = keyData.keyCode !== keyData.keyMappingData.keyRaw;
  
  if (text && text.includes('<img')) {
    // 如果包含HTML标签，提取出所有的img标签和字母
    const imgMatches = text.match(/<img[^>]+>/g);
    const letterMatches = text.match(/>\s*\+\s*([A-Za-z0-9]+)/g);
    
    let result = '';
    if (imgMatches) {
      // 为每个图片添加样式，确保在同一水平线
      const styledImages = imgMatches.map(img => 
        img.replace('class="keyimg"', 'class="keyimg" style="vertical-align: middle; display: inline-block;"')
      );
      result += styledImages.join(' + ');
    }
    if (letterMatches) {
      // 提取字母部分，去掉 "> + " 前缀
      const letters = letterMatches.map(match => match.replace(/>\s*\+\s*/, ''));
      if (result) {
        result += ' + ' + letters.join('');
      } else {
        result += letters.join('');
      }
    }
    return result;
  }

  // 仅 Mac 层将 "Win + " 替换为 Command 图标；Win 层保持 Win 字符
  if (text && text.includes('Win + ') && useKey.keyMatrixTable === MatrixTable.MAC) {
    return text.replace(/Win \+ /g, '<img class="keyimg" src="/src/assets/images/mac/command.png" style="vertical-align: middle; display: inline-block;" /> + ');
  }
  
  return text;
};

const isMoving = ref(false);

const keyMapping = ref<any>(null);

const positionList = reactive({
    is_show_mask: false,
    box_screen_left: 0, // 盒子距离浏览器左侧的距离
    box_screen_top: 0, // 盒子距离浏览器顶部的距离
    start_x: 0,
    start_y: 0,
    end_x: 0,
    end_y: 0,
    is_selected: false
})

// Pointer positions are viewport pixels; the selection mask lives in scaled keyboard coordinates.
const mask_width = computed(() => (`${Math.abs(positionList.end_x - positionList.start_x) / displayScale.value}px;`))
const mask_height = computed(() => (`${Math.abs(positionList.end_y - positionList.start_y) / displayScale.value}px;`))
const mask_left = computed(() => (`${(Math.min(positionList.start_x, positionList.end_x) - positionList.box_screen_left) / displayScale.value}px;`))
const mask_top = computed(() => (`${(Math.min(positionList.start_y, positionList.end_y) - positionList.box_screen_top) / displayScale.value}px;`))

// 根据键盘语种获取背景图片
const getBackgroundImage = computed(() => {
  if (!keyboard.keyboardDefine?.name) {
    return 'keyboard_rk-cb75_null.png';
  }
  
  const name = keyboard.keyboardDefine.name;
  
  if (name.includes('JP')) {
    return 'keyboard_rk-cb75_jp_null.png';
  } else if (name.includes('UK')) {
    return 'keyboard_rk-cb75_uk_null.png';
  } else if (name.includes('DE')) {
    return 'keyboard_rk-cb75_uk_null.png';
  } else if (name.includes('FR')) {
    return 'keyboard_rk-cb75_uk_null.png';
  }else if (name.includes('RU')) {
    return 'keyboard_rk-cb75_null.png';
  }else if (name.includes('TH')) {
    return 'keyboard_rk-cb75_null.png';
  }else {
    return 'keyboard_rk-cb75_null.png';
  }
});

// 动态背景样式
const bgStyle = computed(() => {
  const imageName = getBackgroundImage.value;
  
  // 使用绝对路径，确保在浏览器中能正确访问
  const imagePath = `/src/assets/images/${imageName}`;
  
  return {
    backgroundImage: `url('${imagePath}')`
  };
});

const scale = ref(1);
// Keep RK's horizontal layout and row offsets in their original design space.
// The photo's Y ratio is applied when each key is positioned.
const offset_left = ref(20.6);
const rowPitchCorrection = 9.4;

onMounted(async () => {
    await useKey.init();
    await useLight.init();
    await useMacro.init();
    useKey.state.macros = useMacro.macros;



    if (keyboardViewport.value) {
        viewportObserver = new ResizeObserver(([entry]) => {
            availableWidth.value = entry.contentRect.width;
        });
        viewportObserver.observe(keyboardViewport.value);
        if (keyboardViewport.value.parentElement) {
            stageObserver = new ResizeObserver(([entry]) => {
                availableHeight.value = entry.contentRect.height;
            });
            stageObserver.observe(keyboardViewport.value.parentElement);
        }
    }

    useKey.refresh();
});

onBeforeUnmount(() => {
    viewportObserver?.disconnect();
    stageObserver?.disconnect();
    document.body.removeEventListener('mousemove', handleMouseMove);
    document.body.removeEventListener('mouseup', handleMouseUp);
    useKey.destroy();
    useLight.destroy()
});
const handleMouseDown = (event: any) => {
    // 0 左键 2 右键
    //console.log(event.button)    
    positionList.is_show_mask = true
    positionList.start_x = event.clientX
    positionList.start_y = event.clientY
    positionList.end_x = event.clientX
    positionList.end_y = event.clientY
    positionList.box_screen_left = document.querySelector('.keybox')?.getBoundingClientRect().left as number
    positionList.box_screen_top = document.querySelector('.keybox')?.getBoundingClientRect().top as number
    document.body.addEventListener('mousemove', handleMouseMove) // 监听鼠标移动事件
    document.body.addEventListener('mouseup', handleMouseUp) // 监听鼠标抬起事件
    isMoving.value = false
    positionList.is_selected = false;
}
const handleMouseMove = (event: any) => {
    isMoving.value = true
    useKey.unSelected()
    positionList.end_x = event.clientX
    positionList.end_y = event.clientY
}
const handleMouseUp = async ( event: any) => {
    document.body.removeEventListener('mousemove', handleMouseMove)
    document.body.removeEventListener('mouseup', handleMouseUp)
    positionList.is_show_mask = false
    await handleDomSelect()
    resSetXY()
    isMoving.value = false
}
const handleDomSelect = async () => {
    if (positionList.start_x == positionList.end_x && positionList.start_y == positionList.end_y) {
        return;
    }

    positionList.is_selected = true;
    const dom_mask = window.document.querySelector('.mask')
    const rect_select = dom_mask?.getClientRects()[0]
    document.querySelectorAll('.item').forEach((node, index) => {
        const rects = node.getClientRects()[0]
        if (collide(rects, rect_select) === true && isMoving.value) {
            const index = node.getAttribute('i')
            //keyClick(Number(i))\
            let i: any;
            for (i in useKey.state.keyState) {
                if ((useKey.state.keyState as Array<KeyState>)[i].index == Number(index)) {
                    (useKey.state.keyState as Array<KeyState>)[i].selected = true;
                    useLight.setSelectedKeyColor((useKey.state.keyState as Array<KeyState>)[i].index);
                }
            }
        }
    });

    await useLight.saveLedColorsToDevice();
}

const collide = (rect1: any, rect2: any) => {
    const maxX = Math.max(rect1.x + rect1.width, rect2.x + rect2.width)
    const maxY = Math.max(rect1.y + rect1.height, rect2.y + rect2.height)
    const minX = Math.min(rect1.x, rect2.x)
    const minY = Math.min(rect1.y, rect2.y)
    return maxX - minX <= rect1.width + rect2.width && maxY - minY <= rect1.height + rect2.height
}

const resSetXY = () => {
    positionList.start_x = 0
    positionList.start_y = 0
    positionList.end_x = 0
    positionList.end_y = 0
}

const keySetToDefault = (Index: number) => {
    useKey.keySetToDefault(Index);
    useKey.saveProfile();
}
const handleOpen = (e: boolean, id: string) => {
    if (e) {
        let els = keyMapping.value as Array<DropdownInstance>;
        var index: any;
        for (index in els) {
            if ((els[index] as DropdownInstance).id != id) {
                (els[index] as DropdownInstance).handleClose();
            }
        }
    }
};

const keyClick = async (index: number) => {
    if (positionList.is_selected) return;

    if (meunid.value == 1 || (meunid.value == 3 && useLight.state.lightProps.light == LightEffectEnum.SelfDefine)) {
        useKey.unSelected();
        await useKey.keyClick(index);
    }

    if (meunid.value == 3 && useLight.state.lightProps.light == LightEffectEnum.SelfDefine) {
        useLight.keyChanged(index);
        let key = (useKey.state.keyState[index] as KeyState);
        if (key.selected) {
            useLight.setSelectedKeyColor(key.index);
            await useLight.saveLedColorsToDevice();
        } else {
            useLight.SelfDefineDefault();
        }

        await useKey.saveProfile();
    }
}

const keyTextColorClass = (key: KeyTableData | undefined): string => {
    let color = '';
    switch (meunid.value) {
        case 1:
            color = useKey.keybgColor(key);
            break;
    }

    return color;
}

const keyPositionStyle = (line: KeyLine, key: Key): string => {
    let offset = 0;
    for (let i = 0; i <= key.position; i++) {
        offset += line.keys[i].offset;
    }
    let left = (offset * scale.value) + (key.position * offset_left.value);

    let offsetY = 0;
    for (let j = 0; j <= key.position; j++) {
        offsetY = line.keys[j].offsetY;
    }
    let top = ((offsetY * scale.value) + (line.line - 1) * rowPitchCorrection) * photoYScale;

    return `left: ${left}px;top: ${top}px;`
}

const keyTextColorStyle = (key: KeyTableData | undefined): string => {
    let color = '';
    switch (meunid.value) {
        case 3:
            if (key != undefined) {
                color = `position: relative;left: -99999px;filter: drop-shadow(${useLight.keyTextColor(key.index)} 99999px 0);color:rgb(0, 0, 0);`;
                if (useLight.state.lightProps.light == LightEffectEnum.SelfDefine)
                    color = `position: relative;left: -99999px;filter: drop-shadow(${useLight.keyTextColor(key.index)} 99999px 0);color: ${useLight.keyTextColor(key.index)};`;
            }
            break;
    }

    return color;
}

const dialogOpened = () => {
    document.addEventListener('keydown', useKey.onKeyDown);
}


const dialogClosed = () => {
    document.removeEventListener('keydown', useKey.onKeyDown);
}

const mediaStrKey = (key: String[] | undefined) => {
    if (key == undefined) return '';
    if (key.length > 0) {
        return `mediaKey.${key[0]}`
    }
    return ``
}

const shortcutStrKey = (key: String[] | undefined) => {
    if (key == undefined) return '';
    if (key.length > 0) {
        return `${key[0]}`
    }
    return ``
}
</script>
<style scoped lang="scss">
.cb75-keyboard-viewport {
    width: 100%;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 12px 8px;
    box-sizing: border-box;
}

.cb75-keyboard-content {
    width: max-content;
    min-width: 100%;
}

.cb75-keyboard-frame {
    position: relative;
    flex: none;
    margin-inline: auto;
    overflow: hidden;
    border-radius: 12px;
}

* {
    -webkit-user-select: none;
    /* Safari */
    -moz-user-select: none;
    /* Firefox */
    -ms-user-select: none;
    /* IE10+/Edge */
    user-select: none;
    /* Standard syntax */
}

.bg {
    display: inline-block;
    background-repeat: no-repeat;
    background-position: center center; /* 居中显示 */
    background-size: 100% 100%; /* 完全填充容器，与transform scale配合 */
    position: relative; /* 为绝对定位的按键提供参考 */
    border-radius: 8px; /* 添加圆角 */
    box-shadow: none;
    background-color: transparent;
    overflow: hidden; /* 防止缩放时内容溢出 */
    font-family: 'Arial, Helvetica,' sans-serif;
}

.mask {
    position: absolute;
    background: var(--cb75-accent, #45e6d0);
    opacity: 0.1;
    border: 1px dashed #000;
    pointer-events: none;
}

:deep(.el-dialog__body) {
    padding: 0px !important;
}
:deep(.el-dropdown) {
    line-height: 1.3 !important;
    position: static;
}

.key_remapped {
    color: #07072A;
}

.selected {
    background-color: var(--cb75-accent, #45e6d0) !important;
}

.key:hover {
    background: var(--cb75-accent-soft, rgba(69, 230, 208, 0.2));
}

.keybox > .d-flex {
    // The photographed key rows are spaced further apart than their hit areas.
    // Keep the original flow pitch while allowing each target to fill its cap.
    flex: 0 0 var(--cb75-row-height);
    height: var(--cb75-row-height);
    min-height: var(--cb75-row-height);
}

.key {
    --cb75-key-width: 35px;
    font-family: '思源黑体', sans-serif;
    font-size: 14px;
    font-weight: normal;
    width: calc(var(--cb75-key-width) + 18px);
    height: var(--cb75-key-height);
    flex: none;
    margin-left: -5.5px;
    margin-right: -5.5px;
    padding: 0;
    display: flex; /* 使用flex布局 */
    align-items: center; /* 垂直居中字符 */
    justify-content: center; /* 水平居中字符 */
    text-align: center; /* 文本居中 */
    background: #00000000;
    //background: rgba(0, 0, 0, 0.5);
    border-radius: 5px;

    img {
        width: 32px;
        height: 32px;
    }
}

.p-r {
    position: relative;
}

.key_enter {
    
    &::before {
        content: "";
        position: absolute;
        top: 0px;
        right: 0;
        bottom: -51px; /* 调整高度 */
        width: 48px; /* 调整宽度 */
        background: inherit;
        border-radius: 5px; /* 调整圆角 */
    }
}

.keyline_0 { top: 24px;}
.keyline_1 { top: 96px;}
.keyline_2 { top: 167px;}
.keyline_3 { top: 239px;}
.keyline_4 { top: 310px;}
.keyline_5 { top: 382px;}

.key_i_Backspace {
    --cb75-key-width: 96px;
}

.key_i_TAB {
    --cb75-key-width: 64px;
}

.key_i_CODE29 {
    --cb75-key-width: 64px;
}

.key_i_CAPSLOCK {
    --cb75-key-width: 80px;
}

.key_i_ENTER {
    --cb75-key-width: 106px;
}

.key_i_SHIFT_L {
    --cb75-key-width: 108px;
}

.key_i_SHIFT_R {
    --cb75-key-width: 79px;
}

.key_i_CTRL_L {
    --cb75-key-width: 50px;
}

.key_i_WIN_L {
    --cb75-key-width: 50px;
}

.key_i_ALT_L {
    --cb75-key-width: 50px;
}

.key_i_SPACEBAR {
    --cb75-key-width: 350px;
}

.key_enter {
    
    &::before {
        content: "";
        position: absolute;
        top: 0px;
        right: 0;
        bottom: -51px; /* 调整高度 */
        width: 48px; /* 调整宽度 */
        background: inherit;
        border-radius: 5px; /* 调整圆角 */
    }
}
</style>
