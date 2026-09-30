# RouterOS 监控面板（main d8f0ead）问题总账

> 整合自三轮测试：①WAN 条数矩阵（1~100 条，612 截图）②44 场景极限工况 + HTTP 攻击面 ③SSH 全链路补测 + 前端审计。
> 测试工作区 `panel-wan-scale-test-d8f0ead`，明细见 `_scale/CHAOS_REPORT.md`、`_scale/out/`、`_scale/chaos/`。
> 去重后共 **22 项**：高危 4、中等 13、低 5。另附"验证过硬的清单"。

---

## 一、高危（4 项）

### H1. 活跃连接 / 终端流量排行从未工作过（REST+SSH 双路径）
- **位置**：`app.py:3899` `extract_local_ip`
- **问题**：对 `src-address` 直接 `ipaddress.ip_address()`，而连接地址是 `ip:端口` 形式（`192.168.88.2:4000`），必然 ValueError → 整行跳过 → `active_rows` 恒为空。
- **后果**：活跃连接列表、终端上下行速率、topIps、流量审计的终端排行全部恒为 0。与作者自己真机截图里"终端流量排行：当前未采集到"吻合——**该功能上线以来大概率没在真实数据下工作过**。
- **实证**：插桩测得 SSH 捕获 49178 字节、解析 200 行，进 build 后 0 行。
- **修法**：解析前按最后一个 `:` 拆端口（兼容无端口形式）。

### H2. 存储型 XSS（已在浏览器实测执行）
- **位置**：`public/layout-whitespace-patch.js:2711 / 2993 / 3513 / 3709`（`dns.servers` 未转义）→ `:1866` `opsStatTiles` 的 `${item.meta}` 原样输出。
- **后果**：能改路由器 DNS 配置的人（或被入侵的路由器）可在管理员浏览器执行脚本，并可借面板会话调用 POST 接口（改已保存路由器登录等）。实测 DNS 页/服务日志页执行 4 次。
- **修法**：4 处包 `escapeHtml`（一行改动 ×4）。

### H3. 一条畸形接口记录拖垮整个面板
- **位置**：`app.py:3770` `items.sort(key=... row["name"])`
- **问题**：接口名为 `None` 或数字时抛 TypeError（实测 `iface_missing_fields`、`wrong_types` 两场景）。
- **后果**：快照整体 `status=error`，WAN 显示 0，所有页面停在上一次可用数据。
- **修法**：排序键改 `str(row.get("name") or "")`，构建入口对字段做类型清洗。

### H4. 线路排序写死作者家线路名
- **位置**：`public/assets/panel-head.js:1037` `FIXED_PPPOE_LINE_ORDER = ['pppoe-out10'..'pppoe-out80']`
- **后果**：其他用户 15 条线时 `pppoe-out10` 恒排第一，首页"首条在线"、占比条顺序错乱，观感即"这软件是给特定人写的"。
- **修法**：删除该表，纯用自然排序（`localeCompare numeric` 已具备）。

---

## 二、中等（13 项）

| # | 问题 | 位置/实测 | 后果 |
|---|------|-----------|------|
| M1 | 日志只显示最旧的 60 条 | `build_logs` 取 `[:200]` 再 `[:60]`，RouterOS 日志从旧到新返回 | 5 万条日志时只见 #0–#59，**最新日志永远看不到**，日志中心在日志多的路由器上失效 |
| M2 | 计数器回绕/倒退处理错误 | `compute_rates`：`rx<prev` 即判重置清零 | 64 位回绕当周期速率掉 0；倒退/负数速率显示"-"；大流量线路周期性归零 |
| M3 | 后端截断数被当前端总数 | `app.py:4391` mangle `[:80]` | 100 线实际 200 条规则显示"分流规则 80"；ACL 80、ARP 120、租约 120、路由 160/120、地址列表 100 均无"显示 x/共 y" |
| M4 | 前端静默截断 | `panel-head.js:1890` `slice(0,8)`，另有多处 `slice(0,12/16)` | 10 条线以上首页不再变化且无任何提示 |
| M5 | 有 PPPoE 时其它 WAN 被隐藏 | `build_wan_lines`：存在任意 PPPoE 即只返回 PPPoE | 混合部署（PPPoE+DHCP/静态）下 DHCP WAN 在线路和接口角色里都消失 |
| M6 | 线路类页面无分页 | lineStatus/balance/routes/interfaces 线性增长 | 100 线时桌面 6775~12850px、手机 15292~17168px 长页；违背自家 `PRODUCT_MODEL` scale_adaptive 契约 |
| M7 | 大规模性能 | 1 万接口：快照 9.4MB/秒级轮询、接口页渲染 6.3s、面板 186MB；10 万路由 179MB | 低端设备/浏览器卡顿，序列化全量浪费 |
| M8 | 终端被网段过滤后显示 0 且无解释 | LAN 网段外的租约/ARP 全部丢弃 | 多 LAN/大网段用户看到"0 台终端"不知原因 |
| M9 | 超长名称撑爆布局 | 480 字符线路名实测 | 首页"首条在线"撑几十行、"最忙线路"大字号占满卡片、设备名溢出 |
| M10 | 异常数值不钳位不告警 | 实测 CPU 250%、-40% 原样显示；内存 free>total 显示 0%；400Gbps 显示 50GB/s | 数据明显异常时用户无从判断 |
| M11 | 路由器密码明文落盘 | `router_logins.json` 明文 + 文件内 warning 自述；`chmod 0o600` 在 Windows 无效 | 本机任意进程可读 |
| M12 | 错误提示泄露完整 REST URL | 401 时首页红条拼出完整请求 URL（含主机、字段列表） | 不含密码但冗长难读，观感差 |
| M13 | 手机宽度仍是桌面压缩 | 390px 实测 | 侧栏+宽表格，故障队列在卡片内横向滚动，12+ 线"切换线路"换行；与 M6 同属移动端专项 |

