import type { OverviewTone } from "../index";
import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { desktopPresentation } from "../desktopOverviewPresentation";

interface DecisionAction {
  value: string;
  note: string;
  tone: OverviewTone;
}

function nextAction(state: OverviewPanelProps["state"]): DecisionAction | null {
  switch (state.scenario) {
    case "all-offline":
      return { value: "核对默认出口", note: "线路、网关与承载接口", tone: "danger" };
    case "no-snapshot":
      return { value: "恢复采集快照", note: "先核 RouterOS / REST / SSH", tone: "warn" };
    case "collection-down":
      return { value: "核对采集通道", note: "业务转发不作异常推断", tone: "warn" };
    case "resource-full":
      return { value: "先降低连接压力", note: "再看接口吞吐与活动会话", tone: "danger" };
    case "interfaces-down":
      return { value: "核对 Down 接口", note: "确认默认出口承载关系", tone: "warn" };
    default:
      return null;
  }
}

export function DesktopDecisionRail({ snapshot, state }: OverviewPanelProps) {
  const presentation = desktopPresentation(snapshot, state);
  const credibility = presentation.incidentSummary.find((item) => item.label === "可信度");
  const action = nextAction(state);
  if (!action) return null;
  const items = [
    { role: "next-step", label: "下一步", value: action.value, note: action.note, tone: action.tone },
    {
      role: "credibility",
      label: "可信度",
      value: credibility?.value || presentation.readonlyJudgement,
      note: credibility?.note || "只读判断，不写入 RouterOS",
      tone: credibility?.tone || state.verdict.level,
    },
  ] satisfies Array<{ role: "next-step" | "credibility"; label: string; value: string; note: string; tone: OverviewTone }>;

  return (
    <section
      className="ro-desktop-decision-rail"
      aria-label="桌面判断与处置"
    >
      {items.map((item) => (
        <div
          className={`ro-desktop-thin-kpi ik-overview-kpi-card is-${item.role}`}
          data-tone={item.tone}
          key={item.role}
        >
          <span>{item.label}</span>
          <b>{item.value}</b>
          <em>{item.note}</em>
        </div>
      ))}
    </section>
  );
}
