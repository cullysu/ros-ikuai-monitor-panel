# 外部评审处置台账（2026-10-01）

> 对象：一份七类四十余条的外部评审（技术债/代码质量/性能/安全/UX/产品/测试）。
> 方法：逐条对照当前树（v0.5.1，c5dec09）取证，**属实则处置，不符则证伪**。
> 结论速览：**证伪 17 条 · 已有机制/已修 14 条 · 属实记录（路线图/命名债/文档）15 条 · 本轮无需改产品代码**。
> 与上一轮评审（P0×4+P1×28，已全部整改）不同：本轮没有可修的代码级缺陷，主要是功能诉求、
> 与事实不符的判断、以及若干命名/文档债。

## 一、技术债

| 条目 | 结论 | 证据与处置 |
|---|---|---|
| app.py 单文件 139KB/4000 行 | **证伪** | 实际 9KB/329 行（薄入口）；主体 ros_panel/collector.py 3011 行，模块化包结构 |
| snapshot_builder.py 68KB/2000 行 | **证伪** | 文件不存在（评审对象与本仓库不符） |
| LegacyDesktopOverview.tsx 暴露问题 | 命名债 | 文件是活代码（DesktopOverviewScreen.tsx 引用），"Legacy"指迁移前布局保留在 React 面内；重命名纯搅动 import，记录不改 |
| MobileReference* 是临时实现 | **驳回** | mobile-reference-ui 是用户 2026-09-28 拍板的产品基线，五 Tab 契约已冻结（docs/mobile-product-contract.md），"参考"即权威 |
| panel-app / panel-app-mobile 类共存污染 | **驳回** | mobile 根节点是 `panel-app panel-app-mobile` 修饰符组合（BModifier 模式），跨表面选择器禁令是契约文档 |
| playwright-core 1.61.1 老旧依赖 | **证伪** | package.json 无 playwright-core（Playwright 只是 CI/测试工具，非运行时依赖） |
| vite 6.4.3 "为何不用 v5 稳定版" | **驳回** | 6.4 > 5，6 是当前稳定线，问题不成立 |
| requirements.txt 2 行、无 lock | 部分属实 | 运行时依赖仅 paramiko/requests 且已钉上限（`>=3.4,<4`）；"requirements.lock 29KB"不存在（证伪）；pip-tools/poetry 属工程偏好，记录可选 |
| package.json 100+ 检查脚本、check:decision-system 15 子命令 | **证伪** | 根 package.json 仅 3 个 scripts；16 个 check-*.js 在 tools/ 独立可单跑，无 decision-system 聚合脚本 |
| build-windows-exe.ps1 未验证 | **证伪** | v0.5.1 Release 工作流刚在 windows-latest 构建成功（exe 16.7MB + zip 17.0MB，含 sha256） |
| RouterOS Container Beta 警告 | 记录 | 这是有意的诚实文档警告（写 RouterOS 容器系统本来就有风险），非缺陷 |
| macOS 支持模糊 | 部分属实 | CI 矩阵为 ubuntu+arm64×py3.10-3.12，无 macOS；纯 Python 代码可跑，记录为可选矩阵扩展 |

## 二、代码质量

| 条目 | 结论 | 证据与处置 |
|---|---|---|
| 中英混杂 | 设计决策 | 产品语言中文（README 双语、用户面消息中文），非缺陷 |
| 神秘缩写 | 部分成立 | 领域术语（wan/pppoe/cgnat/upnp）有文档与能力地图；可选补 glossary，记录 |
| 七个 buildOverview* builder 过度抽象 | 判断题 | 七个函数确实存在，是证据模型的分解件（可独立测试）；刚冻结的面上不做重构，记录 |
| buildTabletComparisonObjects 暴露第三表面 | 命名债 | 活代码（evidence model 第 28 行引用），名字是历史痕迹，记录不改 |
| collector 巨石 | 部分属实 | collector.py 3011 行是主体，已按职责分包（ros_panel/ 13 模块）；继续拆分=路线图 |
| 环境变量缺 schema 验证 | 部分属实 | 53 个变量集中在 config.py/panel_access.py 读取、env.example 有文档；无 pydantic 式校验，记录 |
| unknown 先传再验会崩 | **驳回** | 先验证后使用的边界模式正是防运行时崩溃的正确做法 |
| 字符串枚举未收敛 | 部分成立 | schema 层有 literal 校验器兜底；TS 侧 as const 收敛记录为可选 |
| Python 无 mypy/pydantic | 属实 | 路线图记录 |

## 三、性能

| 条目 | 结论 | 证据与处置 |
|---|---|---|
| 全量快照重算卡顿 | 已缓解 | v0.5.1 快照行上限（默认 500）+ gzip 46.5:1（9.6MB→22KB 实测），前端拿到的不是 1MB+ 裸快照 |
| 无虚拟滚动 | 部分证伪 | React 桌面/移动已有分页与"显示 x / 共 y"采样披露，长列表不整页渲染 |
| readonly-diagnostics.js 193KB 手写图表 | **证伪** | 文件不存在 |
| 单进程阻塞 | 记录 | PRODUCT_MODEL 明文承认并定位为单路由巡逻工具，非多路由服务器 |
| 无缓存层 | **证伪** | 采集循环 1s/5s/60s 分层轮询进内存快照，/api/snapshot 服务缓存，不会每请求打路由器 |
| 无 WebSocket/SSE | 属实 | 轮询 by design（LAN 内 1s 轮询），SSE 记录为路线图可选 |
| Docker 1.5GB 内存上限 OOM | **证伪** | compose.yml 无任何内存限制，1.5GB 无出处 |
| 无优雅降级 | 已有 | 行采样上限 + payload 上限 + gzip 即降采样机制（M7 收口） |

