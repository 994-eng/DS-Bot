# 云端环境、Cua、ego 和每 Bot 一块屏幕

- 日期：2026-10-31
- 相关：994-eng/DS-Bot 这个 fork 的产品方向。不改 Fei2411 仓库里已经定下的浏览器插件规则。
- 代码：`extensions/`、`ds-bot/src/client/virtual-screen.js`、`app/src/virtual-screens.mjs`

## 为什么

这个 fork 要做一个更接近 Grok Bot 和 Groupbot 的桌面客户端：Agent 能操作一台 Linux 图形桌面，能用浏览器抓经过打码的网络记录，用户在右侧栏看到当前 Bot 自己的屏幕。团队仍是 DS Bot。不改 DeepSeek Harness，也不把电脑操作做成一套自己的 X11 守护进程或一套 MCP stdio 服务。

## 已定的行为

- Linux 上操作电脑的底层是 Cua 的 cua-spacesd。它在 TCP 3211 上提供 gRPC 和 gRPC-Web。截图、指针、键盘走 `cua.env.v1.ComputerService`，输入由 Cua Driver 执行。窗口和无障碍树走 `WindowsService` 和 `AccessibilityService`。
- 环境令牌只放在请求头里，不放进网址、能力配置或聊天。
- 活的 spacesd 用 protobuf。接上去用 `@trycua/cua` 的 `callJson`。仓库里的 mock 用同样的路径做测试，不是第二套协议。
- 一台机器、一个 spacesd、一份共享数据目录。每个 Bot 一个 `displayId`（`bot:<id>`）。指针和键盘只送到这个 Bot 的显示。
- 浏览器优先用 ego(lite)。一个 Chromium 进程，每个 Bot 一个 Task Space。F12 / 开发者工具对 Agent 来说是在这个 Space 上打开 CDP 的 Network。返回给模型之前打掉 Authorization、Cookie 和同类密钥。原始记录、cookie、页面脚本和下载要批准，默认拒绝。
- Playwright 仍是退路，也仍是桌面应用里现有的浏览器桥（`refs` / `script` / `task` 和 Electron 分区）。这次不把 DevTools 加进那三个插件。
- 桌面右侧栏增加 Screen。打开后，点另一个 Bot，这一栏跟着显示那个 Bot 的屏幕。屏幕之间不共用帧缓冲。
- 云端桌面的描述在 `extensions/cloud-desktop/`：Cua 的 Linux 镜像、3211 上的查看器、可选的 noVNC、共享的 `/data`。批准之后也只记下 docker 命令，不在这里启动容器。
- desktop-sandbox 的 `GET /screenshot` 和 `POST /action` 只在跑不起 spacesd 时作为更薄的数据面，不是默认。

## 不做什么

- 不改 DSH，不把测试指到用户的 `~/.dsh`。
- 不把 MCP stdio 当成电脑操作的主接口。
- 不在 Bot 之间同步 cookie，也不让一块屏幕收到另一块屏幕的输入。
- 不把环境令牌写进仓库、技能或截图。
- 不把这次的侧栏说成已经在播放 spacesd 的实时画面。模型和界面要接上像素流，还没接。

## 已知限制

- 规划器只会「点击引号里的名字」和「输入引号里的文字」。看图的是 Bot 自己的模型。
- ego 和 `@trycua/cua` 都不是这个仓库的依赖。没有它们时，测试走 mock。
- 启动云端桌面不会真的执行 docker。
- 特权操作的批准还不是 DSH 的审批卡。

## 变更

- 2026-10-31：写下这四块的骨架和右侧栏的 Screen 视图。
