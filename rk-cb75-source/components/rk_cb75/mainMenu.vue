<template>
    <div class="cb75-main-menu bg-grey d-flex flex-column jc-between h-100">
        <div class="cb75-menu-body d-flex flex-column flex-1">
            <div class="cb75-menu-stack d-flex flex-column h-100">
                <div class="p-3 bg-white-1 fw-b fs-xxl d-flex jc-between ai-center">
                    <span>{{ $t("key.title") }}</span>
            <div class="d-flex ai-center">
                <!-- 横向Win/Mac图标单选样式 -->
                <el-radio-group v-model="mode" class="mr-2" @change="onModeChange">
                    <el-tooltip
                        v-for="item in useKey.state.MatrixTable"
                        :key="item.value"
                        effect="light"
                        :content="$t(item.value === 0 ? 'Profile.switch_to_win' : 'Profile.switch_to_mac')"
                        placement="bottom"
                        popper-class="tip_font"
                        :disabled="item.value === mode">
                        <el-radio-button :value="item.value" :label="item.value">
                            <img :src="item.img" width="24" height="24" />
                        </el-radio-button>
                    </el-tooltip>
                </el-radio-group>
            </div>
                </div>
                <div class="cb75-profile-list">
                    <el-scrollbar>
                        <div v-for="item in (state.profileList as Array<Profile>)"
                            class="module_box d-flex p-3 my-2 text-grey-1 jc-between"
                            :class="{ 'module_active': item.index === useKey.profile?.index }">
                            <div style="padding-left: 16%;width: 100%" class="d-flex" @click="clickProfile(item)">
                                <div class="d-flex">
                                    <span class="pr-4 d-flex ai-center">
                                        <img src="../../assets/images/dot.png" />
                                    </span>
                                    <span>
                                        {{ getProfileDisplayName(item) }}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <el-dropdown>
                                    <el-icon :size="18" color="#ffffff">
                                        <MoreFilled />
                                    </el-icon>
                                    <template #dropdown>
                                        <el-dropdown-menu style="padding: 0px;">
                                            <!-- Mac配置文件(index=1)只能导出，不能重命名和删除 -->
                                            <el-dropdown-item @click="useKey.renameProfile(item)"
                                                v-if="!item.isDefault && item.index !== 1">
                                                <img src="../../assets/images/title/edit.png" class="img-title" />
                                                {{ $t("key.but_4") }}
                                            </el-dropdown-item>
                                            <el-dropdown-item @click="useKey.deleteProfile(item)"
                                                v-if="!item.isDefault && item.index !== 1">
                                                <img src="../../assets/images/title/del.png" class="img-title" />
                                                {{ $t("key.but_5") }}
                                            </el-dropdown-item>
                                            <el-dropdown-item @click="useKey.exportProfile(item)">
                                                <img src="../../assets/images/title/export.png" class="img-title" />
                                                {{ $t("key.but_6") }}
                                            </el-dropdown-item>
                                        </el-dropdown-menu>
                                    </template>
                                </el-dropdown>
                            </div>
                        </div>
                    </el-scrollbar>
                </div>
            </div>
            <el-dialog v-model="useKey.state.nameEditorDisplay" top="30vh" width="680px" :lock-scroll="true"
                :before-close="useKey.handleEditClose">
                <div class="d-flex ai-center">
                    <el-input v-model="useKey.state.name" placeholder="Please input" maxlength="10" />
                </div>
                <div class="d-flex jc-end">
                    <div class="py-1 px-4 but-green text-white c-p mt-4" @click="useKey.renameSaveProfile">
                        {{ $t('macro.but_7') }}
                    </div>
                </div>
            </el-dialog>
        </div>
        <div class="bg-white" style="height: 46px;">
            <div class="d-flex jc-center text-white">
                <div class="d-flex py-1 m-2 px-3 but-blue c-p" @click="useKey.newProfile()">
                    <img src="../../assets/images/title/new.png" class="img-but" />{{ $t("key.but_1") }}
                </div>
                <div class="d-flex py-1 m-2 px-3 but-green c-p">
                    <el-upload :before-upload="beforeAvatarUpload" :show-file-list="false">
                        <img src="../../assets/images/title/import.png" class="img-but" />
                        {{ $t("key.but_2") }}
                    </el-upload>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { useKeyStore } from "@/stores/rk_cb75/keyStore";
import type { UploadProps } from 'element-plus'
import { uselightStore } from "@/stores/rk_cb75/lightStore";
import { Profile } from '@/keyboard/beiying/rk_cb75/profiles';
import { storeToRefs } from "pinia";
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const useKey = useKeyStore();
const useLight = uselightStore();

const { t } = useI18n();
const { state } = storeToRefs(useKey);

// 获取配置文件显示名称（支持国际化）
const getProfileDisplayName = (item: Profile): string => {
    if (item.isDefault) {
        return t("Profile.default_win");
    } else if (item.index === 1) {
        // Mac配置文件使用国际化
        return t("Profile.default_mac");
    } else {
        return item.name;
    }
};


// 与旧样式一致：使用图标单选按钮，0=Win, 1=Mac
const mode = computed<number | null>({
    get: () => {
        if (useKey.profile?.index === 0) return 0; // Windows 默认配置
        if (useKey.profile?.index === 1) return 1; // Mac 配置
        return null; // 用户自定义配置文件时，不选中任何图标
    },
    set: (_val: number | null) => {}
});

const onModeChange = async (val: number) => {
    if (val === 1) {
        const macProfile = (state.value.profileList as Array<Profile>).find(p => p.index === 1);
        if (macProfile) await clickProfile(macProfile);
    } else {
        const winProfile = (state.value.profileList as Array<Profile>).find(p => p.index === 0);
        if (winProfile) await clickProfile(winProfile);
    }
};

const clickProfile = async (obj: Profile) => {
    await useKey.clickProfile(obj)
    await useLight.refresh()
    await useLight.saveBoardProfileToDevice()
}

const beforeAvatarUpload: UploadProps['beforeUpload'] = (rawFile) => {
    console.log(rawFile)
    const reader = new FileReader();
    reader.onload = (e) => {
        useKey.importProfile(e.target?.result)
    };
    reader.readAsText(rawFile);
    return false
}
</script>
<style scoped lang="scss">
.cb75-main-menu, .cb75-menu-body, .cb75-menu-stack { min-height: 0; min-width: 0; }
.cb75-profile-list { flex: 1; min-height: 0; overflow: hidden; }
.cb75-profile-list :deep(.el-scrollbar) { height: 100%; }
.cb75-main-menu > .bg-white { flex: none; min-height: 46px; height: auto !important; }
.cb75-main-menu > .bg-white > div { flex-wrap: wrap; }
.module_box { min-width: 0; }
.module_box > div:first-child { min-width: 0; }
.module_box > div:first-child span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 900px) {
  .cb75-main-menu { height: 235px; }
  .cb75-menu-stack > .p-3 { padding: 9px 14px !important; }
  .module_box { margin-block: 2px !important; padding: 7px 10px !important; }
}
:deep(.el-radio-button__inner) {
  padding: 4px 8px;
}

:deep(.is-active) {
  img {
    position: relative;
    left: -99999px;
    filter: drop-shadow(#ffffff 99999px 0);
  }
}

:deep(.el-radio-group) {
  display: flex;
  flex-direction: row;
}
</style>
