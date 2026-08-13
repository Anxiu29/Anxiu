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

设备筛选参数集中在 `src/config/devices.ts`。当前参数来自 `doc/C98.txt`。
