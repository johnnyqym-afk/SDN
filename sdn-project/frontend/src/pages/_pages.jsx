/**
 * All remaining SDN Controller pages (P06 - P32)
 * Each exported as named + default export per file
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Card, CardHeader, Table, Btn, Pill, MetricCard, MetricsGrid,
  TwoCol, Select, FormGroup, FormGrid, SectionH, ProgressBar,
  DetailGrid, WizardSteps, LogArea, DiffView, Tag, AlarmBadge,
} from '../components/UI'
import { ordersApi, devicesApi, servicesApi, changesApi, deployApi, slaApi, auditApi, poolsApi } from '../api/client'

// ─── P06 Order List ───────────────────────────────────────────────────────────
export function OrderList() {
  const [orders, setOrders] = useState([])
  const [svcType, setSvcType] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    ordersApi.list({ service_type: svcType || undefined, page_size: 50 })
      .then(r => setOrders(r.data.data?.items || []))
      .catch(() => setOrders([
        { id: '1', order_no: 'ORD-20260407-018', service_type: 'L3VPN', customer_name: '华为金融科技', priority: 1, status: 'SUBMITTED', created_at: new Date().toISOString() },
        { id: '2', order_no: 'ORD-20260407-017', service_type: 'VPLS', customer_name: '中信证券', priority: 2, status: 'DEPLOYING', created_at: new Date().toISOString() },
        { id: '3', order_no: 'ORD-20260406-015', service_type: 'L3VPN', customer_name: '平安银行', priority: 3, status: 'ACTIVE', created_at: new Date().toISOString() },
      ]))
  }, [svcType])

  return (
    <div>
      <Card>
        <CardHeader title="工单列表">
          <Select value={svcType} onChange={setSvcType} style={{ width: 120 }}
            options={[{ value: '', label: '全部类型' }, { value: 'L3VPN', label: 'L3VPN' }, { value: 'VPLS', label: 'VPLS' }]} />
          <Btn size="sm">导出Excel</Btn>
          <Btn variant="primary" size="sm" onClick={() => nav('/catalog')}>+ 新建工单</Btn>
        </CardHeader>
        <Table
          cols={[
            { key: 'order_no', label: '工单号', primary: true, mono: true },
            { key: 'service_type', label: '类型', render: v => <Tag>{v}</Tag> },
            { key: 'customer_name', label: '客户' },
            { key: 'priority', label: '紧急度', render: v => <Pill value={`P${v}`} /> },
            { key: 'status', label: '状态', render: v => <Pill value={v}>{v}</Pill> },
            { key: 'created_at', label: '创建时间', mono: true, render: v => new Date(v).toLocaleDateString() },
            { key: 'id', label: '操作', render: () => <Btn size="sm">详情</Btn> },
          ]}
          rows={orders}
        />
      </Card>
    </div>
  )
}
export default OrderList

// ─── P08 Device List ──────────────────────────────────────────────────────────
export function DeviceList() {
  const [devices, setDevices] = useState([])
  const nav = useNavigate()

  useEffect(() => {
    devicesApi.list({ page_size: 50 })
      .then(r => setDevices(r.data.data?.items || []))
      .catch(() => setDevices([
        { id: '1', hostname: 'PE1-GZ', mgmt_ip: '10.0.0.1', vendor: 'Huawei', model: 'NE40E-X8', version: 'V8R22', status: 'ONLINE', managed: true, last_heartbeat: new Date().toISOString() },
        { id: '2', hostname: 'PE2-SH', mgmt_ip: '10.0.0.2', vendor: 'Huawei', model: 'NE40E-X8', version: 'V8R22', status: 'ONLINE', managed: true, last_heartbeat: new Date().toISOString() },
        { id: '3', hostname: 'PE3-SH', mgmt_ip: '10.0.0.3', vendor: 'Huawei', model: 'NE40E-X16', version: 'V8R22', status: 'OFFLINE', managed: true, last_heartbeat: new Date(Date.now() - 180000).toISOString() },
        { id: '4', hostname: 'PE4-BJ', mgmt_ip: '10.0.0.4', vendor: 'Huawei', model: 'NE40E-X8', version: 'V8R20', status: 'ONLINE', managed: true, last_heartbeat: new Date().toISOString() },
        { id: '5', hostname: 'RR1-CD', mgmt_ip: '10.0.1.1', vendor: 'Huawei', model: 'NE40E-X4', version: 'V8R22', status: 'ONLINE', managed: true, last_heartbeat: new Date().toISOString() },
      ]))
  }, [])

  return (
    <div>
      <MetricsGrid>
        <MetricCard label="总设备" value={devices.length} />
        <MetricCard label="在线" value={devices.filter(d => d.status === 'ONLINE').length} color="green" />
        <MetricCard label="离线" value={devices.filter(d => d.status === 'OFFLINE').length} color="red" />
        <MetricCard label="已纳管" value={devices.filter(d => d.managed).length} color="blue" />
      </MetricsGrid>
      <Card>
        <CardHeader title="设备列表">
          <Btn variant="primary" size="sm">+ 添加设备</Btn>
        </CardHeader>
        <Table
          cols={[
            { key: 'hostname', label: '设备名', primary: true, mono: true },
            { key: 'mgmt_ip', label: '管理IP', mono: true },
            { key: 'model', label: '型号' },
            { key: 'version', label: '版本', mono: true },
            { key: 'status', label: '在线状态', render: v => <Pill value={v}>{v === 'ONLINE' ? '在线' : '离线'}</Pill> },
            { key: 'managed', label: '纳管', render: v => <Pill value={v ? 'ONLINE' : 'OFFLINE'}>{v ? '已纳管' : '未纳管'}</Pill> },
            { key: 'last_heartbeat', label: '最后心跳', mono: true, render: v => v ? new Date(v).toLocaleTimeString() : '-' },
            { key: 'id', label: '操作', render: (v) => <Btn size="sm" onClick={() => nav(`/devices/${v}`)}>详情</Btn> },
          ]}
          rows={devices}
        />
      </Card>
    </div>
  )
}

// ─── P09 Device Detail ────────────────────────────────────────────────────────
export function DeviceDetail() {
  const { id } = useParams()
  const [device, setDevice] = useState(null)

  useEffect(() => {
    devicesApi.get(id)
      .then(r => setDevice(r.data.data))
      .catch(() => setDevice({ hostname: 'PE1-GZ', mgmt_ip: '10.0.0.1', vendor: 'Huawei', model: 'NE40E-X8', version: 'VRP V800R022C10', status: 'ONLINE', managed: true, connection_type: 'NETCONF' }))
  }, [id])

  if (!device) return null

  return (
    <div>
      <TwoCol>
        <Card>
          <SectionH>设备基本信息</SectionH>
          <DetailGrid items={[
            ['主机名', device.hostname], ['管理IP', device.mgmt_ip],
            ['厂商/型号', `${device.vendor} ${device.model}`],
            ['软件版本', device.version], ['连接方式', device.connection_type],
            ['在线状态', <Pill value={device.status}>{device.status === 'ONLINE' ? '在线' : '离线'}</Pill>],
          ]} />
        </Card>
        <Card>
          <SectionH>BGP 邻居摘要</SectionH>
          <Table
            cols={[
              { key: 'neighbor', label: '邻居IP', mono: true },
              { key: 'as', label: 'AS' },
              { key: 'state', label: '状态', render: v => <Pill value="ACTIVE">{v}</Pill> },
              { key: 'routes', label: '学习路由', mono: true },
            ]}
            rows={[
              { neighbor: '10.0.1.1', as: '65000', state: 'Established', routes: 8821 },
              { neighbor: '10.0.0.2', as: '65000', state: 'Established', routes: 1432 },
              { neighbor: '10.0.0.4', as: '65000', state: 'Established', routes: 2101 },
            ]}
          />
        </Card>
      </TwoCol>
      <Card>
        <SectionH>接口列表</SectionH>
        <Table
          cols={[
            { key: 'name', label: '接口名', primary: true, mono: true },
            { key: 'oper', label: 'Oper', render: v => <Pill value="ACTIVE">{v}</Pill> },
            { key: 'bw', label: '带宽' },
            { key: 'util', label: '利用率', render: v => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 60 }}><ProgressBar value={v} color={v > 80 ? 'amber' : 'green'} /></div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: v > 80 ? 'var(--amber)' : 'var(--text3)' }}>{v}%</span>
              </div>
            )},
            { key: 'ip', label: 'IP地址', mono: true },
          ]}
          rows={[
            { name: 'GigabitEthernet0/0/0', oper: 'UP', bw: '1000M', util: 45, ip: '10.1.1.1/30' },
            { name: 'GigabitEthernet0/0/1', oper: 'UP', bw: '1000M', util: 82, ip: '10.1.2.1/30' },
            { name: 'GigabitEthernet0/0/2', oper: 'UP', bw: '1000M', util: 22, ip: '10.1.3.1/30' },
            { name: 'LoopBack0', oper: 'UP', bw: '-', util: 0, ip: '10.0.0.1/32' },
          ]}
        />
      </Card>
    </div>
  )
}

// ─── P10 Topology ─────────────────────────────────────────────────────────────
export function TopologyMap() {
  return (
    <div>
      <Card>
        <CardHeader title="拓扑地图">
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="primary" size="sm">MPLS拓扑</Btn>
            <Btn size="sm">L3拓扑</Btn>
            <Btn size="sm">L2拓扑</Btn>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text3)' }}>
            <span>■ <span style={{ color: 'var(--green)' }}>正常(&lt;50%)</span></span>
            <span>■ <span style={{ color: 'var(--amber)' }}>拥塞(50-80%)</span></span>
            <span>■ <span style={{ color: 'var(--red)' }}>故障/超载</span></span>
          </div>
        </CardHeader>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          <svg width="100%" viewBox="0 0 720 300" style={{ fontFamily: 'var(--mono)' }}>
            <line x1="120" y1="150" x2="260" y2="80" stroke="#3fb950" strokeWidth="2.5" opacity="0.8"/>
            <line x1="120" y1="150" x2="260" y2="220" stroke="#d29922" strokeWidth="3" opacity="0.9"/>
            <line x1="260" y1="80" x2="440" y2="80" stroke="#3fb950" strokeWidth="2" opacity="0.8"/>
            <line x1="260" y1="80" x2="440" y2="220" stroke="#3fb950" strokeWidth="1.5" opacity="0.6"/>
            <line x1="260" y1="220" x2="440" y2="220" stroke="#f85149" strokeWidth="2.5" opacity="0.9" strokeDasharray="6 3"/>
            <line x1="440" y1="80" x2="600" y2="150" stroke="#3fb950" strokeWidth="2" opacity="0.8"/>
            <line x1="440" y1="220" x2="600" y2="150" stroke="#3fb950" strokeWidth="1.5" opacity="0.6"/>
            <text x="178" y="102" fontSize="10" fill="#d29922">82%</text>
            <text x="338" y="256" fontSize="10" fill="#f85149">故障</text>
            {[
              { x: 82, y: 128, label: 'RR1-CD', sub: '10.0.1.1', fill: '#0d2044', stroke: '#58a6ff', textC: '#58a6ff' },
              { x: 222, y: 58, label: 'PE1-GZ', sub: '10.0.0.1', fill: '#0d2a13', stroke: '#3fb950', textC: '#3fb950' },
              { x: 222, y: 198, label: 'PE3-SH', sub: '● OFFLINE', fill: '#2d1216', stroke: '#f85149', textC: '#f85149' },
              { x: 402, y: 58, label: 'PE4-BJ', sub: '10.0.0.4', fill: '#0d2a13', stroke: '#3fb950', textC: '#3fb950' },
              { x: 402, y: 198, label: 'PE5-BJ', sub: '10.0.0.5', fill: '#0d2a13', stroke: '#3fb950', textC: '#3fb950' },
              { x: 562, y: 128, label: 'P1-WH', sub: '10.0.2.1', fill: '#1e1035', stroke: '#bc8cff', textC: '#bc8cff' },
            ].map(n => (
              <g key={n.label}>
                <rect x={n.x} y={n.y} width="76" height="44" rx="8" fill={n.fill} stroke={n.stroke} strokeWidth="1.5"/>
                <text x={n.x + 38} y={n.y + 17} textAnchor="middle" fontSize="11" fill={n.textC} fontWeight="500">{n.label}</text>
                <text x={n.x + 38} y={n.y + 32} textAnchor="middle" fontSize="10" fill="#8b949e">{n.sub}</text>
              </g>
            ))}
          </svg>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>PE3-SH 离线，相关链路告警 (红色虚线)</div>
      </Card>
    </div>
  )
}

// ─── P11 Interface Pool ───────────────────────────────────────────────────────
export function InterfacePool() {
  return (
    <div>
      <MetricsGrid>
        <MetricCard label="总端口数" value="10,240" />
        <MetricCard label="已分配" value="3,588" color="amber" />
        <MetricCard label="占用率" value="35%" color="amber" />
        <MetricCard label="可用端口" value="6,652" color="green" />
      </MetricsGrid>
      <Card>
        <CardHeader title="端口库存"><Btn size="sm">推荐可用端口对</Btn></CardHeader>
        <Table
          cols={[
            { key: 'device', label: '设备', mono: true }, { key: 'if', label: '接口', mono: true, primary: true },
            { key: 'type', label: '类型' }, { key: 'bw', label: '速率' },
            { key: 'status', label: '状态', render: v => <Pill value={v === 'free' ? 'ACTIVE' : 'CHANGING'}>{v === 'free' ? '空闲' : '已分配'}</Pill> },
            { key: 'owner', label: '占用者', render: v => v ? <span style={{ color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{v}</span> : '-' },
          ]}
          rows={[
            { device: 'PE1-GZ', if: 'GE0/0/0', type: 'GE', bw: '1000M', status: 'allocated', owner: 'SVC-L3-008' },
            { device: 'PE1-GZ', if: 'GE0/0/1', type: 'GE', bw: '1000M', status: 'allocated', owner: 'SVC-L3-015' },
            { device: 'PE1-GZ', if: 'GE0/0/2', type: 'GE', bw: '1000M', status: 'free', owner: null },
            { device: 'PE2-SH', if: '10GE1/0/0', type: '10GE', bw: '10000M', status: 'allocated', owner: 'SVC-VL-003' },
          ]}
        />
      </Card>
    </div>
  )
}

// ─── P12 IP Pool ──────────────────────────────────────────────────────────────
export function IpPool() {
  const pools = [
    { name: 'Loopback池', used: 52, total: 100, pct: 52, color: 'green' },
    { name: '互联网段池', used: 1700, total: 2500, pct: 68, color: 'amber' },
    { name: '业务网段池', used: 3100, total: 10000, pct: 31, color: 'green' },
    { name: 'PE-CE池', used: 440, total: 1000, pct: 44, color: 'green' },
  ]
  return (
    <div>
      <Card>
        <SectionH>地址池概览</SectionH>
        {pools.map(p => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ width: 100, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{p.name}</span>
            <div style={{ flex: 1 }}><ProgressBar value={p.pct} color={p.color} /></div>
            <span style={{ width: 80, textAlign: 'right', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{p.used}/{p.total}</span>
            <span style={{ width: 40, textAlign: 'right', fontSize: 11, fontFamily: 'var(--mono)', color: `var(--${p.color})` }}>{p.pct}%</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── P13 VLAN Pool ────────────────────────────────────────────────────────────
export function VlanPool() {
  return (
    <div>
      <MetricsGrid>
        <MetricCard label="VLAN总数" value="1000" sub="范围 2000-2999" />
        <MetricCard label="已分配" value="730" color="amber" />
        <MetricCard label="RD/RT池" value="5000" sub="已用 1,280" />
        <MetricCard label="VNI池" value="1000" sub="范围 5000-5999" />
      </MetricsGrid>
      <Card>
        <SectionH>标签使用情况</SectionH>
        {[
          { name: 'VLAN 2000-2999', used: 730, total: 1000, pct: 73, color: 'amber' },
          { name: 'VNI 5000-5999', used: 280, total: 1000, pct: 28, color: 'green' },
          { name: 'RD (65000:x)', used: 1280, total: 5000, pct: 26, color: 'green' },
          { name: 'RT (65000:x)', used: 900, total: 5000, pct: 18, color: 'green' },
        ].map(p => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ width: 120, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{p.name}</span>
            <div style={{ flex: 1 }}><ProgressBar value={p.pct} color={p.color} /></div>
            <span style={{ width: 80, textAlign: 'right', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{p.used}/{p.total}</span>
            <span style={{ width: 40, textAlign: 'right', fontSize: 11, fontFamily: 'var(--mono)', color: `var(--${p.color})` }}>{p.pct}%</span>
          </div>
        ))}
        {<div style={{ marginTop: 12, padding: 10, background: 'var(--amber-bg)', border: '1px solid #4d3300', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--amber)' }}>
          ⚠ VLAN池占用率 73%，即将达到预警阈值 80%，建议扩容
        </div>}
      </Card>
    </div>
  )
}

// ─── P14 Service Catalog ──────────────────────────────────────────────────────
export function ServiceCatalog() {
  const nav = useNavigate()
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {[
          { icon: '🌐', title: 'L3VPN', desc: '企业网多站点互联，MPLS L3VPN，支持QoS与BFD探测', count: 3, path: '/provision/l3vpn', active: true },
          { icon: '🔗', title: 'VPLS', desc: '二层域拉通，VPLS/VPWS，支持TE隧道与NQA探测', count: 2, path: '/provision/vpls', active: false },
          { icon: '➡️', title: '专线 (DIA)', desc: '点对点专用链路，互联网直连接入，简化向导', count: 1, path: '#', active: false },
        ].map(svc => (
          <Card key={svc.title} style={{ cursor: 'pointer', borderColor: svc.active ? 'var(--blue)' : 'var(--border)' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>{svc.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: svc.active ? 'var(--blue)' : 'var(--text)', marginBottom: 8 }}>{svc.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>{svc.desc}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 12 }}>
              <span style={{ color: 'var(--text3)' }}>已发布模板</span>
              <span style={{ color: 'var(--green)' }}>{svc.count}个</span>
            </div>
            <Btn variant={svc.active ? 'primary' : 'default'} style={{ width: '100%', justifyContent: 'center' }} onClick={() => nav(svc.path)}>立即下单 →</Btn>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── P15 L3VPN Wizard ─────────────────────────────────────────────────────────
export function L3VpnWizard() {
  const [step, setStep] = useState(2)
  const [form, setForm] = useState({ serviceName: '招商银行-成都节点扩容', rd: '65000:1024', importRt: '65000:100', exportRt: '65000:100' })
  const nav = useNavigate()
  const steps = ['1 基本信息', '2 站点选择', '3 VRF模板', '4 路由策略', '5 QoS', '6 BFD探测']

  const submit = async () => {
    await servicesApi.planL3vpn({ service_name: form.serviceName, rd: form.rd, import_rts: [form.importRt], export_rts: [form.exportRt] }).catch(() => {})
    nav('/services')
  }

  return (
    <div>
      <WizardSteps steps={steps} current={step} />
      <Card>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 16 }}>Step 3: VRF 模板选择</div>
        <FormGrid>
          <FormGroup label="服务名称"><input value={form.serviceName} disabled style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text3)', width: '100%' }} /></FormGroup>
          <FormGroup label="VRF 模板">
            <select style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text)', width: '100%' }}>
              <option>VRF-Enterprise-Standard</option><option>VRF-Finance-Premium</option>
            </select>
          </FormGroup>
        </FormGrid>
        <FormGrid>
          <FormGroup label="RD"><input value={form.rd} onChange={e => setForm(f => ({ ...f, rd: e.target.value }))} style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text)', width: '100%' }} /></FormGroup>
          <FormGroup label="Export RT"><input value={form.exportRt} onChange={e => setForm(f => ({ ...f, exportRt: e.target.value }))} style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text)', width: '100%' }} /></FormGroup>
        </FormGrid>
        <FormGrid>
          <FormGroup label="Import RT"><input value={form.importRt} onChange={e => setForm(f => ({ ...f, importRt: e.target.value }))} style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text)', width: '100%' }} /></FormGroup>
          <FormGroup label="冲突检测结果"><input value="✓ 无RT冲突，可用" disabled style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--green)', width: '100%' }} /></FormGroup>
        </FormGrid>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Btn onClick={() => setStep(s => Math.max(0, s - 1))}>← 上一步</Btn>
          {step < 5 ? <Btn variant="primary" onClick={() => setStep(s => s + 1)}>下一步 →</Btn>
            : <Btn variant="primary" onClick={submit}>确认开通</Btn>}
        </div>
      </Card>
    </div>
  )
}

// ─── P16 VPLS Wizard ──────────────────────────────────────────────────────────
export function VplsWizard() {
  const [step, setStep] = useState(1)
  const nav = useNavigate()
  const steps = ['1 基本信息', '2 VSI配置', '3 AC端口', '4 隧道策略', '5 MTU', '6 NQA探测']

  return (
    <div>
      <WizardSteps steps={steps} current={step} />
      <Card>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Step 2: VSI 配置</div>
        <FormGrid>
          <FormGroup label="服务名称"><input defaultValue="中信证券-华南二层互通" style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text)', width: '100%' }} /></FormGroup>
          <FormGroup label="VSI 名称"><input defaultValue="vsi-citic-south-01" style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text)', width: '100%' }} /></FormGroup>
        </FormGrid>
        <FormGrid>
          <FormGroup label="VNI (推荐)"><input defaultValue="5042" style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text)', width: '100%' }} /></FormGroup>
          <FormGroup label="RD"><input defaultValue="65000:5042" style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text)', width: '100%' }} /></FormGroup>
        </FormGrid>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Btn onClick={() => setStep(s => Math.max(0, s - 1))}>← 上一步</Btn>
          <Btn variant="primary" onClick={() => setStep(s => Math.min(5, s + 1))}>下一步 →</Btn>
        </div>
      </Card>
    </div>
  )
}

// ─── P17 Service List ─────────────────────────────────────────────────────────
export function ServiceList() {
  const [services, setServices] = useState([])
  useEffect(() => {
    servicesApi.list({ page_size: 50 })
      .then(r => setServices(r.data.data?.items || []))
      .catch(() => setServices([
        { id: '1', service_code: 'SVC-L3-008', service_name: '华为金融-广州互联', service_type: 'L3VPN', status: 'DEGRADED', sla_target_percent: 99.9, current_sla_percent: 95.2, customer_name: '华为金融科技', expire_at: '2026-12-31' },
        { id: '2', service_code: 'SVC-L3-015', service_name: '平安银行-北京节点', service_type: 'L3VPN', status: 'ACTIVE', sla_target_percent: 99.5, current_sla_percent: 99.8, customer_name: '平安银行', expire_at: '2027-06-30' },
        { id: '3', service_code: 'SVC-VL-003', service_name: '中信证券-二层互通', service_type: 'VPLS', status: 'CHANGING', sla_target_percent: 99.5, current_sla_percent: 97.1, customer_name: '中信证券', expire_at: '2026-09-15' },
        { id: '4', service_code: 'SVC-L3-021', service_name: '招商银行-DC互联', service_type: 'L3VPN', status: 'ACTIVE', sla_target_percent: 99.9, current_sla_percent: 99.9, customer_name: '招商银行', expire_at: '2027-03-31' },
      ]))
  }, [])

  return (
    <div>
      <MetricsGrid>
        <MetricCard label="总业务" value={services.length} color="blue" />
        <MetricCard label="ACTIVE" value={services.filter(s => s.status === 'ACTIVE').length} color="green" />
        <MetricCard label="DEGRADED" value={services.filter(s => s.status === 'DEGRADED').length} color="amber" />
        <MetricCard label="CHANGING" value={services.filter(s => s.status === 'CHANGING').length} color="blue" />
      </MetricsGrid>
      <Card>
        <CardHeader title="服务实例列表">
          <Btn variant="primary" size="sm">+ 新建服务</Btn>
        </CardHeader>
        <Table
          cols={[
            { key: 'service_code', label: '服务编码', primary: true, mono: true },
            { key: 'service_name', label: '服务名称' },
            { key: 'service_type', label: '类型', render: v => <Tag>{v}</Tag> },
            { key: 'status', label: '状态', render: v => <Pill value={v}>{v}</Pill> },
            { key: 'sla_target_percent', label: '承诺SLA', mono: true, render: v => `${v}%` },
            { key: 'current_sla_percent', label: '当月达标', render: (v, row) => (
              <span style={{ fontFamily: 'var(--mono)', color: v >= row.sla_target_percent ? 'var(--green)' : v >= 95 ? 'var(--amber)' : 'var(--red)' }}>{v}%</span>
            )},
            { key: 'id', label: '操作', render: () => <Btn size="sm">详情</Btn> },
          ]}
          rows={services}
        />
      </Card>
    </div>
  )
}

// ─── P19 TE Policy ────────────────────────────────────────────────────────────
export function TePolicy() {
  const nav = useNavigate()
  return (
    <div>
      <Card>
        <CardHeader title="TE 隧道策略库"><Btn variant="primary" size="sm">+ 新建策略</Btn></CardHeader>
        <Table
          cols={[
            { key: 'name', label: '策略名', primary: true, mono: true },
            { key: 'src', label: '源PE', mono: true }, { key: 'dst', label: '目标PE', mono: true },
            { key: 'mode', label: '保护模式', render: v => <Pill value="ACTIVE">{v}</Pill> },
            { key: 'bw', label: '带宽约束', mono: true }, { key: 'services', label: '关联业务', mono: true },
            { key: 'status', label: '状态', render: v => <Pill value={v === 'active' ? 'ACTIVE' : 'DRAFT'}>{v}</Pill> },
            { key: 'id', label: '操作', render: () => <Btn size="sm" onClick={() => nav('/policies/path')}>编辑路径</Btn> },
          ]}
          rows={[
            { id: '1', name: 'TE-GZ-BJ-01', src: 'PE1-GZ', dst: 'PE4-BJ', mode: '1:1', bw: '100M', services: 8, status: 'active' },
            { id: '2', name: 'TE-SH-BJ-01', src: 'PE2-SH', dst: 'PE4-BJ', mode: 'N:1', bw: '50M', services: 5, status: 'active' },
            { id: '3', name: 'TE-GZ-CD-01', src: 'PE1-GZ', dst: 'RR1-CD', mode: '1:1', bw: '200M', services: 3, status: 'inactive' },
          ]}
        />
      </Card>
    </div>
  )
}

// ─── P20 Path Editor ──────────────────────────────────────────────────────────
export function PathEditor() {
  const hops = ['PE1-GZ', 'P1-WH', 'PE4-BJ']
  return (
    <div>
      <TwoCol>
        <div>
          <Card>
            <SectionH>路径配置</SectionH>
            <FormGrid>
              <FormGroup label="路径名称"><input defaultValue="PATH-GZ-BJ-02" style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text)', width: '100%' }} /></FormGroup>
              <FormGroup label="源PE">
                <select style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', color: 'var(--text)', width: '100%' }}><option>PE1-GZ</option></select>
              </FormGroup>
            </FormGrid>
            <SectionH>Hop 序列</SectionH>
            <Table
              cols={[
                { key: 'i', label: '#' }, { key: 'device', label: '设备', mono: true, primary: true },
                { key: 'type', label: '类型', render: () => <Pill value="ACTIVE">strict</Pill> },
                { key: 'i', label: '', render: () => <Btn size="sm" variant="danger">✕</Btn> },
              ]}
              rows={hops.map((h, i) => ({ i: i + 1, device: h }))}
            />
            <Btn size="sm" style={{ marginTop: 8 }}>+ 添加 Hop</Btn>
          </Card>
          <Card>
            <SectionH>校验结果</SectionH>
            {[['环路检测', '无环', 'ok'], ['可达性检测', 'src→dst 可达', 'ok'], ['Hop 连通性', '所有节点物理可达', 'ok'], ['路径成本', 'cost=3, 延迟≈8ms', 'ok']].map(([name, detail]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid #1a4d1a', flexShrink: 0 }}>✓</div>
                <span style={{ fontSize: 12, flex: 1, color: 'var(--text)', fontWeight: 500 }}>{name}</span>
                <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'var(--mono)' }}>{detail}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn size="sm">保存草稿</Btn>
              <Btn variant="primary" size="sm">发布路径</Btn>
            </div>
          </Card>
        </div>
        <Card>
          <SectionH>拓扑可视化 (路径高亮)</SectionH>
          <svg width="100%" viewBox="0 0 380 260" style={{ fontFamily: 'var(--mono)' }}>
            <line x1="60" y1="130" x2="160" y2="70" stroke="#3fb950" strokeWidth="3"/>
            <line x1="160" y1="70" x2="260" y2="130" stroke="#3fb950" strokeWidth="3"/>
            <line x1="160" y1="70" x2="260" y2="190" stroke="#30363d" strokeWidth="1.5" opacity="0.5"/>
            <line x1="60" y1="130" x2="160" y2="190" stroke="#30363d" strokeWidth="1.5" opacity="0.5"/>
            {[
              { x: 22, y: 108, label: 'PE1-GZ', sub: 'SRC', fill: '#0d2a13', stroke: '#3fb950', tc: '#3fb950' },
              { x: 122, y: 48, label: 'P1-WH', sub: 'Hop2', fill: '#1e1035', stroke: '#bc8cff', tc: '#bc8cff' },
              { x: 122, y: 168, label: 'PE3-SH', sub: 'offline', fill: '#21262d', stroke: '#484f58', tc: '#6e7681' },
              { x: 222, y: 108, label: 'PE4-BJ', sub: 'DST', fill: '#0d2a13', stroke: '#3fb950', tc: '#3fb950' },
            ].map(n => (
              <g key={n.label}>
                <rect x={n.x} y={n.y} width="76" height="44" rx="8" fill={n.fill} stroke={n.stroke} strokeWidth="1.5"/>
                <text x={n.x+38} y={n.y+17} textAnchor="middle" fontSize="11" fill={n.tc} fontWeight="500">{n.label}</text>
                <text x={n.x+38} y={n.y+32} textAnchor="middle" fontSize="10" fill="#8b949e">{n.sub}</text>
              </g>
            ))}
          </svg>
        </Card>
      </TwoCol>
    </div>
  )
}

// ─── P21 QoS Templates ────────────────────────────────────────────────────────
export function QosTemplates() {
  return (
    <div>
      <Card>
        <CardHeader title="QoS 模板库"><Btn variant="primary" size="sm">+ 新建模板</Btn></CardHeader>
        <Table
          cols={[
            { key: 'name', label: '模板名', primary: true },
            { key: 'cir', label: 'CIR(M)', mono: true }, { key: 'pir', label: 'PIR(M)', mono: true },
            { key: 'priority', label: '优先级', render: v => <Pill value="ACTIVE">{v}</Pill> },
            { key: 'version', label: '版本', mono: true },
            { key: 'status', label: '状态', render: v => <Pill value={v === 'published' ? 'ACTIVE' : 'DRAFT'}>{v}</Pill> },
            { key: 'services', label: '关联业务数', mono: true },
          ]}
          rows={[
            { name: 'Gold-100M', cir: 100, pir: 120, priority: 'EF', version: 'v1.2', status: 'published', services: 32 },
            { name: 'Silver-50M', cir: 50, pir: 60, priority: 'AF', version: 'v1.0', status: 'published', services: 25 },
            { name: 'Bronze-10M', cir: 10, pir: 15, priority: 'BE', version: 'v2.0', status: 'published', services: 18 },
          ]}
        />
      </Card>
    </div>
  )
}

// ─── P22 SLA Templates ────────────────────────────────────────────────────────
export function SlaTemplates() {
  return (
    <div>
      <Card>
        <CardHeader title="SLA 模板库"><Btn variant="primary" size="sm">+ 新建模板</Btn></CardHeader>
        <Table
          cols={[
            { key: 'name', label: '模板名', primary: true },
            { key: 'avail', label: '可用性', mono: true }, { key: 'latency', label: '延迟(ms)', mono: true },
            { key: 'jitter', label: '抖动(ms)', mono: true }, { key: 'bfd', label: 'BFD Tx/Rx', mono: true },
            { key: 'version', label: '版本', mono: true },
            { key: 'status', label: '状态', render: v => <Pill value={v === 'published' ? 'ACTIVE' : 'DRAFT'}>{v}</Pill> },
          ]}
          rows={[
            { name: 'Gold-99.9%', avail: '99.9%', latency: 30, jitter: 5, bfd: '100/100ms', version: 'v1.1', status: 'published' },
            { name: 'Silver-99.5%', avail: '99.5%', latency: 50, jitter: 10, bfd: '100/100ms', version: 'v2.1', status: 'published' },
            { name: 'Bronze-99%', avail: '99.0%', latency: 100, jitter: 20, bfd: '300/300ms', version: 'v1.0', status: 'published' },
          ]}
        />
      </Card>
    </div>
  )
}

// ─── P23 Change List ──────────────────────────────────────────────────────────
export function ChangeList() {
  const [changes, setChanges] = useState([])
  const nav = useNavigate()
  useEffect(() => {
    changesApi.list({ page_size: 50 })
      .then(r => setChanges(r.data.data?.items || []))
      .catch(() => setChanges([
        { id: '1', change_no: 'CHG-20260407-012', service_id: 'SVC-L3-008', change_type: '扩容', risk_level: 'medium', status: 'APPROVING', scheduled_start: new Date().toISOString() },
        { id: '2', change_no: 'CHG-20260407-011', service_id: 'SVC-VL-003', change_type: '迁移', risk_level: 'high', status: 'RUNNING', scheduled_start: new Date().toISOString() },
        { id: '3', change_no: 'CHG-20260406-009', service_id: 'SVC-L3-021', change_type: '新开', risk_level: 'low', status: 'SUCCESS', scheduled_start: new Date().toISOString() },
      ]))
  }, [])

  return (
    <div>
      <MetricsGrid>
        <MetricCard label="本月变更总数" value={changes.length} />
        <MetricCard label="成功" value={changes.filter(c => c.status === 'SUCCESS').length} color="green" />
        <MetricCard label="待审批" value={changes.filter(c => c.status === 'APPROVING').length} color="amber" />
        <MetricCard label="执行中" value={changes.filter(c => c.status === 'RUNNING').length} color="blue" />
      </MetricsGrid>
      <Card>
        <CardHeader title="变更单列表"><Btn size="sm">导出Excel</Btn></CardHeader>
        <Table
          cols={[
            { key: 'change_no', label: '变更号', primary: true, mono: true },
            { key: 'service_id', label: '关联服务', render: v => <span style={{ color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{v}</span> },
            { key: 'change_type', label: '类型' },
            { key: 'risk_level', label: '风险', render: v => <Pill value={v}>{v === 'high' ? '高' : v === 'medium' ? '中' : '低'}</Pill> },
            { key: 'status', label: '状态', render: v => <Pill value={v}>{v}</Pill> },
            { key: 'scheduled_start', label: '计划执行', mono: true, render: v => new Date(v).toLocaleString() },
            { key: 'id', label: '操作', render: (v, row) => (
              <div style={{ display: 'flex', gap: 4 }}>
                <Btn size="sm" onClick={() => nav(`/changes/${v}`)}>详情</Btn>
                {row.status === 'RUNNING' && <Btn size="sm" onClick={() => nav('/deploy')}>监控</Btn>}
              </div>
            )},
          ]}
          rows={changes}
        />
      </Card>
    </div>
  )
}

// ─── P24 Change Detail ────────────────────────────────────────────────────────
export function ChangeDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  return (
    <div>
      <TwoCol style={{ marginBottom: 16 }}>
        <Card>
          <SectionH>变更概览</SectionH>
          <DetailGrid items={[
            ['变更号', 'CHG-20260407-012'], ['关联服务', 'SVC-L3-008 华为金融-广州'],
            ['变更类型', '扩容 (100M→200M)'], ['风险等级', <Pill value="medium">中</Pill>],
            ['当前状态', <Pill value="APPROVING">待审批</Pill>], ['计划执行', '2026-04-08 22:00-24:00'],
            ['申请人', 'alice (ProvisionEngineer)'], ['预检查', <Pill value="ACTIVE">全部通过</Pill>],
          ]} />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn size="sm" onClick={() => nav(`/changes/${id}/precheck`)}>查看预检查</Btn>
            <Btn variant="primary" size="sm">提交审批</Btn>
          </div>
        </Card>
        <Card>
          <SectionH>审批流</SectionH>
          <Table
            cols={[
              { key: 'name', label: '审批人' }, { key: 'role', label: '角色' },
              { key: 'status', label: '状态', render: v => <Pill value={v === 'PENDING' ? 'APPROVING' : 'ACTIVE'}>{v === 'PENDING' ? '待审批' : '已批准'}</Pill> },
            ]}
            rows={[
              { name: 'Approver1', role: 'Approver', status: 'PENDING' },
              { name: 'NetworkArch1', role: 'NetworkArchitect', status: 'WAITING' },
            ]}
          />
        </Card>
      </TwoCol>
      <Card>
        <SectionH>配置差异对比 (PE1-GZ)</SectionH>
        <DiffView
          before={[' interface GigabitEthernet0/0/2', '  description to-HuaWei-Finance', '-  traffic-limit inbound cir 100000', '-  traffic-limit outbound cir 100000', '  ip binding vpn-instance cust_a_vrf', '  qos apply policy Gold-100M inbound']}
          after={[' interface GigabitEthernet0/0/2', '  description to-HuaWei-Finance', '+  traffic-limit inbound cir 200000', '+  traffic-limit outbound cir 200000', '  ip binding vpn-instance cust_a_vrf', '  qos apply policy Gold-200M inbound']}
        />
      </Card>
    </div>
  )
}

// ─── P25 Precheck ─────────────────────────────────────────────────────────────
export function Precheck() {
  const { id } = useParams()
  const nav = useNavigate()
  const checks = [
    { name: '命令语法检查', detail: '40条命令语法正确', status: 'ok' },
    { name: '资源冲突检查', detail: '无VLAN/RD/RT冲突', status: 'ok' },
    { name: '拓扑可达性检查', detail: 'PE1-GZ, PE4-BJ, RR1-CD 全部在线', status: 'ok' },
    { name: '环路检测', detail: '无路径环路', status: 'ok' },
    { name: 'VRF/VSI 一致性', detail: 'QoS模板版本不一致 (WARNING)', status: 'warn' },
    { name: 'BGP 配置检查', detail: 'BGP peer配置完整', status: 'ok' },
    { name: '回滚点检查', detail: '3台设备均有有效快照', status: 'ok' },
    { name: '发布窗口检查', detail: '窗口 22:00-24:00 有效', status: 'ok' },
    { name: '审批完整性检查', detail: '2/2审批人尚未批准 (WARNING)', status: 'warn' },
  ]
  const iconStyle = { ok: { bg: 'var(--green-bg)', color: 'var(--green)', border: '1px solid #1a4d1a' }, warn: { bg: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid #4d3300' }, err: { bg: 'var(--red-bg)', color: 'var(--red)', border: '1px solid #5a1a1a' } }

  return (
    <div>
      <Card>
        <CardHeader title={`预检查仿真 — CHG-${id || '20260407-012'}`}>
          <span style={{ fontSize: 12, color: 'var(--green)' }}>● 全部通过，可发布</span>
          <Btn size="sm">重新检查</Btn>
          <Btn variant="primary" size="sm" onClick={() => nav(`/changes/${id}`)}>提交审批 →</Btn>
        </CardHeader>
        {checks.map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 6 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, ...iconStyle[c.status], flexShrink: 0 }}>
              {c.status === 'ok' ? '✓' : '!'}
            </div>
            <span style={{ fontSize: 12, flex: 1, color: 'var(--text)', fontWeight: 500 }}>{c.name}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: c.status === 'ok' ? 'var(--green)' : 'var(--amber)' }}>{c.detail}</span>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: 10, background: 'var(--amber-bg)', border: '1px solid #4d3300', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--amber)' }}>
          2 项 WARNING（非阻断），可继续发布。请注意 QoS 模板版本差异。
        </div>
      </Card>
    </div>
  )
}

// ─── P26 Deploy Console ───────────────────────────────────────────────────────
export function DeployConsole() {
  const nav = useNavigate()
  const LOG_LINES = [
    { ts: '22:00:00', text: '开始 Batch 1, 3台设备' },
    { ts: '22:00:05', text: 'PE2-SH: NETCONF 连接建立' },
    { ts: '22:00:09', text: 'PE2-SH: 下发配置 (38条命令)' },
    { ts: '22:00:24', text: 'PE2-SH: commit 成功 ✓', color: 'var(--green)' },
    { ts: '22:00:28', text: 'PE4-BJ: NETCONF 连接建立' },
    { ts: '22:00:47', text: 'PE4-BJ: commit 成功 ✓', color: 'var(--green)' },
    { ts: '22:00:50', text: 'PE5-BJ: NETCONF 连接建立...', color: 'var(--blue)' },
    { ts: '22:00:54', text: 'PE5-BJ: 下发配置中 (38条命令)...', color: 'var(--blue)' },
  ]
  return (
    <div>
      <TwoCol>
        <Card>
          <SectionH>CHG-20260407-011 — 发布批次</SectionH>
          {[
            { title: 'Batch 1 · PE 设备', devices: [['PE2-SH', 'ACTIVE', '成功'], ['PE4-BJ', 'ACTIVE', '成功'], ['PE5-BJ', 'RUNNING', '下发中...']] },
            { title: 'Batch 2 · CE 设备', devices: [['CE5-CD', 'DRAFT', '等待'], ['CE6-CD', 'DRAFT', '等待']] },
          ].map(b => (
            <div key={b.title} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{b.title}</div>
              {b.devices.map(([name, s, label]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{name}</span>
                  <Pill value={s}>{label}</Pill>
                </div>
              ))}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <Btn size="sm">暂停</Btn>
            <Btn size="sm">继续</Btn>
            <Btn variant="danger" size="sm" onClick={() => nav('/rollback')}>停止并回滚</Btn>
          </div>
        </Card>
        <Card>
          <SectionH>实时执行日志</SectionH>
          <LogArea lines={LOG_LINES} />
        </Card>
      </TwoCol>
    </div>
  )
}

// ─── P27 Rollback Center ──────────────────────────────────────────────────────
export function RollbackCenter() {
  const [selected, setSelected] = useState(0)
  const options = [
    { title: '① 一键回滚 (推荐)', desc: '自动选择最近成功发布的快照，逆序恢复所有已发布设备配置，适用于90%场景' },
    { title: '② 按批次选择性回滚', desc: '选择性回滚某些Batch，保留其他变更，适用于部分设备出问题的场景' },
    { title: '③ 手工补偿 (应急)', desc: '自动回滚失败时，手工输入恢复命令逐设备执行，需要网络工程师参与' },
  ]
  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <SectionH>选择回滚方式</SectionH>
        {options.map((o, i) => (
          <div key={i} onClick={() => setSelected(i)} style={{
            background: selected === i ? 'var(--blue-bg)' : 'var(--bg3)',
            border: `1px solid ${selected === i ? 'var(--blue)' : 'var(--border)'}`,
            borderRadius: 'var(--r-lg)', padding: 14, marginBottom: 10, cursor: 'pointer',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{o.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{o.desc}</div>
          </div>
        ))}
      </Card>
      <Card>
        <SectionH>目标变更: CHG-20260407-011</SectionH>
        <DetailGrid items={[
          ['关联服务', 'SVC-VL-003'], ['发布时间', '2026-04-07 22:00'],
          ['回滚期限', '2026-04-08 22:00 (24h内)'], ['依赖检查', <Pill value="ACTIVE">无后续变更依赖</Pill>],
        ]} />
        <div style={{ marginTop: 14, padding: 10, background: 'var(--red-bg)', border: '1px solid #5a1a1a', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--red)', marginBottom: 14 }}>
          ⚠ 高风险变更回滚需 Approver 再次确认
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn>取消</Btn>
          <Btn variant="danger">确认执行一键回滚</Btn>
        </div>
      </Card>
    </div>
  )
}

// ─── P28 Performance ──────────────────────────────────────────────────────────
export function Performance() {
  const bars = Array.from({ length: 24 }, (_, i) => 20 + Math.sin(i * 0.5) * 30 + Math.random() * 20)
  return (
    <div>
      <Card>
        <CardHeader title="性能监控">
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="primary" size="sm">接口流量</Btn>
            <Btn size="sm">隧道时延</Btn>
            <Btn size="sm">BFD状态</Btn>
            <Btn size="sm">设备资源</Btn>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn size="sm">1h</Btn><Btn variant="primary" size="sm">24h</Btn><Btn size="sm">7天</Btn>
          </div>
        </CardHeader>
        <TwoCol>
          <div>
            <SectionH>PE1-GZ GE0/0/1 流量 (24h)</SectionH>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 10 }}>
              {bars.map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: h > 80 ? 'var(--amber)' : 'var(--blue)', borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
            </div>
          </div>
          <div>
            <SectionH>设备资源 (实时)</SectionH>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              <MetricCard label="CPU" value="42%" color="amber" />
              <MetricCard label="内存" value="67%" />
              <MetricCard label="磁盘" value="31%" color="green" />
            </div>
            <SectionH>接口利用率 Top5</SectionH>
            {[['GE0/0/1', 82, 'amber'], ['GE0/0/0', 45, 'green'], ['GE0/0/2', 22, 'green']].map(([name, v, c]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 100, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{name}</span>
                <div style={{ flex: 1 }}><ProgressBar value={v} color={c} /></div>
                <span style={{ width: 40, textAlign: 'right', fontSize: 11, fontFamily: 'var(--mono)', color: `var(--${c})` }}>{v}%</span>
              </div>
            ))}
          </div>
        </TwoCol>
      </Card>
    </div>
  )
}

// ─── P29 SLA Board ────────────────────────────────────────────────────────────
export function SlaBoard() {
  const [data, setData] = useState(null)
  useEffect(() => {
    slaApi.getDashboard().then(r => setData(r.data.data)).catch(() => setData({ overall_sla_pct: 99.2, violation_count: 2, violation_minutes: 148, services_above_99pct: 61, total_services: 68 }))
  }, [])
  const d = data || {}
  const services = [
    { name: '招商银行-DC互联', pct: 99.9, target: 99.9 }, { name: '平安银行-北京', pct: 99.8, target: 99.5 },
    { name: '国泰君安-上海', pct: 99.5, target: 99.5 }, { name: '中信证券-二层', pct: 97.1, target: 99.5 },
    { name: '华为金融-广州', pct: 95.2, target: 99.9 },
  ]
  return (
    <div>
      <MetricsGrid>
        <MetricCard label="整体SLA" value={`${d.overall_sla_pct || '-'}%`} color="green" sub="目标 99.0%" />
        <MetricCard label="违约业务" value={d.violation_count || '-'} color="red" sub={`共${d.total_services || '-'}个业务`} />
        <MetricCard label="违约时长" value={`${d.violation_minutes || '-'} min`} color="amber" sub="本月累计" />
        <MetricCard label="达标 ≥99%" value={`${d.services_above_99pct || '-'}%`} color="green" sub={`${d.services_above_99pct || '-'}/${d.total_services || '-'}`} />
      </MetricsGrid>
      <Card>
        <SectionH>各业务 SLA 达标率 (本月)</SectionH>
        {services.map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ width: 140, fontSize: 12, color: 'var(--text2)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
            <div style={{ flex: 1 }}><ProgressBar value={s.pct} color={s.pct >= s.target ? 'green' : s.pct >= 95 ? 'amber' : 'red'} /></div>
            <span style={{ width: 52, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, color: s.pct >= s.target ? 'var(--green)' : s.pct >= 95 ? 'var(--amber)' : 'var(--red)' }}>{s.pct}%</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── P30 Reports ──────────────────────────────────────────────────────────────
export function Reports() {
  const bars = [45, 35, 15, 5]
  return (
    <div>
      <TwoCol>
        <Card>
          <SectionH>开通时长分布 (本月)</SectionH>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 100, padding: '0 20px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
            {[['var(--green)', '< 2h', 45], ['var(--blue)', '2-8h', 35], ['var(--amber)', '8-24h', 15], ['var(--red)', '> 24h', 5]].map(([c, l, v]) => (
              <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: `${v * 2}px`, background: c, borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionH>运营效能报表</SectionH>
          <DetailGrid items={[
            ['发布成功率', <span style={{ color: 'var(--amber)' }}>96.7% (目标≥98%)</span>],
            ['P1 MTTR', '8.2 min (目标<5min)'],
            ['平均开通时长', '3.2h'],
            ['变更总数', '44次 (本月)'],
            ['自动回滚成功率', <span style={{ color: 'var(--green)' }}>100%</span>],
            ['业务实例增长', '+8 (本月)'],
          ]} />
        </Card>
      </TwoCol>
    </div>
  )
}

// ─── P31 Audit Log ────────────────────────────────────────────────────────────
export function AuditLog() {
  const [logs, setLogs] = useState([])
  useEffect(() => {
    auditApi.list({ page_size: 50 })
      .then(r => setLogs(r.data.data?.items || []))
      .catch(() => setLogs([
        { id: '1', actor_name: 'alice', action_type: 'DEPLOY', object_type: 'change', object_id: 'CHG-011', detail: '发起发布，Batch1 开始执行', result: 'SUCCESS', occurred_at: new Date().toISOString() },
        { id: '2', actor_name: 'approver1', action_type: 'APPROVE', object_type: 'change', object_id: 'CHG-011', detail: '审批通过高风险迁移变更', result: 'SUCCESS', occurred_at: new Date().toISOString() },
        { id: '3', actor_name: 'alice', action_type: 'CREATE', object_type: 'order', object_id: 'ORD-018', detail: '创建工单，客户:华为金融科技，L3VPN', result: 'SUCCESS', occurred_at: new Date().toISOString() },
        { id: '4', actor_name: 'bob', action_type: 'LOGIN', object_type: 'user', object_id: 'bob', detail: 'MFA认证 IP:10.1.1.100', result: 'SUCCESS', occurred_at: new Date().toISOString() },
      ]))
  }, [])
  return (
    <div>
      <Card>
        <CardHeader title="审计日志">
          <Btn size="sm">导出CSV</Btn>
          <Btn size="sm">生成审计报告</Btn>
        </CardHeader>
        <Table
          cols={[
            { key: 'occurred_at', label: '时间戳', mono: true, render: v => new Date(v).toLocaleString() },
            { key: 'actor_name', label: '操作人', render: v => <span style={{ color: 'var(--blue)' }}>{v}</span> },
            { key: 'action_type', label: '操作类型', render: v => <Pill value={v === 'DEPLOY' ? 'ACTIVE' : v === 'APPROVE' ? 'ACTIVE' : v === 'LOGIN' ? 'DRAFT' : 'APPROVING'}>{v}</Pill> },
            { key: 'object_type', label: '对象', mono: true },
            { key: 'detail', label: '操作详情' },
            { key: 'result', label: '结果', render: v => <Pill value={v === 'SUCCESS' ? 'ACTIVE' : 'FAILED'}>{v}</Pill> },
          ]}
          rows={logs}
        />
        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg3)', borderRadius: 'var(--r)', fontSize: 11, color: 'var(--text3)' }}>
          🔒 审计日志采用哈希链保护（SHA256），每条日志含前一条哈希值，不可篡改。自动按月归档至 MinIO 对象存储。
        </div>
      </Card>
    </div>
  )
}

// ─── P32 System Admin ─────────────────────────────────────────────────────────
export function SystemAdmin() {
  return (
    <div>
      <TwoCol>
        <Card>
          <SectionH>用户与权限</SectionH>
          <Table
            cols={[
              { key: 'name', label: '用户', primary: true },
              { key: 'role', label: '角色', render: v => <Tag>{v}</Tag> },
              { key: 'status', label: '状态', render: () => <Pill value="ACTIVE">active</Pill> },
              { key: 'login', label: '最后登录', mono: true },
            ]}
            rows={[
              { name: 'admin', role: 'SuperAdmin', login: '昨天 22:00' },
              { name: 'alice', role: 'ProvisionEngineer', login: '今天 09:00' },
              { name: 'approver1', role: 'Approver', login: '今天 08:30' },
              { name: 'noc1', role: 'NOCOperator', login: '今天 09:15' },
            ]}
          />
          <Btn size="sm" style={{ marginTop: 10 }}>+ 新增用户</Btn>
        </Card>
        <Card>
          <SectionH>微服务健康</SectionH>
          {[
            ['iam-service', 'green', 'UP · p99=12ms'],
            ['inventory-service', 'green', 'UP · p99=45ms'],
            ['orchestration-service', 'green', 'UP · p99=120ms'],
            ['deploy-service', 'green', 'UP · p99=88ms'],
            ['assurance-service', 'amber', 'WARN · 队列积压210'],
            ['PostgreSQL', 'green', 'UP · 连接池 24/50'],
            ['Redis', 'green', 'UP · mem 2.1GB/8GB'],
            ['Kafka', 'green', 'UP · lag=0'],
          ].map(([name, c, val]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--${c})`, boxShadow: `0 0 6px var(--${c})`, flexShrink: 0 }} />
              <span style={{ fontSize: 12, flex: 1, color: 'var(--text)' }}>{name}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{val}</span>
            </div>
          ))}
        </Card>
      </TwoCol>
      <Card>
        <SectionH>南向连接器</SectionH>
        <Table
          cols={[
            { key: 'type', label: '连接器类型', primary: true },
            { key: 'proto', label: '协议/端口', mono: true },
            { key: 'status', label: '状态', render: v => <Pill value="ACTIVE">{v}</Pill> },
            { key: 'sync', label: '最后同步', mono: true },
            { key: 'id', label: '操作', render: () => <Btn size="sm">测试连接</Btn> },
          ]}
          rows={[
            { id: '1', type: 'NETCONF-HW', proto: 'SSH/830', status: 'active', sync: '13:45:00' },
            { id: '2', type: 'SSH-CLI-HW', proto: 'SSH/22', status: 'active', sync: '13:44:58' },
            { id: '3', type: 'SNMP-Collect', proto: 'UDP/161', status: 'active', sync: '13:45:02' },
          ]}
        />
      </Card>
    </div>
  )
}
