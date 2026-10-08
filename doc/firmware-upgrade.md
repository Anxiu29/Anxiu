# 固件升级实现与学习记录

## 用了哪些资料

1. 官方 API 文档：https://sparklinkplayjoy.github.io/keyboard-docs/keyboard/api/info.html 。确认 `updateBin()`、`toBoot()`、进度和升级重连的公开接口。
2. 官方 npm 包 `@sparklinkplayjoy/sdk-keyboard@1.0.24`（MIT）：核对实际 `updateBin → updateDrive → toBoot/updateStart/toApp` 路径、16 字节签名算法、CRC 初值与多项式、512 字节补齐、244 字节写入、重启延时。检查使用的固定版本发布包：https://registry.npmjs.org/@sparklinkplayjoy/sdk-keyboard/-/sdk-keyboard-1.0.24.tgz 。签名计算移植到 `firmwareSignature.ts`，测试向量从这个版本的原算法独立执行得到。
3. **运行时实际复用** `@sparklinkplayjoy/protocol-keyboard@1.0.7` 的 `systemProtocol.blSIGN/blERASE/blREBOOT/blWRITE/blRCRC/blTOAPP` 编码器。固定版本，避免协议随依赖更新漂移。该包声明文件发布路径有误，本项目仅补充实际使用 API 的类型声明。
4. 本地 `doc/星闪悦动通信协议-V1.0.7.xlsx` 的通信协议表：核对 0x08–0x0E、Unlock 02–07、擦除进度 FF 表示完成、写入响应地址/长度、SYNC 的运行模式/板卡/SN/容量。
5. 用户提供的官方固件及 `doc/C98_firmware_1_us.json`：C98(739) 单模、v1.0.1、20250515a。读取原始二进制验证大小和 SHA-256；不把二进制放入 Git。

没有直接引入整套 SDK：其全局 HID 自动重连会与项目现有连接管理争用。项目复用官方编码器，保留自身会话生命周期；也没有引入 crypto-js，Bootloader 签名不需要它。

## 为什么之前不能升级

之前只有下载链接和文件选择 UI，按钮始终禁用；缺少签名解锁、Bootloader 重连、分块写入与整包校验。普通命令编码器只允许 60 字节数据，不能直接承载 250 字节的升级写入帧。

## 现在的流程

1. 用户选择“在线升级”或“本地升级”并确认型号与擦除提示。在线方式直接获取官方固定版本，无需下载和选择本地文件；本地方式选择已保存的官方 .bin 文件，使用相同的大小、SHA-256 和设备身份校验。切换方式或更换文件会重置确认。下载有 60 秒超时和大小限制，下载失败不会关闭设备会话。
2. 擦除前核对文件 SHA-256、设备 SYNC 信息及固件空间。当前只开放已核对的这一个文件，不根据扩展名或文件名判断兼容。
3. 关闭普通配置会话，交给固件独占通道。应用模式依次执行签名、erase(0)、签名、reboot，等待重新枚举。已经处于 Bootloader 时跳过此步骤。
4. 重连只探测指定 VID/PID；重新验证板卡、16 字节原始 SN 和运行模式。浏览器未授权的新接口由页面上的“授权升级设备”按钮触发授权，不能在后台自动弹窗。
5. Unlock 02 获取挑战值，再用挑战值解锁具体操作。擦除等待 FF 完成；固件用 FF 补齐至 512 字节，每次写入最多 244 字节，最后一块使用真实余数。官方编码器生成四个 64 字节 HID 报告，逐片等待发送完成。
6. 每块核对设备回显地址和长度。CRC 使用初值 0、多项式 0x8408、无最终异或；主机与设备对补齐后的整个镜像比较。校验通过才解锁跳转应用。
7. 等待应用模式重连并再次校验设备身份，然后重建普通会话、读取配置。只有这些步骤成功才提示完成。

