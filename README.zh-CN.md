# RouterOS 只读语义排障控制台

[English](./README.md) | [简体中文](./README.zh-CN.md)

这是一个面向 RouterOS 运维的只读面板，用来快速理解 WAN、路由、DNS、DHCP、防火墙、接口、流量和日志状态。

它的定位不是替代 WinBox/WebFig，也不是重新做一套 Grafana、Zabbix、LibreNMS 或 The Dude。它真正要解决的是：把 RouterOS 的原始状态翻译成风险摘要、证据入口和下一步人工检查动作。

## 安装路径

| 路径 | 适合谁 | 状态 |
|------|--------|------|
| 本地运行 | 想几分钟内从电脑上试一下 | 推荐先试 |
| Docker / Compose | NAS、小主机、Linux 主机、OpenWrt Docker、云主机 | 推荐部署方式 |
| RouterOS Container | 想一体化跑在 RouterOS 附近的高级用户 | Beta / 高级 |
| Linux systemd / VM | 需要服务化和生产运维的用户 | 专业部署 |

## 快速开始：本地运行

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:ROS_MONITOR_ROUTER_HOST="192.168.88.1"
$env:ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
$env:ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"
$env:ROS_PANEL_BIND="127.0.0.1"
$env:ROS_PANEL_PORT="8080"
$env:ROS_PANEL_TARGET_IP="127.0.0.1"
$env:ROS_PANEL_PROFILE="routeros_only"
.\.venv\Scripts\python app.py
```

打开：

```text
http://127.0.0.1:8080/
```

Windows、macOS、Linux 细节见 [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)。

## 快速开始：Docker

```bash
cp .env.docker.example .env.docker
# 编辑 .env.docker，设置 ROS_MONITOR_ROUTER_HOST / USER / PASSWORD
docker compose --env-file .env.docker up -d --build
```

打开：

```text
http://127.0.0.1:8080/
```

Docker 是公开项目的默认推荐部署方式，因为它不要求用户有 ESXi 或单独的虚拟机，也能把面板和 RouterOS 本体隔离开。对局域网开放之前，先读 [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md)。

## RouterOS Container

RouterOS Container 作为高级/Beta 路径支持。它不是默认路径，因为它会涉及 RouterOS container、存储、veth，以及可能的 API/firewall 访问边界。

尝试前先读 [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md)，并先做 RouterOS 备份。

## Linux systemd / VM

Linux 部署脚本保留给需要 systemd 托管实例的专业用户：

```bash
export ROS_PANEL_TARGET_IP="192.168.3.50"
export ROS_PANEL_BIND="0.0.0.0"
export ROS_PANEL_PORT="80"
export ROS_PANEL_PROFILE="routeros_only"
export ROS_MONITOR_ROUTER_HOST="192.168.3.1"
export ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
export ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"

./deploy_linux.sh --instance public50 --disable-ip-service
```

在真实局域网主机上使用 systemd 路径前，先读 [DEPLOY_PUBLIC_192.168.3.50.md](./DEPLOY_PUBLIC_192.168.3.50.md) 或 [DEPLOY_PUBLIC_192.168.4.50.md](./DEPLOY_PUBLIC_192.168.4.50.md)。

## 它会做什么

- 通过只读 API/SSH 路径采集 RouterOS 状态。
- 从 `public/` 提供静态 Web UI。
- 从当前快照生成语义排障信息：
  - 采集异常
  - WAN 和默认路由风险
  - DNS/DHCP 压力
  - ARP 冲突
  - 接口丢包/错误
  - RouterOS 资源和连接压力
  - 安全日志线索
- 公开 profile 默认关闭写入类能力。

## 它不会做什么

- 不修改 RouterOS 配置。
- 不修改 OpenWrt、Nikki/Mihomo、ESXi、DNS、DHCP、NAT、防火墙、路由、UPnP 或端口转发。
- 不内置用户登录和 TLS 终止。
- 不替代 RouterOS 备份或配置 diff 工具。

## 仓库结构

- `app.py`：后端入口和 RouterOS 快照采集器。
- `public/`：静态前端。
- `Dockerfile`：容器镜像构建。
- `compose.yml`：推荐 Docker Compose 部署。
- `.env.docker.example`：不含真实秘密的 Docker 环境变量模板。
- `deploy_linux.sh`：Linux systemd 部署脚本。
- `routeros-panel*.service`：systemd 单元。
- `tools/`：本地 smoke 和浏览器验证工具。
- `DEPLOY_LOCAL.md`：本地试用路径。
- `DEPLOY_DOCKER.md`：Docker 部署路径。
- `DEPLOY_ROUTEROS_CONTAINER.md`：RouterOS Container Beta 路径。
- `docs/local-predeploy-checks.md`：本地预部署检查说明。

## 必要环境变量

至少需要设置：

- `ROS_MONITOR_ROUTER_HOST`
- `ROS_MONITOR_ROUTER_USER`
- `ROS_MONITOR_ROUTER_PASSWORD`
- `ROS_PANEL_BIND`
- `ROS_PANEL_PORT`
- `ROS_PANEL_TARGET_IP`
- `ROS_PANEL_PROFILE`

可以参考 [env.example](./env.example) 或 [.env.docker.example](./.env.docker.example)。不要把真实密码提交进 Git。

## 安全基线

- 给面板创建专用的 RouterOS 最小权限只读用户。
- 不要使用 RouterOS 的 `admin` 账号。
- 本地运行时保持 `ROS_PANEL_BIND=127.0.0.1`。
- Docker 默认只发布到 `127.0.0.1`，确认访问边界后再开放到局域网。
- 不要把面板直接暴露到公网。
- 如果访问跨出可信局域网，先加 HTTPS 和认证。
- 面向公开/产品化部署时使用 `routeros_only`。
- 公开 profile 会禁用私有 OpenWrt/Nikki 诊断；IP 别名写入应保持关闭，除非经过单独评审。

## 验证

```bash
python -m py_compile app.py
docker compose --env-file .env.docker.example config --quiet
curl -fsS http://127.0.0.1:8080/api/health
curl -fsS http://127.0.0.1:8080/api/semantic-triage
```

公开 profile 预期：

- `profile=routeros_only`
- `publicRouterosProfile=true`
- `readonlyDiagnostics=false`
- `ipAliasWrite=false`
- `POST /api/ip-alias` 返回 `403`

## 当前状态

这是早期公开 MVP / 包装草案，适合受控局域网测试和只读运维观察。不要直接暴露到公网。

## 许可证

目前尚未选择开源许可证。在加入许可证之前，保留所有权利。
