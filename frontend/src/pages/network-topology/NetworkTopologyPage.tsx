// NetworkTopologyPage.tsx
import { useState, useContext, useEffect, useCallback } from 'react';
import { Tree } from 'primereact/tree';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import ReactFlow, { Controls, Background, Handle, Position, Node, Edge, Connection, addEdge, useNodesState, useEdgesState } from 'reactflow';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import 'reactflow/dist/style.css';
import '../../styles/network-topology-global.css';
import { NETWORK_THEMES, applyNetworkTopologyTheme, toReactFlowColors } from '../../styles/network-topology-tokens';
import { ThemeContext } from '../../components/layouts/TenantLayout';
import { useTranslation } from 'react-i18next';
import api from '../../api';

function CustomNetworkNode({ data }: { data: { label: string; status?: 'normal' | 'warning' | 'danger'; themeColors: any } }) {
  const { label, status, themeColors } = data;
  const statusColor = { normal: themeColors.accentGreen, warning: themeColors.accentAmber, danger: themeColors.accentRed }[status || 'normal'];

  return (
    <div style={{
      padding: '14px 18px', borderRadius: '10px', border: `2px solid ${themeColors.borderMedium}`,
      backgroundColor: themeColors.bgNode, color: themeColors.textPrimary, minWidth: '160px',
      boxShadow: `0 4px 12px ${themeColors.shadow}`, display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s ease',
    }}>
      {/* 노드 상단 타겟 핸들: 마우스 드래그 선을 받는 지점 */}
      <Handle type="target" position={Position.Top} style={{ background: themeColors.accentBlue, width: 8, height: 8 }} />
      {/* 노드 하단 소스 핸들: 마우스 드래그 선을 시작하는 지점 */}
      <Handle type="source" position={Position.Bottom} style={{ background: themeColors.accentGreen, width: 8, height: 8 }} />
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusColor,
        animation: status === 'danger' ? 'blink 1s infinite' : 'none', boxShadow: `0 0 8px ${statusColor}`,
      }} />
      <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.3px' }}>{label}</span>
    </div>
  );
}

// 🌟 [수정 핵심]: nodeTypes를 메인 컴포넌트 바깥에 상수로 분리 선언합니다.
const NODE_TYPES = {
  customNode: CustomNetworkNode,
};

