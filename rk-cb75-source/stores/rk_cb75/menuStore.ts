import { defineStore } from "pinia";

export const useMenuStore = defineStore("menustore_rk_cb75", {
  state: () => ({
    meunid: 0,
    moduleid: 0,
    name: '<img src="/src/assets/images/logo@1x.png" style="width: 130px" />',
    moduleList: [] as any,
    menuList: [{
      id: 1, title: "home.menu_6", src: "/src/assets/images/menu/key.png",
      children: [
        { id: 1, title: "配置文件1", src: "/src/assets/images/dot.png", },
        { id: 2, title: "配置文件2", src: "/src/assets/images/dot.png", },
        { id: 3, title: "配置文件3", src: "/src/assets/images/dot.png", },
      ],
    },
    { id: 2, title: "home.menu_7", src: "/src/assets/images/menu/macro.png" },
    { id: 3, title: "home.menu_8", src: "/src/assets/images/menu/light.png" },
    { id: 4, title: "home.menu_9", src: "/src/assets/images/menu/setting.png" },
    { id: 7, title: "home.menu_11", src: "/src/assets/images/menu/download.png" },
    //{ id: 6, title: "TFT设置", src: "/src/assets/images/menu/tft.png" }
    ] as any,
  }),
  actions: {
    setName(name: string) {
      this.name = name;
    },
    nameInit() {
      this.name = '<img src="/src/assets/images/logo@1x.png" style="width: 130px" />';
    },
    setMeunid(id: number) {
      this.meunid = id;
      this.moduleid = 0;
      this.moduleList = [];
      this.getModuleList(id);
    },
    setModuleid(id: number) {
      this.moduleid = id;
    },
    getModuleList(id: number) {
      this.moduleList = this.menuList?.find((item: any) => item.id === id)?.children || [];
    },
  },
});
