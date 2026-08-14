# Anxiu Keyboard Studio

基于 Vue 3、TypeScript 与 WebHID 的 RK-C98 网页驱动 MVP。

## 功能

- WebHID 设备授权、连接和断开监听
- 读取设备信息、默认矩阵与 FN0–FN3 键位
- 可视化键盘改键、未保存状态提醒
- 分批写入、设备保存和写后回读验证
- 重新加载与恢复出厂设置
- 无样机时可使用演示模式验证完整交互

## 启动

```bash
npm install
npm run dev
```

WebHID 正式环境必须使用 HTTPS；本地开发可使用 `localhost`。支持桌面 Chrome/Edge。

## 包头校验

协议的 1 字节包头校验为 `uint8(0x35 + head + len + cmd + data[len - 1])`；当数据为空时不累加数据字节。HID 报告尾部的 `0x00` 填充不参与计算。实现位于 `src/protocol/codec.ts`，并使用真机抓包建立了测试向量。

## 可替换架构

项目采用端口与适配器架构：

- `domain/`：纯键盘模型、校验规则和键码表，不依赖 Vue、WebHID 或具体协议。
- `application/ports.ts`：定义设备传输和键盘协议端口。
- `application/`：设备会话与应用门面，只依赖领域模型和端口。
- `protocol/`、`transport/`：星闪协议与 WebHID 的基础设施适配器。
- `devices/`：每种键盘的驱动插件，负责装配设备参数、协议和传输。
- `composition/root.ts`：唯一组合根，集中注册所有键盘驱动。
- `stores/`、`components/`：Vue UI 适配器，只通过 `KeyboardDriverService` 使用核心能力。

新增键盘时实现 `DeviceDriver` 并在组合根注册；新增协议时按需组合 `KeyboardDevice` 能力；新增传输方式时实现 `DeviceTransport`。替换 Vue UI 时可直接复用 `KeyboardDriverService` 和全部核心层。

协议能力采用可选组合，而不是要求所有键盘实现同一个巨型接口：`DeviceProfileCapability`、`KeymapCapability`、`ConfigurationCapability` 和 `FactoryResetCapability` 可独立提供。设备的静态身份、协议、传输和能力列表由 `DeviceManifest` 声明；只读设备可以只实现 profile 能力。

键码通过 `KeyCatalog` 注入会话：领域层的 `HID_KEY_CATALOG` 只包含公共 HID 定义，星闪扩展位于 `protocol/xsyd/keyCatalog.ts`，C98 驱动使用 `CompositeKeyCatalog` 组合两者。UI 从当前会话获取目录，因此增加其他编码体系不会修改 Vue 组件或污染公共键码。

跨层错误统一为带稳定 `DriverErrorCode` 的 `DriverError`。应用和 UI 可根据 `UNSUPPORTED_BROWSER`、`DEVICE_NOT_CONNECTED`、`PROTOCOL_TIMEOUT`、`PROTOCOL_CRC_ERROR`、`PROTOCOL_REJECTED`、`VERIFY_FAILED` 等错误码决定恢复动作，同时继续展示本地化消息。

## 协议依据

- 星闪悦动键盘 SDK 文档：https://sparklinkplayjoy.github.io/keyboard-docs/keyboard/
- 项目内通信协议：`doc/星闪悦动通信协议-V1.0.7.xlsx`

协议层使用 0–3 表示四个布局层，UI 按官方 SDK 术语显示为 Fn1–Fn4。保存时只下发相对设备原始配置发生变化的键位，随后执行手动保存并完整回读验证。恢复出厂设置会导致设备断开并重新枚举，页面不会尝试复用旧 HID 会话。

设备筛选参数集中在 `src/config/devices.ts`。当前参数来自 `doc/C98.txt`。