## 四、安全

| 条目 | 结论 | 证据与处置 |
|---|---|---|
| env 明文密码 | 已处置 | 0.5.0 已在 compose 文档声明"密码不应经 env 传递"；落盘走 DPAPI 加密（router_config） |
| 无密钥管理集成 | 属实 | 路线图记录 |
| SSH 私钥未支持 | **属实** | 真差距（paramiko 仅密码路径）；路线图 Next 候选（含 RouterOS 侧公钥导入说明） |
| docker host forward 绕过 | **驳回** | 三层默认全关（env.example / panel_access.py / compose.yml `:-0`），opt-in 且有文档 |
| SSRF 跳板 | **驳回** | router host 是操作者自配的部署参数；威胁模型=局域网只读面板，公网部署明确"不做"（契约文档） |
| 无速率限制 | 部分证伪 | connection search 已有 429+Retry-After（server.py:361，0.4.0）；登录失败锁定无，记录（localhost 单用户场景） |
| 无操作审计 | 设计决策 | 隐私优先（PRIVACY.md：不留浏览痕迹）与"记录谁看了什么"互斥，记录为有意取舍 |
| 无自动脱敏 | 属实 | 路线图可选（分享脱敏指南已有） |
| 错误信息过详细 | 已修 | M12：compact_exception_text 剥离完整 URL 并截断 |

## 五、UX

| 条目 | 结论 | 处置 |
|---|---|---|
| 无离线 SW / 无推送 / 无深色模式 | 属实 | 三条均为功能诉求，记路线图 |
| 国际化缺失 | 设计决策 | 中文为产品语言，i18n 记录为路线图远期 |
| 时区处理不明确 | **本轮已修** | v0.5.1 证据时间戳改 RFC3339 UTC-Z，显示端按浏览器时区渲染（跨时区 12h 偏差实测 9/9） |
| 无错误代码 | 记录 | 可选 |
| SUPPORT.md 薄 | 部分属实 | 记录扩充 |
| 无社区渠道 | 产品决策 | 不处置 |

## 六、产品

| 条目 | 结论 | 处置 |
|---|---|---|
| "只读"但有写入口 | 已文档化 | ipAlias 写是唯一写操作且默认关、受开关保护（契约文档明示） |
| 私有功能混入公开版 | 已有机制 | profile 机制隔离禁用（readonly profile 不加载） |
| Desktop/Mobile 定位冲突 | 已文档化 | 契约冻结：桌面=对比台、移动=单手巡逻，用户已拍板 |
| Bus Factor=1 / 无商业模式 / 竞品 | 产品判断 | 非工程缺陷，不处置 |
| ROADMAP Later 模糊 | 记录 | 里程碑化=作者决策 |
| mobile-native-release 命名误导 | 部分证伪 | 那是姊妹仓库（Android 壳加载同一 React surface），本项目不含此名 |

## 七、测试

| 条目 | 结论 | 证据与处置 |
|---|---|---|
| 单元测试缺失 | 部分证伪 | tests/ 69 个单测 + 16 个 check-*.js 契约/回归 + 44 混沌场景 + 真机验收；覆盖率报告无，记录可选 |
| Mock 陈旧 | 部分成立 | 基线 7.15.3 与验证路由器（CHR 7.15.3）当前一致；升级监听记录 |
| 跨浏览器不足 | 属实 | Playwright chromium only，Safari/移动引擎覆盖记录为路线图 |
| 无压测 | **大幅证伪** | 1 万接口/10 万路由/612 截图矩阵/200 并发/5 万行 SSH——scale 测试即压测证据（ISSUES_MASTER）；k6 自动化记录可选 |
| 无内存泄漏检测 | 部分 | predeploy CDP 断言覆盖；持续化记录可选 |
| 无 SAST/DAST | 部分证伪 | dependency-audit 工作流（pip-audit + npm-audit）0.5.0 已上；Semgrep/ZAP 记录路线图 |
| 无 Fuzzing | **大幅证伪** | 44 混沌场景即畸形输入轰炸：乱码行/1MB 行/5 万行/截断 JSON/HTML 响应/401/500/NaN/Unicode 零宽（ISSUES_MASTER 第四节"验证过硬清单"），只是没叫 fuzzing |
| 无渗透测试 | 部分证伪 | 攻击面清单已测：目录穿越/Host 伪造/DNS rebinding/CSRF/超大请求/半开连接；外部渗透报告记录可选 |

## 处置汇总

- **证伪 17 条**：多为与本仓库不符的事实（不存在的文件、错误的行数/体积、无出处的配置值、方向搞反的版本判断）。
- **已有机制/已修 14 条**：采样、gzip、429 护栏、错误瘦身、DPAPI、compose 文档、依赖审计工作流、时区修复（本轮）等。
- **属实并记录 15 条**：SSH 私钥支持、密钥管理集成、SSE、深色模式、离线/推送、i18n、macOS CI、mypy、覆盖率报告、glossary、SUPPORT 扩充、Semgrep/ZAP、错误代码、自动脱敏、登录失败锁定——均已列入路线图池，按产品节奏排期。
- **命名债 2 处**（Legacy*/Tablet* 文件名）：活代码，重命名收益<搅动成本，记录不动。
- **本轮产品代码零改动**：评审未发现可修的代码级缺陷（区别于上轮 P0/P1 整改）。
