# 矩阵键值读取说明

## 结论

C98 的默认键位读取结果应保留完整的 `6 × 21 = 126` 个矩阵槽位。矩阵槽位和实际存在的按键不是同一个概念：

- 每个槽位都有固定的 `row + column` 地址。
- 槽位有按键时，`sourceCode` 是该位置的默认键值，`present = true`。
- 槽位没有按键时，统一保存 `sourceCode = 0`、`present = false`。
- UI 只渲染 `present = true` 的位置，因此空槽不会显示成按键。
- 协议读取当前层键值时，只查询真实按键，不向设备查询空槽。

## 为什么不能在协议层删除空槽

如果读取时直接跳过 `0`，返回数组虽然更短，但会失去两个信息：

1. 无法确认每条数据原本属于矩阵的哪一列。
2. 后续布局、抓包和固件文档无法按固定的 126 个槽位逐项对照。

因此领域模型同时保存完整矩阵和真实按键集合：

```text
完整矩阵槽位 positions：126 个
实际可配置位置：positions.filter(position => position.present)
UI 显示位置：同样只取 present = true
每层 assignments：只包含实际可配置位置
```

## 两行响应的数据位置

根据当前协议，每次请求两行，每行 21 个槽位。解包后的 `data` 包含状态字节，因此结构为：

```text
data[0]       状态码
data[1]       第一行行号
data[2..22]   第一行 21 个键值
data[23]      第二行行号
data[24..44]  第二行 21 个键值
```

三次读取分别请求：

```text
第 1 次：row 0、row 1
第 2 次：row 2、row 3
第 3 次：row 4、row 5
```

最终一定得到 126 个矩阵槽位。读取代码没有把 126 当成“126 个真实按键”。

## `sourceCode = 0` 与目标键码 `keyCode = 0` 的区别

这两个字段处于不同上下文，不能混为一谈：

- `position.sourceCode = 0`：默认矩阵表中该物理槽为空，所以不显示。
- `assignment.keyCode = 0`：真实按键被分配了编号为 0 的功能；该按键仍然存在，也仍然显示。

因此 UI 根据 `position.present` 判断是否显示，而不是根据当前分配的 `keyCode` 是否为 0 判断。

## 当前代码位置

- 矩阵解析：[KeyboardProtocol.ts](../src/protocol/KeyboardProtocol.ts)
- 槽位模型：[keyboard.ts](../src/domain/keyboard.ts)
- C98 演示矩阵：[layout.ts](../src/devices/c98/layout.ts)
- UI 空槽过滤：[KeyboardCanvas.vue](../src/components/KeyboardCanvas.vue)
- 相关测试：[layout.test.ts](../tests/layout.test.ts)

## UI 如何保证读取顺序不被视觉布局修改

读取层始终保留设备返回的原始 `row/column/sourceCode`，不会修改键值，也不会删除空槽。`C98OrderedMatrixLayoutDescriptor` 只根据产品图片调整少数键帽宽高，不允许把键移动到其他行：

```text
设备事实：row + column + sourceCode
视觉描述：y 永远等于 row，同一行始终按 column 递增
```

映射键必须是 `row + column`，不能是 `sourceCode`。原因是 sourceCode 表示该位置当前读取到的默认功能，将来可能改变或重复；矩阵地址才代表不变的物理位置。

这意味着设备返回的空槽会在页面中形成间隔，但不会显示键帽。比如抓包的第 1 行（矩阵 row 1）后半段是：

```text
... 2D 2E 2A 4C 00 00 53 54 55 56
            │  │
            │  └─ Del（0x4C）
            └──── Backspace（0x2A）
```

所以数据模型和 UI 中 Del 都必须紧跟在 Backspace 后面，并保持在同一行。Backspace 变宽后，只能把后续 Del 向右推，不能把 Del 移到顶部或其他区域。

当前尺寸表依据 `doc/C98(739)_单模_us(带旋钮）.png` 调整 Backspace、Tab、CapsLock、Enter、Shift、Space、数字区 0、数字区 + 和数字区 Enter。旋钮没有出现在当前 6×21 可配置矩阵中，因此对应位置保持空白，不创建旋钮控件，也不使用 Del 或其他键补位。
