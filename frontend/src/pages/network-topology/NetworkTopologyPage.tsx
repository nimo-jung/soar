import { useState, useMemo, useContext, useEffect } from 'react';
import { Tree } from 'primereact/tree';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import ReactFlow, { Controls, Background, MarkerType, Node, Edge, Handle, Position } from 'reactflow';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import 'reactflow/dist/style.css';
// 정적 전역 스타일 (PrimeReact / ReactFlow 테마 대응)
import '../../styles/network-topology-global.css';
// 테마 토큰 팔레트 및 CSS 변수 적용 유틸리티
import { NETWORK_THEMES, applyNetworkTopologyTheme, toReactFlowColors } from '../../styles/network-topology-tokens';
import { ThemeContext } from '../../components/layouts/TenantLayout';
import { useTranslation } from 'react-i18next';
import api from '../../api';

// ------------------------------------------------------------------
// 0. 커스텀 노드 컴포넌트
// ------------------------------------------------------------------
function CustomNetworkNode({ data }: { data: { label: string; status?: 'normal' | 'warning' | 'danger'; themeColors: any } }) {
  const { label, status, themeColors } = data;
  const statusColor = { normal: themeColors.accentGreen, warning: themeColors.accentAmber, danger: themeColors.accentRed }[status || 'normal'];

  return (
    <div style={{
      padding: '14px 18px',
      borderRadius: '10px',
      border: `2px solid ${themeColors.borderMedium}`,
      backgroundColor: themeColors.bgNode,
      color: themeColors.textPrimary,
      minWidth: '160px',
      boxShadow: `0 4px 12px ${themeColors.shadow}`,
      display: 'flex', alignItems: 'center', gap: '10px',
      transition: 'all 0.2s ease',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: themeColors.accentBlue, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: themeColors.accentGreen, width: 8, height: 8 }} />
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusColor,
        animation: status === 'danger' ? 'blink 1s infinite' : 'none',
        boxShadow: `0 0 8px ${statusColor}`,
      }} />
      <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.3px' }}>{label}</span>
    </div>
  );
}

