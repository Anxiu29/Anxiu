<script setup lang="ts">
import { ref } from 'vue'
import { useDeviceStore } from '@/stores/mouse/deviceStore'
import { useProfileStore } from '@/stores/mouse/profileStore'
import { useMacroStore } from '@/stores/mouse/macroStore'
import MouseDialog from './MouseDialog.vue'
import MouseFirmware from './MouseFirmware.vue'
import type { MousePresentation } from '@/ui/MousePresentation'
defineProps<{ firmware?: MousePresentation['firmware'] }>()
const emit = defineEmits<{ disconnect: [] }>()
const device = useDeviceStore(),
  profiles = useProfileStore(),
  macros = useMacroStore()
const confirm = ref<'factory' | 'local' | ''>('')
async function applyConfirmation() {
  const action = confirm.value
  confirm.value = ''
  if (action === 'factory') await device.run((p) => p.restoreFactory(), true, false, 'set.but_2')
  else if (action === 'local') {
    try {
      profiles.clearLocal()
      macros.clearLocal()
      profiles.ensureDefault('默认配置')
      macros.ensureDefault('默认宏')
    } catch {
      device.error = '清除本地数据失败'
    }
  }
}
</script>
<template>
  <section class="mouse-workspace mouse-device-settings">
    <header class="mouse-heading">
      <div>
        <h2>设备设置</h2>
      </div>
    </header>

    <section class="mouse-panel mouse-settings-card">
      <div class="mouse-settings-sections">
      <section class="mouse-preferences-card">
      <h3>设备维护</h3>
      <div class="mouse-maintenance-actions">
        <div class="mouse-maintenance-row">
          <span class="mouse-maintenance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5" /></svg></span>
          <div class="mouse-maintenance-copy"><strong>清除本地配置与宏</strong><small>删除此鼠标在当前浏览器中保存的配置和宏。</small></div>
          <button class="ghost" :disabled="device.busy" @click="confirm = 'local'">清除本地数据</button>
        </div>
        <div class="mouse-maintenance-row factory">
          <span class="mouse-maintenance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6M12 8v5l3 2" /></svg></span>
          <div class="mouse-maintenance-copy"><strong>恢复出厂设置</strong><small>重置鼠标上的设备设置，恢复默认配置。</small></div>
          <button class="ghost mouse-factory-button" :disabled="device.busy || device.firmwareNeedsReconnect" @click="confirm = 'factory'">恢复出厂</button>
        </div>
      </div>
      </section>
      <MouseFirmware :resources="firmware" />
      </div>
      <footer class="mouse-connection-actions">
        <p>{{ device.firmwareNeedsReconnect ? '请重新连接鼠标以继续使用。' : '配置文件可在「配置管理」中导入与导出。' }}</p>
        <button class="ghost" :disabled="device.busy || device.firmwareNeedsReconnect" @click="device.refresh(true)">
          重新读取
        </button>
        <button class="ghost" :disabled="device.busy" @click="emit('disconnect')">断开设备</button>
      </footer>
    </section>
    <MouseDialog
      v-if="confirm"
      class="mouse-maintenance-dialog"
      :title="confirm === 'factory' ? '恢复出厂设置' : '清除本地数据'"
      @close="confirm = ''"
    >
      <div class="mouse-confirmation-body">
      <span class="mouse-confirmation-icon" aria-hidden="true">!</span>
      <div><strong>{{ confirm === 'factory' ? '确认重置鼠标设置？' : '确认清除已保存的数据？' }}</strong><p>
        {{
          confirm === 'factory'
            ? '鼠标上的设备设置将恢复为默认值，请先保存需要的配置。'
            : '此鼠标在当前浏览器中保存的配置和宏将被删除，其他设备数据不受影响。'
        }}
      </p></div></div>
      <template #footer>
        <button class="ghost" autofocus @click="confirm = ''">取消</button>
        <button class="ghost mouse-confirmation-submit" @click="applyConfirmation">确认</button>
      </template>
    </MouseDialog>
  </section>
</template>
