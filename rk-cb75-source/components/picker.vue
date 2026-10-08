<template>
  <div class="d-flex flex-column">
    <div class="rk-picker-layout d-flex mt-3">
      <!-- 色相 -->
      <div class="color-slider is-vertical">
        <div class="color-slider-bar" ref="hueSlider" @mousedown="hueMousedown">
          <div ref="hueSliderThumb" class="color-slider-thumb"></div>
        </div>
      </div>
      <!-- 色盘 -->
      <div class="panel" ref="panel" @mousedown="panelMousedown">
        <div class="white-panel"></div>
        <div class="black-panel"></div>
        <div class="color-picker-panel-cursor" :style="{
          left: cursorPosition.x + 'px',
          top: cursorPosition.y + 'px',
          backgroundColor: `rgb(${cursorPosition.rgb.r}, ${cursorPosition.rgb.g}, ${cursorPosition.rgb.b})`,
        }"></div>
      </div>
      <div class="rk-picker-rgb d-flex flex-column ml-4">
        <!-- <el-input v-model="cursorPosition.rgb.color" style="width: 68px; margin-left: 10px;" size="small"
            @change="colorHexChanged()" :maxlength="7" /> -->
        <div class="rk-picker-rgb-row mb-2 d-flex ai-center">
          <div class="mr-4">R</div>
          <div class="r rk-picker-channel"><el-slider v-model="cursorPosition.rgb.r" :min="0" :max="255" @change="colorChanged"/></div>
          <div class="ml-3"><el-input-number v-model="cursorPosition.rgb.r" :min="0" :max="255" size="small" style="width: 55px"
              :controls="false" @change="colorChanged()" /></div>
        </div>
        <div class="rk-picker-rgb-row mb-2 d-flex ai-center">
          <div class="mr-4">G</div>
          <div class="g rk-picker-channel"><el-slider v-model="cursorPosition.rgb.g" :min="0" :max="255" @change="colorChanged"/></div>
          <div class="ml-3"><el-input-number v-model="cursorPosition.rgb.g" :min="0" :max="255" size="small" style="width: 55px"
              :controls="false" @change="colorChanged()" /></div>
        </div>
        <div class="rk-picker-rgb-row mb-2 d-flex ai-center">
          <div class="mr-4">B</div>
          <div class="b rk-picker-channel"><el-slider v-model="cursorPosition.rgb.b" :min="0" :max="255" @change="colorChanged"/></div>
          <div class="ml-3"><el-input-number v-model="cursorPosition.rgb.b" :min="0" :max="255" size="small" style="width: 55px"
              :controls="false" @change="colorChanged()" /></div>
        </div>
        <div>
          <el-tag :color="item.rainbow ? '#FFFFFF' : `rgb(${item.r}, ${item.g}, ${item.b})`" v-for="item in colors"
            @click="colorFore(item.index, item.r, item.g, item.b)" :class="{ 'color_active': item.index === index }"
            :style="presetTagStyle(item)" class="m-1 c-p" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import convert from "color-convert";

const DEFAULT_PRESET_COLORS = [
  { index: 1, r: 255, g: 0, b: 0 },
  { index: 2, r: 255, g: 128, b: 0 },
  { index: 3, r: 255, g: 255, b: 0 },
  { index: 4, r: 0, g: 255, b: 0 },
  { index: 5, r: 0, g: 0, b: 255 },
  { index: 6, r: 0, g: 255, b: 255 },
  { index: 7, r: 255, g: 0, b: 255 },
  { index: 8, r: 255, g: 255, b: 255 }
];

