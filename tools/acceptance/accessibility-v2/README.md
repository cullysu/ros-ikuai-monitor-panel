# 移动端文字缩放证据边界

本目录的运行时验收把三类缩放证据刻意分开，避免把任一模拟结果写成实体设备结论。

| 命令 | 证明什么 | 明确不证明什么 |
| --- | --- | --- |
| `npm run check:mobile-accessibility-runtime-v2` | Chromium 真实浏览器进程中的两组互补证据：（1）物理输出尺寸保持不变、CSS 可用视口减半且 DPR 翻倍的 2x 布局压力配置；（2）同一真实浏览器中注入 **200% 计算字号** 后的重排断言，检查横向溢出、文字裁切、主要操作可达、限定步数的根区域 Tab 焦点和 landmark。 | 浏览器工具栏实际操作、iOS Dynamic Type、Android 系统字号。 |
| `npm run check:mobile-accessibility-runtime-v2-native` | Chromium CDP page-scale 的 200% 视觉缩放。 | 布局重排、工具栏缩放、OS 系统文字大小。 |
| `npm run check:mobile-accessibility-runtime-v2-css-fixture` | 测试注入的 CSS 字号翻倍及其重排压力。 | 浏览器缩放或任何 OS 文字大小。 |
| `npm run check:browser-toolbar-zoom200` | **仅 Windows**：16 个彼此独立的 headed Microsoft Edge cell（8 个 CSS 视口 × normal / `interfaces-down`）由 Windows UI Automation 聚焦。每个 cell 先真实 `Ctrl+0` 复位；每一个 200% 步进都必须由页面 DPR 或布局视口的实际变化确认。`Ctrl+Shift+OEM_PLUS`、`Ctrl+Numpad Add` 无效时才点击 Edge 真实“…”菜单的 Zoom in，UIA“已发送按键”永不算成功。验收记录五个已确认步进、DPR≈2、双轴布局比≈2、目标 CSS 视口、当前 worktree identity、横向溢出、非滚动且非省略号容器中的可见运维文字裁切、可达主要任务、键盘焦点和 Windows-owned 截图。每个浏览器上下文/进程在 cell 后回收，并有全局及单 cell 超时。Linux `check:release-gates` 只跑离线 fixture；Windows packaging 运行此真实矩阵并上传精确 SHA 绑定的 report/proof artifact，`--release-candidate` 仍拒绝缺失、陈旧或失败的本地真实报告。 | iOS Dynamic Type、Android/Windows 系统字号、CSS 注入字号、CDP page-scale 或物理手机表现。缺少 Windows、pywinauto 或真实 Edge 时会 fail closed。 |

主门禁对每个覆盖场景要求：无横向溢出、截图物理尺寸未丢失、主要操作可滚动到完整可视区域、键盘 Tab 焦点可见且未被裁切、可操作控件不低于 44 CSS px。200% 计算字号断言还要求文本确实达到约 2x、每个受测根区域位于唯一 `main` landmark 内、可见导航 landmark 有唯一名称，并把根区域内前至多 4 个可聚焦对象限制在至多 24 次 Tab 中完成检查。报告中的 `scalingEvidence.physicalOsTextSize.status = "not-proven"` 是预期的诚实状态；只有实体 iOS/Android 设备的独立人工验收记录可以关闭它。
