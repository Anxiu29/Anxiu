# TLW 鼠标接入

## 使用与入口

运行 npm run dev，在首页点击“连接设备”。浏览器授权框同时列出 C98 键盘和 CB75 鼠标；选中后由 VID、PID、usagePage、usage 自动选择驱动。
同一页面一次管理一个设备。取消授权保留原连接；真正切换时关闭旧会话；宏有未保存修改时先确认。发现多台已授权设备时显示选择列表。
“演示模式”通过设备选择器提供键盘和 CB75 鼠标演示；鼠标演示配置与真机使用不同的本地存储键。

构建仍使用 npm run build，入口只有 index.html。已移除独立 tlw.html、独立 Vue 应用和 Element Plus 依赖。

## 分层与代码位置

- src/devices/catalog.ts：唯一设备注册目录，键盘、鼠标按相同插件结构登记。
- src/devices/cb75/config.ts：CB75 型号名称、VID/PID、HID 集合、报告 ID、分包长度、图片、按键布局和本地存储键。
- src/devices/cb75/CB75Driver.ts：识别接口、建立 TLW 协议、初始化、监听拔出和释放连接。
- src/application/DeviceService.ts：统一授权与会话切换；不负责解释具体协议。
- src/application/DeviceDriverRegistry.ts：生成授权筛选条件、匹配设备、拒绝重复 ID/HID 身份。
- src/application/MouseSession.ts：鼠标功能端口；页面和 Store 通过此接口工作。
- src/protocol/tlw/：协议命令、排队收发、分包、ACK 校验与设置回读。
- src/domain/mouse/：纯数据结构、编码、校验、宏和配置格式。
- src/stores/mouse/：鼠标状态、保存动作、DPI 同步和本地资料库。
- src/components/mouse/：原生 Vue 控件，复用 AppShell 和 Anxiu 主题。
- src/components/mouse/mouse.css：只作用于鼠标界面的响应式样式。

设备类别 kind 决定键盘/鼠标工作区；protocolFamily 声明 sparklink/tlw。键盘原有内部驱动 ID 和协议 ID 保留，避免破坏已有逻辑。

## 新增型号

1. 在 src/devices/新型号/ 放置配置、图片、布局和驱动。使用独立的型号 ID、HID 身份和本地存储键。
2. 驱动声明 kind、protocolFamily、capabilities 和 hid；connect 接收统一入口已选中的 HIDDevice，不再自行弹出授权框。
3. TLW 兼容鼠标可复用协议实现，但必须先核对命令族、分包、字段和实际能力。仅 VID/PID 相似不能证明协议相同。
4. 驱动返回 MouseSession 或 DeviceSession，并保证失败、拔出、关闭都会释放报告监听及设备。
5. 在 catalog.ts 登记 driver 与 presentation。页面无需增加型号名判断。
6. 添加身份冲突、初始化、切换及协议回读测试。不同协议的鼠标实现 MouseDevice 端口即可复用鼠标界面。

配置文件标识由 MouseIdentity.profileModel 注入本地配置库，驱动也将标识注入协议。CB75 保留既有 CB75-Mouse 标识及兼容默认值；新型号必须明确提供自己的标识。固定 128 字节配置块及 DPI 字段布局仍属于当前支持的协议变体，不代表任意 TLW 型号均可直接复用。

配置导入分两步校验：先验证 JSON 格式、型号和宏依赖，再根据当前设备检查有效物理键上的左键、空槽位、矩阵外保留字节以及当前 DPI 档位是否启用。第二步在任何宏、功能区或键位写入之前完成。配置写入仍是多段事务，中途通信失败不具备整份配置回滚能力；需要重连并回读设备确认实际状态。

## 固件更新

MouseFirmware.vue 只管理页面状态；application/MouseFirmwareImage.ts 负责本地文件读取、有限大小的在线下载、取消、超时和 SHA-256 校验。大小限制和固件头验证由型号的 MouseFirmwareSupport 提供，页面不内置 CB75 的字节上限。

CB75 的 USB 升级使用独立 Report ID 5，16 字节数据块和 CRC16。升级排入协议操作队列后停止常规通信；发送结束或传输失败后需要重新连接。已发送不等于已验证固件安装版本。本地更新提供 Windows EXE 下载，网页不运行 EXE。资源来源和哈希见 public/firmware/cb75-mouse/README.md。

## 协议与同步

业务层继续使用逻辑命令号；发送边界把 current 命令映射为 command + 0xa0。
有线分包 56 字节，无线 24 字节；无线保留接收器路由 payload[31] = 2。
每次只允许一个待匹配请求；检查报告、命令、地址、长度和 ACK。写入设置后回读。
DPI 页面等待本次读取完成，再通过 setTimeout 安排下一次；隐藏或卸载页面会暂停/停止调度。前台写入和会话代次校验防止旧读取覆盖新设置。

宏支持录制、手动插入、编辑、拖动顺序、播放方式、按键绑定和 JSON 导入导出。拖动移动整个动作对象，延迟随动作一起移动。宏库与配置库仍使用 cb75-mouse.macros.v1 / cb75-mouse.profiles.v1。
浏览器数据按站点源隔离；从其他域名或端口迁移时，先在旧页面导出，再导入新页面。

## 验证

npm run type-check 检查类型；npm test 运行现有键盘测试、新增设备/组件集成测试，以及 tests/tlw 中的抓包协议回归；npm run build 检查生产构建。
集成测试通过模拟 HID 回放，覆盖有线/无线高命令族、取消授权、错误接口、断开、失败重试、多个授权设备、宏拖动/草稿保护、硬件 DPI 同步和轮询停止。

自动测试和抓包回放不能替代实机验收。无线接收器的实际固件兼容、恢复出厂以及宏的物理播放/停止行为仍需连接设备确认。

浏览器验收使用临时抓包回放夹具，检查了 390px、768px、1024px 和桌面宽度、深浅主题，以及正式入口的 C98 演示。夹具已删除，不包含在交付代码或生产构建中。
