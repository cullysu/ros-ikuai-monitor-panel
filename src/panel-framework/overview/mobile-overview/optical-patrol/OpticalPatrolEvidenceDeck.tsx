import type { OpticalPatrolEvidenceItem, OpticalPatrolModel } from "./opticalPatrolTypes";

type TabletGroup = OpticalPatrolModel["tabletEvidenceGroups"][number];

function compactSource(value: string): string {
  if (/overview\.evidenceRows|overview evidence boundary|概览证据记录/i.test(value)) return "概览证据边界";
  if (/resourceSamples/i.test(value)) return "资源当前值 + 历史样本";
  if (/routes\.(?:defaultRoutes|items)/i.test(value)) return "默认路由记录";
  if (/meta\.rest/i.test(value)) return "REST 采集记录";
  if (/meta\.ssh/i.test(value)) return "SSH 采集记录";
  if (/\bwan\[|lineStatus/i.test(value)) return "WAN 运行记录";
  if (/interfaces?/i.test(value)) return "接口运行记录";
  return value;
}

function groupTitle(group: TabletGroup): string {
  return group.label;
}

function groupRows(group: TabletGroup): OpticalPatrolEvidenceItem[] {
  return group.items;
}

function rowCopy(row: OpticalPatrolEvidenceItem): { label: string; value: string; dateTime: string | null } {
  return {
    label: row.label,
    value: row.value === null ? "—" : compactSource(String(row.value)),
    dateTime: row.observedAt,
  };
}

export function OpticalPatrolEvidenceDeck({ groups }: { groups: OpticalPatrolModel["tabletEvidenceGroups"] }) {
  if (!groups.length) return null;
  return (
    <section className="op__evidence-deck" aria-label="证据工作区" data-optical-patrol-evidence-deck>
      {groups.map((group, groupIndex) => (
        <div className="op__evidence-group" key={`${groupTitle(group)}-${groupIndex}`}>
          <h2>{groupTitle(group)}</h2>
          <ol>
            {groupRows(group).slice(0, 6).map((row, rowIndex) => {
              const copy = rowCopy(row);
              return (
                <li key={`${copy.label}-${copy.value}-${rowIndex}`} data-optical-patrol-tone={row.tone}>
                  <span>{String(rowIndex + 1).padStart(2, "0")}</span>
                  <p>{copy.label ? <small>{copy.label}</small> : null}<strong>{copy.dateTime ? <time dateTime={copy.dateTime}>{copy.value}</time> : copy.value}</strong></p>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
