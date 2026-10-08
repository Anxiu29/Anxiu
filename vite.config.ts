import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/down': {
        target: 'https://drive.rkgaming.com/down',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/down/, ''),
      },
    },
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // 核心模型和协议无需浏览器；组件测试通过文件头显式启用 jsdom。
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
