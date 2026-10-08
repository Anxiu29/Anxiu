import { defineStore } from "pinia";
import i18n from "@/lang";
import { ref } from "vue";

export const useLocaleStore = defineStore("localeinfo", {
  state: () => ({
    locale: ref(i18n.global.locale.value),
  }),
  actions: {
    setLocale(lang: any) {
      this.locale = lang;
      i18n.global.locale.value = lang;
      localStorage.setItem("locale", lang);
    },
  },
});
