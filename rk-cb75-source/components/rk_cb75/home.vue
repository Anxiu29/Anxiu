<template>
    <div class="cb75-shell d-flex h-100" v-loading="loading" :element-loading-text="$t('home.title_1')"
        element-loading-background="rgba(0, 0, 0, 0.7)">
        <div class="cb75-rail">
            <Meun />
        </div>
        <div class="cb75-page-area flex-1">
            <RK_CB75_Page v-if="meunid > 0" />
            <div v-else class="cb75-home d-flex flex-column jc-center ai-center">
                <!-- <div class="d-flex flex-column jc-center ai-center" v-if="!isKeyboardConnect()">
                    <div class="p-5 fs-big m-5 mb-4">No keyboard connected to dongle</div>
                    <div class="bg-dark text-white py-3 px-5 mx-4 c-p mt-4" style="border-radius: 10px;height: 24px;"
                        @click="disconnect"> {{ $t("home.but_4") }}</div>
                </div> -->
                <div class="cb75-home-inner d-flex flex-column jc-center ai-center">
                    <div class="cb75-home-title text-black my-4">
                       CB75 Keyboard
                    </div>
                    <div class="cb75-home-visual my-4 c-p" @click="setMeunid();">
                        <el-tooltip effect="light" :content="$t('home.title_tip')" placement="top"
                            popper-class="tip_font2">
                            <img :src="`../../src/assets/images/${keyboard.keyboardDefine?.image}`" :alt="keyboard.keyboardDefine?.name || 'CB75 Keyboard'" />
                        </el-tooltip>
                    </div>
                    <div class="d-flex my-4">
                        <!-- <div class="but-red text-white py-3 px-5 mx-4 c-p" style="border-radius: 10px;" @click="setMeunid();">
            {{ $t("home.but_3") }}
          </div> -->
                        <div class="bg-dark text-white py-3 px-5 mx-4 c-p" style="border-radius: 10px;"
                            @click="disconnect"> {{
                                $t("home.but_2") }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useMenuStore } from "@/stores/rk_cb75/menuStore";
import { keyboard } from '@/keyboard/beiying/keyboard'
import RK_CB75_Page from '@/components/rk_cb75/index.vue'
import { RK_CB75, RK_CB75_EVENT_DEFINE } from "@/keyboard/beiying/rk_cb75/rk_cb75";
import Meun from "@/components/rk_cb75/menu.vue";
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from "pinia";

const useMenu = useMenuStore();
const { meunid } = storeToRefs(useMenu);

const loading = ref(false)

const setMeunid = () => {
    useMenu.setMeunid(1);
    if (keyboard != undefined && keyboard.keyboardDefine != undefined) {
        useMenu.setName(keyboard.keyboardDefine.name.valueOf())
    }
};

onMounted(async () => {
    console.log("meunid:" + meunid.value)
    rk_cb75.value = keyboard.protocol as RK_CB75;
    rk_cb75.value.addEventListener(RK_CB75_EVENT_DEFINE.OnReportStart, reportStart, false);
    rk_cb75.value.addEventListener(RK_CB75_EVENT_DEFINE.OnReportFinish, reportFinish, false);
});

onBeforeUnmount(() => {
    if (rk_cb75.value != undefined) {
        rk_cb75.value.removeEventListener(RK_CB75_EVENT_DEFINE.OnReportFinish, reportFinish, false);
        rk_cb75.value.removeEventListener(RK_CB75_EVENT_DEFINE.OnReportStart, reportStart, false);
    }
});

const rk_cb75 = ref<RK_CB75>();

const reportStart = async (event: any) => {
    if (event != undefined && event.detail != undefined) {
        loading.value = true
    }
};

const reportFinish = async (event: any) => {
    if (event != undefined && event.detail != undefined) {
        if (event.detail == 'finish') {
            loading.value = false
        }
        if (event.detail == 'timeout') {
            loading.value = false;
        }
    }
};

const disconnect = () => {
    useMenu.nameInit();
    keyboard.close();
};
</script>
<style scoped>
.cb75-shell { min-width: 0; min-height: 0; overflow: hidden; }
.cb75-rail { flex: 0 0 70px; min-width: 0; }
.cb75-page-area { min-width: 0; min-height: 0; }
.cb75-home { min-height: 100%; padding: 24px; box-sizing: border-box; overflow: auto; }
.cb75-home-inner { width: 100%; min-width: 0; }
.cb75-home-title { max-width: 100%; font-size: clamp(32px, 6vw, 76px); font-weight: 750; line-height: 1.1; text-align: center; overflow-wrap: anywhere; }
.cb75-home-visual { max-width: 100%; }
.cb75-home-visual img { display: block; width: min(100%, 900px); max-height: min(48vh, 450px); object-fit: contain; }
@media (max-width: 900px) {
  .cb75-shell { flex-direction: column; overflow: visible; min-height: 100%; height: auto; }
  .cb75-rail { flex: none; height: 64px; width: 100%; }
  .cb75-page-area { flex: 1; overflow: visible; }
  .cb75-home { min-height: calc(100dvh - 146px); padding: 20px 12px; }
  .cb75-home-visual img { max-height: 42vh; }
}
</style>
