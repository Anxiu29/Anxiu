import { defineStore } from "pinia";

export const useSetStore = defineStore("setstore", {
    state: () => ({
        langList: [
            {
                value: "en",
                label: "English",
            },
            {
                value: "cn",
                label: "简体中文",
            },
            {
                value: "tw",
                label: "繁體中文",
            },
            {
                value: "ja",
                label: "日本語",
            },
            {
                value: "kr",
                label: "한국어",
            },
            {
                value: "ru",
                label: "Русский",
            },
            {
                value: "pt_br",
                label: "Português (Brasil)",
            },
            {
                value: "de",
                label: "Deutsch",
            },
            {
                value: "th",
                label: "ไทย",
            },
            {
                value: "es",
                label: "Español",
            },
            {
                value: "tr",
                label: "Türkçe",
            },
            {
                value: "it",
                label: "Italiano",
            },
            {
                value: "ar",
                label: "العربية",
            },
        ] as any
    }),
    actions: {},
});