---

## 三、低（5 项）

| # | 问题 | 说明 |
|---|------|------|
| L1 | `ssh_capture` 竞态 | 服务器"先发 exit-status 后发数据"时静默拿到空文本（`app.py:3027`）；真实 RouterOS 不会，可加固 |
| L2 | RouterOS v6 格式原样透传 | 日期 `sep/28/2026`、uptime `1w2d03:04:05` 未统一格式 |
| L3 | 路由器时钟异常无告警 | 乱码/1970/2099 原样显示，不与本机比对 |
| L4 | 单线路占比显示 0.0% | 该线当期速率为 0 时应显示 100% 或"-" |
| L5 | 200 并发拒 5 个连接 | Windows 监听队列满，进程不崩；可调 backlog |

---

## 四、验证过硬的清单（攻击面与异常输入）

- 目录穿越（`../`、`%2e%2e`、`%5c`、绝对路径、`.env`）全部 404；
- Host 伪造、DNS rebinding（`127.0.0.1.nip.io`）全部 403；
- 全部 POST：无 session / 无 CSRF / 跨源 / text/plain 一律 403；超大与负 Content-Length 403 且不挂起；
- 畸形请求行 400、64KB URL 414、未知方法 501；60 个半开连接不阻塞；
- `/api/router-login` 不回传密码；面板日志无密码；ping 走参数数组无 shell 注入；
- 计数器乱码/浮点、资源全 0/乱码/倒挂、空响应体、HTML 响应、截断 JSON、401/500、线路抖动、慢响应、零 WAN、全离线、重复名、Unicode/零宽字符名：**44 场景零崩溃、零 NaN、零横向溢出、零 JS 报错**（除 H2/H3 两个已列问题）；
- `xss_everything` 全字段喷洒（用户列表、NTP、DHCP 服务器名、地址池、mangle、路由备注、日志主题、SSH 连接字段）：17 页 XSS 执行 0 —— H2 的 `dns.servers` 是唯一漏网点；
- 前端：`escapeHtml` 五字符全转义（含引号）、无 href/src 型注入、定时器先清后建、监听器一次性注册守卫、保存登录下拉用 textContent 转义；
- SSH 层：各场景连接总数正确透传、REST 404 正确回退 SSH、auth 拒绝/挂起/垃圾行/1MB 行/5 万行/慢滴流全部安全；
- DNS 静态分页参数钳位正确（limit 999→300、负值→1、offset 超界不崩）。

---

## 五、建议修复顺序

1. **H1** extract_local_ip 拆端口 —— 让终端流量/活跃连接功能复活（收益最大）；
2. **H2** dns.servers 四处 escapeHtml —— 堵唯一已实证的 XSS；
3. **H3** 接口排序崩溃 —— 一行防御；
4. **H4** 删写死排序表 —— 面向其他用户的第一印象；
5. **M1** 日志改最新优先（或倒序取尾部 60）；
6. **M3+M4** 所有截断处补"显示 x / 共 y"（后端已有 list_scale_meta 机制可复用）；
7. **M2** 计数器回绕按 2^64 处理；
8. **M10** 数值钳位 + 数据异常显式标注；
9. **M6/M7** 线路页分组/折叠/分页 + 大列表采样；
10. **M5** 混合 WAN 展示；
11. **M11** 密码 DPAPI 加密落盘；
12. **M9** 长名称 CSS ellipsis；
13. **M13** 移动端独立布局（长期，参照自家 mobile-reference-ui）；
14. L1–L5 顺手加固。

## 六、未尽事项

