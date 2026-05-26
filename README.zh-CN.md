# RouterOS 只读语义排障面板

[English](./README.md) | [简体中文](./README.zh-CN.md)

这是一个面向 RouterOS 的只读运维面板，用来快速查看 WAN、路由、DNS、
DHCP、防火墙、接口、流量、资源和日志状态，并把原始状态整理成风险摘要、
证据入口和下一步人工排查建议。

它的定位是“语义排障”：告诉用户现在最该看哪里、为什么值得看、下一步应
该人工核对什么。它不是 WinBox/WebFig、Grafana、Zabbix、LibreNMS、
The Dude、备份工具或配置 diff 工具的替代品。

## 当前状态

这是早期公开 MVP，适合在受信任的局域网里试用和做只读观察。不要把面板
直接暴露到公网。如果访问范围离开受信任 LAN，请先加认证和 HTTPS。

## 安装路径

安装路径只是部署方式，不是产品版本。能力模式见
[PRODUCT_MODEL.md](./PRODUCT_MODEL.md)。

| 路径 | 适合谁 | 状态 |
| --- | --- | --- |
| Docker 一条命令 | 大多数 Linux/NAS/虚拟机用户 | 默认推荐 |
| Windows EXE | 不想安装 Python 的 Windows 用户 | 推荐首次试用 |
| Docker / Compose | NAS、小主机、Linux、OpenWrt Docker、云主机 | 推荐部署 |
| 本地 Python | 开发者或调试用户 | 支持 |
| Linux systemd / VM | 需要 systemd 托管的环境 | 专业部署 |
| RouterOS Container | 熟悉 RouterOS Container 的高级用户 | Beta / 高级 |

## 访问地址

正常的局域网访问地址是面板主机 IP：

```text
http://<panel-host-ip>:28646/
```

在运行面板的同一台机器上，也可以打开：

```text
http://127.0.0.1:28646/
```

普通局域网客户端不需要安装 localhost alias helper。那个 helper 只是给
坚持在每台客户端都输入 `127.0.0.1:28646` 的用户准备的可选方案。

面板 API 会优先根据浏览器请求里的 HTTP `Host` 头显示真实访问地址，所以
手动 Docker Compose 不再依赖容器自己猜宿主机 LAN IP。`ROS_PANEL_TARGET_IP`
只作为日志和地址设置里的兜底值。

## Docker 一条命令

安装脚本默认本地构建，避免公开安装依赖包可见性。CI 也会发布可选 GHCR 镜像：

```text
ghcr.io/cullysu/ros-ikuai-monitor-panel:main
```

更稳妥的首次安装方式是先下载、审阅、dry-run，再执行：

```bash
curl -fsSLO https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh
bash install.sh --dry-run
bash install.sh
```

短命令：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash
```

打开安装器打印的局域网地址，通常是：

```text
http://<panel-host-ip>:28646/
```

如果就在面板主机本机访问，也可以打开 `http://127.0.0.1:28646/`。

首次进入面板后，在网页里的 RouterOS 登录页填写 SSH 地址、端口、账号和
密码。公开 Docker 安装不要求把真实 RouterOS 密码写进 `.env.docker`。

自定义安装目录或端口：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --dir "$HOME/routeros-panel" --port 28647
```

强制本地构建：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --build-local
```

只有在 GHCR 包已经允许匿名拉取时，才使用预构建镜像：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --prebuilt
```

升级：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --upgrade
```

停止服务但保留本地数据：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --uninstall
```

彻底删除容器数据卷和安装目录：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --uninstall --purge
```

更多 Docker 细节见 [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md)。

## Windows EXE

目前还没有官方签名的预构建 EXE。公开发布正式 release 之前，建议在 Windows
上从源码构建：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-windows-exe.ps1
```

输出文件：

- `dist\routeros-triage-panel\RouterOS Triage Panel.exe`
- `dist\routeros-triage-panel\routeros-panel.env`
- `dist\RouterOS-Triage-Panel-Windows.zip`

从受信任的本地目录运行。项目当前还没有代码签名。

更多说明见 [DEPLOY_WINDOWS_EXE.md](./DEPLOY_WINDOWS_EXE.md)。

## 手动 Docker / Compose

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

首次运行时打开：

```text
http://<panel-host-ip>:28646/
```

`.env.docker` 里的 RouterOS 凭据可以保持示例值，然后在网页登录页填写真实
SSH 信息。

## 本地 Python

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:ROS_MONITOR_ROUTER_HOST="<routeros-host-or-dns>"
$env:ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
$env:ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"
$env:ROS_PANEL_BIND="0.0.0.0"
$env:ROS_PANEL_PORT="28646"
$env:ROS_PANEL_TARGET_IP="auto"
$env:ROS_PANEL_PROFILE="routeros_only"
.\.venv\Scripts\python app.py
```

