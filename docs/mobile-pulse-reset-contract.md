# 手机端重做合同：线路优先的运行脉冲

- **状态**：`prototype approved / production implementation pending`
- **日期**：2026-08-15
- **所有权**：仅手机与窄平板；桌面呈现不得导入本合同的组件或样式。
- **废止方向**：`src/panel-framework/mobile-native-ui` 当前卡片账本呈现已被产品所有者否决。其自动矩阵与内部审图只能作为工程历史，不能作为当前视觉签收。

## 1. 为什么重新开始

当前手机首屏仍由「结论卡、三格信号、路由卡、图表卡、对象卡」构成。虽然证据语义正确，但容器成为视觉主角，正常与事故只是在同一后台模板内换内容。它拥有 iOS 的安全区和触控尺寸，却没有原生手机的信息节奏；拥有冷蓝配色，却没有爱快以线路、接口、检测和比较为核心的效率。

因此本轮不继续调 `mnui-*` CSS，不从当前 JSX 复制结构。只保留已经验证的领域事实：

- `current / historical / unavailable`；
- `verified / unknown / offline` 路由状态；
- 缺失读数保持不可用，明确观测的零值仍为零；
- 只有完整的当前观测才能显示当前速率和趋势；
- RFC 3339 带时区时间；
- `navigator.onLine` 只能提示，不能阻断 LAN 快照请求。

## 2. 研究结论

### 爱快 4.0 / iKuai 负责什么

爱快感来自对象和比较，而不是蓝色皮肤：

1. 线路、接口、采集、资源是可定位对象；
2. 已连接、断开、检测失败、未绑定、未确认不能合并成抽象“健康”；
3. 当前状态、关键差异、短时趋势和后续检查入口必须在同一任务链；
4. 事故按影响对象排序，规模与统计只能在无事故时补充。

参考：

- [iKuai 官方系统概况](https://www.ikuai8.com/support/ymgn/lyym.html)
- [iKuai iOS App](https://apps.apple.com/cn/app/%E7%88%B1%E5%BF%ABikuai/id1630043774)

### iOS / Liquid Glass 负责什么

iOS 感来自内容与控制的层级、触控秩序和空间连续性，不是大字、大白卡或全屏毛玻璃：

1. 内容层连续、边到边；用分组、对齐和细分隔表达层级；
2. Liquid Glass 只属于导航、工具栏和瞬时控件；
3. 四个根导航稳定，搜索和刷新必须是真实动作；
4. 列表进入详情使用真实 push 路由，Back/Forward、焦点和滚动状态可恢复；
5. 常用操作 44px 以上，200% 文本不裁切。

参考：

- [Apple HIG — Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple HIG — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Apple WWDC25 — Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/)

## 3. 选定方向

三条独立方向分别强调线路对象、iOS 运行脉冲和单手决策轨。最终合并为 **线路优先的运行脉冲**：

1. 顶部设备上下文和两个真实工具动作；
2. 64–72px 证据脉冲带，只回答“当前能否据此判断”；
3. 正常态显示已核验默认 WAN、上下行读数与短时趋势；
4. 事故态删除趋势，把最高风险对象队列接管首屏；
5. 后续内容使用连续对象行，不给每个模块套独立圆角白卡；
6. 底部四根玻璃导航是唯一持续悬浮材料。

原型：

- `_design/mobile-reset-1038/originals/single-390x844.png`
- `_design/mobile-reset-1038/originals/interfaces-down-390x844.png`
- `_design/mobile-reset-1038/originals/resource-full-390x844.png`

## 4. 七种场景的结构要求

| 场景 | 首屏主位 | 必须撤回 |
| --- | --- | --- |
| `single` | 已核验默认 WAN、双向当前读数、短时趋势 | 无意义事故说明 |
| `fleet` | 跨设备最高风险对象；无事故才显示规模 | 用设备数量盖过接口/资源事故 |
| `all-offline` | 离线对象、最后可用证据、仍可达的采集面 | 当前速率和正常语气 |
| `no-snapshot` | 快照不可用、失败来源、哪些值不能判断 | 所有当前业务数字 |
| `collection-down` | REST/SSH 独立通道、最近成功时间、失败证据 | 将采集失败等同业务中断 |
| `resource-full` | CPU/内存/磁盘的当前、阈值、差值、采样连续性 | 流量趋势和终端排行 |
| `interfaces-down` | Down 接口按影响排序、承载关系、路由后果 | 正常 WAN 图抢首屏 |

## 5. 响应式能力

- `320/360/375/390/430`：单手连续内容流；证据和最高风险在首个有效视口。
- `667×375 / 844×390`：单一横屏任务；左侧设备/证据，右侧风险或趋势；禁止桌面侧栏。
- `768×1024`：真实对象列表 + 所选对象证据，列表结束后右栏不能空置。
- `200%`：行转为多行，单位和数值保持同组，不缩小字号换取通过。

## 6. 实现边界

新呈现必须拥有全新目录、选择器和测试身份；旧 `mobile-native-ui` 呈现接管后物理删除，不保留并行隐藏 DOM 或覆盖 CSS。允许共享领域模型、路由协议、证据格式和时间工具；禁止共享桌面或旧手机布局组件。

当前阶段只关闭了**原型方向**：第一次独立复核发现产品 P1×4、视觉 P1×5；两轮修正了接口影响分层、资源持续性、事故页证据链、图表语义和底部导航材料。最终两名独立评审均为 `PASS, P0=0, P1=0`。这不等于生产实现签收；生产产品、视觉、状态矩阵和发布门禁仍全部关闭。

## 7. 生产切换记录

生产手机所有权已经切到 `src/panel-framework/mobile-pulse-ui`：概览、模型、对象工作区、详情、导航和连接流程均使用独立 `mpu-*` 命名。`MobilePanelApp` 与兼容入口均已接入新组件；旧 `src/panel-framework/mobile-native-ui` 12 个呈现/样式文件已物理删除，路由成熟度源码指针同步迁移。类型检查通过。下一门禁是迁移运行时验收并生成真实七场景截图；在此之前不得把原型通过写成生产视觉通过。
