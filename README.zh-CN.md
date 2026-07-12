# RouterOS 只读状态面板

[English](./README.md) | [简体中文](./README.zh-CN.md)

这是一个面向 RouterOS 的只读状态面板，用来快速确认设备是否在线、线路
是否正常、流量是否异常、资源是否吃紧，以及当前展示的数据是否新鲜、完整、
可信。

它的定位是“只读状态”：通过 RouterOS API/SSH 读取当前事实，并把状态、字段、
刷新时间和采集完整度讲清楚。它不做配置管理，也暂时不做排障工具；不是
WinBox/WebFig、Grafana、Zabbix、LibreNMS、The Dude、备份工具或配置
diff 工具的替代品。

## 当前状态

这是早期公开 MVP，适合在本机 localhost 场景里试用和做只读观察。不要把面板
直接暴露到局域网或公网。

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

公开项目的浏览器入口固定为：

```text
http://127.0.0.1:28646/
```

在运行面板的同一台机器上，也可以打开：

```text
http://127.0.0.1:28646/
```

普通局域网客户端不应直接打开面板主机 IP。需要跨设备时，应在客户端本机做转发，
让浏览器入口仍保持 `127.0.0.1:28646`。

面板 API 会优先根据浏览器请求里的 HTTP `Host` 头显示真实访问地址，所以
手动 Docker Compose 不再依赖容器自己猜宿主机 LAN IP。`ROS_PANEL_TARGET_IP`
只作为日志和地址设置里的兜底值。

## 公开交付矩阵

公开产品按四种交付方式保持同一套 RouterOS-only、本机 loopback 默认边界：

| 交付方式 | 运行时默认值 | 浏览器入口 |
| --- | --- | --- |
| RouterOS Container 补充 | 唯一默认开启 `ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=1` 的交付方式，只接受保留 `Host: 127.0.0.1:28646` 且带匹配 `ROS_PANEL_LOCALHOST_FORWARD_TOKEN` 的客户端本机转发访问 | 直接用容器/veth/LAN IP 打开仍会被 Host/token 守卫拒绝 |
| Docker / Compose | 容器内监听 `0.0.0.0`，宿主机只发布 `127.0.0.1:28646` | 在 Docker 宿主机打开 `http://127.0.0.1:28646/` |
| Windows EXE | EXE 监听 `127.0.0.1:28646` | 在 Windows 主机打开 `http://127.0.0.1:28646/` |
| Linux systemd / VM | 非 root systemd 服务监听 `127.0.0.1:28646` | 在 systemd 主机打开 `http://127.0.0.1:28646/` |
| RouterOS Container | 容器进程监听 RouterOS container 网络内部地址 | 客户端通过本机转发器打开 `http://127.0.0.1:28646/` |

四种方式都应保持 `routeros_only`、不信任代理头、关闭 IP alias 写入、关闭
admin session 暴露。`127.0.0.1` 永远是当前浏览器所在设备；跨设备访问必须先在
该客户端本机建立明确的转发或隧道。

面板里的“面板地址”对 Docker、Linux systemd/VM、RouterOS Container 是只读状态
视图；这些方式要改地址必须改安装 env/部署层后重启。Windows EXE 的 sidecar
`routeros-panel.env` 在普通可写目录下可以由面板保存，但仍只允许 loopback 地址。
这个“网络写入”开关只修改面板本机监听地址，不会向 RouterOS 写入任何配置。

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

打开安装器打印的本机地址：

```text
http://127.0.0.1:28646/
```

如果就在面板主机本机访问，也可以打开 `http://127.0.0.1:28646/`。

首次进入面板后，在网页里的 RouterOS 登录页填写 SSH 地址、端口、账号和
密码。公开 Docker 安装不要求把真实 RouterOS 密码写进 `.env.docker`。

自定义安装目录：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --dir "$HOME/routeros-panel"
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
http://127.0.0.1:28646/
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
$env:ROS_PANEL_BIND="127.0.0.1"
$env:ROS_PANEL_PORT="28646"
$env:ROS_PANEL_TARGET_IP="127.0.0.1"
$env:ROS_PANEL_PROFILE="routeros_only"
.\.venv\Scripts\python app.py
```

同机打开 `http://127.0.0.1:28646/`，其他局域网 IP 入口不作为公开项目部署目标。

## Linux systemd / VM

```bash
export ROS_PANEL_BIND="127.0.0.1"
export ROS_PANEL_PORT="28646"
export ROS_PANEL_TARGET_IP="127.0.0.1"
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
- 在首页和采集状态页展示采集状态、最后刷新时间、RouterOS 连接状态、
  WAN 在线数、最高风险指标和数据完整度。
- 在规则类页面提供摘要视图，并保留 RouterOS 原始字段展开。
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
- 公开模式下保持私有探测和本地写入能力关闭，除非经过单独评估。

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
curl -fsS http://127.0.0.1:28646/api/snapshot
docker compose logs -f --tail=100 routeros-triage
```

从其他局域网设备验证时不要把 `127.0.0.1` 换成面板主机 IP；公开项目入口固定为本机 loopback。

公开只读模式预期：

- `profile=routeros_only`
- `publicRouterosProfile=true`
- `readonlyDiagnostics=false`
- `ipAliasWrite=false`
- `POST /api/ip-alias` 返回 `403`

## 许可证

MIT，见 [LICENSE](./LICENSE)。
