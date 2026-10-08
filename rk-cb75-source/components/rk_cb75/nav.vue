<template>
  <div class="cb75-nav mx-4 mt-3">
    <div class="fw-b fs-xxl">{{ profileDisplayName }}</div>
    <div class="cb75-nav-controls d-flex mt-4">
      <div class="cb75-layer-picker d-flex ai-center mr-4">
        <el-radio-group class="ml-4" v-model="useKey.keyMatrixLayer" text-color="#00ffff" fill="#ffff00"
          @change="useKey.getKeyMatrix">
          <el-radio v-for="item in useKey.state.MatrixLayers" :value="item.value" :label="item.value">
            <span>{{ $t(item.label) }}</span>
          </el-radio>
        </el-radio-group>
      </div>
      <div class="cb75-tap-toggle d-flex ml-4">
        <div>
          <el-popover effect="light" :width="320" placement="bottom">
            <div class="d-flex flex-column">
              <span>{{ $t('tip.tape1') }}</span>
              <span>{{ $t('tip.tape2') }}</span>
              <span>{{ $t('tip.tape3') }}</span>
            </div>
            <template #reference>
              <el-checkbox v-model="isLayer" :label="$t('set.layer_1')" style="width: 100%;" @change="LayerChanged">
                {{ $t('set.layer_1') }}
              </el-checkbox>
            </template>
          </el-popover>
        </div>
        <div class="ml-2 px-3" v-if="isLayer">
          <el-slider class="cb75-layer-slider" v-model="layer" :min="1" :max="127" @change="setLayer" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useKeyStore } from "@/stores/rk_cb75/keyStore";
import { uselightStore } from "@/stores/rk_cb75/lightStore";
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const useLight = uselightStore();
const useKey = useKeyStore();
const { t } = useI18n();

const profileDisplayName = computed(() => {
  const item = useKey.profile;
  if (!item) return '';
  if (item.isDefault) return t("Profile.default_win");
  if (item.index === 1) return t("Profile.default_mac");
  return item.name;
});
const isLayer = ref(false);
const layer = ref(5);

const syncTapeLayerState = () => {
  isLayer.value = (useLight.state.layer & 0x01) > 0;
  const delay = useLight.state.layer >> 1;
  if (isLayer.value && delay === 0) {
    layer.value = 5;
    useLight.setLayer(5);
    return;
  }
  layer.value = delay > 0 ? delay : 5;
};

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

onMounted(async () => {
  await useKey.init();
  await useLight.init();
  syncTapeLayerState();
});

watch(() => useLight.state.layer, syncTapeLayerState);
watch(() => useKey.profile?.index, async () => {
  await useLight.init();
  syncTapeLayerState();
});

onBeforeUnmount(() => {
  useKey.destroy();
});
</script>

<style scoped lang="scss">
.cb75-nav { min-width: 0; margin-bottom: 18px; }
.cb75-nav-controls { flex-wrap: wrap; gap: 12px 18px; }
.cb75-layer-picker, .cb75-tap-toggle { margin: 0 !important; min-width: 0; }
.cb75-layer-picker :deep(.el-radio-group) { margin: 0 !important; display: flex; flex-wrap: wrap; gap: 4px 10px; }
.cb75-tap-toggle { flex-wrap: wrap; align-items: center; }
.cb75-layer-slider { width: min(180px, 40vw); }
@media (max-width: 700px) {
  .cb75-nav { margin: 14px 16px !important; }
  .cb75-nav-controls { margin-top: 10px !important; }
  .cb75-layer-picker :deep(.el-radio) { margin-right: 10px; }
}
::deep(.el-radio-button__inner) {
  padding: 0 5px;
}

::deep(.is-active) {
  img {
    position: relative;
    left: -99999px;
    filter: drop-shadow(#ffffff 99999px 0);
  }
}

::deep(.el-radio__input.is-checked .el-radio__inner) {
  --el-color-primary: var(--cb75-accent, #45e6d0);
}

::deep(.el-radio__input.is-checked+.el-radio__label) {
  --el-color-primary: var(--cb75-accent, #45e6d0);
}
</style>
