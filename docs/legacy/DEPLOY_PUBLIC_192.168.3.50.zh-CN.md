# 历史公开 RouterOS-only 实例说明

[English](./DEPLOY_PUBLIC_192.168.3.50.md) | [简体中文](./DEPLOY_PUBLIC_192.168.3.50.zh-CN.md)

这个文件只保留为旧版主机固定地址部署的迁移说明，不再作为公开项目的推荐安装路径。

新的公开安装请使用当前文档：

- [README.zh-CN.md](./README.zh-CN.md)
- [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md)
- [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
- [DEPLOY_WINDOWS_EXE.md](./DEPLOY_WINDOWS_EXE.md)
- [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md)

当前公开项目浏览器入口固定为：

```text
http://127.0.0.1:28646/
```

在面板主机本机，也可以打开 `http://127.0.0.1:28646/`。

Linux/systemd 实例部署使用：

```bash
export ROS_PANEL_TARGET_IP="127.0.0.1"
export ROS_PANEL_BIND="127.0.0.1"
export ROS_PANEL_PORT="28646"
export ROS_PANEL_PROFILE="routeros_only"
export ROS_PANEL_IP_ALIAS_WRITE_ENABLED="0"
export ROS_PANEL_EXPOSE_ADMIN_SESSIONS="0"

export ROS_MONITOR_ROUTER_HOST="192.168.88.1"
export ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
export ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"

./deploy_linux.sh --instance routeros-panel --disable-ip-service
```

在面板主机本机验证：

```bash
curl -fsS "http://127.0.0.1:28646/api/health"
curl -fsS "http://127.0.0.1:28646/api/semantic-triage"
```

从其他局域网客户端验证时不应改成面板主机 IP；公开项目入口仍是 `127.0.0.1:28646`。

公开模式预期：

- `profile` 为 `routeros_only`。
- `target` 为检测到或配置的面板主机。
- `meta.capabilities.publicRouterosProfile` 为 `true`。
- `meta.capabilities.readonlyDiagnostics` 为 `false`。
- `meta.capabilities.ipAliasWrite` 为 `false`。

旧的主机固定地址不再是公开项目默认值。公开项目不要把面板主机局域网 IP 作为浏览器入口。
里的本机别名只是可选方案。
