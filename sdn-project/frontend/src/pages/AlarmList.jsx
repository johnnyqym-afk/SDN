import { useEffect, useState } from 'react'
import { alarmsApi } from '../api/client'
import { Card, CardHeader, Table, Btn, Pill, AlarmBadge, MetricCard, MetricsGrid, Select } from '../components/UI'

export default function AlarmList() {
  const [alarms, setAlarms] = useState([])
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')

  const load = () => {
    alarmsApi.list({ severity: severity || undefined, status: status || undefined, page_size: 50 })
      .then(r => setAlarms(r.data.data?.items || []))
      .catch(() => setAlarms([
        { id: '1', severity: 'P1', source_name: 'PE3-SH', description: 'GE0/0/1 Link Down', status: 'NEW', aggregate_count: 1, first_occurred_at: new Date().toISOString() },
        { id: '2', severity: 'P1', source_name: 'PE5-BJ', description: 'BGP邻居断开', status: 'NEW', aggregate_count: 1, first_occurred_at: new Date().toISOString() },
        { id: '3', severity: 'P2', source_name: 'PE1-GZ', description: '接口利用率 82%', status: 'ACKNOWLEDGED', aggregate_count: 3, first_occurred_at: new Date().toISOString() },
        { id: '4', severity: 'P3', source_name: 'CE12-CD', description: '内存使用率 78%', status: 'ACKNOWLEDGED', aggregate_count: 1, first_occurred_at: new Date().toISOString() },
      ]))
  }
  useEffect(load, [severity, status])

  const acknowledge = async (id) => {
    await alarmsApi.acknowledge(id).catch(() => {})
    load()
  }

  return (
    <div>
      <MetricsGrid>
        <MetricCard label="P1 告警" value={alarms.filter(a => a.severity === 'P1' && a.status === 'NEW').length} color="red" sub="未确认" />
        <MetricCard label="P2 告警" value={alarms.filter(a => a.severity === 'P2').length} color="amber" />
        <MetricCard label="已确认" value={alarms.filter(a => a.status === 'ACKNOWLEDGED').length} color="blue" />
        <MetricCard label="今日已关闭" value="14" color="green" sub="MTTR 8.2 min" />
      </MetricsGrid>
      <Card>
        <CardHeader title="告警列表">
          <Select value={severity} onChange={setSeverity} style={{ width: 100 }}
            options={[{ value: '', label: '全部级别' }, { value: 'P1', label: 'P1' }, { value: 'P2', label: 'P2' }, { value: 'P3', label: 'P3' }]} />
          <Select value={status} onChange={setStatus} style={{ width: 110 }}
            options={[{ value: '', label: '全部状态' }, { value: 'NEW', label: '新建' }, { value: 'ACKNOWLEDGED', label: '已确认' }, { value: 'CLOSED', label: '已关闭' }]} />
          <Btn size="sm">批量确认</Btn>
        </CardHeader>
        <Table
          cols={[
            { key: 'id', label: '告警ID', mono: true, primary: true },
            { key: 'severity', label: '级别', render: v => <AlarmBadge level={v} /> },
            { key: 'description', label: '告警描述' },
            { key: 'source_name', label: '来源设备', mono: true },
            { key: 'aggregate_count', label: '聚合数', mono: true },
            { key: 'first_occurred_at', label: '首次发生', mono: true, render: v => new Date(v).toLocaleTimeString() },
            { key: 'status', label: '状态', render: v => <Pill value={v}>{v === 'NEW' ? '新建' : v === 'ACKNOWLEDGED' ? '已确认' : '已关闭'}</Pill> },
            { key: 'id', label: '操作', render: (v, row) => (
              <div style={{ display: 'flex', gap: 4 }}>
                {row.status === 'NEW' && <Btn size="sm" onClick={() => acknowledge(v)}>确认</Btn>}
                <Btn size="sm">详情</Btn>
              </div>
            )},
          ]}
          rows={alarms}
        />
      </Card>
    </div>
  )
}
