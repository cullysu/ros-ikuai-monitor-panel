# 安装指南（简体中文）

本指南面向第一次使用的用户。四条安装路径任选其一即可，能力完全相同，
区别只是"装在哪"。装完之后的使用方式都一样：在浏览器打开
`http://127.0.0.1:28646/`，填一次路由器的只读账号，然后看面板。

开始之前只需要知道三件事：

1. 这个面板是**只读观察工具**，不会修改路由器配置。
2. 面板默认只在本机（127.0.0.1）可访问，这是有意设计，不是故障。
3. 你需要一个 RouterOS 的**只读账号**（推荐专门建一个 `panel` 用户，
   勾选 read / api / winbox 之外的策略按需给，不要用 admin）。

---

## 路径一：Windows 直装（推荐 Windows 新手）

**你要下载的文件**（在 GitHub Releases 页面）：

- `RouterOS-Triage-Panel-Windows-v0.3.0.exe` ← 单文件直装版，下载这一个就够
- `RouterOS-Triage-Panel-Windows-v0.3.0.exe.sha256` ← 校验文件（可选）

**操作步骤**：

1. 下载 `RouterOS-Triage-Panel-Windows-v0.3.0.exe` 到任意文件夹，
   比如 `D:\RouterOS面板\`。
2. 双击运行。如果 Windows SmartScreen 弹出提示：点 **更多信息** →
   **仍要运行**。（程序没有做代码签名，这是个人开源项目的常见情况；
   不放心的话先按下面"校验文件"一节核对 SHA256。）
3. 会弹出一个**黑色控制台窗口**——这是面板本体，不要关。浏览器会
   自动打开 `http://127.0.0.1:28646/`；如果没自动打开，手动在浏览器
   输入这个地址。
4. 在面板连接页填写：
   - 路由器地址（例如 `192.168.88.1`）
   - REST 方式保持默认 `https` / 端口 `443`
   - SSH 端口保持默认 `22`
   - 只读用户名和密码
5. 点连接。第一次连接 SSH 时面板会让你**确认路由器的密钥指纹**，
   按面板提示与路由器上 `/system/ssh` 显示的指纹核对一致后确认即可。

**日常使用**：以后每次想看面板，双击同一个 exe 就行。浏览器打开
`http://127.0.0.1:28646/`。

**卸载**：删除 exe 文件即可，不写注册表、不留服务。

**常见问题**：

- 提示端口被占用：说明 28646 端口有别的程序在用，关掉它再双击 exe。
- 浏览器打不开：在运行 exe 的那台电脑上手动输入
  `http://127.0.0.1:28646/`。
- 其他电脑/手机打不开：**这是正常的**。公开版只允许本机访问。
- 杀毒软件报未知程序：没有代码签名的 PyInstaller 程序可能被误报，
  校验 SHA256 与 Release 页一致后加入信任即可。

**校验文件（可选但推荐）**：在命令提示符（cmd）里执行：

```bat
certutil -hashfile "D:\RouterOS面板\RouterOS-Triage-Panel-Windows-v0.3.0.exe" SHA256
```

把输出的值与 Release 页 `.sha256` 文件里的值对比，一致说明文件没被篡改。

> 偏好绿色解压版的用户：下载 `RouterOS-Triage-Panel-Windows-v0.3.0.zip`，
> 解压后运行里面的 `RouterOS Triage Panel.exe`，效果相同，另外附带
> localhost 域名别名工具。

---

## 路径二：Docker 一条命令（推荐 Linux / NAS 用户）

前置条件：机器上有 Docker（NAS 一般在套件中心装"Docker"即可）。

**方式 A：从源码自动构建并运行（默认，最省心）**

在 SSH 终端里执行一条命令：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash
```

脚本会自动克隆源码、构建镜像、启动容器并设好开机自启。完成后打开
`http://127.0.0.1:28646/`（在这台机器的浏览器里）。

**方式 B：使用预构建镜像（不在这台机器上编译，更快）**

