import type { SectionModel } from "../../sections/sectionModels";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import {
  InspectorDisclosure,
  InspectorFacts,
  InspectorSection,
  displayValue,
  observedLabel,
} from "./InspectorPrimitives";
import { RouteInspector } from "./NetworkInspectors";

export function BalanceInspector({ row, model }: { row: WorkspaceRow; model: SectionModel }) {
  if (row.evidence.kind === "balance-distribution") {
    return (
      <>
        <InspectorSection title="线路分布" note="仅展示当前快照中的线路占比与读数，不推断调度策略效果。">
          <InspectorFacts facts={[
            { label: "线路", value: displayValue(row.evidence.name), valueKind: "machine" },
            { label: "流量占比", value: row.evidence.share === null ? "未取得" : `${row.evidence.share}%`, valueKind: "numeric" },
            { label: "状态", value: row.evidence.active === true ? "运行" : row.evidence.active === false ? "未运行" : "未确认", tone: row.evidence.active === true ? "trust" : "warn" },
            { label: "下载 / 上传", value: `${displayValue(row.evidence.downRate)} / ${displayValue(row.evidence.upRate)}`, valueKind: "numeric" },
            { label: "对象 ID", value: row.id, valueKind: "machine" },
          ]} />
        </InspectorSection>
        <InspectorDisclosure title="证据边界" note="分布是采样窗口中的线路对象汇总，不等于链路质量或策略命中率" facts={[
          { label: "来源表", value: row.table, valueKind: "machine" },
          { label: "快照时间", value: model.observedAt || model.updatedAt, valueKind: "machine" },
        ]} />
      </>
    );
  }
  if (row.evidence.kind === "route") {
    return (
      <>
        <InspectorSection title="分流出口判据" note="WAN 分流页沿用路由对象的可验证活动判据">
          <InspectorFacts facts={[
            { label: "默认路由", value: row.evidence.isDefault ? "是" : "否", tone: row.evidence.isDefault ? "trust" : "neutral" },
            { label: "活动标志", value: observedLabel(row.evidence.active, "活动", "非活动"), tone: row.evidence.active === true ? "trust" : "warn" },
            { label: "路由表", value: displayValue(row.evidence.table, "main"), valueKind: "machine" },
            { label: "对象 ID", value: row.id, valueKind: "machine" },
          ]} />
        </InspectorSection>
        <RouteInspector row={row} model={model} />
      </>
    );
  }

  const values = row.values;
  return (
    <>
      <InspectorSection title="匹配与动作" note="仅展示快照中记录的策略匹配条件与动作，不提供配置修改入口">
        <InspectorFacts facts={[
          { label: "链 / 动作", value: displayValue(values.chain), valueKind: "machine" },
          { label: "接口", value: displayValue(values.interface), valueKind: "machine" },
          { label: "说明", value: displayValue(values.comment, "未记录") },
        ]} />
      </InspectorSection>
      <InspectorSection title="路由标记">
        <InspectorFacts facts={[
          { label: "标记 / 路由表", value: displayValue(values.mark), valueKind: "machine" },
          { label: "来源表", value: displayValue(row.table), valueKind: "machine" },
        ]} />
      </InspectorSection>
      <InspectorDisclosure title="原始对象身份" note="用于策略规则比对与深链恢复" facts={[
        { label: "对象 ID", value: row.id, valueKind: "machine" },
        { label: "记录表", value: row.table, valueKind: "machine" },
      ]} />
    </>
  );
}
