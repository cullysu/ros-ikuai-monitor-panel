import { ChevronRight, CircleAlert, History } from "lucide-react";
import type { PanelNavigate } from "../routes/panelRoutes";
import type { SectionModel } from "../sections/sectionModels";
import "./mobile-interface-recovery.css";

export function MobileInterfaceEvidenceBoundary({
  model,
  evidenceAt,
  onNavigate,
}: {
  model: SectionModel;
  evidenceAt: string | null;
  onNavigate: PanelNavigate;
}) {
  if (model.evidenceMode === "current") return null;

  const historical = model.evidenceMode === "historical";
  const StateIcon = historical ? History : CircleAlert;
  const state = historical ? "historical" : "unavailable";

  return (
    <section
      className="mdw-domain-context mdw-interface-recovery"
      data-mobile-interface-recovery
      data-mobile-interface-recovery-state={state}
      aria-labelledby="mdw-interface-recovery-title"
    >
      <header className="mdw-interface-recovery-heading">
        <span>
          <StateIcon aria-hidden="true" size={16} />
          <b id="mdw-interface-recovery-title">接口证据边界</b>
        </span>
        <small>{historical ? "历史参考" : "当前不可用"}</small>
      </header>
      <div className="mdw-interface-recovery-copy">
        <b>{historical ? "接口对象仅保留历史记录" : "接口对象暂不参与当前判断"}</b>
        <p>
          {historical
            ? "历史快照不代表当前运行状态；当前接口业务数字不可据此确认。"
            : "没有成功快照时不显示接口业务数字；先核对采集通道和失败记录。"}
        </p>
      </div>
      <div className="mdw-interface-recovery-actions" aria-label="接口调查入口">
        <button
          type="button"
          data-mobile-interface-recovery-action="diagnostics"
          onClick={() => onNavigate("readonlyDiagnostics", { returnRoute: "interfaces", evidenceAt })}
        >
          <span>检查采集通道</span>
          <ChevronRight aria-hidden="true" size={16} />
        </button>
        <button
          type="button"
          data-mobile-interface-recovery-action="logs"
          onClick={() => onNavigate("logs", { returnRoute: "interfaces", evidenceAt })}
        >
          <span>查看失败记录</span>
          <ChevronRight aria-hidden="true" size={16} />
        </button>
      </div>
    </section>
  );
}
