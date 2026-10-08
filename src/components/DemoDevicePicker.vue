<script setup lang="ts">
import { onMounted, ref } from 'vue'
defineProps<{ devices: { id: string; name: string; kind: string; image: string }[] }>()
const emit = defineEmits<{ select: [id: string]; close: [] }>()
const dialog = ref<HTMLDialogElement>()
onMounted(() => dialog.value?.showModal?.())
</script>
<template>
  <dialog
    ref="dialog"
    class="demo-picker"
    aria-label="选择演示设备"
    @cancel.prevent="emit('close')"
  >
    <header>
      <div>
        <h2>选择演示设备</h2>
        <p>无需连接设备，体验设置与配置管理。</p>
      </div>
      <button class="ghost" aria-label="关闭演示选择" @click="emit('close')">×</button>
    </header>
    <div class="demo-devices">
      <button
        v-for="device in devices"
        :key="device.id"
        class="demo-device"
        :aria-label="'体验 ' + device.name"
        @click="emit('select', device.id)"
      >
        <img :src="device.image" alt="" />
        <small>键盘</small>
        <strong>{{ device.name }}</strong>
        <span>进入演示 →</span>
      </button>
    </div>
    <p>演示操作不会写入真实设备。</p>
  </dialog>
</template>
<style scoped>
.demo-picker {
  width: min(960px, 94vw);
  max-height: 86dvh;
  overflow: auto;
  padding: 28px;
  border-radius: 16px;
  border: 1px solid var(--border-subtle, #28303b);
  background: var(--panel);
  color: var(--text-primary);
}
.demo-picker::backdrop {
  background: #0008;
}
header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
h2 {
  margin: 0;
  font-size: 22px;
}
p,
small {
  color: var(--text-secondary);
  font-size: 12px;
}
.demo-devices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 24px 0;
}
.demo-device {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle, #28303b);
  background: var(--surface-control, #171d27);
  color: var(--text-primary);
}
.demo-device:hover {
  border-color: var(--cyan);
}
.demo-device img {
  width: 100%;
  height: 160px;
  object-fit: contain;
}
.demo-device span {
  font-size: 12px;
  color: var(--cyan);
}
@media (max-width: 520px) {
  .demo-devices {
    grid-template-columns: 1fr;
  }
  .demo-device img {
    height: 110px;
  }
}
</style>
