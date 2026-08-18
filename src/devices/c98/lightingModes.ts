import type { LightingModePresentation } from '@/ui/DevicePresentation'

/**
 * C98 官方驱动展示的主面板灯效，数组顺序对应方案协议的 mode 值。
 * mode 0 是静态模式，后续 1～20 按官方界面从左到右、从上到下排列。
 */
export const C98_LIGHTING_MODES: readonly LightingModePresentation[] = [
  { value: 0, label: '静态灯光' },
  { value: 1, label: '波纹荡漾' },
  { value: 2, label: '潮起潮落' },
  { value: 3, label: '涟漪轻漾' },
  { value: 4, label: '旋转风暴' },
  { value: 5, label: '幸运彩虹' },
  { value: 6, label: '闪耀彩虹' },
  { value: 7, label: '熠熠生辉' },
  { value: 8, label: '移动窗格' },
  { value: 9, label: '波形变换' },
  { value: 10, label: '移形换影' },
  { value: 11, label: '行云流水' },
  { value: 12, label: '正弦曲线' },
  { value: 13, label: '百花争艳' },
  { value: 14, label: '斑斓镶嵌' },
  { value: 15, label: '雨落如注' },
  { value: 16, label: '跃动不息' },
  { value: 17, label: '踏雪无痕' },
  { value: 18, label: '踏雪寻梅' },
  { value: 19, label: '镭射穿云' },
  { value: 20, label: '水波荡漾' },
]