export default {
  props: {
    rgb: {
      type: Object,
      required: true
    },
    presetColors: {
      type: Array,
      default: () => []
    }
  },
  data() {
    const colors = this.presetColors.length > 0 ? this.presetColors : DEFAULT_PRESET_COLORS;
    return {
      h: 0, // 色相
      cursorPosition: {
        x: 0, // 饱和度
        y: 0, // 明值
        rgb: this.rgb,
      },
      alpha: 1,
      mousePageY: 0,
      sliderTop: 0,
      index: 0,
      colors
    };
  },
  mounted() {
    const r = Number(this.cursorPosition.rgb?.r);
    const g = Number(this.cursorPosition.rgb?.g);
    const b = Number(this.cursorPosition.rgb?.b);
    const color = String(this.cursorPosition.rgb?.color ?? '').toUpperCase();

    // 界面默认颜色统一兜底为白色
    if (
      !Number.isFinite(r) ||
      !Number.isFinite(g) ||
      !Number.isFinite(b) ||
      ((r === 0 && g === 0 && b === 0) && (color === '' || color === '#000000'))
    ) {
      this.cursorPosition.rgb.r = 255;
      this.cursorPosition.rgb.g = 255;
      this.cursorPosition.rgb.b = 255;
      this.cursorPosition.rgb.color = '#FFFFFF';
    }

    this.syncPickerFromRgb();
  },

  methods: {
    syncPickerFromRgb() {
      const panel = this.$refs.panel;
      const hueSlider = this.$refs.hueSlider;
      if (!panel || !hueSlider) {
        return;
      }

      const r = Number(this.cursorPosition.rgb.r) || 0;
      const g = Number(this.cursorPosition.rgb.g) || 0;
      const b = Number(this.cursorPosition.rgb.b) || 0;
      const hsv = convert.rgb.hsv(r, g, b);
      const h = Math.max(0, Math.min(360, Number(hsv?.[0]) || 0));
      const s = Math.max(0, Math.min(100, Number(hsv?.[1]) || 0));
      const v = Math.max(0, Math.min(100, Number(hsv?.[2]) || 0));

      this.h = h;
      this.hue2rgb(h);

      const top = Math.round((h / 360) * hueSlider.offsetHeight);
      this.$refs.hueSliderThumb.style.top = `${Math.max(0, Math.min(hueSlider.offsetHeight, top))}px`;

      this.cursorPosition.x = Math.round((s / 100) * panel.offsetWidth);
      this.cursorPosition.y = Math.round(((100 - v) / 100) * panel.offsetHeight);

      const color = `#${r.toString(16).toUpperCase().padStart(2, '0')}${g.toString(16).toUpperCase().padStart(2, '0')}${b.toString(16).toUpperCase().padStart(2, '0')}`;
      this.cursorPosition.rgb.color = color;

      const match = this.colors.find((item) => item.r === r && item.g === g && item.b === b);
      this.index = match?.index ?? 0;
    },
    presetTagStyle(item) {
      if (item?.rainbow) {
        return {
          borderWidth: "0px",
          borderRadius: "3px",
          width: "32px",
          height: "32px",
          background: "linear-gradient(135deg, #FF0000 0%, #FFFF00 20%, #00FF00 40%, #00FFFF 60%, #0000FF 80%, #FF00FF 100%)",
        };
      }
      return {
        borderWidth: "0px",
        borderRadius: "3px",
        width: "32px",
        height: "32px",
      };
    },
    // 取色
    eyedropper(e) {
      // 需要在https并且浏览器支持的情况下才能运行
      if (!window.EyeDropper) {
        alert("当前浏览器不支持取色功能！！！");
        // this.$message.error("当前浏览器不支持取色功能！！！");
        return;
      }
      const dropper = new EyeDropper();
      dropper
        .open()
        .then((result) => {
          // hex 转 hsv
          let hsv = convert.hex.hsv(result.sRGBHex);
          // 设置色盘、色相、透明度值
          this.alpha = 1;
          this.$refs.alphaSliderThumb.style.left =
            this.$refs.alphaSliderWrapper.offsetWidth + "px";
          let hueSliderWidth = this.$refs.hueSlider.offsetWidth;
          this.h = hsv[0]; // 色相值
          let left = (hsv[0] / 360) * hueSliderWidth;
          this.$refs.hueSliderThumb.style.left = left + "px";
          // 计算色相值
          this.computeHue(left);
          let panel = this.$refs.panel;
          this.cursorPosition.x = (hsv[1] / 100) * panel.offsetWidth;
          this.cursorPosition.y = (-(hsv[2] - 100) / 100) * panel.offsetHeight;
          this.getRgb(this.cursorPosition.x, this.cursorPosition.y);
        })
        .catch((e) => {
          // this.$message.error("取色失败！！！");
          alert("取色失败！！！");
        });
    },
    panelMousedown(e) {
      let panel = this.$refs.panel;
      // mousedown设置第一次位置并转换rgb值
      let x = e.pageX - panel.getBoundingClientRect().left;
      let y = e.pageY - panel.getBoundingClientRect().top;
      this.getRgb(x, y);
      document.body.addEventListener("mousemove", this.panelMousemove);
      document.body.addEventListener("mouseup", this.panelMouseup);
    },
    panelMousemove(e) {
      // 色盘元素
      let panel = this.$refs.panel;
      let panelWidth = panel.offsetWidth;
      let panelHeight = panel.offsetHeight;
      // 更新光标位置和颜色值
      const panelRect = panel.getBoundingClientRect();
      let cursorX = e.clientX - panelRect.left;
      // 边界判断
      if (cursorX < 0) {
        cursorX = 0;
      } else if (cursorX > panelWidth) {
        cursorX = panelWidth;
      }
      let cursorY = e.clientY - panelRect.top;
      if (cursorY < 0) {
        cursorY = 0;
      } else if (cursorY > panelHeight) {
        cursorY = panelHeight;
      }
      this.getRgb(cursorX, cursorY);
    },
    panelMouseup(e) {
      this.$emit('picked');
      document.body.removeEventListener("mousemove", this.panelMousemove);
      document.body.removeEventListener("mouseup", this.panelMouseup);
    },
    // 获取rgb值
    getRgb(x, y) {
      let panel = this.$refs.panel;
      let panelWidth = panel.offsetWidth;
      let panelHeight = panel.offsetHeight;
      let h = this.h;
      let s = parseFloat(((x / panelWidth) * 100).toFixed(2));
      let v = parseFloat(((-(y - panelHeight) / panelHeight) * 100).toFixed(2));
      let rgbArr = convert.hsv.rgb(h, s, v);
      this.cursorPosition.rgb.r = rgbArr[0];
      this.cursorPosition.rgb.g = rgbArr[1];
      this.cursorPosition.rgb.b = rgbArr[2];
      this.$emit('onpick', rgbArr[0], rgbArr[1], rgbArr[2])
      this.cursorPosition.x = x;
      this.cursorPosition.y = y;
      let r = this.cursorPosition.rgb.r.toString(16).toUpperCase().padStart(2, '0');
      let g = this.cursorPosition.rgb.g.toString(16).toUpperCase().padStart(2, '0');
      let b = this.cursorPosition.rgb.b.toString(16).toUpperCase().padStart(2, '0');
      this.cursorPosition.rgb.color = `#${r}${g}${b}`;
    },
    // 色相滑动
    hueMousedown(e) {
      e.stopPropagation();
      // 获取色相背景元素
      let hueSlider = this.$refs.hueSlider;
      // 获取色相滑块元素
      let hueSliderThumb = this.$refs.hueSliderThumb;
      // 鼠标按下设置初始值
      hueSliderThumb.style.top = e.offsetY + "px";
      this.computeHue(e.offsetY);
      // 获取鼠标当前x轴位置
      this.mousePageY = e.pageY;
      this.sliderTop = e.offsetY;
      document.body.addEventListener("mousemove", this.hueMousemove);
      document.body.addEventListener("mouseup", this.hueMouseup);
    },
    hueMousemove(e) {
      e.stopPropagation();
      // 偏移量
      let mouseOffsetY = e.pageY - this.mousePageY;
      // left最终值 当前位置 + 偏移量
      let top = this.sliderTop + mouseOffsetY;
      // 获取色相背景元素
      let hueSlider = this.$refs.hueSlider;
      //   获取色相滑块元素
      let hueSliderThumb = this.$refs.hueSliderThumb;
      if (top < 0) {
        top = 0;
      } else if (top > hueSlider.offsetHeight) {
        top = hueSlider.offsetHeight;
      }
      hueSliderThumb.style.top = top + "px";
      this.computeHue(top);
    },
    hueMouseup(e) {
      e.stopPropagation();
      this.$emit('picked');
      document.body.removeEventListener("mousemove", this.hueMousemove);
      document.body.removeEventListener("mouseup", this.hueMouseup);
    },
    // 计算色相值
    computeHue(top) {
      const sliderPercentage = top / this.$refs.hueSlider.clientHeight;
      const h = Math.round(sliderPercentage * 360);
      // 设置色相
      this.h = h;
      this.hue2rgb(h);
      this.getRgb(this.cursorPosition.x, this.cursorPosition.y);
    },
    // hue to rgb
    hue2rgb(h) {
      let doHandle = (num) => {
        if (num > 255) {
          return 255;
        } else if (num < 0) {
          return 0;
        } else {
          return Math.round(num);
        }
      };
      let hueRGB = (h / 60) * 255;
      let r = doHandle(Math.abs(hueRGB - 765) - 255);
      let g = doHandle(510 - Math.abs(hueRGB - 510));
      let b = doHandle(510 - Math.abs(hueRGB - 1020));
      let rgbString = "rgb(" + r + "," + g + "," + b + ")";
      this.$refs.panel.style.backgroundColor = rgbString;
    },
    // 透明度
    alphaMousedown(e) {
      e.stopPropagation();
      // 背景图元素
      let alphaSliderWrapper = this.$refs.alphaSliderWrapper;
      // 背景图宽度
      let wrapperWidth = alphaSliderWrapper.offsetWidth;
      //   滑块元素
      let alphaSliderThumb = this.$refs.alphaSliderThumb;
      //   设置滑块元素 left 值
      alphaSliderThumb.style.left = e.offsetX + "px";
      this.alpha = (e.offsetX / wrapperWidth).toFixed(2);
      console.log(this.alpha);
      // 获取鼠标当前x轴位置
      let mousePageX = e.pageX;
      let sliderLeft = e.offsetX;
      document.body.addEventListener("mousemove", alphaMousemove);
      document.body.addEventListener("mouseup", (e) => {
        e.stopPropagation();
        document.body.removeEventListener("mousemove", alphaMousemove);
      });
      let self = this;
      function alphaMousemove(e) {
        e.stopPropagation();
        // 偏移量
        let mouseOffsetX = e.pageX - mousePageX;
        // left最终值 当前位置 + 偏移量
        let left = sliderLeft + mouseOffsetX;
        if (left < 0) {
          left = 0;
        } else if (left > wrapperWidth) {
          left = wrapperWidth;
        }
        alphaSliderThumb.style.left = left + "px";
        self.alpha = (left / wrapperWidth).toFixed(2);
      }
    },
    colorChanged(presetIndex) {
      this.$emit('onpick', this.cursorPosition.rgb.r, this.cursorPosition.rgb.g, this.cursorPosition.rgb.b, presetIndex)
      this.$emit('picked');
    },
    colorFore(index, r, g, b) {
      this.cursorPosition.rgb.r = r
      this.cursorPosition.rgb.g = g
      this.cursorPosition.rgb.b = b
      this.index = index;
      this.colorChanged(index)
    },
    colorHexChanged() {
      if (this.cursorPosition.rgb.color.length != 7) {
        let i = 0;
        for (i = 0; i < 7; i++) {
          if (this.cursorPosition.rgb.color.length <= i + 1) {
            this.cursorPosition.rgb.color = this.cursorPosition.rgb.color + "0"
          }
        }
      }

      if (this.cursorPosition.rgb.color.slice(0, 1) != "#") {
        this.cursorPosition.rgb.color = "#" + this.cursorPosition.rgb.color;
      }

      this.cursorPosition.rgb.r = parseInt(this.cursorPosition.rgb.color.slice(1, 3), 16);
      this.cursorPosition.rgb.g = parseInt(this.cursorPosition.rgb.color.slice(3, 5), 16);
      this.cursorPosition.rgb.b = parseInt(this.cursorPosition.rgb.color.slice(5, 7), 16);

      if (Number.isNaN(this.cursorPosition.rgb.r)) this.cursorPosition.rgb.r = 0;
      if (Number.isNaN(this.cursorPosition.rgb.g)) this.cursorPosition.rgb.g = 0;
      if (Number.isNaN(this.cursorPosition.rgb.b)) this.cursorPosition.rgb.b = 0;

      let r = this.cursorPosition.rgb.r.toString(16).toUpperCase().padStart(2, '0');
      let g = this.cursorPosition.rgb.g.toString(16).toUpperCase().padStart(2, '0');
      let b = this.cursorPosition.rgb.b.toString(16).toUpperCase().padStart(2, '0');
      this.cursorPosition.rgb.color = `#${r}${g}${b}`;

      this.$emit('onpick', this.cursorPosition.rgb.r, this.cursorPosition.rgb.g, this.cursorPosition.rgb.b)
      this.$emit('picked');
    }
  },
};
</script>

