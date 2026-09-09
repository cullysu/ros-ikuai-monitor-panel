
---

## Step 1214：图形化首次连接设置与运行时路由器切换（2026-09-08）

### 用户产品裁定

- 公开产品**不得要求用户编辑 env 文件**；首次打开必须是图形化配置界面，配置一次即保存为默认，并支持多路由器一键切换。
- 基底维持 dbb4f89（与 192.168.3.5 实况逐字节一致）。

### 实施内容

1. **首次连接设置界面**（`panel.js` + `panel.css`）：`/api/health` 检测 `needs_config` 时渲染居中设置卡（设备地址/用户名/密码/高级 SSH 端口/记住设备资料），POST `/api/router-login` 独立呈现 REST 与 SSH 通道结果（成功/失败圆点+消息条）。后端门槛由"SSH 必须通过"改为"REST 与 SSH 至少一通"（REST 为主采集通道；两者皆败才拒绝），杜绝用户路由器 SSH 抽风导致的假失败。
2. **运行时路由器切换**：顶栏"切换路由器"下拉列出已存档案（存了密码的档案一键切换）。后端 `POST /api/router-switch`（会话+CSRF 双守卫）：按 savedId 从服务端档案库取凭据（密码不出后端），重测通过后 `set_router_config` 应用到活采集器（每轮实时读配置，无需重启），并刷新档案 lastUsedAt。
3. **注册**：端点加入 `write_api_paths` 与 `bootstrap_write_api_paths`（首启无会话也能配置）。
4. 巨石拆分（75 行标记 + panel.css 1979 行 + panel-head.js 3877 + panel.js 191）与隐私清洗随本步一并保留。

### 本地验证

- Playwright：`needs_config` 时设置卡渲染、六字段齐全、0 JS 错误；无档案时切换器正确隐藏。
- 回归测试 pass；LAN 默认检查 ok；全仓库私人 IP 仅剩 MikroTik 出厂默认段。

### 边界

- REST 通道的协议/端口仍为部署级 env 配置（图形界面只读展示，不提供可伪造字段）；SSH 抽风时切换可能间歇失败（可重试）。
- EXE 重新打包后，首启即为本界面。

- outcome: `$OUT`

### Step1214 追加：Windows 本地运行须知（2026-09-08）

- 本机 `python` 为 Microsoft Store 空壳（退出码 49 无输出）。`local-predeploy-check.js` 及所有 spawn python 的工具必须显式传 `--python C:/Users/cully/AppData/Local/Programs/Python/Python313/python.exe`（或先修正 PATH）。
- `local-predeploy-check.js` 会随机选端口并通过子进程 env 传入（`os.environ.setdefault` 语义下 env 文件不会覆盖它），因此 `routeros-panel.env` 中不应写 `ROS_PANEL_PORT`，否则与本机常驻实例端口冲突导致子进程绑定失败。
- 上述两点已在本地以完整 predeploy 冒烟验证（exit 0, pass=true）。
