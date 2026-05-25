# RouterOS 只读语义排障台

[English](./README.md) | 简体中文

这是一个面向 RouterOS 的只读运维面板，用来快速查看 WAN、路由、DNS、DHCP、终端、接口、流量和日志状态，并把原始状态整理成风险摘要、证据入口和下一步人工排查建议。

它不是 WinBox/WebFig、Grafana、Zabbix、LibreNMS、The Dude 或备份/配置 diff 工具的替代品。它的核心定位是：让普通用户和运维人员更快知道“现在该先看哪里”，同时不给面板 RouterOS 写配置的能力。

## 推荐安装：Docker 一条命令

默认安全安装，只允许本机访问：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash
```

打开：

```text
http://127.0.0.1:28646/
```

首次进入面板后，在网页里的 RouterOS 登录页填写 SSH 地址、账号和密码。公开安装不要求你把真实 RouterOS 密码写进 `.env.docker`。

如果确认只在可信局域网内使用，可以显式开放 LAN 访问：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --lan
```

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

首次运行仍然可以在网页里填写 RouterOS 登录信息；`.env.docker` 里的 RouterOS 凭据可以保持示例值。

手动开放 LAN：

```bash
ROS_PANEL_PUBLISHED_ADDR=0.0.0.0 docker compose --env-file .env.docker up -d --build
```

然后从局域网客户端打开：

```text
http://<面板宿主机LAN地址>:28646/
```

不要把面板直接暴露到公网。跨网段、远程访问或多人使用时，请先加反向代理、HTTPS 和认证。

## RouterOS 凭据

建议在 RouterOS 上创建专用只读用户：

- 不要使用 `admin`。
- 只授予采集所需的只读权限。
- 确认 RouterOS SSH 对运行面板的 Docker 宿主机可达。
- 如果 RouterOS 的 SSH 服务设置了 `allowed-address`，把面板宿主机地址加入允许范围。
- 不要把真实密码提交到 Git、截图或 issue。

保存密码时请理解：密码会写入面板所在机器/容器的数据卷，只适合你信任的单机或受控环境。

## 常用验证

```bash
docker compose ps
curl -fsS http://127.0.0.1:28646/api/health
curl -fsS http://127.0.0.1:28646/api/semantic-triage
docker compose logs -f --tail=100 routeros-triage
```

公开只读模式预期：

- `profile=routeros_only`
- `publicRouterosProfile=true`
- `readonlyDiagnostics=false`
- `ipAliasWrite=false`
- `POST /api/ip-alias` 返回 `403`

## 排障

页面打不开：

- 确认 Docker 正在运行。
- 查看 `docker compose ps` 和 `docker compose logs -f --tail=100 routeros-triage`。
- 如果端口被占用，用 `--port 28647` 换端口重新安装或启动。

局域网访问不到：

- 确认使用了 `--lan`，或设置了 `ROS_PANEL_PUBLISHED_ADDR=0.0.0.0`。
- 确认宿主机防火墙允许访问面板端口。
- 从其他设备访问时使用面板宿主机 LAN 地址，不是 `127.0.0.1`。

RouterOS 登录失败：

- 确认 RouterOS SSH 服务已启用。
- 确认账号密码不是示例值 `CHANGE_ME`。
- 确认 RouterOS 防火墙 input 规则允许面板宿主机。
- 如果提示 “TCP connected but no SSH banner”，通常是 RouterOS SSH 服务限制、服务 `allowed-address`、防火墙、连接限制或端口上不是 SSH 服务导致。

## 它会做什么

- 通过只读 API/SSH 路径采集 RouterOS 状态。
- 展示 WAN、接口、终端、DNS、DHCP、路由、分流、日志等信息。
- 根据当前快照生成语义排障队列。
- 默认保持公开部署的写入能力关闭。
- 对不同规模的 RouterOS 环境保留真实数量、可见数量、分页和采样提示。

## 它不会做什么

- 不修改 RouterOS 配置。
- 不修改 OpenWrt、Nikki/Mihomo、ESXi、DNS、DHCP、NAT、防火墙、路由、UPnP 或端口转发。
- 不内置用户登录系统，也不负责 TLS 终止。
- 不替代 RouterOS 备份、配置审计或专业监控告警系统。

## 其他安装路径

- [DEPLOY_WINDOWS_EXE.md](./DEPLOY_WINDOWS_EXE.md)
- [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
- [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md)
- [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md)

## 安全基线

- 为面板创建专用只读 RouterOS 用户。
- 默认保持 `127.0.0.1:28646`，确认访问边界后再做 LAN 暴露。
- 不要把面板直接暴露到公网。
- 跨网段或远程访问时，先加 HTTPS 和认证。
- 面向公开/产品化部署时使用 `routeros_only`。
- 公开模式下保持私有诊断和本地写入能力关闭，除非经过单独评估。

## 当前状态

这是早期公开 MVP / 打包草案，适合受控局域网测试和只读运维观察。生产环境使用前，请先确认访问控制、日志、备份、升级和回滚流程。

## 许可证

当前尚未选择开源许可证。加入许可证之前，保留所有权利。