// ------------------------------------------------------------------
// 1. 메인 페이지 컴포넌트
// ------------------------------------------------------------------
export default function NetworkTopologyPage() {
  const { isDarkMode } = useContext(ThemeContext);
  const { t } = useTranslation();
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [selectedTopoNode, setSelectedTopoNode] = useState<string | null>(null);

  // 트리 데이터
  const [networkTreeNodes, setNetworkTreeNodes] = useState([
    {
      key: '0', label: '전체 네트워크 (Backbone)', icon: 'pi pi-fw pi-globe',
      children: [
        { key: '0-0', label: 'DMZ 구간 (10.10.10.0/24)', icon: 'pi pi-fw pi-shield',
          children: [
            { key: '0-0-0', label: 'Web Server 01 (10.10.10.11)', icon: 'pi pi-fw pi-server' },
            { key: '0-0-1', label: 'WAS Server 01 (10.10.10.12)', icon: 'pi pi-fw pi-server' },
          ],
        },
        { key: '0-1', label: '내부 사내망 (192.168.1.0/24)', icon: 'pi pi-fw pi-home',
          children: [
            { key: '0-1-0', label: '인사팀 PC 대역', icon: 'pi pi-fw pi-desktop' },
            { key: '0-1-1', label: '개발팀 PC 대역', icon: 'pi pi-fw pi-desktop' },
          ],
        },
      ],
    },
  ]);

  // State for nodes and edges
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Fetch data from backend API
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await api.get('/api/networks'); // Replace with your actual endpoint
        setNodes(response.data.nodes);
        setEdges(response.data.edges);
      } catch (error) {
        console.error('Error fetching network topology data:', error);
      }
    }

    fetchData();
  }, []);

  const palette = isDarkMode ? NETWORK_THEMES.dark : NETWORK_THEMES.light;
  const colors = toReactFlowColors(palette);

  // Apply theme palette to root CSS variables
  useEffect(() => {
    const palette = isDarkMode ? NETWORK_THEMES.dark : NETWORK_THEMES.light;
    applyNetworkTopologyTheme(palette);
  }, [isDarkMode]);

  return (
    <div style={{
      display: 'flex', width: '100%', height: 'calc(100vh - 190px)',
      backgroundColor: 'transparent', borderRadius: '8px', overflow: 'hidden',
      border: `1px solid ${colors.borderSubtle}`,
    }}>
      {/* Left Tree */}
      <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1px', padding: '5px', flexShrink: 0, backgroundColor: 'transparent' }}>
        <Panel header={t('networkTopology.layeredStructure')} style={{ flex: 1, overflow: 'hidden', borderColor: colors.borderMedium, backgroundColor: 'transparent' }}>
          <div className="flex gap-2 mb-3">
            <Button icon="pi pi-plus" className="p-button-sm p-button-success" label={t('networkTopology.addBand')} style={{ fontSize: '12px' }} size="small" />
            <Button icon="pi pi-trash" className="p-button-sm p-button-danger" label={t('networkTopology.delete')} style={{ fontSize: '12px' }} size="small" />
          </div>
          <Tree
            value={networkTreeNodes}
            selectionMode="single"
            selectionKeys={selectedNodeKey}
            onSelectionChange={(e: any) => setSelectedNodeKey(typeof e.value === 'string' ? e.value : Object.keys(e.value || {})[0] || null)}
            className={`network-tree ${isDarkMode ? 'p-tree-dark' : ''}`}
            style={{ backgroundColor: 'var(--bg-panel, transparent)' }}
          />
        </Panel>
      </div>

      {/* Center Map */}
      <div style={{ flex: 1, display: 'flex', padding: '5px', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ position: 'absolute', top: '24px', left: '360px', zIndex: 10, fontWeight: 'bold', fontSize: '1.25rem', color: colors.textHeading }}>
          {t('networkTopology.topologyMap')}
        </div>
        <div style={{ flex: 1, margin: '1px', borderRadius: '8px', backgroundColor: colors.bgPanel, border: `1px solid ${colors.borderMedium}`, overflow: 'hidden' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView fitViewOptions={{ padding: 0.5 }}
            nodeTypes={{ customNode: CustomNetworkNode }}
            onNodeClick={(_, node) => setSelectedTopoNode(node.id)}
            className={isDarkMode ? 'dark' : ''}
            style={{ backgroundColor: colors.bgPanel }}
            defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: colors['edge-normal'] } }}
          >
            <Controls
              style={{ backgroundColor: colors.ctrlBg, borderColor: colors.ctrlBorder }}
            />
            <Background color={colors['grid-dot']} gap={16} />
          </ReactFlow>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: '320px', display: 'flex', padding: '5px', flexShrink: 0, backgroundColor: 'transparent'}}>
        <Panel
          header={t('networkTopology.watchTargetTitle')}
          style={{
            flex: 1,
            overflow: 'hidden',
            borderColor: colors.borderMedium,
            backgroundColor: 'transparent',
          }}
        >
          <div style={{ backgroundColor: 'var(--bg-panel, transparent)' }}>
            {selectedNodeKey || selectedTopoNode ? (
              <div>
                <p style={{ fontSize: '14px' }}>
                  <strong style={{ color: colors.textHeading }}>{t('networkTopology.nodeKeyLabel')}:</strong> <span style={{ color: colors.textPrimary }}>{selectedNodeKey || selectedTopoNode}</span>
                </p>
                <p style={{ fontSize: '14px' }}>
                  <strong style={{ color: colors.textHeading }}>{t('networkTopology.mappingStatusLabel')}:</strong> <span style={{ color: colors.accentGreen }}>{t('networkTopology.normalSyncStatus')}</span>
                </p>
                <p style={{ fontSize: '14px' }}>
                  <strong style={{ color: colors.textHeading }}>{t('networkTopology.recentEventLabel')}:</strong> <span style={{ color: colors.accentRed }}>{t('networkTopology.criticalAlertLabel')}</span>
                </p>
                <hr style={{ border: `0.5px solid ${colors.borderSubtle}`, margin: '15px 0' }} />
                <Button label={t('networkTopology.assetPolicyButton')} icon="pi pi-cog" className="w-full p-button-outlined" />
              </div>
            ) : (
              <p style={{ color: colors.textMuted, textAlign: 'center', marginTop: '40px' }}>{t('networkTopology.selectTargetHint')}</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
