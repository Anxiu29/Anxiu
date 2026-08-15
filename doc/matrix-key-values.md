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

## UI 第一阶段严格显示读取顺序

当前 `C98MatrixLayoutDescriptor` 不再通过键码推测键帽所在行，也不对键位重新排序。视觉坐标直接使用协议矩阵坐标：

```text
geometry.x = address.column
geometry.y = address.row
geometry.width = 1
geometry.height = 1
```

这意味着设备返回的空槽会在页面中形成间隔，但不会显示键帽。比如抓包的第 1 行（矩阵 row 1）后半段是：

```text
... 2D 2E 2A 4C 00 00 53 54 55 56
            │  │
            │  └─ Del（0x4C）
            └──── Backspace（0x2A）
```

所以页面上 Del 必须紧跟在 Backspace 后面。此前布局按照键码维护另一份视觉顺序，错误地把 `0x4C` 放到了上一行；该逻辑已经删除。

目前页面展示的是“协议矩阵视图”，目的是优先保证读取结果完全可核对。以后如果需要真实键帽宽度和错位排列，必须根据权威的矩阵地址到物理几何表新增布局描述器；不能再根据默认键值猜测，因为默认键值会变化，也可能重复。
