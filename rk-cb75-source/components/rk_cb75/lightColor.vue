<template>
    <div class="rk-light-color d-flex h-100">
        <div class="rk-light-color-card d-flex flex-column flex-1 mx-4 my-4" style="box-shadow: 0px 0px 24px 0px #E9EBF3;">
            <div class="bg-white p-2" style="border-radius: 10px 10px 0px 0px;line-height: 30px;">
                {{ $t('light.title_2') }}
            </div>
            <div class="rk-light-color-body d-flex flex-1">
                <div class="rk-light-color-slider-panel bg-box" style="border-radius: 0px 0px 0px 10px;">
                    <div class="rk-light-color-scroll w-100">
                        <el-scrollbar>
                            <div class="rk-light-slider-list d-flex flex-column jc-between">
                                <div class="rk-light-slider-row d-flex m-3"
                                    v-if="useLight.state.lightProps.light != LightEffectEnum.SelfDefine">
                                    <div class="rk-light-slider-column d-flex flex-column">
                                        <div>
                                            <el-slider class="rk-light-slider" :step="1" :max="20" :min="1"
                                                v-model="useLight.state.lightProps.brightness"
                                                @change="ligtChanged" />
                                        </div>
                                        <div class="d-flex jc-center">{{ $t('light.title_3') }}</div>
                                    </div>
                                    <div class="ml-4 mt-1">{{ useLight.state.lightProps.brightness }}</div>
                                </div>
                                <div class="rk-light-slider-row d-flex m-3" v-if="showSpeed">
                                    <div class="rk-light-slider-column d-flex flex-column">
                                        <div>
                                            <el-slider class="rk-light-slider" :step="1" :max="4" :min="1"
                                                v-model="useLight.state.lightProps.speed"
                                                @change="ligtChanged" />
                                        </div>
                                        <div class="d-flex jc-center">{{ $t('light.title_4') }}</div>
                                    </div>
                                    <div class="ml-4 mt-1">{{ useLight.state.lightProps.speed }}</div>
                                </div>
                                <div class="rk-light-slider-row d-flex m-3">
                                    <div class="rk-light-slider-column d-flex flex-column">
                                        <div>
                                            <el-slider class="rk-light-slider" :step="1" :max="30" :min="0"
                                                v-model="useLight.state.lightProps.sleep"
                                                @change="ligtChanged" />
                                        </div>
                                        <div class="d-flex jc-center">{{ $t('light.title_5') }}</div>
                                    </div>
                                    <div class="ml-4 mt-1" v-if="useLight.state.lightProps.sleep > 0">
                                        {{ useLight.state.lightProps.sleep }}min
                                    </div>
                                    <div class="ml-4 mt-1" v-else>{{ $t('light.title_6') }}</div>
                                </div>
                            </div>
                        </el-scrollbar>
                    </div>
                </div>
                <div class="rk-light-color-picker-panel bg-box flex-1" style="border-radius: 0px 0px 10px 0px;" v-if="![3, 15, 16, 17].includes(useLight.state.lightProps.light)">
                    <div class="rk-light-color-scroll w-100">
                        <el-scrollbar>
                            <div class="rk-light-picker-content d-flex flex-column ml-5">
                                <div class="d-flex ai-center">
                                    <div class="mr-4 mt-1 p-1 b-grey" style="border-radius: 5px;">
                                        <el-tag :color="`rgb(${useLight.rgb.r}, ${useLight.rgb.g}, ${useLight.rgb.b})`"
                                            style="border-width: 0px; border-radius: 5px;width: 42px;height: 42px;" />
                                    </div>
                                    <div v-if="useLight.state.lightProps.light != LightEffectEnum.SelfDefine">
                                        <el-checkbox v-model="useLight.state.lightProps.mixing"
                                            :label="$t('light.title_7')" size="large" @change="ligtChanged" />
                                    </div>
                                    <div v-else>
                                        <div class="py-1 px-3 but-red text-white c-p"
                                            @click="useLight.SelfDefineDefaultAll">
                                            {{ $t('light.title_8') }}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <Picker @onpick="onPicking" @picked="onPicked" :rgb="useLight.rgb" />
                                </div>
                            </div>
                        </el-scrollbar>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.rk-light-color,
.rk-light-color-card,
.rk-light-color-body {
    min-width: 0;
    min-height: 0;
}

.rk-light-color-slider-panel,
.rk-light-color-picker-panel {
    width: 50%;
    min-width: 0;
}

.rk-light-color-scroll {
    height: 100%;
    min-height: 0;
}

.rk-light-slider-list {
    padding-left: 4%;
}

.rk-light-slider-column {
    flex: 1;
    min-width: 0;
    max-width: 360px;
}

.rk-light-slider {
    width: 100%;
}

@media (max-width: 1300px) {
    .rk-light-color-body {
        flex-direction: column;
    }

    .rk-light-color-slider-panel,
    .rk-light-color-picker-panel {
        width: 100%;
        flex: none;
        min-height: 170px;
    }

    .rk-light-color-scroll {
        height: 180px;
    }

    .rk-light-picker-content {
        margin-left: 12px !important;
    }
}

@media (max-width: 900px) {
    .rk-light-color-card {
        margin: 12px !important;
    }

    .rk-light-color-scroll {
        height: auto;
        min-height: 180px;
    }

    .rk-light-slider-list {
        padding: 0 8px;
    }

    .rk-light-slider-row {
        margin: 10px !important;
    }
}
</style>
<script setup lang="ts">
import Picker from '../picker.vue'
import { uselightStore } from "@/stores/rk_cb75/lightStore";
import { LightEffectEnum } from '@/keyboard/beiying/enum'
import { useKeyStore } from "@/stores/rk_cb75/keyStore";
import { type KeyState } from '@/keyboard/beiying/interface'
import { computed } from "vue";

const useLight = uselightStore();
const useKey = useKeyStore();

const NO_SPEED_LIGHTS = new Set<number>([
    LightEffectEnum.FixedOn,
    LightEffectEnum.SelfDefine,
    LightEffectEnum.OFF,
]);

const showSpeed = computed(() => !NO_SPEED_LIGHTS.has(useLight.state.lightProps.light));

const onPicking = () => {
    if (useLight.state.lightProps.light == LightEffectEnum.SelfDefine) {
        let i: any;
        for (i in useKey.state.keyState) {
            if ((useKey.state.keyState as Array<KeyState>)[i].selected) {
                useLight.onPicking(useLight.rgb.r, useLight.rgb.g, useLight.rgb.b, Number((useKey.state.keyState as Array<KeyState>)[i].index));
            }
        }
    } else {
        useLight.onPicking(useLight.rgb.r, useLight.rgb.g, useLight.rgb.b, 0);
    }
}

const onPicked = async () => {
    await useLight.onPicked()
    useKey.saveProfile()
}

const ligtChanged = async () => {
    await useLight.ligtChanged();
    useKey.saveProfile()
}
</script>
<style scoped lang="scss"></style>