<style lang="scss" scoped>
.rk-picker-layout {
  min-width: 0;
  flex-wrap: wrap;
  gap: 12px;
}

.rk-picker-rgb {
  flex: 1;
  min-width: min(280px, 100%);
  max-width: 410px;
}

.rk-picker-rgb-row {
  min-width: 0;
}

.rk-picker-channel {
  min-width: 0;
  flex: 1;
}

.rk-picker-channel :deep(.el-slider) {
  width: 100%;
}

@media (max-width: 700px) {
  .rk-picker-rgb {
    width: 100%;
    min-width: 0;
    margin-left: 0 !important;
  }

  .rk-picker-rgb-row > .mr-4 {
    margin-right: 12px !important;
  }

  .rk-picker-rgb-row > .ml-3 {
    margin-left: 8px !important;
  }
}

.color_active {
  border: 5px solid var(--cb75-accent, #45e6d0) !important;
}

:deep(.r) {
  --bg-color: #FF0000;
}

:deep(.g) {
  --bg-color: #00FF00;
}

:deep(.b) {
  --bg-color: #0000FF;
}

:deep(.el-slider__bar) {
  background-color: var(--bg-color) !important;
}

:deep(.el-slider__button) {
  background-color: var(--bg-color) !important;
  border: 3px solid #FFFFFF !important;
  height: 30px !important;
  border-radius: 3px !important;
}

:deep(.el-slider) {
  --el-slider-height: 10px !important;
}

:deep(.el-slider__runway) {
  background-color: #DCDCDE !important;
}

:deep(.el-slider__stop) {
  background-color: transparent !important;
}

.eyedropper {
  cursor: pointer;
}

.panel {
  width: 180px;
  height: 100px;
  position: relative;
  //   border: 1px solid #fff;
  background-color: rgb(255, 38, 0);

  // box-sizing: border-box;
  &>div {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }

  .white-panel {
    background: linear-gradient(90deg, #fff, rgba(255, 255, 255, 0));
  }

  .black-panel {
    background: linear-gradient(0deg, #000, transparent);
  }

  .color-picker-panel-cursor {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    position: absolute;
    // left: 100%;
    // top: 0;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 0 3px #fff, inset 0 0 2px 2px rgb(0 0 0 / 40%),
      0 0 2px 3px rgb(0 0 0 / 50%);
    background-color: transparent;
  }
}

.color-slider,
.color-slider-bar {
  position: relative;
}

.color-slider.is-vertical {
  width: 16px;
  height: 100px;
  margin-right: 8px;
  cursor: pointer;
}

.color-slider.is-vertical .color-slider-bar {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(180deg,
      red 0,
      #ff0 17%,
      #0f0 33%,
      #0ff 50%,
      #00f 67%,
      #f0f 83%,
      red);
}

.color-slider-thumb {
  background-color: #fff;
  border-radius: 4px;
  position: absolute;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  border: 1px solid #dcdee2;
  left: 0;
  top: 0;
  width: 100%;
  height: 5px;
  transform: translateY(-20%);
  box-sizing: border-box;
  position: absolute;
  pointer-events: none;
}

// 透明度
.alpha-slider-bar {
  width: 280px;
  height: 12px;
  position: relative;
  cursor: pointer;
}

.alpha-slider-wrapper,
.alpha-slider-bg {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  border-radius: 6px;
  background: linear-gradient(90deg,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 1));
}

.alpha-slider-bar.is-vertical .alpha-slider-bg {
  /* 这里先暂时写死 */
  background: linear-gradient(to top,
      rgba(255, 0, 0, 0) 0%,
      rgba(255, 0, 0) 100%);
}

.alpha-slider-wrapper {
  background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==");
}

.alpha-slider-thumb {
  background-color: #fff;
  border-radius: 4px;
  position: absolute;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  border: 1px solid #dcdee2;
  left: 100%;
  top: 0;
  width: 5px;
  height: 150%;
  transform: translateY(-20%);
  box-sizing: border-box;
  position: absolute;
  pointer-events: none;
}

.el-input-number {
  width: 52px;
  margin-left: 4px;
}
</style>
