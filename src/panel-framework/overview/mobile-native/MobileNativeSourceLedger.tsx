import type { MobileNativeFocus, MobileNativeModel } from "./mobileNativeTypes";

export function MobileNativeSourceLedger({ model, focus }: { model: MobileNativeModel; focus: MobileNativeFocus }) {
  if (focus.risk || model.evidenceMode !== "current") return null;
  const collection = model.detailSections.find((section) => section.key === "collection");
  const rows = collection?.rows.filter((row) => row.key === "rest" || row.key === "ssh") || [];
  if (!rows.length) return null;
  return (
    <section className="mn-phone-source" aria-labelledby="mn-phone-source-title" data-mobile-native-phone-source>
      <header><h2 id="mn-phone-source-title">采集来源</h2><span>REST / SSH</span></header>
      <div>
        {rows.map((row) => (
          <div className={`is-${row.tone || "trust"}`} key={row.key}>
            <span>{row.label}</span>
            <span><b>{row.value}</b>{row.note ? <small>{row.note}</small> : null}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