相较所核对 SDK 的实现，本项目显式等待每个发送/解锁、等待擦除最终响应，并拒绝错误或重复的写入确认，不自动重试擦除/写入。解锁统一遵循协议要求的“02 → 挑战值 → 具体操作”链。重启可能没有 ACK，因此通过重连及 SYNC 确认运行模式，不能以 sendReport 成功当作升级完成。

## 文件与适用边界

- 文件：`XS105_RK739X_C98_App_v1.0.1_20250515a.bin`
- 原始长度：105588 字节；补齐后：105984 字节。
- SHA-256：`8bee06e292d3b4eb76249c0969c9d05731ff025d54c4b38d80a51bf5e2bcc78f`
- 支持 VID `0x1CA2` / PID `0x1604`。不会猜测其他型号或未知 Bootloader PID；如设备重枚举为其他 PID，需要先记录实际身份并核对厂商资料再添加。
- 在线获取使用官方 HTTPS 直链（已核对允许跨域访问），下载至浏览器内存后进行大小和 SHA-256 校验。不会自动采用未经核对的新版本，升级内容不上传服务器。
- 演示会话不允许刷写。升级期间锁定设备操作并启用页面关闭提示。
- 授权等待可以停止；停止不会恢复已擦除的固件。保持设备供电，重新在线升级恢复。Bootloader 的 Profile 只查询 SYNC，不调用应用配置指令，连接成功后直接显示升级入口。当前普通连接只识别已登记的 HID 接口和 VID/PID，不能保证识别设备在 Bootloader 下的枚举身份。
- 型号确认仍由用户根据实际设备完成；SHA-256 证明文件与指定下载一致，不等于验证所有同 VID/PID 的硬件变体。

## 验证及尚未完成的实机验证

自动测试覆盖官方签名向量、CRC 向量、成功流程、Bootloader 恢复、补齐及末块、签名拒绝、容量超限、板卡变化、写入回显错误、CRC 错误、擦除超时、错误文件和 UI 确认/锁定/授权。构建和类型检查用于验证集成。

2026-09-08 已完成实机只读验证：Windows 枚举到 VID 0x1CA2 / PID 0x1604，相关 USB/HID 接口状态为 OK；本地网页连接键盘、读取配置后显示“已就绪”，报告 App V1.0.1 与四层配置。未执行擦除或刷写。Bootloader 枚举身份、擦除响应、整包写入及重启恢复仍需单独实机验证，不能把只读连接或模拟通过表述为刷写成功。

## 升级诊断日志

设置 → 固件升级中，开始一次升级尝试后会显示“导出升级诊断日志”。日志只在浏览器内存中保存，点击后下载 JSON；刷新会清空。文件校验失败或等待授权期间也可以导出。

- `stage`：文件校验、进入 Bootloader、重连、擦除、写入、CRC、重启以及应用配置回读。
- `command`：命令编号、分片数、写入地址/长度、耗时和成功/失败。重启命令只记为 `sent`，不将发送成功误判成设备启动成功。
- `connection`：重新枚举设备时的身份查询或匹配错误。
- `result`：最终完成或失败及失败时的阶段；固件已启动但配置读取失败会落在 `reading-configuration`。
- `schemaVersion` 与时间戳便于复现；最多保存 4096 条，超出会丢弃最旧记录并增加 `dropped`。每次新的升级尝试会重置日志。

日志不包含固件正文、原始 HID 报文、签名种子和设备序列号。错误文本最多 500 字符。可根据最后的命令和阶段区分文件不匹配、签名拒绝、擦除超时、写入地址不符、CRC 不一致或重连失败。

完整实机验收应记录：刷写前文件校验结果、进入 Bootloader 后的身份匹配、每块确认、完整 CRC 结果、重启后的运行模式与配置回读。不要为验证恢复逻辑主动在擦除或写入期间断电。是否执行实际擦除刷写，应在确认目标设备、指定固件和配置备份情况后决定。

## 第三方署名

签名算法来自 `@sparklinkplayjoy/sdk-keyboard`，作者 `@sparklinkplayjoy`，包声明许可证 MIT。协议编码器来自同作者的 `@sparklinkplayjoy/protocol-keyboard`，许可证 MIT。

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
