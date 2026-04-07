import { useState } from 'react'

/* ── Design token helpers ── */
export const cx = (...args) => args.filter(Boolean).join(' ')

/* ── Status pill ── */
const PILL_MAP = {
  ACTIVE: 'green', active: 'green', ONLINE: 'green', online: 'green',
  PASSED: 'green', SUCCESS: 'green', success: 'green', published: 'green',
  已纳管: 'green', 在线: 'green',
  FAILED: 'red', OFFLINE: 'red', offline: 'red', DEGRADED: 'red', ROLLBACK_FAILED: 'red',
  离线: 'red', failed: 'red',
  DRAFT: 'gray', draft: 'gray', TERMINATED: 'gray', inactive: 'gray', PENDING: 'gray',
  APPROVING: 'amber', APPROVED: 'amber', SCHEDULED: 'amber', CHANGING: 'amber', WAITING: 'amber',
  待审批: 'amber', WARNING: 'amber',
  RUNNING: 'blue', DEPLOYING: 'blue', 执行中: 'blue', PRECHECK_PASSED: 'blue',
  ROLLBACK_SUCCESS: 'purple', ROLLING_BACK: 'purple',
  P1: 'red', P2: 'amber', P3: 'blue', P4: 'gray',
  high: 'red', 高: 'red', medium: 'amber', 中: 'amber', low: 'green', 低: 'green',
  NEW: 'red', ACKNOWLEDGED: 'blue', CLOSED: 'green',
}

export function Pill({ value, children }) {
  const label = children ?? value
  const color = PILL_MAP[value] || 'gray'
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 10,
      fontFamily: 'var(--mono)',
      whiteSpace: 'nowrap',
      background: `var(--${color}-bg)`,
      color: `var(--${color})`,
      border: `1px solid`,
      borderColor: color === 'green' ? '#1a4d1a'
        : color === 'red' ? '#5a1a1a'
        : color === 'amber' ? '#4d3300'
        : color === 'blue' ? '#1a3a6e'
        : color === 'purple' ? '#3d1f7a'
        : 'var(--border)',
    }}>{label}</span>
  )
}

/* ── Button ── */
export function Btn({ children, variant = 'default', size = 'md', onClick, disabled, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'var(--sans)',
    fontSize: size === 'sm' ? 11 : 12,
    padding: size === 'sm' ? '3px 8px' : '6px 14px',
    borderRadius: 'var(--r)',
    border: '1px solid var(--border2)',
    background: 'var(--bg3)',
    color: 'var(--text2)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
  }
  const variants = {
    primary: { background: 'var(--blue-dim)', color: 'var(--text)', borderColor: 'var(--blue)' },
    danger: { background: 'var(--red-bg)', color: 'var(--red)', borderColor: '#5a1a1a' },
  }
  return (
    <button style={{ ...base, ...(variants[variant] || {}), ...style }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

/* ── Card ── */
export function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding: 16,
      marginBottom: 16,
      ...style,
    }}>
      {children}
    </div>
  )
}

/* ── Card Header ── */
export function CardHeader({ title, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{title}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{children}</div>
    </div>
  )
}

/* ── Metric Card ── */
export function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: 16,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)', lineHeight: 1, color: color ? `var(--${color})` : 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

/* ── Metrics Grid ── */
export function MetricsGrid({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
      {children}
    </div>
  )
}

/* ── Table ── */
export function Table({ cols, rows, onRowClick }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} style={{
                fontSize: 11, color: 'var(--text3)', fontWeight: 500,
                textAlign: 'left', padding: '8px 10px',
                borderBottom: '1px solid var(--border)',
                textTransform: 'uppercase', letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>暂无数据</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i}
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {cols.map(c => (
                <td key={c.key} style={{
                  padding: '9px 10px',
                  color: c.primary ? 'var(--text)' : 'var(--text2)',
                  fontWeight: c.primary ? 500 : 400,
                  fontFamily: c.mono ? 'var(--mono)' : 'var(--sans)',
                  fontSize: 12,
                  borderBottom: '1px solid var(--border)',
                  whiteSpace: c.nowrap ? 'nowrap' : 'normal',
                }}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Input ── */
export function Input({ value, onChange, placeholder, disabled, style }) {
  return (
    <input
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        fontSize: 12, padding: '7px 10px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        background: 'var(--bg3)',
        color: disabled ? 'var(--text3)' : 'var(--text)',
        width: '100%',
        outline: 'none',
        ...style,
      }}
      onFocus={e => { if (!disabled) e.target.style.borderColor = 'var(--blue)' }}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
  )
}

/* ── Select ── */
export function Select({ value, onChange, options, style }) {
  return (
    <select
      value={value}
      onChange={e => onChange?.(e.target.value)}
      style={{
        fontSize: 12, padding: '7px 10px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        background: 'var(--bg3)',
        color: 'var(--text)',
        outline: 'none',
        ...style,
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: 'var(--bg3)' }}>{o.label}</option>
      ))}
    </select>
  )
}

/* ── FormGroup ── */
export function FormGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
      {children}
    </div>
  )
}

/* ── FormGrid ── */
export function FormGrid({ cols = 2, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14, marginBottom: 14 }}>
      {children}
    </div>
  )
}

