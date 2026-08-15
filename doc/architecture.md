# 项目架构导读

## 一条业务链路

```text
Vue UI
  -> KeyboardDriverService（应用入口）
  -> DeviceSession（用例与状态）
  -> KeyboardDevice 能力端口
  -> C98Driver（设备装配）
  -> XsydKeyboardProtocol（协议实现）
  -> HidTransport（WebHID 实现）
  -> 键盘
```

依赖方向始终从外向内。领域层不知道 Vue、WebHID 或星闪协议；应用层只认识端口，不认识 C98。

## 各层负责什么

| 层 | 负责 | 不负责 |
| --- | --- | --- |
| `domain/` | 键位、键码、布局、校验等纯业务概念 | 设备通信、页面状态 |
| `application/` | 连接、读取、编辑、保存、回读验证等用例 | 拼协议字节、渲染页面 |
| `protocol/` | 命令编解码、CRC、响应解析 | 键盘外观、Vue 交互 |
| `transport/` | WebHID 打开、收发、断开 | 理解业务命令 |
| `devices/` | 将某型号所需协议、布局、键码目录组装成驱动 | 全局业务流程 |
| `components/`、`stores/` | 展示与用户交互 | 直接访问 WebHID 或拼报文 |
| `composition/` | 在程序入口注册具体实现 | 承载业务规则 |

## 为什么地址与布局要分开

一个键有两套完全不同的信息：

```text
MatrixAddress                  ControlGeometry
固件矩阵：row=3,column=1       页面位置：x=1.8,y=3,width=1
协议用它读写键位               UI 用它绘制键帽
```

以前把 `row`、`column` 同时当协议地址和页面坐标，会导致页面外观绑死协议矩阵。现在：

- `domain/layout.ts` 定义 `MatrixAddress`、`ControlGeometry` 和 `LayoutDescriptor`。
- `protocol/KeyboardProtocol.ts` 只解析矩阵地址，然后交给布局描述器投影。
- `devices/c98/layout.ts` 保存 C98 的物理外观。
- `components/KeyboardCanvas.vue` 只读取 `geometry`，不知道协议矩阵。

因此，同一协议增加新配列时，只需添加新的 `LayoutDescriptor` 并在设备驱动中注入；UI 和协议均无需修改。

## 如何扩展

### 新增同协议、不同配列

1. 在 `devices/<model>/layout.ts` 定义布局描述器。
2. 复用现有协议和传输实现。
3. 在新设备驱动中注入布局、键码目录和设备参数。
4. 在组合根注册驱动。

### 新增另一套协议

1. 在 `protocol/` 实现应用层需要的能力端口。
2. 协议内部独立处理命令、CRC、超时和错误映射。
3. 在设备驱动中选择该协议实现。
4. 不修改领域模型、应用用例和 UI。

### 更换 UI 框架

新 UI 通过 `KeyboardDriverService` 调用连接、编辑、保存等用例，并读取领域模型即可。核心层不依赖 Vue 或 Pinia。

## 判断边界是否健康

- 删除 Vue 后，领域和应用测试仍应能运行。
- 用模拟设备替换 WebHID 后，保存与回读流程仍应能测试。
- 增加新键盘时，原有协议和 UI 文件原则上无需修改。
- 协议报文中出现的矩阵坐标不应直接成为 CSS 坐标。
- 具体设备、协议和传输只应在装配位置相遇。

`tests/dependency-boundaries.test.ts` 检查静态依赖方向，`tests/layout.test.ts` 检查协议地址与视觉布局没有重新耦合。
