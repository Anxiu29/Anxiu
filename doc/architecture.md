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

## 协议命令为什么也要声明化

协议适配器现在拆成三个角色：

```text
commands.ts                 XsydCommandClient             KeyboardProtocol
命令字、响应字、默认超时    排队、收发、响应匹配、错误     设备信息和键位业务语义
```

`KeyboardProtocol` 不再自己保存 pending 请求或监听 HID 报告。新增普通命令时，先在 `protocol/xsyd/commands.ts` 登记命令规格，再在协议业务适配器中组织请求数据。这样通信机制只有一份，命令知识也不再散落成魔法数字。

这里没有过度设计成通用协议框架：命令表和命令客户端仍明确属于 XSYD。等真正出现第二套协议后，再提取两种协议都证明需要的共同抽象。

## 能力为什么由设备描述，而不是协议决定

协议回答“怎样通信”，设备能力回答“这台设备允许做什么”。使用同一协议的两个型号，可能具有不同层数、矩阵大小，甚至一个允许改键、另一个只读。

`domain/capabilities.ts` 定义能力描述器，`devices/c98/capabilities.ts` 声明 C98 能力，设备驱动负责将它注入协议适配器。协议读取到设备和固件版本后，才解析最终能力并据此读取矩阵和层级。

静态型号可以使用 `StaticCapabilityDescriptor`；同一型号的旧固件若能力不同，可以使用 `VariantCapabilityDescriptor` 按设备或协议版本选择。这样版本分支停留在设备描述中，不会散落到 UI、会话和协议读写流程。

## 保存是应用事务，不是协议方法

`application/SaveConfiguration.ts` 将保存定义成可观察事务：校验、差异写入、设备提交、回读验证、完成。协议端口只提供原子能力，应用用例决定调用顺序。

事务比较使用 `layer + positionId` 作为稳定身份，不依赖设备回读数组顺序；保存前还会检查配置是否包含所有层和物理键位。任何阶段失败都不会替换 `DeviceSession` 中的编辑草稿，UI 可通过 `SaveProgress` 展示当前阶段。

## 关闭也是会话状态

协议命令客户端关闭后会同时拒绝当前请求和尚未执行的排队请求，禁止继续向已经释放的传输发送数据。WebHID 传输关闭时会移除设备报告监听、浏览器全局断连监听并清空订阅者，避免反复连接后累积回调。

## 领域模型不假设所有控件都是矩阵键

`PhysicalAddress` 是可辨识联合：普通键盘协议可以使用 `MatrixAddress`，旋钮、触控条或独立控制器可以使用 `IndexedAddress`。`LayoutDescriptor` 通过泛型约束输入地址；XSYD 和 C98 仍在编译期明确要求矩阵键，但公共 `KeyPosition` 不再把未来设备限制为行列矩阵。
