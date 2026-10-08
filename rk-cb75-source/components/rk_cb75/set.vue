<template>
    <div class="cb75-settings-page d-flex jc-center w-100">
        <div class="cb75-settings-card d-flex flex-column ml-4 my-4">
            <div class="bg-white p-2" style="border-radius: 10px 10px 0px 0px;line-height: 30px;">
                {{ $t("set.title") }}
            </div>
            <div class="bg-white-1" style="border-radius: 0px 0px 10px 10px;">
                <div class="m-5" style="border-bottom: 1px solid #E7EAF2;">
                    <div class="m-4">{{ $t("set.lang") }}</div>
                    <div class="m-4">
                        <el-select v-model="locale" placeholder="Select" style="width: 100%;"
                            @change="useLocale.setLocale(locale)">
                            <el-option v-for="item in langList" :key="item.value" :label="item.label"
                                :value="item.value" />
                        </el-select>
                    </div>
                    <div class="mb-5"></div>
                </div>
                <div class="m-5">
                    <!-- <div class="m-4">
                        <el-checkbox v-model="isLayer" :label="$t('set.layer_1')" style="width: 100%;"
                            @change="LayerChanged">
                            {{ $t('set.layer_1') }}
                        </el-checkbox>
                    </div>
                    <div class="m-4 px-3" v-if="isLayer">
                        <el-slider style="width: 360px" v-model="layer" :min="1" :max="127"
                            @change="setLayer" />
                    </div> -->
                    <div class="m-4 d-flex flex-column">
                        <div class="py-3 my-3 w-100 bg-warn-1 text-grey-1 text-center br-2 b-grey c-p but"
                            @click="local = true">
                            {{ $t("set.but_1") }}
                        </div>
                        <div class="py-3 my-3 w-100 bg-warn-1 text-grey-1 text-center br-2 b-grey c-p but"
                            @click="reSet = true">
                            {{ $t("set.but_2") }}
                        </div>
                    </div>
                    <div class="mb-1"></div>
                    <el-dialog v-model="reSet" :title="$t('set.but_2')">
                        <span>{{ $t("set.title_1") }}</span>
                        <template #footer>
                            <div class="d-flex jc-center">
                                <el-button @click="setToFactory()">{{ $t("set.but_5") }}</el-button>
                                <el-button type="primary" @click="reSet = false">{{ $t("set.but_6") }}</el-button>
                            </div>
                        </template>
                    </el-dialog>
                    <el-dialog v-model="local" :title="$t('set.but_1')">
                        <span>{{ $t("set.title_7") }}</span>
                        <template #footer>
                            <div class="d-flex jc-center">
                                <el-button @click="clearLocalData()">{{ $t("set.but_5") }}</el-button>
                                <el-button type="primary" @click="local = false">{{ $t("set.but_6") }}</el-button>
                            </div>
                        </template>
                    </el-dialog>
                </div>
                <!-- <div class="m-5 d-flex ai-center flex-column">
                    <div class="m-4">{{ $t("set.mode_title") }}</div>
                    <div>
                        <el-slider style="width: 360px" v-model="mode" :min="0" :max="3" :step="3"
                            :format-tooltip="formatModeValue" @change="DebounceChanged" />
                    </div>
                    <div class="m-4">{{ $t(modeStr) }}</div>
                </div> -->
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { uselightStore } from "@/stores/rk_cb75/lightStore";
import { useSetStore } from "@/stores/setStore";
import { useKeyStore } from "@/stores/rk_cb75/keyStore";
import { useMacroStore } from "@/stores/rk_cb75/macroStore";
import { useLocaleStore } from "@/stores/locale";
import { storeToRefs } from "pinia";
import { storage } from '@/common/storage';
import { useI18n } from 'vue-i18n';
import { ConnectionType } from '@/device/enum';

// 解构出t方法
const { t } = useI18n();
const useLight = uselightStore();
const useLocale = useLocaleStore();
const { locale } = storeToRefs(useLocale);
const setStore = useSetStore();
const { langList } = storeToRefs(setStore);
const useKey = useKeyStore();
const useMacro = useMacroStore();

const reSet = ref(false);
const mode = ref(0);
const isLayer = ref(false);
const layer = ref(0);
const local = ref(false);

const modeStr = computed(() => (mode.value >= 2 ? "set.mode_work" : "set.mode_game"))
const isDown = computed(() => (useLight.connectType == ConnectionType.USB))

const formatModeValue = (val: number) => {
    if (val >= 2)
        return t("set.mode_work");
    else
        return t("set.mode_game");
}
onMounted(async () => {
    await useLight.init();
    isLayer.value = (useLight.state.layer & 0x01) > 0;
    layer.value = useLight.state.layer >> 1 || 5;
    mode.value = useLight.state.debounce;
});

onBeforeUnmount(() => {
    useLight.destroy();
});

const LayerChanged = () => {
    if (!isLayer.value) {
        useLight.setLayer(0)
    } else {
        useLight.setLayer(layer.value || 5)
    }
    useKey.saveProfile();
}

const setLayer = () => {
    useLight.setLayer(layer.value);
    useKey.saveProfile();
}

const DebounceChanged = () => {
    useLight.DebounceChanged(mode.value);
    useKey.saveProfile();
}

const setToFactory = () => {
    useKey.setToFactory();
    reSet.value = false;
    useMacro.clearMacro();
}

const clearLocalData = () => {
    storage.clear();
    local.value = false;
    window.location.reload();
}
</script>
<style scoped>
.cb75-settings-page { min-width: 0; min-height: 100%; overflow: auto; padding: 20px; box-sizing: border-box; }
.cb75-settings-card { width: min(640px, 100%); min-width: 0; margin: 0 !important; }
@media (max-width: 700px) {
  .cb75-settings-page { padding: 12px; }
  .cb75-settings-card .m-5 { margin: 12px !important; }
  .cb75-settings-card .m-4 { margin: 8px !important; }
}
</style>
<style lang="scss" scoped>
:deep(.el-checkbox) {
    width: 100%;
    --el-checkbox-checked-text-color: #4743A7;
    --el-checkbox-text-color: #4743A7;
    --el-checkbox-checked-bg-color: #4743A7;
    --el-checkbox-checked-input-border-color: #ffffff;
    --el-checkbox-input-border-color-hover: #ffffff;
    --el-checkbox-checked-icon-color: transparent;
}

:deep(.el-checkbox__inner) {
    background-color: transparent;
    width: 18px;
    height: 18px;
}

.but:hover {
    background-color: #4743A7;
    color: #ffffff
}
</style>
