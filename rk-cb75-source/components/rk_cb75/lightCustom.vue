<template>
    <div style="min-width: 210px;width: 240px;">
        <div class="bg-grey d-flex flex-column jc-between h-100">
            <div class="d-flex flex-column flex-1">
                <div class="d-flex flex-column h-100">
                    <div class="p-3 bg-white-1 fw-b fs-xxl">{{ $t('light.title') }}</div>
                    <div style="height: 78vh">
                        <el-scrollbar>
                            <div style="padding-left: 16%" v-for="item in useLight.state.lightEffects"
                                class="module_box d-flex p-3 my-2 text-grey-1 jc-between"
                                :class="[useLight.selectd(item.light)]" @click="useLight.lightClick(item.light)">
                                <div class="d-flex">
                                    <span class="pr-4 d-flex ai-center">
                                        <img src="../../assets/images/dot.png" />
                                    </span>
                                    <span>
                                        {{ item.label }}
                                    </span>
                                </div>
                            </div>
                        </el-scrollbar>
                    </div>
                    <!-- <div class="flex-1">
                        <div class="d-flex flex-column h-100">
                            <div class="bg-white-1 p-2" style="height: 24px; border-radius: 5px 5px 0px 0px">
                                {{ $t('light.title_1') }}
                            </div>
                            <div class="bg-white flex-1" style="border-radius: 0px 0px 5px 5px">
                                <div style="height: 40vh">
                                    <el-scrollbar>
                                        <div class="d-flex flex-wrap bg-white p-1 jc-between">
                                            <div :class="[`c-p d-flex jc-center p-1 m-1 bg-grey br-1 b-grey`, useLight.selectdCustom(item.light)]"
                                                v-for="item in useLight.state.lightEffects"
                                                @click="useLight.lightClick(item.light)"
                                                style="width: 95px;overflow: hidden;">
                                                {{ item.label }}
                                            </div>
                                        </div>
                                    </el-scrollbar>
                                </div>
                            </div>
                        </div>
                    </div> -->
                </div>
            </div>
        </div>
    </div>
    <div class="flex-1">
        <div class="d-flex flex-column h-100">
            <div class="d-flex jc-center ai-center flex-1">
                <Key />
            </div>
            <div style="height: 320px;overflow: hidden;">
                <LightColor />
            </div>
        </div>
    </div>
</template>
<style scoped lang="scss">
.active {
    color: #4743A7 !important;
    background-color: #F0F0FC !important;
}
</style>

<script setup lang="ts">
import Key from "./key.vue";
import LightColor from "./lightColor.vue";
import { uselightStore } from "@/stores/rk_cb75/lightStore";
import { useKeyStore } from "@/stores/rk_cb75/keyStore";
import { onMounted, onBeforeUnmount } from "vue";

const useKey = useKeyStore();
const useLight = uselightStore();

onMounted(async () => {
    await useKey.init();
    await useKey.getKeyMatrixNomal()
    await useLight.init();
});

onBeforeUnmount(() => {
    useKey.destroy();
    useLight.destroy();
});

</script>