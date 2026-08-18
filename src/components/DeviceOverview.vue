<script setup lang="ts">
import type { KeyboardProfile } from '@/domain/keyboard'

defineProps<{ profile: KeyboardProfile; busy?: boolean; imageUrl?: string; imageAlt?: string }>()
// 组件只展示注入的设备资源和领域 Profile，不直接认识 C98 图片或驱动实现。
const emit = defineEmits<{ reload: [] }>()
</script>

<template>
  <section class="device-overview">
    <div class="overview-heading"><div><span class="eyebrow">DEVICE OVERVIEW</span><h1>设备首页</h1><p>查看当前连接设备的信息，或从左侧进入改键设置。</p></div><button class="ghost" :disabled="busy" @click="emit('reload')">重新读取</button></div>

    <div class="overview-device panel">
      <div class="overview-image">
        <img :src="imageUrl" :alt="imageAlt || `${profile.device.productName} 键盘大图`" />
      </div>
      <div class="overview-details">
        <div class="overview-device-title">
          <span class="connected-label"><i></i>设备已连接</span>
          <h2>{{ profile.device.productName }}</h2>
        </div>
        <div class="device-specs">
          <div><small>固件版本</small><strong>{{ profile.device.firmwareVersion }}</strong></div>
          <div><small>协议版本</small><strong>{{ profile.device.protocolVersion }}</strong></div>
          <div><small>VID / PID</small><strong>{{ profile.device.vendorId.toString(16).padStart(4, '0').toUpperCase() }} / {{ profile.device.productId.toString(16).padStart(4, '0').toUpperCase() }}</strong></div>
          <div><small>配置层数</small><strong>{{ profile.capabilities.layers }}</strong></div>
        </div>
      </div>
    </div>
  </section>
</template>
