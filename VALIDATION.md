# 首版验收记录

验证日期：2026-09-08。环境：Windows、Node.js 24.15.0、Chrome / Playwright；浏览器测试采用隔离上下文，不覆盖玩家存档。

- `npm run build`：TypeScript 与 Vite 生产构建通过；应用、依赖和 Three.js 引擎已分包。
- `npm test`：6 项通过。涵盖道路连通、50% / 100% 效率、缺电停机与恢复、放置边界与碰撞、扩地候选与费用、三个世界初始布局无重叠。
- `npm run test:browser`：29 项通过，无未捕获浏览器异常。包含真实鼠标建造、升级、扩地、采集、旋转缩放、招募、交易、世界切换、双击直播间、节目与设备、天气、存档刷新、导入导出和损坏文件拒绝。
- `npm run test:settings`：暂停、4 倍速、昼夜滑条、新游戏重置与浏览器异常检查通过。
- `node tests/release.mjs`：8 项通过。1920 / 1440 / 390 像素宽度取景、侧栏缩小世界区域、左键平移、生产构建收入与交互、生产环境不暴露诊断接口、无运行异常。

测试报告：`test-results/report.json` 与 `test-results/release-report.json`。

截图：`test-results/final-1440.png`、`final-1920.png`、`final-390.png`、`final-shop.png`、`studio.png`、`nether.png`、`end.png`、`night-snow.png`。

运行浏览器验证需要开发服务器 5173；发布检查另需 `npm run preview -- --port 4173`。截图使用软件 WebGL 环境，因此未将其帧率作为普通电脑的 60 FPS 性能保证。
