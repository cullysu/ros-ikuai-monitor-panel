# RouterOS 只读 Soak Harness

`tools/check-routeros-readonly-soak.py` 用真实面板的只读采集结果生成 soak 证据。它不会连接 RouterOS 管理 API，不发送设备写请求，也不会改变面板、设备或网络配置。

## 前置条件

面板进程必须在启动前获得精确的 40 位源码提交号。dispatcher 只接受 `ROS_PANEL_BUILD_COMMIT`，或受支持运行环境提供的 `SOURCE_VERSION` / `GITHUB_SHA`；非 40 位十六进制值不会公开。`/api/health` 与 `/api/snapshot` 都会返回同一个根字段 `buildCommit`。

Windows `cmd.exe` 示例：

```bat
set "ROS_PANEL_BUILD_COMMIT=0123456789abcdef0123456789abcdef01234567"
py -3 app.py
```

以上只设置面板进程的构建身份，不会把提交号写入 RouterOS。服务管理器启动的面板应在其进程环境中设置同名变量。

## 运行

以下是 Windows `cmd.exe` 语法；`^` 必须是该行最后一个字符：

```bat
py -3 tools\check-routeros-readonly-soak.py ^
  --base-url http://127.0.0.1:28646 ^
  --duration 1800 ^
  --interval 30 ^
  --out _acceptance\routeros-readonly-soak.json ^
  --expected-commit 0123456789abcdef0123456789abcdef01234567
```

- `--base-url` 必填，必须是没有凭据、查询、片段或任意路径的 `http(s)://host[:port]` 根地址。端口只能是 `1` 至 `65535`。
- `--duration` 是整个网络采集循环的单调时钟硬 deadline，默认 `300` 秒。
- `--interval` 是相邻样本开始之间的等待时间，默认 `30` 秒。
- `--out` 必填，以临时文件加原子替换写入脱敏 JSON 报告。
- `--expected-commit` 可选，但发布候选 soak 必须提供；它只能是精确 40 位十六进制提交号，且两个端点都必须返回匹配的 `buildCommit`。

工具只发出 `GET /api/health` 与 `GET /api/snapshot`，不跟随重定向。每个请求的独立 deadline 为 10 秒，并且永远不会越过整个 soak 的剩余 deadline。每个响应正文最多读取 8 MiB；无论 `Content-Length` 是否存在，超过上限都立即失败。

## Freshness 与失败边界

工具不使用顶层 `updatedAt` 判断 freshness。该字段可能在采集失败时被重写为失败时间，并不证明 RouterOS 数据刚刚成功采集。

两个端点都会提供同一份脱敏 `collectionEvidence`：

```json
{
  "channel": "routeros-realtime-rest",
  "lastSuccessAt": "2026-08-09T12:34:56Z",
  "lastFailureAt": null,
  "failureActive": false
}
```

`lastSuccessAt` 来自实时 RouterOS REST 采集器的最后成功边界；`lastFailureAt` 和 `failureActive` 来自当前采集异常或部分端点失败边界。成功 soak 要求两个端点均为 `status=ok`、权威成功时间不在未来且不超过 120 秒、采集通道正确，并且没有活动失败。

## 报告与失败语义

报告只保存状态、请求和证据时间、freshness/age、采集通道、HTTP 状态、commit 校验结果以及摘要 SHA-256。摘要哈希的输入也是这些显式白名单字段；响应正文中的密码、Cookie、令牌、设备内容或其他敏感字段既不会写入报告，也不会参与哈希。

提供 `--expected-commit` 时，报告顶层写入精确的 `expectedCommit`，每个 health/snapshot 通道写入实际发现的精确 `buildCommit`。这两个字段都是发布候选身份，不是凭据；通道摘要哈希会覆盖 `buildCommit`，因此后续门禁可以检测 SHA 被替换。

## 验证已有报告

同一脚本提供 fail-closed verifier。Windows `cmd.exe` 示例：

```bat
py -3 tools\check-routeros-readonly-soak.py ^
  --verify-report _acceptance\routeros-readonly-soak.json ^
  --expected-commit 0123456789abcdef0123456789abcdef01234567 ^
  --min-duration 1800 ^
  --min-samples 60
```

验证器要求 schema v2、顶层 `outcome=pass`、精确 `expectedCommit`、实际与声明时长均达到策略、样本数达标、每个样本恰有 health/snapshot 两个成功通道、每个通道的 `buildCommit` 与候选完全一致、freshness/失败边界仍为成功状态，并重新计算白名单摘要。它还会重新计算运行起止时长，要求样本和通道时间都落在该运行窗口内，并用 `completedAt - evidenceAt` 重算每个通道的 `ageSeconds`；声明值与重算值不一致、为负或超过 120 秒都会失败。报告完成时间距验证时刻最多 6 小时，超过该窗口的旧报告不能重放为当前候选证据。`interrupted`、`internalOutcome`、缺通道、缺 SHA 或任何摘要漂移都会失败。验证器最多读取 16 MiB 报告。

发布候选门禁不把可变报告路径再次交给验证器。它会先冻结 soak 原始 bytes，再通过 `--verify-report-stdin` 将同一份 bytes 送入 verifier；该模式与 `--verify-report` 互斥，要求相同的 `--expected-commit`、`--min-duration` 和 `--min-samples`。因此在快照形成后的路径替换不会改变已验证报告。

无目标、连接失败、重定向、超大正文、无效 JSON、缺失或不匹配的预期提交、无效/未来/过期权威时间、活动采集失败、请求 deadline 或 soak deadline 都会 fail-closed。`Ctrl-C` 和未预期异常会写出已完成的脱敏采样并返回失败。

单元测试使用本地临时 HTTP 服务验证这些边界，但 fixture 结果不是 RouterOS soak 证据。没有显式真实面板地址时，工具不会运行，更不会报告通过。
