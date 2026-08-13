<script setup lang="ts">
import { computed, ref } from 'vue'
import { KEYCODES } from '@/domain/keycodes'
import type { KeyCategory } from '@/domain/keyboard'

defineProps<{ current?: number }>()
const emit = defineEmits<{ select: [code: number] }>()
const search = ref('')
const category = ref<KeyCategory | 'all'>('all')
const categories: Array<{ id: KeyCategory | 'all'; label: string }> = [{ id: 'all', label: '全部' }, { id: 'basic', label: '基础键' }, { id: 'modifier', label: '修饰键' }, { id: 'navigation', label: '导航' }, { id: 'function', label: '功能键' }, { id: 'special', label: '特殊' }]
const filtered = computed(() => KEYCODES.filter((key) => (category.value === 'all' || key.category === category.value) && key.label.toLowerCase().includes(search.value.toLowerCase())))
</script>

<template>
  <aside class="picker panel">
    <div class="panel-heading"><div><span class="eyebrow">KEY LIBRARY</span><h2>分配按键</h2></div><span v-if="current !== undefined" class="hex">0x{{ current.toString(16).padStart(4, '0').toUpperCase() }}</span></div>
    <input v-model="search" class="search" placeholder="搜索按键…" />
    <div class="category-tabs"><button v-for="item in categories" :key="item.id" :class="{ active: category === item.id }" @click="category = item.id">{{ item.label }}</button></div>
    <div class="key-list"><button v-for="key in filtered" :key="key.code" :class="{ active: current === key.code }" @click="emit('select', key.code)"><span>{{ key.label }}</span><small>{{ key.code.toString(16).padStart(2, '0').toUpperCase() }}</small></button></div>
  </aside>
</template>
