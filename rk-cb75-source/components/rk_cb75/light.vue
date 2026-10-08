<template>
    <div class="rk-light-page">
        <aside class="rk-light-sidebar bg-grey d-flex flex-column">
            <div class="p-3 bg-white-1 fw-b fs-xxl">{{ $t('light.title') }}</div>
            <div class="rk-light-effects">
                <el-scrollbar>
                    <div style="padding-left: 16%" v-for="item in useLight.state.lightEffects"
                        class="module_box d-flex p-3 my-2 text-grey-1 jc-between"
                        :class="[useLight.selectd(item.light)]" @click="onLightClick(item.light)">
                        <div class="d-flex">
                            <span class="pr-4 d-flex ai-center">
                                <img src="../../assets/images/dot.png" />
                            </span>
                            <span>{{ $t(item.label) }}</span>
                        </div>
                    </div>
                </el-scrollbar>
            </div>
        </aside>
        <div class="rk-light-editor d-flex flex-column">
            <div class="rk-light-key-stage d-flex jc-center ai-center flex-1">
                <Key />
            </div>
            <div class="rk-light-controls" v-if="useLight.state.lightProps.light !== LightEffectEnum.OFF">
                <LightColor />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Key from "./key.vue";
import LightColor from "./lightColor.vue";
import { uselightStore } from "@/stores/rk_cb75/lightStore";
import { useKeyStore } from "@/stores/rk_cb75/keyStore";
import { LightEffectEnum } from "@/keyboard/beiying/enum";
import { onMounted } from "vue";

const useKey = useKeyStore();
const useLight = uselightStore();

onMounted(async () => {
    await useLight.init();
    await useKey.getKeyMatrixNomal()
});

const onLightClick = async (light: any) => {
    useLight.state.lightProps.light = light;
    await useLight.lightClick(light);
    useKey.saveProfile();
    useKey.unSelected();
}
</script>

<style scoped>
.rk-light-page {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    overflow: hidden;
}

.rk-light-sidebar {
    width: 240px;
    min-width: 210px;
    flex: none;
    min-height: 0;
}

.rk-light-effects {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.rk-light-editor {
    flex: 1;
    min-width: 0;
    min-height: 0;
}

.rk-light-key-stage {
    min-width: 0;
    min-height: 0;
    overflow: auto;
}

.rk-light-controls {
    height: clamp(220px, 35vh, 320px);
    min-width: 0;
    flex: none;
    overflow: auto;
}

@media (max-width: 900px) {
    .rk-light-page {
        display: block;
        overflow-x: hidden;
        overflow-y: auto;
    }

    .rk-light-sidebar {
        width: 100%;
        min-width: 0;
        height: 180px;
    }

    .rk-light-editor {
        height: auto;
    }

    .rk-light-key-stage {
        height: 260px;
        flex: none !important;
    }

    .rk-light-controls {
        height: auto;
        overflow: visible;
    }
}
</style>
