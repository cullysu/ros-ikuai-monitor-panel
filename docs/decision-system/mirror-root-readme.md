RouterOS / iKuai panel decision repository mirror. **FAIL overall for release / Step1197 records synchronized decision boundaries after the latest failed exact-SHA CI candidate / release CLOSED**.

这是当前面板工作的决策仓库入口。手机视觉基线仍是用户确认的四屏参考，桌面视觉基线仍是 192.168.3.5 / iPad 方向；本轮只修复 CI 与决策状态同步，不改变产品美术或网络行为。

- status: `current-mirror-entry`
- currentStep: `1204`
- currentOutcome: `1204:collection-tablet-threshold-and-dpr-evidence-fixed-awaiting-exact-sha-ci`
- currentBoundary: `1204`
- authority: `decision-system/current-state.md`

## 入口

- `decision-system\current-state.md`：唯一当前结论、证据和门禁。
- `decision-system\README.md`：短决策导航与同步规则。
- `D:\想法\面板\面板重做决策日志.md`：完整记录触发/问题、观察事实、决策、理由与拒绝项、验证、边界/心得。
- `手机界面唯一视觉基线.md`：已确认的手机视觉参考与删除边界。

## 当前边界

当前产品结论：**FAIL overall / Run 33316260102 在 Windows Edge popup `find-zoom-in` 首格失败，Linux 未形成终态，CL/GHCR 尚无下一候选证据 / release CLOSED**。不得把历史 SHA、PR merge SHA 或单个绿色局部门禁当作发布证据。

## 过程怎么记录

每个材料性步骤记录：触发/问题、观察事实、决策、理由与拒绝项、验证、边界/心得。这里提供可审计的设计和工程理由，不记录模型私有逐字思维链。

## 强制更新规则

每个材料性切片结束后更新仓库日志、current-state 与 machine state，再同步 D 盘镜像。用户否决高于历史代理签收；旧手机合同和旧手机 presentation owner 不得回流。
