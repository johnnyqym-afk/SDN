// ─── P02 Dashboard ───────────────────────────────
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardApi, alarmsApi, ordersApi } from '../api/client'
import { Card, CardHeader, MetricCard, MetricsGrid, Table, Btn, Pill, AlarmBadge, ProgressBar, TwoCol } from '../components/UI'

export function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [alarms, setAlarms] = useState([])
  const [orders, setOrders] = useState([])
  const nav = useNavigate()

  useEffect(() => {
    dashboardApi.getSummary().then(r => setSummary(r.data.data)).catch(() => setSummary({
      p1_alarm_count: 3, active_changes: 7, sla_rate_pct: 99.2,
      device_online_rate_pct: 98.4, service_count: 68, weekly_change_success_rate: 96.7,
    }))
    alarmsApi.list({ page_size: 4 }).then(r => setAlarms(r.data.data?.items || [])).catch(() => setAlarms([
      { id: '1', severity: 'P1', source_name: 'PE3-SH', description: 'GE0/0/1 Link Down', first_occurred_at: new Date().toISOString(), aggregate_count: 1 },
      { id: '2', severity: 'P1', source_name: 'PE5-BJ', description: 'BGP邻居断开 10.0.0.9', first_occurred_at: new Date().toISOString(), aggregate_count: 1 },
      { id: '3', severity: 'P2', source_name: 'PE1-GZ', description: '接口利用率 82%', first_occurred_at: new Date().toISOString(), aggregate_count: 3 },
    ]))
    ordersApi.list({ page_size: 5 }).then(r => setOrders(r.data.data?.items || [])).catch(() => setOrders([
      { id: '1', order_no: 'ORD-20260407-018', service_type: 'L3VPN', customer_name: '华为金融科技', priority: 1, status: 'SUBMITTED', requested_completion_at: '2026-04-09' },
      { id: '2', order_no: 'ORD-20260407-017', service_type: 'VPLS', customer_name: '中信证券', priority: 2, status: 'DEPLOYING', requested_completion_at: '2026-04-08' },
    ]))
  }, [])

  const s = summary || {}
  return (
    <div>
      <MetricsGrid>
        <MetricCard label="今日 P1 告警" value={s.p1_alarm_count ?? '-'} color="red" sub="未确认" />
        <MetricCard label="进行中变更" value={s.active_changes ?? '-'} color="blue" sub="2 待审批" />
        <MetricCard label="SLA 达标率" value={s.sla_rate_pct ? `${s.sla_rate_pct}%` : '-'} color="green" sub="本月" />
        <MetricCard label="设备在线率" value={s.device_online_rate_pct ? `${s.device_online_rate_pct}%` : '-'} sub="504/512" />
      </MetricsGrid>
      <MetricsGrid>
        <MetricCard label="业务实例总数" value={s.service_count ?? '-'} color="blue" sub="L3VPN 45 · VPLS 23" />
        <MetricCard label="本周变更成功率" value={s.weekly_change_success_rate ? `${s.weekly_change_success_rate}%` : '-'} color="green" sub="43/44 成功" />
        <MetricCard label="VLAN 池占用" value="73%" color="amber" sub="730/1000" />
        <MetricCard label="今日已开通" value="5" sub="L3VPN 3 · VPLS 2" />
      </MetricsGrid>
      <TwoCol>
        <Card>
          <CardHeader title="最新告警"><Btn size="sm" onClick={() => nav('/alarms')}>全部 →</Btn></CardHeader>
          {alarms.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
              <AlarmBadge level={a.severity} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{a.source_name} — {a.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{new Date(a.first_occurred_at).toLocaleTimeString()} · 聚合 {a.aggregate_count}</div>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <CardHeader title="本周变更成功率" />
          {[['新开业务', 100, 'green'], ['扩容/迁移', 96, 'green'], ['退网变更', 88, 'amber']].map(([label, v, c]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                <span style={{ color: 'var(--text3)' }}>{label}</span>
                <span style={{ color: `var(--${c})`, fontFamily: 'var(--mono)' }}>{v}%</span>
              </div>
              <ProgressBar value={v} color={c} />
            </div>
          ))}
        </Card>
      </TwoCol>
      <Card>
        <CardHeader title="待处理工单"><Btn size="sm" onClick={() => nav('/orders')}>全部 →</Btn></CardHeader>
        <Table
          cols={[
            { key: 'order_no', label: '工单号', primary: true, mono: true },
            { key: 'service_type', label: '类型', render: v => <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, border: '1px solid var(--border)', color: 'var(--text3)', background: 'var(--bg3)', fontFamily: 'var(--mono)' }}>{v}</span> },
            { key: 'customer_name', label: '客户' },
            { key: 'priority', label: '紧急度', render: v => <Pill value={`P${v}`} /> },
            { key: 'status', label: '状态', render: v => <Pill value={v}>{v}</Pill> },
            { key: 'requested_completion_at', label: '预期开通', mono: true, render: v => v ? new Date(v).toLocaleDateString() : '-' },
          ]}
          rows={orders}
          onRowClick={r => nav(`/orders`)}
        />
      </Card>
    </div>
  )
}

export default Dashboard