export default function NetworkTopologyPage() {
  const { isDarkMode } = useContext(ThemeContext);
  const { t } = useTranslation();
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [selectedTopoNode, setSelectedTopoNode] = useState<string | null>(null);

  const [networkTreeNodes, setNetworkTreeNodes] = useState<any[]>([]);
  // 🌟 일반 useState 대신 ReactFlow 전용 State Hook 사용 (이 부분이 드래그를 가능하게 만듭니다)
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [bandDialogVisible, setBandDialogVisible] = useState(false);
  const [bandName, setBandName] = useState('');
  const [bandStatus, setBandStatus] = useState('normal');
  const [bandType, setBandType] = useState('network_device');
  const [bandIp, setBandIp] = useState('');
  const [loading, setLoading] = useState(false);

  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('normal');
  const [editType, setEditType] = useState('network_device');
  const [editIp, setEditIp] = useState('');
  const [editNodeId, setEditNodeId] = useState<string | null>(null);

  const palette = isDarkMode ? NETWORK_THEMES.dark : NETWORK_THEMES.light;
  const colors = toReactFlowColors(palette);

  const buildNetworkTree = useCallback((networks: any[]) => {
    const grouped: Record<string, any[]> = {};
    for (const net of networks) {
      const type = net.type || 'pc_mobile';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(net);
    }
    const typeIcons: Record<string, string> = { network_device: 'pi pi-fw pi-server', server: 'pi pi-fw pi-th-large', pc_mobile: 'pi pi-fw pi-user' };
    const typeLabels: Record<string, string> = {
      network_device: t('networkTopology.nodeTypes.network_device'),
      server: t('networkTopology.nodeTypes.server'),
      pc_mobile: t('networkTopology.nodeTypes.pc_mobile'),
    };

    const children = Object.entries(grouped).map(([type, items]) => ({
      key: `group-${type}`,
      label: typeLabels[type] || type,
      icon: typeIcons[type] || 'pi pi-fw pi-circle',
      children: items.map((net) => ({
        key: String(net.id),
        label: `${net.name} (${net.status || 'normal'})`,
        icon: 'pi pi-fw pi-server',
      })),
    }));

    return [{ key: '0', label: t('networkTopology.rootTreeLabel'), icon: 'pi pi-fw pi-globe', children }];
  }, [t]);

  const loadData = useCallback(async () => {
    try {
      const response = await api.get('/api/networks');
      const rawNodes = response.data.nodes || [];
      const rawEdges = response.data.edges || [];

      setNodes(rawNodes.map((n: any) => ({
        id: String(n.id),
        type: 'customNode',
        position: { x: n.x_pos, y: n.y_pos },
        data: { label: n.name, status: n.status, themeColors: palette }
      })));

      setEdges(rawEdges.map((e: any) => ({
        id: String(e.id),
        source: String(e.source_id),
        target: String(e.target_id),
        label: e.label,
        type: e.type || 'smoothstep',
        style: { stroke: colors['edge-normal'] }
      })));

      setNetworkTreeNodes(buildNetworkTree(rawNodes));
    } catch (error) {
      console.error('Data load error:', error);
    }
  }, [palette, colors, buildNetworkTree]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => { applyNetworkTopologyTheme(palette); }, [isDarkMode, palette]);

  /**
   * 🌟 노드 연결선(Edge) 생성 이벤트 핸들러 추가
   * 두 장비/대역 노드를 선으로 연결했을 때 백엔드 API 호출을 연동하여 영구 보존합니다.
   */
  const onConnect = useCallback(async (params: Connection) => {
    if (!params.source || !params.target) return;
    
    // UI에 선을 미리 낙관적으로 표시(Buffer 형태)
    setEdges((eds) => addEdge({ ...params, type: 'smoothstep', style: { stroke: colors['edge-normal'] } }, eds));

    try {
      // 이전에 보완해 둔 백엔드 컨트롤러의 Post('edges') API를 호출합니다.
      await api.post('/api/networks/edges', {
        source_id: parseInt(params.source, 10),
        target_id: parseInt(params.target, 10),
        type: 'smoothstep',
        label: '' // 필요 시 기입
      });
      // DB 저장 완료 후 최신 상태 동기화 재로드
      await loadData();
    } catch (error) {
      console.error('연결선(Edge) 저장 실패:', error);
      // 실패 시 데이터 롤백 처리
      await loadData();
    }
  }, [colors, loadData]);

  const onNodeDragStop = async (_event: any, node: Node) => {
    try {
      await api.patch(`/api/networks/nodes/${node.id}/position`, {
        x_pos: node.position.x,
        y_pos: node.position.y,
      });
    } catch (error) {
      console.error('좌표 저장 실패:', error);
    }
  };

  const handleEditBand = () => {
    if (!selectedNodeKey || !/^\d+$/.test(String(selectedNodeKey))) return;
    setEditNodeId(selectedNodeKey);
    const node = nodes.find((n: any) => n.id === String(selectedNodeKey));
    if (!node) return;
    setEditName(node.data.label);
    setEditStatus(node.data.status || 'normal');
    // type과 ip는 원본 데이터에 없을 수 있으므로 기본값 사용
    setEditType('network_device');
    setEditIp('');
    setEditDialogVisible(true);
  };

  const handleUpdateBand = async () => {
    if (!editNodeId || !editName.trim()) return;
    setLoading(true);
    try {
      await api.patch(`/api/networks/${editNodeId}`, { name: editName.trim(), status: editStatus, type: editType, ip_address: editIp });
      setEditDialogVisible(false);
      await loadData();
    } catch (error) {
      console.error('대역 수정 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBand = async () => {
    if (!bandName.trim()) return;
    setLoading(true);
    try {
      await api.post('/api/networks', { name: bandName.trim(), status: bandStatus, type: bandType, ip_address: bandIp, x_pos: 100, y_pos: 100 });
      setBandDialogVisible(false);
      setBandName('');
      await loadData();
    } catch (error) {
      console.error('대역 추가 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBand = async () => {
    if (!selectedNodeKey || !/^\d+$/.test(String(selectedNodeKey))) return;
    if (!window.confirm(t('networkTopology.confirmDelete') || '정말 삭제하시겠습니까?')) return;
    setLoading(true);
    try {
      await api.delete(`/api/networks/${selectedNodeKey}`);
      setSelectedNodeKey(null);
      await loadData();
    } catch (error) {
      console.error('대역 삭제 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 190px)', border: `1px solid ${colors.borderSubtle}`, borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1px', padding: '5px', flexShrink: 0 }}>
        <Panel header={t('networkTopology.layeredStructure')} style={{ flex: 1, overflow: 'hidden', borderColor: colors.borderMedium }}>
          <div className="flex gap-2 mb-3">
            <Button icon="pi pi-plus" className="p-button-sm p-button-success" title={t('networkTopology.buttons.add')} onClick={() => setBandDialogVisible(true)} size="small" />
            <Button icon="pi pi-pencil" className="p-button-sm p-button-warning" title={t('networkTopology.buttons.edit')} onClick={handleEditBand} disabled={!selectedNodeKey || !/^\d+$/.test(String(selectedNodeKey))} size="small" />
            <Button icon="pi pi-trash" className="p-button-sm p-button-danger" title={t('networkTopology.delete')} onClick={handleDeleteBand} disabled={!selectedNodeKey || !/^\d+$/.test(String(selectedNodeKey))} size="small" />
          </div>
          <Tree value={networkTreeNodes} selectionMode="single" selectionKeys={selectedNodeKey} onSelectionChange={(e: any) => setSelectedNodeKey(typeof e.value === 'string' ? e.value : Object.keys(e.value || {})[0] || null)} style={{ backgroundColor: 'transparent' }} />
        </Panel>
      </div>

      <div style={{ flex: 1, display: 'flex', padding: '5px', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '20px', zIndex: 10, fontWeight: 'bold', fontSize: '1.25rem', color: colors.textHeading }}>
          {t('networkTopology.topologyMap')}
        </div>
        <div style={{ flex: 1, borderRadius: '8px', border: `1px solid ${colors.borderMedium}`, overflow: 'hidden' }}>
          {/* ReactFlow 에 onConnect 핸들러 연결 */}
          <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop} 
            fitView 
            fitViewOptions={{ padding: 0.5 }} 
            nodeTypes={NODE_TYPES} 
            onNodeClick={(_, node) => setSelectedTopoNode(node.id)} 
            style={{ backgroundColor: colors.bgPanel }}
          >
            <Controls />
            <Background color={colors['grid-dot']} gap={16} />
          </ReactFlow>
        </div>
      </div>

      <Dialog visible={editDialogVisible} onHide={() => setEditDialogVisible(false)} header={t('networkTopology.dialog.editTitle')} modal style={{ width: '450px' }}>
        <div className="flex flex-column gap-3 pt-2">
          <div><label className="tenant-form-label">{t('networkTopology.formFields.name')}</label><InputText value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t('networkTopology.formFields.namePlaceholder')} className="w-full" autoFocus /></div>
          <div><label className="tenant-form-label">{t('networkTopology.formFields.type')}</label>
            <select value={editType} onChange={(e) => setEditType(e.target.value)} className="p-inputtext w-full p-component">
              <option value="network_device">{t('networkTopology.nodeTypes.network_device')}</option><option value="server">{t('networkTopology.nodeTypes.server')}</option><option value="pc_mobile">{t('networkTopology.nodeTypes.pc_mobile')}</option>
            </select>
          </div>
          <div><label className="tenant-form-label">{t('networkTopology.formFields.ip')}</label><InputText value={editIp} onChange={(e) => setEditIp(e.target.value)} placeholder={t('networkTopology.formFields.ipPlaceholder')} className="w-full" /></div>
          <div><label className="tenant-form-label">{t('networkTopology.formFields.status')}</label>
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="p-inputtext w-full p-component">
              <option value="normal">{t('networkTopology.statusOptions.normal')}</option><option value="warning">{t('networkTopology.statusOptions.warning')}</option><option value="danger">{t('networkTopology.statusOptions.danger')}</option>
            </select>
          </div>
          <Button className="tenant-primary-action" label={t('networkTopology.buttons.save')} icon="pi pi-check" onClick={handleUpdateBand} disabled={loading || !editName.trim()} loading={loading} />
        </div>
      </Dialog>

      <Dialog visible={bandDialogVisible} onHide={() => setBandDialogVisible(false)} header={t('networkTopology.dialog.addTitle')} modal style={{ width: '450px' }}>
        <div className="flex flex-column gap-3 pt-2">
          <div><label className="tenant-form-label">{t('networkTopology.formFields.name')}</label><InputText value={bandName} onChange={(e) => setBandName(e.target.value)} placeholder={t('networkTopology.formFields.namePlaceholder')} className="w-full" autoFocus /></div>
          <div><label className="tenant-form-label">{t('networkTopology.formFields.type')}</label>
            <select value={bandType} onChange={(e) => setBandType(e.target.value)} className="p-inputtext w-full p-component">
              <option value="network_device">{t('networkTopology.nodeTypes.network_device')}</option><option value="server">{t('networkTopology.nodeTypes.server')}</option><option value="pc_mobile">{t('networkTopology.nodeTypes.pc_mobile')}</option>
            </select>
          </div>
          <div><label className="tenant-form-label">{t('networkTopology.formFields.ip')}</label><InputText value={bandIp} onChange={(e) => setBandIp(e.target.value)} placeholder={t('networkTopology.formFields.ipPlaceholder')} className="w-full" /></div>
          <div><label className="tenant-form-label">{t('networkTopology.formFields.status')}</label>
            <select value={bandStatus} onChange={(e) => setBandStatus(e.target.value)} className="p-inputtext w-full p-component">
              <option value="normal">{t('networkTopology.statusOptions.normal')}</option><option value="warning">{t('networkTopology.statusOptions.warning')}</option><option value="danger">{t('networkTopology.statusOptions.danger')}</option>
            </select>
          </div>
          <Button className="tenant-primary-action" label={t('networkTopology.buttons.add')} icon="pi pi-check" onClick={handleAddBand} disabled={loading || !bandName.trim()} loading={loading} />
        </div>
      </Dialog>
    </div>
  );
}