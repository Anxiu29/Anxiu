import { defineStore } from "pinia";
import { reactive, ref } from 'vue';
import { Macro, Macros, Action, ActionType } from '@/keyboard/beiying/rk_cb75/macros';
import { RK_CB75, RK_CB75_EVENT_DEFINE } from '@/keyboard/beiying/rk_cb75/rk_cb75';
import { keyboard } from '@/keyboard/beiying/keyboard'
import { storage } from '@/common/storage';
import { ConnectionEventEnum, ConnectionStatusEnum } from "@/device/enum";
import fileSaver from "file-saver";
import { ElMessage } from 'element-plus'

export const useMacroStore = defineStore("macrostore_rk_cb75", () => {
  const rk_cb75 = ref<RK_CB75>();
  const macros = ref<Macros>();
  const macro = ref<Macro>();
  const key = ref<string>('');

  const state = reactive({
    eventVal: 1,
    eventList: [
      {
        value: 1,
        label: "macro.event_1",
      },
      {
        value: 2,
        label: "macro.event_2",
      },
    ],
    actList: [
      { value: "macro.menu_1", label: "macro.menu_1" },
      { value: "macro.menu_3", label: "macro.menu_3" },
      { value: "macro.menu_2", label: "macro.menu_2" }
    ],
    delayList: [
      { value: "macro.menu_4", label: "macro.menu_4" },
      { value: "macro.menu_5", label: "macro.menu_5" },
      { value: "macro.menu_6", label: "macro.menu_6" }
    ],
    macro: macro,
    name: '',
    nameEditorDisplay: false,
    key: key,
    actionTextShow: false,
    actionText: '',
  });
  const actions = {};
  const isInited = ref(false);
  const isDirty = ref(false);
  const savedSnapshot = ref<string | null>(null);
  const savedMacroIndex = ref<number | null>(null);
  const draftRepeat = ref(1);

  const buildMacroSnapshot = (item?: Macro, repeatCount = 1) => JSON.stringify({
    repeat: repeatCount,
    actions: (item?.actions ?? []).map((action) => ({
      action: action.action,
      type: action.type,
      delay: action.delay,
      key: action.key,
      index: action.index,
    })),
  });

  const resetSavedSnapshot = (repeatCount?: number) => {
    const currentRepeat = repeatCount ?? macro.value?.repeat ?? 1;
    savedMacroIndex.value = macro.value?.index ?? null;
    savedSnapshot.value = buildMacroSnapshot(macro.value, currentRepeat);
    draftRepeat.value = currentRepeat;
    isDirty.value = false;
  };

  const syncDirty = (repeatCount?: number) => {
    const currentRepeat = repeatCount ?? draftRepeat.value ?? macro.value?.repeat ?? 1;
    draftRepeat.value = currentRepeat;
    if (savedSnapshot.value === null || savedMacroIndex.value !== (macro.value?.index ?? null)) return;
    isDirty.value = buildMacroSnapshot(macro.value, currentRepeat) !== savedSnapshot.value;
  };

  const restoreEditState = () => {
    if (savedSnapshot.value === null) {
      const currentRepeat = macro.value?.repeat ?? 1;
      resetSavedSnapshot(currentRepeat);
      return currentRepeat;
    }
    const restoredRepeat = savedMacroIndex.value === (macro.value?.index ?? null)
      ? (draftRepeat.value || macro.value?.repeat || 1)
      : (macro.value?.repeat ?? 1);
    syncDirty(restoredRepeat);
    return restoredRepeat;
  };

  const clearEditState = () => {
    isDirty.value = false;
    savedSnapshot.value = null;
    savedMacroIndex.value = null;
    draftRepeat.value = 1;
  };

  const init = async () => {
    if (rk_cb75.value == undefined) {
      rk_cb75.value = (keyboard.protocol as RK_CB75);
      keyboard.addEventListener("connection", connectionEventCallback);
    }

    if (rk_cb75.value != undefined && !isInited.value) {
      rk_cb75.value.addEventListener(RK_CB75_EVENT_DEFINE.OnMacrosGotten, macroGotten, false);

      let tmp = storage.get(`${keyboard.keyboardDefine?.name}_macro`) as Macros;
      if (tmp != null) {
        let ms = new Macros();
        for (let m of tmp.macroList) {
          let tm = new Macro(m.name);
          tm.repeat = m.repeat;
          for (let a of m.actions) {
            let ta = new Action(a.key, a.delay, a.action, a.type);
            tm.add(ta);
          }
          tm.refresh();
          ms.add(tm);
        }
        rk_cb75.value.data.macros = ms;
        macros.value = rk_cb75.value.data.macros;
        macro.value = macros.value.get()[0];
        refresh();
      } else {
        let ms = new Macros();
        ms.add(new Macro("Default Macro"));
        rk_cb75.value.data.macros = ms;
        macros.value = rk_cb75.value.data.macros;
        macro.value = macros.value.get()[0];
        //await rk_cb75.value.getMacros();
      }

      resetSavedSnapshot(macro.value?.repeat ?? 1);
      isInited.value = true;
    }
  };

  const isMacroData = (value: unknown): value is Macro => {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Partial<Macro> & { layers?: unknown };
    return typeof candidate.name === 'string'
      && candidate.name.length > 0
      && Array.isArray(candidate.actions)
      && candidate.layers == null;
  };

  const isProfileFileData = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as { name?: unknown; layers?: unknown; profile?: unknown; ledEffect?: unknown; ledColors?: unknown };
    return typeof candidate.name === 'string'
      && candidate.name.length > 0
      && typeof candidate.layers === 'object'
      && candidate.layers !== null
      && typeof candidate.profile === 'object'
      && candidate.profile !== null
      && typeof candidate.ledEffect === 'object'
      && candidate.ledEffect !== null
      && typeof candidate.ledColors === 'object'
      && candidate.ledColors !== null;
  };

  const importProfile = (str: any) => {
    try {
      const p: unknown = JSON.parse(str);
      if (isProfileFileData(p)) {
        import('@/stores/rk_cb75/keyStore').then(({ useKeyStore }) => {
          useKeyStore().importProfile(str);
        });
        return;
      }

      if (!isMacroData(p)) {
        ElMessage.error('Error parsing JSON data')
        return
      }

      if (macros.value == undefined) {
        macros.value = rk_cb75.value?.data.macros ?? new Macros();
        if (rk_cb75.value != undefined) {
          rk_cb75.value.data.macros = macros.value;
        }
      }

      let tm = new Macro(p.name)
      tm.repeat = Number.isFinite((p as any).repeat) ? Math.max(1, Math.trunc((p as any).repeat)) : 1;
      for (let a of p.actions) {
        let ta = new Action(a.key, a.delay, a.action, a.type);
        tm.add(ta);
      }
      tm.refresh();
      macro.value = tm;
      macros.value?.add(macro.value);
    } catch (e) {
      ElMessage.error('Error parsing JSON data')
    }
  };

  const saveAction = () => {
    try {
      var as: Array<Action> = JSON.parse(state.actionText);
      macro.value?.clear();
      for (let a of as) {
        let ta = new Action(a.key, a.delay, a.action, a.type);
        macro.value?.add(ta);
      }
      macro.value?.refresh();
      // 成功解析后的代码
    } catch (e) {
      // 解析出错时的代码
      ElMessage.error('Error parsing JSON data')
    }
  };

  const exportMacro = (obj: Macro) => {
    let blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
    fileSaver.saveAs(blob, `${obj.name}.rk`);
  };
  const connectionEventCallback = async (event: Event) => {
    switch (keyboard.state.connectionEvent) {
      case ConnectionEventEnum.Disconnect:
      case ConnectionEventEnum.Close:
        destroy();
        break;
    }
  };

  const destroy = () => {
    if (rk_cb75.value != undefined) {
      rk_cb75.value.removeEventListener(RK_CB75_EVENT_DEFINE.OnMacrosGotten, macroGotten, false);
    }

    if (keyboard.state.ConnectionStatus != ConnectionStatusEnum.Connected) {
      keyboard.removeEventListener("connection", connectionEventCallback);
      isInited.value = false;
      rk_cb75.value = undefined;
      clearEditState();
    }
  };

  const macroGotten = (event: any) => {
    macros.value = event.detail as Macros;
    refresh();
  };

  const refresh = () => {
    if (macros.value != undefined) {
      macro.value = macros.value.get()[0];
    }
  };

  const getMacroData = async () => {
    if (rk_cb75.value != undefined) {
      await rk_cb75.value.getMacros();
    }
  }

  const setMacroData = async () => {
    if (rk_cb75.value != undefined) {
      await rk_cb75.value.setMacros();
    }
  }

  const clearMacro = async () => {
    if (rk_cb75.value != undefined) {
      let ms = new Macros();
      rk_cb75.value.data.macros = ms;
      macros.value = rk_cb75.value.data.macros;
      macro.value = undefined;
    }
  }

  return {
    macros, state, actions, key, isDirty, draftRepeat,
    init, destroy, refresh, getMacroData, exportMacro, importProfile, setMacroData, clearMacro, saveAction,
    resetSavedSnapshot, syncDirty, restoreEditState,
  }
});
