<script setup lang="ts">
import { ref } from 'vue'
import { useDeviceStore } from '@/stores/mouse/deviceStore'
import { useProfileStore } from '@/stores/mouse/profileStore'
import MouseDialog from './MouseDialog.vue'
const device = useDeviceStore()
const profiles = useProfileStore()
const fileInput = ref<HTMLInputElement>()
const editing = ref<'new' | 'rename' | ''>('')
const editId = ref('')
const name = ref('')
function create() {
  editing.value = 'new'
  let number = 1
  while (profiles.profiles.some((p) => p.name === `配置 ${number}`)) number++
  name.value = `配置 ${number}`
}
function rename(id: string, value: string) {
  editing.value = 'rename'
  editId.value = id
  name.value = value
}
function save() {
  if (device.busy || !name.value.trim()) return
  if (editing.value === 'new') profiles.save(name.value.trim())
  else profiles.rename(editId.value, name.value.trim())
  if (!profiles.error) editing.value = ''
}
function choose(id: string) {
  if (!device.busy) void profiles.switchTo(id)
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) await profiles.importFile(input.files[0])
  input.value = ''
}
</script>
<template>
  <section class="mouse-workspace mouse-profiles">
    <header class="mouse-heading">
      <div>
        <span class="eyebrow">PROFILES</span>
        <h2>配置管理</h2>
        <p>保存不同使用场景的鼠标设置，随时切换。</p>
      </div>
      <div class="mouse-toolbar">
        <button class="ghost" :disabled="device.busy" @click="fileInput?.click()">导入配置</button>
        <button class="primary" :disabled="device.busy" @click="create">新建配置</button>
        <input ref="fileInput" hidden type="file" accept=".rk,.json" @change="importFile" />
      </div>
    </header>
    <section class="mouse-profile-section">
      <header>
        <h3>
          本地配置
          <small>{{ profiles.profiles.length }}</small>
        </h3>
        <p>点击即可切换。配置保存在当前浏览器中，可导入、导出。</p>
      </header>
      <div class="mouse-profile-cards">
        <article
          v-for="profile in profiles.profiles"
          :key="profile.id"
          class="mouse-profile-card"
          :class="{ active: profiles.selected === profile.id }"
          @click="choose(profile.id)"
        >
          <span class="mouse-profile-symbol" aria-hidden="true">▤</span>
          <div class="mouse-profile-info">
            <strong>{{ profile.name }}</strong>
            <small>{{ profile.isDefault ? '默认就有' : '自定义配置' }}</small>
          </div>
          <span v-if="profiles.selected === profile.id" class="mouse-profile-badge">当前</span>
          <div class="mouse-profile-card-actions" @click.stop>
            <button
              v-if="!profile.isDefault"
              class="ghost"
              :disabled="device.busy"
              :aria-label="'重命名配置 ' + profile.name"
              @click="rename(profile.id, profile.name)"
            >
              重命名
            </button>
            <button
              class="ghost"
              :aria-label="'导出配置 ' + profile.name"
              @click="profiles.exportFile(profile.id)"
            >
              导出
            </button>
            <button
              v-if="!profile.isDefault"
              class="ghost danger"
              :disabled="device.busy"
              :aria-label="'删除配置 ' + profile.name"
              @click="profiles.remove(profile.id)"
            >
              删除
            </button>
          </div>
        </article>
      </div>
    </section>
    <MouseDialog
      v-if="editing"
      :title="editing === 'new' ? '新建配置' : '重命名配置'"
      @close="editing = ''"
    >
      <form @submit.prevent="save">
        <label class="mouse-field">
          配置名称
          <input v-model="name" autofocus maxlength="80" aria-label="配置名称" />
        </label>
        <p v-if="editing === 'new'">从最初的默认配置复制一份，不包含后来的修改。</p>
        <div class="mouse-toolbar">
          <button type="button" class="ghost" @click="editing = ''">取消</button>
          <button class="primary" :disabled="device.busy || !name.trim()">保存</button>
        </div>
      </form>
    </MouseDialog>
  </section>
</template>
