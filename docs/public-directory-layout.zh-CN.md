# public/ 目录组成（桌面 React 化后）

桌面默认前端已是 React（`src/panel-framework/`）。构建命令：

```
npm run build:framework
```

构建会（重新）生成 React 产物、计算内容寻址文件名，并**自动把 surface loader 注入 `public/index.html` 与 `public/index.react.html`**（先移除旧的 `panel-surface-loader.*.js` 引用再注入，重复构建幂等，恒为恰好 1 个 loader）。

## 当前组成

| 路径 | 角色 |
| --- | --- |
| `public/index.html` | **默认入口 = React 壳**（只含 `<div id="app">` + 一个 `panel-surface-loader.<hash>.js`） |
| `public/index.react.html` | React 壳的创作母本，loader 行与 index.html 保持同步 |
| `public/index.legacy.html` | vanilla（原生 JS）回退入口，直接访问 `/index.legacy.html` 使用 |
| `public/assets/framework/` | React 产物：`panel-desktop.<hash>.js` / `panel-mobile.<hash>.js`、对应 CSS、`panel-surface-loader.<hash>.js`、`manifest.json`（含 sha256 / gzip / brotli 记录） |
| `public/assets/panel-head.js` | **仅服务 legacy 入口**（`index.legacy.html`），React 桌面不加载 |
| `public/assets/panel.css` | 仅服务 legacy 入口的样式 |

注意：

- loader 按 `?surface=` / sessionStorage / 指针启发式选择桌面或移动 bundle，运行时注入；`index.html` 内不允许直接引用 `panel-desktop.*` / `desktop.*` 等资产（`tools/framework-asset-identity.js` 会拦截）。
- 手工编辑 `public/index.html` 时不要改动 loader 行；重跑构建即可自动同步（即使出现重复 loader 行也会被清理回恰好 1 个）。
- `PANEL_REACT_INDEX_TARGET` 环境变量可在引入新壳时把注入目标改为单个文件（默认处理 `index.html` + `index.react.html` 两个）。

## 与姊妹仓的关系

本仓 `public/` 与姊妹仓 `ros-ikuai-monitor-panel-mobile-native-release` 的 `public/` **相互独立，没有任何同步脚本**。两仓各自构建、各自发布；不要假设一方的资产 hash 或入口文件在另一方有效。
