# 一刻专注 · 中文学习番茄钟

纯 HTML、CSS、JavaScript 项目，无后端、无依赖，不需要构建。

## 使用与预览

在电脑终端执行：

```sh
cd /workspace/chinese-pomodoro
python3 -m http.server 8080 --bind 0.0.0.0
```

电脑打开 http://localhost:8080 。如果项目在你自己的电脑上，iPhone / iPad 与电脑连接同一 Wi-Fi，在 Safari 打开 `http://电脑的局域网IP:8080`（例如 `http://192.168.1.10:8080`），按需允许防火墙访问。远程工作区的 localhost 不能直接从手机访问，需使用工作区提供的端口转发或部署。

也可以在电脑直接打开 index.html 查看界面；日常使用建议通过 HTTP/HTTPS 访问，以保证本地存储行为稳定。

## 免费部署（推荐 GitHub Pages）

1. 登录 GitHub，新建仓库，例如 `chinese-pomodoro`。
2. 将 `index.html`、`styles.css`、`app.js` 上传到仓库根目录并提交。
3. 打开仓库 **Settings → Pages → Build and deployment**。
4. Source 选择 **Deploy from a branch**，Branch 选择 **main**，目录选择 **/(root)**，保存。
5. 等待部署完成后，打开页面显示的 HTTPS 地址，通常为 `https://你的用户名.github.io/chinese-pomodoro/`。
6. 在 iPhone/iPad Safari 打开该地址，点分享按钮 → **添加到主屏幕**，即可像独立小工具一样启动。

GitHub 免费账户使用公开仓库即可启用 Pages。应用数据不会上传到仓库，任务和记录仍仅保存在浏览器本机。

也可使用 Cloudflare Pages 免费套餐：创建 Pages 项目 → 直接上传静态资源，将上述三个文件放在上传目录根部 → 部署，即可取得 `https://项目名.pages.dev` 地址。平台菜单或免费套餐规则可能调整，以平台当前显示为准。

## 行为说明

- 专注 25 分钟、休息 5 分钟；支持开始、暂停、继续和重置。
- 完整完成一轮专注才计数；暂停、重置、切换模式均不会额外计数。
- 计时完成后切换至另一模式，等待手动开始，不会后台自动累计多轮。
- 根据截止时间计算剩余时间，支持刷新恢复；Safari 后台或锁屏时可能挂起网页，返回页面时会校正并登记完成。锁屏期间不保证提醒，本项目没有声音和系统推送。
- 今日次数按设备本地日期统计；跨午夜的一轮记录在其完成日，凌晨后界面自动显示新一天的数据。
- 任务与统计保存在 localStorage；清理网站数据会删除记录，不同设备、浏览器或网站地址之间不自动同步。建议同一时间使用一个页面计时；多标签页同时修改没有冲突合并。
- 支持安全区域、窄屏、iPad 双栏、触摸按钮、键盘操作和减少动态效果设置。
- 添加到主屏幕不等于离线缓存；本项目未配置 Service Worker，重新打开时需要网络。

## 代码检查

```sh
node --check app.js
node check.cjs
```

检查覆盖计时状态流转、重置、完成去重、刷新恢复、跨天、任务保存与清除、文本安全和存储异常。模拟 DOM 检查不替代真实 iPhone/iPad Safari 的布局、触摸和锁屏测试。

## 文件

- `index.html`：中文页面及语义结构
- `styles.css`：响应式界面
- `app.js`：计时、任务、本地存储
- `check.cjs`：无需安装依赖的逻辑检查