同机打开 `http://127.0.0.1:28646/`，其他局域网设备打开
`http://<panel-host-ip>:28646/`。

## Linux systemd / VM

```bash
export ROS_PANEL_BIND="0.0.0.0"
export ROS_PANEL_PORT="28646"
export ROS_PANEL_TARGET_IP="auto"
export ROS_PANEL_PROFILE="routeros_only"
export ROS_MONITOR_ROUTER_HOST="<routeros-host-or-dns>"
export ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
export ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"

./deploy_linux.sh --instance routeros-panel --disable-ip-service
```

## RouterOS Container

RouterOS Container 是高级 Beta 路径。它会涉及 RouterOS container、storage、
veth，以及可能的 firewall/API 访问边界，不适合作为默认安装方式。

公开项目的默认路径是本地构建 RouterOS 可导入归档，再上传到 RouterOS：

```bash
bash tools/build-routeros-container-archive.sh --platform linux/amd64
```

GHCR 镜像只作为可选快速路径；只有确认匿名 `docker pull` 成功后，才在
RouterOS 里使用 `remote-image=`。

尝试前请阅读 [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md)
并先做 RouterOS 备份。

## RouterOS 凭据

建议在 RouterOS 上创建专用只读用户：

- 不要使用 `admin`。
- 只授予采集所需的只读权限。
- 确认 RouterOS SSH 对运行面板的主机可达。
- 如果 RouterOS SSH 设置了 `allowed-address`，把面板主机地址加入允许范围。
- 不要把真实密码提交到 Git、截图或 issue。

如果选择保存密码，请理解：RouterOS 登录信息会作为本地秘密保存在面板主机
或容器数据卷里。只在你信任的单机或受控环境中保存。

## 它会做什么

- 通过只读 API/SSH 路径采集 RouterOS 状态。
- 展示 WAN、接口、终端、DNS、DHCP、路由、连接和日志等信息。
- 根据当前快照生成语义排障队列。
- 默认保持公开部署的写入能力关闭。
- 对不同规模的 RouterOS 环境保留真实数量、可见数量、分页和采样提示。

## 它不会做什么

- 不修改 RouterOS 配置。
- 不修改 OpenWrt、Nikki/Mihomo、ESXi、DNS、DHCP、NAT、防火墙、路由、
  UPnP 或端口转发。
- 不内置多用户认证系统，也不负责 TLS 终止。
- 不替代 RouterOS 备份、配置审计或专业监控告警系统。

## 安全基线

- 为面板创建专用只读 RouterOS 用户。
- 不要直接暴露到公网。
- 跨网段、远程访问或多人使用时，先加 HTTPS 和认证。
- 面向公开/产品化部署时使用 `routeros_only`。
- 公开模式下保持私有诊断和本地写入能力关闭，除非经过单独评估。

## 支持和贡献

- 报告安装、登录或数据问题前先看 [SUPPORT.md](./SUPPORT.md)。
- 分享日志、截图或保存登录信息前，先看 [PRIVACY.md](./PRIVACY.md) 和
  [docs/security/CREDENTIALS.md](./docs/security/CREDENTIALS.md)。
- 项目边界见 [DISCLAIMER.md](./DISCLAIMER.md)，路线图见 [ROADMAP.md](./ROADMAP.md)。
- 提 issue 时使用 GitHub 表单，并脱敏日志和截图。
- 贡献代码前看 [CONTRIBUTING.md](./CONTRIBUTING.md)。
- 讨论中遵守 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。
- 安全问题按 [SECURITY.md](./SECURITY.md) 处理，不要发公开 issue。

## 常用验证

```bash
docker compose ps
curl -fsS http://127.0.0.1:28646/api/health
curl -fsS http://127.0.0.1:28646/api/semantic-triage
docker compose logs -f --tail=100 routeros-triage
```

从其他局域网设备验证时，把 `127.0.0.1` 换成面板主机 IP。

公开只读模式预期：

- `profile=routeros_only`
- `publicRouterosProfile=true`
- `readonlyDiagnostics=false`
- `ipAliasWrite=false`
- `POST /api/ip-alias` 返回 `403`

## 许可证

MIT，见 [LICENSE](./LICENSE)。
