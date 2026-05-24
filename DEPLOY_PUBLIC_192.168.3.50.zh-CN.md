# 公开 RouterOS-only MVP 部署：192.168.3.50

[English](./DEPLOY_PUBLIC_192.168.3.50.md) | [简体中文](./DEPLOY_PUBLIC_192.168.3.50.zh-CN.md)

本文档描述只读 RouterOS 语义排障控制台的公开 MVP 部署路径。目标是在 `192.168.3.50` 上运行一套独立的 RouterOS-only 实例；它不是私有 `.3.5` 面板的克隆，也不会部署或修改 RouterOS/OpenWrt 配置。

## 范围

适合这个路径的目标：

- 公开产品方向的 RouterOS-only 控制台
- 只读采集 RouterOS 状态，并生成语义排障信息
- 使用独立 systemd 实例，避免覆盖既有旧版部署
- 默认不让宿主机自动管理次级 IP

不要把它当成：

- RouterOS 配置编辑器
- OpenWrt/Nikki/私有诊断包
- 缺少外部访问控制的公网服务
- 备份、NMS、告警或恢复工具的替代品

## 只读安全

- 使用 `ROS_PANEL_PROFILE=routeros_only`。
- RouterOS 用户应具备满足 API/SSH 采集所需的最小只读权限。
- 公开 profile 会禁用私有 OpenWrt/Nikki 诊断，并默认关闭 IP 别名写入。
- 面板没有 RouterOS 配置变更端点。IP 别名命名等本地便利功能必须显式开启，且不会写入 RouterOS。
- 不要把凭据写进 git；通过环境变量或 `/etc/default/routeros-panel-public50` 提供。

## Demo / 验证路径

如果只需要 demo 或 review 产物，先跑本地 fixture 检查，不接触部署主机：

```powershell
.\tools\check-local-predeploy.ps1 -Profile public -SkipBackend
```

如果要跑会启动安全本地后端的 smoke：

```powershell
.\tools\check-local-predeploy.ps1 -Profile public
```

当脚本自行启动后端时，会强制 `ROS_MONITOR_ROUTER_HOST=127.0.0.1` 和 `ROS_PANEL_PROFILE=routeros_only`，不会访问网络设备。

## 0）在 192.168.3.50 宿主机上预检查

1. 确认目标网卡已经持有 `192.168.3.50/24`：
   - `ip addr`
2. 如果准备使用 `ROS_PANEL_PORT=80`，确认端口空闲：
   - `ss -lntp | grep ':80 ' || true`
3. 确认 RouterOS 只读凭据已经在 git 之外准备好。

## 1）作为独立实例部署

在目标 Linux 主机的项目目录下执行：

```bash
# 选择实例名，只用 ASCII，避免空格和斜杠。
INSTANCE="public50"

# 公开 MVP 控制台配置。
export ROS_PANEL_TARGET_IP="192.168.3.50"
export ROS_PANEL_BIND="0.0.0.0"
export ROS_PANEL_PORT="80"
export ROS_PANEL_PROFILE="routeros_only"
export ROS_PANEL_IP_ALIAS_WRITE_ENABLED="0"

# RouterOS 只读连接信息。占位值请在 git 之外替换。
export ROS_MONITOR_ROUTER_HOST="192.168.3.1"
export ROS_MONITOR_ROUTER_USER="readonly-user"
export ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"

# 不启用 IP-heal，推荐用于公开 .3.50 实例。
./deploy_linux.sh --instance "${INSTANCE}" --disable-ip-service
```

部署后宿主机上会出现：

- 应用目录：`/opt/ros-ikuai-monitor-panel-${INSTANCE}`
- 环境文件：`/etc/default/routeros-panel-${INSTANCE}`
- 模板单元：
  - `/etc/systemd/system/routeros-panel@.service`
  - `/etc/systemd/system/ros-panel-ip@.service`
- 已启用面板实例：`routeros-panel@${INSTANCE}.service`
- 默认保持禁用：`ros-panel-ip@${INSTANCE}.service`

## 2）验证

```bash
systemctl --no-pager --full status "routeros-panel@${INSTANCE}.service"
curl -fsS "http://192.168.3.50/api/health"
journalctl -u "routeros-panel@${INSTANCE}.service" -n 100 --no-pager
```

预期 health 响应包含：

- `profile` 为 `routeros_only`
- `target` 为 `192.168.3.50`
- `status` 在采集成功后从 `starting` 进入 `ok`

## 3）可选 IP-heal

除非明确需要宿主机在网卡上添加或保持一个次级面板 IP，否则保持 IP-heal 禁用。

如果明确选择这个模型：

```bash
systemctl enable --now "ros-panel-ip@${INSTANCE}.service"
```

警告：如果这个 IP 已经被其他设备占用，启用 IP-heal 可能造成 IP 冲突。

## 4）RouterOS-only WAN 自适应

公开 `routeros_only` profile 不假设一定是 `8x PPPoE`。它会自动从以下来源识别逻辑 WAN：

- `interface/pppoe-client`
- `ip/dhcp-client`
- 活跃默认路由网关
- WAN 风格接口上的全局 / 类公网地址

UI 会按线路数量自适应：

- `1 WAN`：单线路聚焦，不伪造负载均衡卡片
- `2 WAN`：双线路并排对比
- `3 WAN`：三线路卡片对照
- `4 WAN`：2x2 矩阵
- `5~6 WAN`：高密度卡片矩阵
- `7~8 WAN`：更紧凑的表格派发模式
- `9~10 WAN`：运维模式，保留核心摘要并使用高密度表格

后端布局层级：

- `single`：`1`
- `few`：`2~3`
- `multi`：`4~6`
- `dense`：`7~10`

相关快照字段：

- `meta.profile`
- `meta.capabilities`
- `meta.wanCount`
- `meta.lineCount`
- `meta.lineLayoutTier`
- 顶层 `wan`
- `semanticTriage`
- `actionQueue`

## 公开 MVP 说明

- 这是公开产品包装草案，不是最终托管 demo。
- 公开 RouterOS-only 评审应使用实例化模式，避免覆盖历史私有部署文件。
- 部署和回滚应纳入操作者自己的 Linux / systemd 管理流程；这个仓库不部署到网络设备。
