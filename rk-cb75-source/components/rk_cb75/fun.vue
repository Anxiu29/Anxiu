<template>
  <div class="cb75-function-browser d-flex w-100">
    <div class="cb75-function-menu bg-grey">
      <div class="cb75-function-menu-scroll">
        <el-scrollbar>
          <div :class="[{ 'bg-white-1': item.id === useKey.state.funid }, `${item.style}`]"
            class="mx-4 br-2 my-2 text-center p-2 c-p" v-for="item in useKey.state.funMenuList"
            @click="useKey.setFunid(item.id)">
            {{ $t(item.title) }}
          </div>
        </el-scrollbar>
      </div>
    </div>
    <div class="cb75-function-content flex-1 ml-3">
      <div class="bg-white w-100 h-100">
        <div class="cb75-function-results">
          <el-scrollbar>
            <div class="d-flex flex-wrap" v-if="useKey.state.funid == 3">
              <div :class="['d-flex c-p ai-center jc-center p-3 m-1 bg-grey br-1', useKey.isMacroSelected(macro)]"
                v-for="macro in useKey.state.macros?.get()" @click="clickMacro(macro)" style="min-width: 24px;">
                {{ macro.name }}
              </div>
            </div>
            <div :class="['d-flex flex-wrap', `${line.style}`]" v-for="line in useKey.state.keyFunList" v-else>
              <el-tooltip v-if="line.id == useKey.state.funid" v-for="item in line.keys" effect="light"
                :disabled="item.tip == ''" :content="itemTipText(item)" placement="bottom" popper-class="tip_font">
                <div :class="[`c-p d-flex ai-center jc-center p-2 m-1 bg-grey br-1`, useKey.isFunSelected(item.key)]"
                  @click="useKey.mapping(item.key, item.type)"
                  style="min-width: 36px;min-height: 32px;font-size: 14px;">
                  <span style="word-wrap: break-word;filter: drop-shadow(#6a6a77 99999px 0);position: relative;left: -99999px;color:#6a6a77" v-html="itemText(item)"></span>
                </div>
              </el-tooltip>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useKeyStore } from "@/stores/rk_cb75/keyStore";
import { onMounted, onBeforeUnmount } from 'vue';
import { Macro } from '@/keyboard/beiying/rk_cb75/macros';
import { useI18n } from "vue-i18n";
import { MatrixTable } from "@/keyboard/beiying/enum";

const { t } = useI18n();

const useKey = useKeyStore();

onMounted(async () => {
  await useKey.init();
});

onBeforeUnmount(() => {
  useKey.destroy();
});

const clickMacro = (obj: Macro) => {
  useKey.clickMacro(obj)
  useKey.confirmSetMacro()
}

const itemText = (item: any) => {
  if (item.type == MatrixTable.MAC) return item.text[0] as string;
  if (item.tip != '') return t(item.text[0] as string);
  if ((item.key >> 24) == 8) return t(item.text[0] as string);

  let str = '';
  let i = 0;
  let texts = [];
  for (i = 0; i < item.text.length; i++) {
    str = `${str}${item.text[i]}`
    if (item.text[i] != '' && item.text[i] != undefined) {
      texts.push(item.text[i])
    }
  }
  if (texts.length == 4) {
    str = `<div class='d-flex'>
      <div>
          <div>${texts[1]}</div>
          <div>${texts[0]}</div>
      </div>
      <div class='ml-3'>
          <div>${texts[3]}</div>
          <div>${texts[2]}</div>
      </div>
      </div>`
  } else if (texts.length == 3) {
    str = `<div class='d-flex'>
      <div>
          <div>${texts[1]}</div>
          <div>${texts[0]}</div>
      </div>
      <div class='ml-3'>
          <div>&nbsp;</div>
          <div>${texts[2]}</div>
      </div>
      </div>`
  } else if (texts.length == 2) {
    str = `<div class='d-flex'>
      <div>
          <div>${texts[0]}</div>
          <div>&nbsp;</div>
      </div>
        <div class='ml-3'>
          <div>&nbsp;</div>
          <div>${texts[1]}</div>
      </div>
      </div>`
  }
  return str;
}

const itemTipText = (item: any) => {
  if (item.tip != '') return t(item.tip);
  return '';
}

</script>
<style scoped lang="scss">
.cb75-function-browser { height: 100%; min-width: 0; min-height: 0; overflow: hidden; }
.cb75-function-menu { flex: 0 0 160px; min-width: 0; height: 100%; }
.cb75-function-menu-scroll, .cb75-function-results { height: 100%; min-height: 0; overflow: hidden; }
.cb75-function-menu-scroll :deep(.el-scrollbar), .cb75-function-results :deep(.el-scrollbar) { height: 100%; }
.cb75-function-content { min-width: 0; min-height: 0; }
@media (max-width: 700px) {
  .cb75-function-browser { flex-direction: column; }
  .cb75-function-menu { flex: 0 0 65px; width: 100%; }
  .cb75-function-menu-scroll :deep(.el-scrollbar__view) { display: flex; flex-wrap: nowrap; align-items: center; min-width: max-content; }
  .cb75-function-menu-scroll :deep(.el-scrollbar__wrap) { overflow-x: auto; overflow-y: hidden; }
  .cb75-function-menu-scroll .c-p { flex: none; margin: 6px !important; padding: 8px 12px !important; }
  .cb75-function-content { margin-left: 0 !important; flex: 1; }
}
.d-none {
  display: none;
}

.selected {
  background-color: var(--cb75-accent, #45e6d0) !important;
  color: var(--cb75-on-accent, #061619);
}

.key {
  margin: 4px;
  font-size: 14px;
  width: 20px;
  height: 20px;
}

.key1 {
  width: 65px;
}

.key2 {
  width: 227px;
}


.box {
  width: 180px;
}

.box1 {
  width: 325px;
}

.box2 {
  width: 380px;
}
</style>
