<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDeviceStore } from '@/stores/mouse/deviceStore'
import { useSpeedStore } from '@/stores/mouse/speedStore'
const device = useDeviceStore()
const speed = useSpeedStore()
const activeStage = computed(() => device.config?.functions[12] ?? 0)
const selected = ref(device.config?.functions[12] ?? 0)
const value = ref(speed.stages[selected.value]?.value ?? 800)
watch(
  () => device.config?.functions[12],
  (stage) => {
    if (stage === undefined || !speed.stages[stage]) return
    selected.value = stage
    value.value = speed.stages[stage].value
  },
)
watch(
  () => speed.stages[selected.value]?.value,
  (dpi) => {
    if (dpi !== undefined) value.value = dpi
  },
)
let syncTimer: ReturnType<typeof setTimeout> | undefined
let disposed = false
async function syncDpi() {
  if (disposed) return
  const healthy = document.hidden || (await device.syncDpiStage())
  // Schedule after completion so slow wireless reads never accumulate.
  if (!disposed && healthy) syncTimer = setTimeout(syncDpi, 1000)
}
onMounted(() => {
  void syncDpi()
})
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(syncTimer)
})
async function selectStage(index: number) {
  selected.value = index
  value.value = speed.stages[index].value
  if (speed.stages[index].enabled && !(await speed.select(index))) {
    selected.value = activeStage.value
    value.value = speed.stages[selected.value].value
  }
}
async function save() {
  const basic = device.config!.basic
  const rank = (value.value - basic.dpiStart) / basic.dpiStep
  if (
    !Number.isFinite(value.value) ||
    !Number.isInteger(rank) ||
    value.value < basic.dpiStart ||
    value.value > speed.maxDpi
  ) {
    device.error =
      'DPI 必须在 ' + basic.dpiStart + '～' + speed.maxDpi + ' 之间，步进为 ' + basic.dpiStep
  } else if (value.value !== speed.stages[selected.value]?.value) {
    await speed.save(selected.value, value.value)
  }
  value.value = speed.stages[selected.value]?.value ?? basic.dpiStart
}
const setEnabled = (index: number, value: string | number | boolean) =>
  speed.setEnabled(index, Boolean(value))
const setRate = (value: string | number | boolean) => speed.setRate(Number(value))
</script>
<template>
  <section v-if="device.config" class="mouse-workspace">
    <header class="mouse-heading">
      <div>
        <span class="eyebrow">PERFORMANCE</span>
        <h2>DPI 与回报率</h2>
        <p>通过鼠标按键切换 DPI 后，此处会自动同步当前档位。</p>
      </div>
    </header>
    <section class="mouse-panel">
      <h3>DPI 档位</h3>
      <div class="mouse-dpi-grid">
        <article
          v-for="stage in speed.stages"
          :key="stage.index"
          class="mouse-dpi-stage"
          :class="{
            active: selected === stage.index,
            'in-use': activeStage === stage.index,
            inactive: !stage.enabled,
          }"
        >
          <button
            class="stage-button"
            :aria-pressed="selected === stage.index"
            :disabled="device.busy"
            @click="selectStage(stage.index)"
          >
            <span :style="{ background: stage.color }" class="mouse-swatch"></span>
            DPI {{ stage.index + 1 }}
            <strong>{{ stage.value }}</strong>
            <span class="mouse-stage-status">
              {{
                activeStage === stage.index
                  ? '使用中'
                  : stage.enabled
                    ? '点击切换'
                    : '已停用 · 可编辑'
              }}
            </span>
          </button>
          <div class="mouse-toolbar">
            <label>
              <input
                type="checkbox"
                :checked="stage.enabled"
                :disabled="device.busy"
                @change="speed.setEnabled(stage.index, ($event.target as HTMLInputElement).checked)"
              />
              启用
            </label>
            <input
              type="color"
              :value="stage.color"
              :aria-label="'DPI ' + (stage.index + 1) + ' 颜色'"
              :disabled="device.busy"
              @change="speed.setColor(stage.index, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </article>
      </div>
      <label class="mouse-field">
        DPI {{ selected + 1 }} · 灵敏度
        <div class="mouse-range">
          <input
            v-model.number="value"
            aria-label="DPI 灵敏度滑块"
            type="range"
            :min="device.config.basic.dpiStart"
            :max="speed.maxDpi"
            :step="device.config.basic.dpiStep"
            :disabled="device.busy"
            @change="save"
          />
          <input
            v-model.number="value"
            aria-label="DPI 数值"
            type="number"
            :min="device.config.basic.dpiStart"
            :max="speed.maxDpi"
            :step="device.config.basic.dpiStep"
            :disabled="device.busy"
            @change="save"
          />
        </div>
      </label>
    </section>
    <section class="mouse-panel">
      <h3>回报率</h3>
      <div class="mouse-toolbar">
        <button
          v-for="rate in speed.rates"
          :key="rate.code"
          class="ghost"
          :class="{ active: device.config.functions[11] === rate.code }"
          :aria-pressed="device.config.functions[11] === rate.code"
          :disabled="device.busy"
          @click="speed.setRate(rate.code)"
        >
          {{ rate.hz }} Hz
        </button>
      </div>
    </section>
  </section>
</template>
