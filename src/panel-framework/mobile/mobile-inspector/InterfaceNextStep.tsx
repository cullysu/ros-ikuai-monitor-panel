import { ChevronRight } from "lucide-react";
import type { PanelNavigate } from "../../routes/panelRoutes";

export function InterfaceNextStep({
  objectId,
  evidenceAt,
  onNavigate,
}: {
  objectId: string;
  evidenceAt: string;
  onNavigate: PanelNavigate;
}) {
  return (
    <section className="mdi-next-step" data-tablet-inspector-next-step="true" aria-label="下一步检查">
      <header>
        <div>
          <span className="mdi-next-step-kicker">下一步检查</span>
          <h3>核对默认路由</h3>
          <p>从当前接口进入路由工作区，确认出口与活动记录仍直接关联。</p>
        </div>
      </header>
      <button
        type="button"
        data-mobile-action-object-id={objectId}
        data-mobile-action-evidence-at={evidenceAt}
        data-mobile-action-from="interfaces"
        onClick={() => onNavigate("routes", {
          objectId,
          returnRoute: "interfaces",
          evidenceAt,
        })}
      >
        <span>打开路由工作区</span>
        <ChevronRight aria-hidden="true" size={17} />
      </button>
    </section>
  );
}
