# 移动端文字缩放证据边界

本目录只记录当前仍有独立证据边界的能力。多个脚本别名不代表多个独立能力，因此 Mobile Reference 只保留一个 canonical accessibility 命令。

| 命令 | 证明什么 | 明确不证明什么 |
| --- | --- | --- |
| `npm run check:mobile-accessibility-runtime-v2` | 当前 Mobile Reference owner 的浏览器运行时证据：7 个 mobile owner 视窗（含 568×320 与 768×1024）的导航归属、共享清单中的 18 条正式路由、标题/内容或空态、landmark、ID/ARIA target、唯一 `aria-current`、列表到详情的 Back/Forward 与焦点恢复，以及 200% 计算字号、reduced motion/transparency 和 forced colors。 | 浏览器工具栏缩放、实体设备系统字号、真实辅助技术读屏结果，或外部人工签收。 |
| `npm run check:browser-toolbar-zoom200` | **仅 Windows**：24 个 headed Microsoft Edge cell，覆盖 568 mobile 与 667/844 desktop 等真实 owner 视窗；每个 cell 都必须由页面 DPR 或布局视口的实际变化确认 200%，并记录当前 worktree identity、溢出、裁切、任务可达、焦点和 Windows-owned 截图。 | iOS Dynamic Type、Android/Windows 系统字号、CSS 注入字号、CDP page-scale 或物理手机表现。缺少 Windows、pywinauto 或真实 Edge 时会 fail closed。 |

这些自动门禁只能证明脚本实际断言的 DOM、布局、历史和模拟媒体状态。实体 iOS/Android 系统字号、真实 AT、浏览器工具栏操作与人工 owner 签收必须由各自独立证据关闭，不能由命令别名或 CSS/CDP 模拟代替。