- ~~`conn_xss`（SSH 连接字段注入）的页面渲染验证被 H1 掩盖~~ **已复测关闭（2026-09-30）**：H1 修复后行进入渲染链（connTotal=50/20 证明解析通路），`conn_xss` + `xss_everything`（17 区块）重跑，`window.__xss` 全程 0、0 pageerror、无溢出——XSS 载荷因非法 IP 被校验层拒绝，`connection-mark`/`data-x` 属性注入未破出；
- ~~mock 未实现 SSH `dns/static print count-only`，DNS 静态 totalCount 未做端到端验证~~ **已关闭（2026-09-30）**：fake_ssh 补实现 count-only（计数经 ssh_state 注入），`dns_static_5000` 端到端实测快照 `dns.forwardRuleCount=5000` + `forwardRuleSample=true`（"显示 x / 共 y" 徽标数据源）；
- ~~未测 DHCP/静态 IP 型 WAN 拨号的完整矩阵~~ **已按发布面关闭（2026-09-30）**：生产验证路由器 chr-lab（ESXi CHR 7.15.3，192.168.3.66）即为 DHCP 型 WAN，real-machine 验收 11/11 ALL PASS（WAN 在线 + 速率历史 + 17 区块）；多 WAN 混合矩阵仍属 scale 专项；
- 每档采样约 1~2 分钟，趋势图点数有限。（测试节奏备注，非缺陷，不处理）

---

## 七、修复记录（2026-09-28，工作区就地修复，未提交）

状态：✅已修 ✅部分修 ⏳暂缓。验证=py_compile + node --check + `_scale/fixcheck/` 三个测试脚本全过（helpers 13 断言、build_snapshot e2e 8 项、登录存储往返）。

| # | 状态 | 修复内容 |
|---|------|---------|
| H1 | ✅ | `split_connection_endpoint()` 拆 `ip:port`/`[v6]:port`；`extract_local_ip` 解析后比对 router_ips。e2e 实证：LAN 终端速率 1000/5000bps 恢复，路由器自身连接仍被排除 |
| H2 | ✅ | 4 处 `dns.servers` meta 全部包 `escapeHtml`（2711/2993/3513/3709 对应行），与本文件 escape-at-source 惯例一致 |
| H3 | ✅ | 接口排序键改 `str(row.get("name") or "")`；e2e 实证 None 名接口下 snapshot 仍 ok |
| H4 | ✅ | 删 `FIXED_PPPOE_LINE_ORDER` 表，纯 `pppoe-out(\d+)` 后缀数字自然排序 |
| M1 | ✅ | `build_logs` 取尾部 200/60（最新窗口），e2e 实证 300 条日志显示 msg-240..299 |
| M2 | ✅ | `counter_delta()`：2^64 回绕按模计算，只有回跳过半空间才判重置；e2e 实证回绕速率 500bps 为正 |
| M3 | ✅ | scale_meta 新增 routes/securityFilters/addressLists/mangleRules/routingRules 五项；前端 `withScaleHint` 接入 9 个页面 subtitle（读 `snapshot.meta.scale`） |
| M4 | ✅ | 首页占比条 >8 条时显示"另 N 条未计入（共 M 条）" |
| M5 | ✅ | `build_wan_lines` 不再因 PPPoE 存在而隐藏其它 WAN；混合部署 e2e 实证 pppoe+DHCP 两行并存（自查修掉一处 `rows=[]` 覆盖 bug） |
| M6 | ✅ | `tableWithFold()`（默认 24 条+`<details>` 展开）接入 14 个大列表：lineStatus/接口/终端/ARP/租约/Filter/地址集/Mangle/路由表/流量负载×3/线路检测/策略路由；`table()` 加 indexOffset 保持序号连续 |
| M7 | ⏳ | 大规模性能（万接口 9.4MB 快照等）需采样/分页产品决策，本轮未动；scale meta + 折叠已显著降低 100 线渲染压力 |
| M8 | ✅ | 后端 lanScope（arpTotal/arpOutOfScope）透传至 `snapshot.terminalsLanScope`；终端页 0 台且有网段外记录时显示解释性 notice |
| M9 | ✅ | `.line-name` ellipsis、`.ik-summary-box b` 单行省略、record-value `overflow-wrap:anywhere` |
| M10 | ✅ | CPU/内存/磁盘钳位 0–100 + `resourceAnomaly` 列表；首页/流量负载页显示"数据异常提醒"danger notice |
| M11 | ✅ | Windows 上 DPAPI 加密（`dpapi:v1:` 前缀，c_void_p blob 避免堆损坏），旧明文兼容读，哨兵值不加密；存储往返 e2e 通过 |
| M12 | ✅ | `compact_exception_text()`：HTTP 状态码优先（"REST 返回 HTTP 401"），其余剥离 `for url:`/`with url:` 并限长 200；三处 REST 失败路径 + 连接测试页接入 |
| M13 | ⏳ | 移动端独立布局由 `ros-ikuai-monitor-panel-mobile-native-release`（iKuai NTR RouterOS App）承接，桌面仓不动 |
| L1 | ✅ | `ssh_capture` 空捕获+exit ready 时 0.5s drain，仅异常路径触发不加常驻延迟 |
| L2 | ✅ | `format_routeros_uptime`（1w2d03:04:05→1周2天 03:04:05）+ `format_routeros_clock`（sep/28/2026→2026-09-28），解析失败原样透传 |
| L3 | ✅ | `clockAnomaly`/`clockOffsetSeconds`（>15 分钟告警或解析失败告警），并入数据异常提醒 |
| L4 | ✅ | 单线路 0 速率占比显示 100%（而非 0.0%） |
| L5 | ✅ | `request_queue_size = 128` |