/* ── Section Header ── */
export function SectionH({ children }) {
  return (
    <div style={{
      fontSize: 11, color: 'var(--text3)', fontWeight: 500,
      marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px',
      paddingBottom: 6, borderBottom: '1px solid var(--border)',
    }}>{children}</div>
  )
}

/* ── Progress Bar ── */
export function ProgressBar({ value, color = 'green' }) {
  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 3, height: 5, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', borderRadius: 3, background: `var(--${color})`, transition: 'width 0.4s' }} />
    </div>
  )
}

/* ── Detail Grid ── */
export function DetailGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 16px', fontSize: 12 }}>
      {items.map(([k, v]) => (
        <>
          <span key={k + '_k'} style={{ color: 'var(--text3)' }}>{k}</span>
          <span key={k + '_v'} style={{ color: 'var(--text)', fontFamily: typeof v === 'string' && v.match(/^[\d.:\/\-]+$/) ? 'var(--mono)' : 'var(--sans)' }}>{v ?? '-'}</span>
        </>
      ))}
    </div>
  )
}

/* ── Page Title ── */
export function PageTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{subtitle}</p>}
    </div>
  )
}

/* ── Loading ── */
export function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text3)', fontSize: 12 }}>
      <span style={{ animation: 'spin 1s linear infinite', marginRight: 8 }}>⟳</span> 加载中...
    </div>
  )
}

/* ── Empty ── */
export function Empty({ text = '暂无数据' }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text3)', fontSize: 12 }}>
      {text}
    </div>
  )
}

/* ── Tag ── */
export function Tag({ children }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 6px', borderRadius: 3,
      border: '1px solid var(--border)', color: 'var(--text3)',
      background: 'var(--bg3)', fontFamily: 'var(--mono)',
    }}>{children}</span>
  )
}

/* ── Two Col layout ── */
export function TwoCol({ children, style }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, ...style }}>
      {children}
    </div>
  )
}

/* ── Alarm Level Badge ── */
export function AlarmBadge({ level }) {
  const colors = { P1: '#f85149', P2: '#d29922', P3: '#58a6ff', P4: '#6e7681' }
  const bgs = { P1: '#2d1216', P2: '#2c1d0a', P3: '#0d2044', P4: '#21262d' }
  const borders = { P1: '#5a1a1a', P2: '#4d3300', P3: '#1a3a6e', P4: '#30363d' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
      fontFamily: 'var(--mono)', flexShrink: 0,
      background: bgs[level] || '#21262d',
      color: colors[level] || '#6e7681',
      border: `1px solid ${borders[level] || '#30363d'}`,
    }}>{level}</span>
  )
}

/* ── Pagination ── */
export function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'flex-end', fontSize: 12, color: 'var(--text3)' }}>
      <Btn size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>‹</Btn>
      <span>第 {page} / {totalPages} 页，共 {total} 条</span>
      <Btn size="sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>›</Btn>
    </div>
  )
}

/* ── Wizard Steps ── */
export function WizardSteps({ steps, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
      {steps.map((s, i) => (
        <>
          <div key={i} style={{
            flex: 1, minWidth: 80, textAlign: 'center',
            padding: '8px 6px', borderRadius: 'var(--r)',
            border: `1px solid ${i < current ? '#1a4d1a' : i === current ? 'var(--blue)' : 'var(--border)'}`,
            fontSize: 11,
            background: i < current ? 'var(--green-bg)' : i === current ? 'var(--blue-bg)' : 'transparent',
            color: i < current ? 'var(--green)' : i === current ? 'var(--blue)' : 'var(--text3)',
            fontWeight: i === current ? 600 : 400,
          }}>{s}</div>
          {i < steps.length - 1 && <span key={`arr-${i}`} style={{ color: 'var(--text3)', fontSize: 12, flexShrink: 0 }}>›</span>}
        </>
      ))}
    </div>
  )
}

/* ── Log Area ── */
export function LogArea({ lines }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 'var(--r)', padding: 12,
      fontFamily: 'var(--mono)', fontSize: 11,
      color: 'var(--text2)', maxHeight: 260,
      overflowY: 'auto', lineHeight: 1.8,
    }}>
      {lines.map((line, i) => (
        <div key={i} style={{ color: line.color || 'var(--text2)' }}>
          <span style={{ color: 'var(--text3)' }}>[{line.ts}]</span> {line.text}
        </div>
      ))}
    </div>
  )
}

/* ── Diff View ── */
export function DiffView({ before, after }) {
  const lineStyle = (type) => ({
    background: type === '+' ? 'rgba(63,185,80,0.1)' : type === '-' ? 'rgba(248,81,73,0.1)' : 'transparent',
    color: type === '+' ? 'var(--green)' : type === '-' ? 'var(--red)' : 'var(--text3)',
  })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {[{ title: '◀ 变更前', lines: before }, { title: '▶ 变更后', lines: after }].map(panel => (
        <div key={panel.title} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{panel.title}</div>
          <div style={{ padding: 10, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.8, maxHeight: 200, overflowY: 'auto' }}>
            {panel.lines.map((l, i) => (
              <div key={i} style={lineStyle(l[0])}>{l}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
