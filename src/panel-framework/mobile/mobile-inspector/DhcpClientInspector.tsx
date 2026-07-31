import type { SectionModel } from '../../sections/sectionModels';
import type { WorkspaceRow } from '../mobileDomainWorkspaceModel';
import {
  EvidenceBoundary,
  InspectorFacts,
  InspectorSection,
  displayValue,
  observedLabel,
} from './InspectorPrimitives';

export function DhcpClientInspector({ row, model }: { row: WorkspaceRow; model: SectionModel }) {
  const evidence = row.evidence;
  if (evidence.kind !== 'dhcp-client') {
    throw new Error('DHCP inspector received non-DHCP evidence');
  }
  return (
    <>
      <InspectorSection title='DHCP 客户端' note='仅展示客户端快照字段，不推断上游可用性。'>
        <InspectorFacts facts={[
          { label: '接口', value: displayValue(evidence.interfaceName), valueKind: 'machine' },
          { label: '状态', value: displayValue(evidence.status), tone: evidence.status === 'running' ? 'trust' : 'neutral' },
          { label: '默认路由', value: observedLabel(evidence.addDefaultRoute, '启用', '停用') },
          { label: '上游 DNS', value: observedLabel(evidence.usePeerDns, '使用', '未使用') },
          { label: '对象 ID', value: row.id, valueKind: 'machine' },
        ]} />
      </InspectorSection>
      <EvidenceBoundary model={model} />
    </>
  );
}
