# RouterOS 只读语义排障面板

[English](./README.md) | [简体中文](./README.zh-CN.md)

这是一个面向 RouterOS 的只读运维面板，用来快速查看 WAN、路由、DNS、DHCP、终端、接口、流量和日志状态，并把原始状态整理成风险摘要、证据入口和下一步人工排查建议。

它不是 WinBox/WebFig、Grafana、Zabbix、LibreNMS、The Dude 或备份/配置 diff 工具的替代品。它的定位是让普通用户和运维人员更快知道“现在该先看哪里”，同时不授予面板修改 RouterOS 配置的能力。

## 推荐安装：Docker 一条命令

默认远程入口使用面板主机的局域网地址，安装器会打印类似：

```text
http://<panel-host-ip>:28646/
```

在运行面板的那台机器上，也可以打开 `http://127.0.0.1:28646/`。面板跑在别的局域网主机上时，客户端不需要安装本机别名 helper，直接打开 `http://<panel-host-ip>:28646/`。本机别名只保留为可选方案，给坚持在每台客户端都输入 `127.0.0.1:28646` 的用户使用，见 [docs/LOCALHOST_ALIAS.md](./docs/LOCALHOST_ALIAS.md)。

面板 API 会优先根据浏览器请求里的 HTTP `Host` 头显示真实访问地址，所以手动 Docker Compose 不再依赖容器自己猜宿主机 LAN IP。`ROS_PANEL_TARGET_IP` 只是日志和地址设置里的兜底值。

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash
```

打开安装器打印的局域网地址：

```text
http://<panel-host-ip>:28646/
```

如果就在面板主机本机访问，也可以打开 `http://127.0.0.1:28646/`。

首次进入面板后，在网页里的 RouterOS 登录页填写 SSH 地址、端口、账号和密码。公开安装不要求把真实 RouterOS 密码写进 `.env.docker`。

自定义安装目录或端口：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --dir "$HOME/routeros-panel" --port 28647
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

## 安装路径

安装路径是部署方式，不是产品版本。面板能力模式见 [PRODUCT_MODEL.md](./PRODUCT_MODEL.md)。

| 路径 | 适合谁 | 状态 |
| --- | --- | --- |
| Docker 一条命令 | 大多数 Linux/NAS/虚拟机用户 | 默认推荐 |
| Windows EXE | 不想安装 Python 的 Windows 用户 | 推荐首次试用 |
| Docker / Compose | NAS、小主机、Linux 主机、OpenWrt Docker、云主机 | 推荐部署 |
| 本地 Python | 开发者或调试者 | 支持 |
| Linux systemd / VM | 需要 systemd 托管的运维环境 | 专业部署 |
| RouterOS Container | 熟悉 RouterOS Container 的高级用户 | Beta / 高级 |

## 手动 Docker / Compose

如果你想自己管理 `.env.docker`：

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

首次运行打开：

```text
http://<panel-host-ip>:28646/
```

`.env.docker` 里的 RouterOS 凭据可以保持示例值，然后在网页登录页填写真实 SSH 信息。

## Windows EXE

解压 Windows ZIP 后，EXE 会自动打开检测到的面板地址；在 Windows 主机本机也可以使用：

```text
http://127.0.0.1:28646/
```

`routeros-panel.env` 里的面板默认值应保持：

```dotenv
ROS_PANEL_BIND=0.0.0.0
ROS_PANEL_PORT=28646
ROS_PANEL_TARGET_IP=auto
```

其他局域网设备访问 Windows 主机上的面板时，打开 `http://<panel-host-ip>:28646/`。

## Linux systemd / VM

systemd/VM 部署默认也使用：

```bash
export ROS_PANEL_BIND="0.0.0.0"
export ROS_PANEL_PORT="28646"
export ROS_PANEL_TARGET_IP="auto"
```

## RouterOS Container

RouterOS Container 是高级/Beta 路径。它会涉及 RouterOS container、storage、veth、可能还有 firewall/API 访问边界，不适合当作默认安装方式。

该路径的面板进程默认监听 `0.0.0.0:28646`，客户端应在你明确暴露服务后打开 `http://<panel-host-ip>:28646/`。`http://127.0.0.1:28646/` 只适合同机访问；本机别名是可选方案，不是默认要求。不要直接复制通用 NAT/防火墙规则到生产路由器。

## RouterOS 凭据

建议在 RouterOS 上创建专用只读用户：

- 不要使用 `admin`。
- 只授予采集所需的只读权限。
- 确认 RouterOS SSH 对运行面板的主机可达。
- 如果 RouterOS SSH 设置了 `allowed-address`，把面板主机地址加入允许范围。
- 不要把真实密码提交到 Git、截图或 issue。

保存密码时请理解：密码会写入面板所在机器或容器的数据目录，只适合你信任的单机或受控环境。

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

## 它会做什么

- 通过只读 API/SSH 路径采集 RouterOS 状态。
- 展示 WAN、接口、终端、DNS、DHCP、路由、分流、日志等信息。
- 根据当前快照生成语义排障队列。
- 默认保持公开部署的写入能力关闭。
- 对不同规模的 RouterOS 环境保留真实数量、可见数量、分页和采样提示。

## 它不会做什么

- 不修改 RouterOS 配置。
- 不修改 OpenWrt、Nikki/Mihomo、ESXi、DNS、DHCP、NAT、防火墙、路由、UPnP 或端口转发。
- 不内置多用户登录系统，也不负责 TLS 终止。
- 不替代 RouterOS 备份、配置审计或专业监控告警系统。

## 其他安装路径

- [DEPLOY_WINDOWS_EXE.md](./DEPLOY_WINDOWS_EXE.md)
- [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
- [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md)
- [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md)

## 安全基线

- 为面板创建专用只读 RouterOS 用户。
- 远程客户端使用面板主机的局域网地址，通常是 `http://<panel-host-ip>:28646/`。
- `http://127.0.0.1:28646/` 只代表当前这台客户端自己，除非在该客户端上安装了可选的本机别名 helper。
- 如果其他局域网设备打不开，检查面板主机防火墙是否放行 TCP `28646`；安装器会打印常见 `ufw`/`firewalld` 示例，但不会静默修改防火墙。
- 不要把面板直接暴露到公网。
- 跨网段、远程访问或多人使用时，先加 HTTPS 和认证。
- 面向公开/产品化部署时使用 `routeros_only`。
- 公开模式下保持私有诊断和本地写入能力关闭，除非经过单独评估。

## 当前状态

这是早期公开 MVP / 打包草案，适合受控本机或局域网环境里的只读观察。生产环境使用前，请先确认访问控制、日志、备份、升级和回滚流程。

## 许可证

当前尚未选择开源许可证。加入许可证之前，保留所有权利。
