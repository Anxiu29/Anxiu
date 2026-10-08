import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import 'element-plus/dist/index.css'
import './assets/css/style.scss'
import './anxiu-theme.css'
import i18n from './lang'
import App from './App.vue'

const app = createApp(App)
for (const [name, component] of Object.entries(ElementPlusIconsVue)) app.component(name, component)
app.use(createPinia()).use(ElementPlus).use(i18n).mount('#app')
