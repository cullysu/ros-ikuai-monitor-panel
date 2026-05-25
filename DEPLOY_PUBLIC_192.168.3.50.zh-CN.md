# 历史公开 RouterOS-only 实例说明

[English](./DEPLOY_PUBLIC_192.168.3.50.md) | [简体中文](./DEPLOY_PUBLIC_192.168.3.50.zh-CN.md)

这个文件只保留为旧版主机固定地址部署的迁移说明，不再作为公开项目的推荐安装路径。

新的公开安装请使用当前文档：

- [README.zh-CN.md](./README.zh-CN.md)
- [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md)
- [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
- [DEPLOY_WINDOWS_EXE.md](./DEPLOY_WINDOWS_EXE.md)
- [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md)

当前文档化的浏览器入口固定为：

```text
http://127.0.0.1:28646/
```

Linux/systemd 实例部署使用：

```bash
export ROS_PANEL_TARGET_IP="127.0.0.1"
export ROS_PANEL_BIND="0.0.0.0"
export ROS_PANEL_PORT="28646"
export ROS_PANEL_PROFILE="routeros_only"
export ROS_PANEL_IP_ALIAS_WRITE_ENABLED="0"
export ROS_PANEL_EXPOSE_ADMIN_SESSIONS="0"

export ROS_MONITOR_ROUTER_HOST="192.168.88.1"
export ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
export ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"

./deploy_linux.sh --instance routeros-panel --disable-ip-service
```

在能直接访问面板服务、或已经安装本机别名的客户端上验证：

```bash
curl -fsS "http://127.0.0.1:28646/api/health"
curl -fsS "http://127.0.0.1:28646/api/semantic-triage"
```

公开模式预期：

- `profile` 为 `routeros_only`。
- `target` 为 `127.0.0.1`。
- `meta.capabilities.publicRouterosProfile` 为 `true`。
- `meta.capabilities.readonlyDiagnostics` 为 `false`。
- `meta.capabilities.ipAliasWrite` 为 `false`。

旧的主机固定地址不再是公开项目默认值。如果面板运行在另一台局域网主机上，请按
[docs/LOCALHOST_ALIAS.md](./docs/LOCALHOST_ALIAS.md) 在客户端安装本机别名，浏览器仍打开
`http://127.0.0.1:28646/`。
