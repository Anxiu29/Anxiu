import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/cb75/',
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  server: { proxy: { '/down': { target: 'https://drive.rkgaming.com/down', changeOrigin: true, rewrite: path => path.replace(/^\/down/, '') } } },
  build: { outDir: '../public/cb75', emptyOutDir: true },
})