**未尽事项（原第六节）补充**：
- conn_xss 渲染复测：H1 已修，连接行现在会渲染，建议用 `_scale/chaos_ros.py` 对 `conn_xss` 场景重跑一轮页面级验证；
- 修复自测脚本保留在 `_scale/fixcheck/`（test_helpers.py / test_snapshot_e2e.py / test_login_store.py）；
- 本工作区 app.py 仍带 `_SCALE_REST_PORT` 压测插桩（3 处 URL 拼接），正式提交前需剔除；
- M7 暂缓项建议方案：快照按 bucket 采样接口/路由列表 + 趋势图降采样，需先定契约再动。

### 补充验证（2026-09-29，真实面板 + 无头浏览器 14/14 PASS）

拉起 `chaos_ros.py`（REST mock）+ `fake_ssh.py`（SSH mock）+ 真实 app.py（:28997），Playwright(chromium-1223) 无头验证：

| 验证项 | 结果 |
|---|---|
| 15 个页面基线扫页（pageerror + XSS 标记） | ✅ 零 JS 错、`window.__xss` 恒未置位 |
| **H2**：`xss_names` 场景（dns.servers=XSS 向量）下 dns4/serviceLogs/dhcp/security/overview | ✅ 不执行、零报错 |
| **conn_xss 复测**（原"未尽事项"）：H1 修复后 SSH 连接字段 XSS 首次真正到达渲染层（60 条活跃连接） | ✅ 渲染正常且脚本不执行 |
| **M6**：wan_1000 场景（1000 条线）lineStatus 折叠 | ✅ 显示 24 条 + "展开其余 976 条（共 1,000 条）"；**页面高度 1954px**（修复前 100 线即 6775~12850px） |
| M6 展开状态跨秒级轮询保持 | ✅（发现并修复：轮询重渲染会把展开收回去 → data-fold-key + localStorage + 渲染后恢复） |
| **M4**：首页"另 992 条线路未计入占比条（共 1,000 条）" | ✅ |
| **M9**：长名 ellipsis 生效 + 1000 线下无横向溢出 | ✅ |

**本轮新增改动**（浏览器验证暴露的缺口）：
- lineStatus 页故障优先队列表（compactTable 路径）与线路状态板卡网格原本不在 table() 折叠覆盖内 → 补 `queueTableHtml`/`boardFold` 折叠（keep=24）；
- 新增 `restoreFoldStates()`：折叠展开状态按 `区段:序号` 存 localStorage，renderApp 每次渲染后恢复——否则 1 秒轮询重渲染会把展开立即收回，折叠形同虚设。

自测脚本：`_scale/fixcheck/browser_check.py`（可重复执行；结束后场景自动回 baseline）。测试进程已全部停止。

### 批评回应落地（2026-09-29）：单元测试从零到 28

外部代码评审指出"165 个检查器验证产物、0 个单元测试验证逻辑；四个高危 bug 每个都是 10 行单测能拦住的"。已落地：

- 新建 `tests/test_core.py`（28 用例，全绿 0.16s，`python -m unittest discover -s tests -t .`）：
  - 批评点名的 4 个全部在内：`extract_local_ip` 拆 `ip:port`（3 用例）、None/数字接口名排序不崩（2 用例）、日志最新窗口可见、64 位计数器回绕；
  - 覆盖本轮全部边界加固：混合 WAN、lanScope 计数、scale meta 截断计数、overview 钳位+异常标注+时钟偏差、v6 日期/uptime 格式化、REST 错误脱敏、DPAPI 往返（Windows-only 用例）、登录存储往返+明文落盘断言；
  - 已接入 CI：linux-validation 加单测步骤，windows-packaging 加同套件（DPAPI 用例只在 Windows 激活）。
- 纠正评审一处细节：React 版（panel-framework）不在本仓分支，在姊妹仓 `ros-ikuai-monitor-panel-mobile-native-release/src/panel-framework/`（含 desktop/），双技术栈并存属实、位置跨仓。
