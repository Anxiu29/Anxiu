<template>
  <div class="cb75-menu d-flex flex-column bg-white jc-between ai-center h-100">
    <div class="cb75-menu-main d-flex flex-column">
      <el-tooltip effect="light" :content="$t('home.menu')" placement="right" popper-class="tip_font2">
        <div class="box p-4" role="button" tabindex="0" :aria-label="$t('home.menu')" @click="home" @keydown.enter="home" @keydown.space.prevent="home" :class="{ active: 0 === meunid }">
          <img src="@/assets/images/menu/home.png" />
        </div>
      </el-tooltip>
      <el-tooltip v-for="item in menuList" :key="item.id" effect="light" :content="$t(item.title)" placement="right" popper-class="tip_font2">
        <div class="box p-4" role="button" tabindex="0" :aria-label="$t(item.title)" :class="{ active: item.id === meunid }" @click="onMenuClick(item.id)" @keydown.enter="onMenuClick(item.id)" @keydown.space.prevent="onMenuClick(item.id)">
          <img :src="item.src" />
        </div>
      </el-tooltip>
    </div>
    <div>
      <el-tooltip effect="light" :content="$t('home.menu_5')" placement="right" popper-class="tip_font2">
        <div class="box p-4" role="button" tabindex="0" :aria-label="$t('home.menu_5')" :class="{ active: 5 === meunid }" @click="onMenuClick(5)" @keydown.enter="onMenuClick(5)" @keydown.space.prevent="onMenuClick(5)">
          <img src="@/assets/images/menu/exit.png" />
        </div>
      </el-tooltip>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useMenuStore } from "@/stores/rk_cb75/menuStore";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useKeyStore } from "@/stores/rk_cb75/keyStore";
import { uselightStore } from "@/stores/rk_cb75/lightStore";
import { useMacroStore } from "@/stores/rk_cb75/macroStore";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const useKey = useKeyStore();
const useMenu = useMenuStore();
const useLight = uselightStore();
const useMacro = useMacroStore();
const { meunid, menuList } = storeToRefs(useMenu);

onMounted(() => {
  useMenu.setMeunid(meunid.value);
});

const warnUnsavedMacro = (nextId: number) => {
  if (meunid.value === 2 && nextId !== 2 && useMacro.isDirty) {
    ElMessage({ type: "warning", message: t("macro.title_12") });
  }
};

const onMenuClick = async (id: any) => {
  warnUnsavedMacro(id);
  useKey.unSelected();
  useKey.unSelectFunc();
  useMenu.setMeunid(id)
  if (id == 3) {
    await useLight.saveBoardProfileToDevice();
  }
}

const home = () => {
  warnUnsavedMacro(0);
  useMenu.nameInit();
  useMenu.setMeunid(0);
};
</script>
<style scoped lang="scss">
.box {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 3px solid transparent;
  border-radius: 6px;

  img {
    width: 32px;
    display: block;
  }

  &.active {
    color: var(--cb75-accent, #45e6d0) !important;
    border-left-color: var(--cb75-accent, #45e6d0);
    background: var(--cb75-accent-soft, #173a39);
  }
}
@media (max-width: 900px) {
  .cb75-menu { flex-direction: row; width: 100%; height: 64px; overflow-x: auto; overflow-y: hidden; }
  .cb75-menu-main { flex-direction: row; }
  .box { flex: none; padding: 15px !important; }
  .box img { width: 26px; height: 26px; object-fit: contain; }
  .box.active { border-left-color: transparent; border-bottom: 3px solid var(--cb75-accent, #45e6d0); }
}
@media (max-width: 440px) {
  .box { padding: 9px !important; }
  .box img { width: 24px; height: 24px; }
}
</style>
