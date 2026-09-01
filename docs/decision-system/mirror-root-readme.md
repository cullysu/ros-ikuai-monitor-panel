RouterOS / iKuai panel decision repository mirror. **FAIL overall for release / Step1188 separates current exact-SHA CI evidence from historical records / release CLOSED**.

这是当前面板工作的决策仓库入口。手机视觉基线仍是用户确认的四屏参考，桌面视觉基线仍是 192.168.3.5 / iPad 方向；本轮只修复 CI 与决策状态同步，不改变产品美术或网络行为。

- status: `current-mirror-entry`
- currentStep: `1188`
- currentOutcome: `1188:remote-old-run-separated-and-protected-branch-publish-next`
- currentBoundary: `1188`
- authority: `decision-system/current-state.md`

## 入口

- `decision-system\\current-state.md`：唯一当前结论、证据和门禁。
- `decision-system\\README.md`：短决策导航与同步规则。
- `D:\\想法\\面板\\面板重做决策日志.md`：完整记录触发/问题、观察事实、决策、理由与拒绝项、验证、边界/心得。
- `手机界面唯一视觉基线.md`：已确认的手机视觉参考与删除边界。

## 当前边界

当前产品结论：**FAIL overall / current-identity product and visual re-signoff is open / Linux, Windows and CL/GHCR exact-SHA evidence is incomplete / release CLOSED**。不得把历史 SHA、PR merge SHA 或单个绿色局部门禁当作发布证据。

## 过程怎么记录

每个材料性步骤记录：触发/问题、观察事实、决策、理由与拒绝项、验证、边界/心得。这里提供可审计的设计和工程理由，不记录模型私有逐字思维链。

## 强制更新规则

每个材料性切片结束后更新仓库日志、current-state 与 machine state，再同步 D 盘镜像。用户否决高于历史代理签收；旧手机合同和旧手机 presentation owner 不得回流。
