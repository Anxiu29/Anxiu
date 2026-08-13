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

## 协议依据

- 星闪悦动键盘 SDK 文档：https://sparklinkplayjoy.github.io/keyboard-docs/keyboard/
- 项目内通信协议：`doc/星闪悦动通信协议-V1.0.7.xlsx`

协议层使用 0–3 表示四个布局层，UI 按官方 SDK 术语显示为 Fn1–Fn4。保存时只下发相对设备原始配置发生变化的键位，随后执行手动保存并完整回读验证。恢复出厂设置会导致设备断开并重新枚举，页面不会尝试复用旧 HID 会话。

设备筛选参数集中在 `src/config/devices.ts`。当前参数来自 `doc/C98.txt`。