到本项目的 GitHub Releases 页面，找到 v0.3.0 的说明里
"预构建镜像"一节，整条复制执行，形如：

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --prebuilt --image ghcr.io/cullysu/ros-ikuai-monitor-panel:sha-<40位提交号>
```

（`sha-<提交号>` 是与发布提交一一对应的不可变镜像标签，Release 页会
给出写好的完整命令。）

**管理命令**：

```bash
# 停止并卸载
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --uninstall

# 连数据卷一起清掉
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --uninstall --purge
```

更细的用法见 [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md)。

---

## 路径三：Linux systemd / 虚拟机（推荐常驻部署）

**你要下载的文件**：`RouterOS-Triage-Panel-Linux-v0.3.0.tar.gz`

**操作步骤**（Debian/Ubuntu 为例，需要 python3）：

```bash
tar -xzf RouterOS-Triage-Panel-Linux-v0.3.0.tar.gz
cd ros-ikuai-monitor-panel
sudo ./deploy_linux.sh --instance routeros-panel --disable-ip-service
```

脚本会自动：装依赖（python3-venv）、建虚拟环境、注册并启动
`routeros-panel@routeros-panel` 系统服务、设置开机自启。

**验证**：

```bash
systemctl status routeros-panel@routeros-panel
```

然后在**这台机器上**的浏览器打开 `http://127.0.0.1:28646/`。

**改端口**：编辑 `/etc/default/routeros-panel-routeros-panel` 里的
`ROS_PANEL_PORT`，然后 `sudo systemctl restart routeros-panel@routeros-panel`。

**卸载**：

```bash
sudo systemctl disable --now routeros-panel@routeros-panel
sudo rm -rf /opt/routeros-triage-panel /etc/default/routeros-panel-routeros-panel
```

> 产线环境（如 ESXi 里的面板虚机）已经在用这套 systemd 单元的读者：
> 这条路径与你现有部署兼容，`--upgrade` 语义与模板单元名不变。

---

## 路径四：RouterOS Container（高级 / Beta）

把面板直接跑在 RouterOS 的容器功能里，不需要额外的主机。**这条路只建议
已经会用 RouterOS Container 的人走**：它会改动路由器的容器、存储、虚拟
接口配置，操作前请先阅读官方文档并确认出问题能自救：

- <https://help.mikrotik.com/docs/display/ROS/Container>

**你要下载的文件**：`RouterOS-Triage-Panel-RouterOS-Container-v0.3.0-amd64.tar`

**操作概要**：

1. RouterOS 开启 container 模式（`/system/device-mode/update`，按官方文档操作）。
2. 在 WinBox/WEB 的 **Containers** 页把这个 `.tar` 文件 import 进路由器。
3. 建立 veth 接口与容器（env 里可设 `ROS_PANEL_BIND=0.0.0.0`，
   这是四种路径里唯一允许容器内监听非本机地址的；对外浏览器入口仍然
   建议通过本机转发访问 `http://127.0.0.1:28646/`）。
4. 启动容器后，从路由器同网段的机器通过你设置的转发访问面板。

逐步命令模板见 [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md)。

---

## 装好之后：第一次连接路由器

四条路径装完后的界面完全一样：

1. 浏览器打开 `http://127.0.0.1:28646/`。
2. 连接页填写路由器地址、只读账号、密码。
3. 第一次 SSH 连接需要确认主机密钥指纹（在路由器上执行
   `/certificate print` 或按面板提示的路径核对）。
4. 连接成功后即可看到 WAN、路由、DNS、DHCP、防火墙、日志等只读视图。

**建议现在就做**：在 RouterOS 里建一个只读用户专门给面板用
（`/user add name=panel group=read password=...`），不要用 admin。

## 校验下载文件

每个发布资产都配有同名的 `.sha256` 文件：

```bash
# Linux / macOS
sha256sum -c RouterOS-Triage-Panel-Linux-v0.3.0.tar.gz.sha256

# Windows（cmd）
certutil -hashfile "RouterOS-Triage-Panel-Windows-v0.3.0.exe" SHA256
```

## 还是不行？

到本项目的 GitHub Issues 页面提一个问题，附上：

- 你走的哪条路径（一/二/三/四）
- 面板页面上显示的错误原文
- 控制台窗口（Windows）或 `systemctl status` / `docker logs`
  （Linux）里的最后几行
