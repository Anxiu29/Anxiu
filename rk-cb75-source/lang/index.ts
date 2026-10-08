import { createI18n } from "vue-i18n";
import EN from "./en";
import CN from "./zh-cn";
import TW from "./zh-tw";
import JA from "./ja";
import KR from "./ko-kr";
import RU from "./ru";
import PT_BR from "./pt_br";
import DE from "./de";
import ES from "./es";
import TR from "./tr";
import IT from "./it";
import AR from "./ar";
import TH from "./th";
import { qmkI18n } from "./qmk";

// 获取浏览器界面语言，默认语言
let currentLanguage = navigator.language.toLowerCase();
// 如果本地缓存记录了语言环境，则使用本地缓存
let lsLocale = localStorage.getItem("locale") || "";
if (lsLocale) {
  currentLanguage = lsLocale;
}

const messages = {
  en: {        // English - 英语
    ...EN,
    qmk: qmkI18n.en,
  },
  cn: {        // Chinese (Simplified) - 中文简体
    ...CN,
    qmk: qmkI18n.cn,
  },
  tw: {        // Chinese (Traditional) - 中文繁体
    ...TW,
    qmk: qmkI18n.tw,
  },
  ja: {        // Japanese - 日语
    ...JA,
    qmk: qmkI18n.ja,
  },
  kr: {        // Korean - 韩语
    ...KR,
    qmk: qmkI18n.kr,
  },
  ru: {        // Russian - 俄语
    ...RU,
    qmk: qmkI18n.ru,
  },
  pt_br: {     // Portuguese (Brazil) - 葡萄牙语(巴西)
    ...PT_BR,
    qmk: qmkI18n.pt_br,
  },
  de: {        // German - 德语
    ...DE,
    qmk: qmkI18n.de,
  },
  es: {        // Spanish - 西班牙语
    ...ES,
    qmk: qmkI18n.es,
  },
  tr: {        // Turkish - 土耳其语
    ...TR,
    qmk: qmkI18n.tr,
  },
  it: {        // Italian - 意大利语
    ...IT,
    qmk: qmkI18n.it,
  },
  ar: {        // Arabic - 阿拉伯语
    ...AR,
    qmk: qmkI18n.ar,
  },
  th: {        // Thai - 泰语
    ...TH,
    qmk: qmkI18n.th,
  },
};
let lang = 'en';
const normalizedLanguage = currentLanguage.replace(/-/g, '_');
for (let key in messages) {
  if (messages.hasOwnProperty(key)) {
    if (normalizedLanguage.includes(key)) {
      lang = key
    }
  }
}
//进行类型配置，可根据不同类型进行不同配置
const i18n = createI18n({
  legacy: false, //使用Composition APT模式，需要将其设置为false
  globalInjection: true, //全局生效$t
  locale: lang, //默认使用的语言
  messages: messages, //es6解构
});
export default i18n;
