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

## 真机联调前必须确认

协议文档未定义包头 CRC 的具体算法。目前 `src/protocol/codec.ts` 使用 8 位累加反码作为默认策略。请用固件实现或抓包数据确认，并只替换 `checksum8`，其余协议层无需改动。

设备筛选参数集中在 `src/config/devices.ts`。当前参数来自 `doc/C98.txt`。
