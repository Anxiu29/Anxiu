<script setup lang="ts">
import { computed, ref } from 'vue'
import type { KeyCategory, KeyDefinition } from '@/domain/keyboard'

const props = defineProps<{ current?: number; keys: readonly KeyDefinition[] }>()
const emit = defineEmits<{ select: [code: number] }>()
const search = ref('')
const category = ref<KeyCategory | 'all'>('all')
const categories: Array<{ id: KeyCategory | 'all'; label: string }> = [{ id: 'all', label: '全部' }, { id: 'basic', label: '基础键' }, { id: 'modifier', label: '修饰键' }, { id: 'navigation', label: '导航' }, { id: 'function', label: '功能键' }, { id: 'media', label: '媒体' }, { id: 'special', label: '特殊' }]
const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return props.keys.filter((key) => {
    const matchesCategory = category.value === 'all' || key.category === category.value
    const hex = key.code.toString(16).padStart(4, '0').toLowerCase()
    return matchesCategory && (key.label.toLowerCase().includes(query) || String(key.code).includes(query) || hex.includes(query.replace(/^0x/, '')))
  })
})
</script>

<template>
  <aside class="picker panel">
    <div class="panel-heading"><div><span class="eyebrow">KEY LIBRARY</span><h2>分配按键</h2></div><span v-if="current !== undefined" class="hex">0x{{ current.toString(16).padStart(4, '0').toUpperCase() }}</span></div>
    <input v-model="search" class="search" placeholder="搜索按键…" />
    <div class="category-tabs"><button v-for="item in categories" :key="item.id" :class="{ active: category === item.id }" @click="category = item.id">{{ item.label }}</button></div>
    <div class="key-list"><button v-for="key in filtered" :key="key.code" :class="{ active: current === key.code }" @click="emit('select', key.code)"><span>{{ key.label }}</span><small>{{ key.code.toString(16).padStart(2, '0').toUpperCase() }}</small></button></div>
  </aside>
</template>
