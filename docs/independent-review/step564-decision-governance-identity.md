# Step564：决策治理目录与 runtime identity 解耦

## 触发

Step563 把独立评审记录写入 `docs/independent-review/` 后，运行时身份发生漂移，当前矩阵和 runtime 报告立即失效。治理材料不应改变生产运行证据的身份，但也不能因此忽略 dirty worktree。

## 可审计事实

- 写入 Step563 评审文件后，identity 从 `33fd...` 变为 `391d...`，旧报告不能冒充当前证据。
- `tools/worktree-runtime-identity.js` 原先只排除 `docs/decision-system/` 与少量治理文件，未排除 `docs/independent-review/`。
- 增加治理前缀后，当前 fingerprint 为 `cce3ad6d0efd...`；`docs/independent-review/` 被识别为 governance path，runtime 与矩阵重新绑定。
- 当前验证：fresh runtime `236/98/122`、Overview `28/28`、route-responsive `76/76`、route/state `266/266` 通过；readiness 仍在 route maturity 处失败。

## 决策与边界

将独立评审目录视为治理输入，而非运行时输入；保持 `worktreeClean=false` 和 `releaseEvidenceEligible=false`，不放宽发布身份、不删除审计文件、不绕过 route maturity。当前真实成熟度仍为 `0 complete / 18 bounded-readonly / 0 fallback / 1 unavailable`，没有路由获得 independent acceptance。

这一步只证明“记录决策不会让证据自我失效”，不证明手机产品、路由模块、Accessibility、200% 重排、RouterOS soak、CL 或 GitHub 发布通过。
