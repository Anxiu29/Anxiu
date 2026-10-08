# CB75 Mouse 固件资源

仅供 CB75 鼠标使用，与 CB75 键盘固件无关。两个文件由用户指定并授权复制。

- `cb75-mouse-20260922.bin`：来自 `rk-hub-web/tools/tlw/artifacts/firmware/cb75-mouse-capture-20260922.bin`，112164 字节；2026-09-22 USB 抓包还原的固件，未声明版本号。SHA-256：`0e50fe5838ddb08c53272ccd9c951e63b7d0d48a260705f8a98032e434e9b355`。
- `cb75-mouse-V0110-20260921.exe`：原文件名 `测试升级包(mouse)_X11_20U_001-RK525-XYW73A+8925-三模鼠标-CS43D0-V0110-20260921.exe`，3599360 字节。SHA-256：`2060fe33b8cf88d0679a4ff506a47fe3be4b03c26d8d1fccb70900f1ba9cd5a8`。仅复制并提供下载，未运行。

在线资源配置位于 `src/devices/cb75/firmwareResources.ts`。替换 BIN 时需要同步 SHA-256；浏览器先验证哈希和固件头再开放写入。不能由 EXE 文件名推断 BIN 的版本，也不自动判断设备是否已安装最新版本。

USB 升级代码同步自 `rk-hub-web/src/mouse/tlw/cb75/firmware.ts`：Report ID 5、16 字节数据块、CRC16、逐包确认。最终状态表示固件已发送，不代表已验证设备重启或安装版本。完成或传输失败后必须重新连接。
