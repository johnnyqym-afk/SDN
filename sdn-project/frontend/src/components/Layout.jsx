import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { group: '总览', items: [
    { to: '/dashboard', label: '工作台首页', badge: null },
    { to: '/alarms',    label: '告警中心',   badge: 3 },
    { to: '/orders',    label: '工单列表',   badge: null },
  ]},
  { group: '资源管理', items: [
    { to: '/devices',          label: '设备列表' },
    { to: '/topology',         label: '拓扑地图' },
    { to: '/pools/interfaces', label: '接口资源池' },
    { to: '/pools/ip',         label: 'IP地址池' },
    { to: '/pools/vlan',       label: 'VLAN/标签池' },
  ]},
  { group: '服务中心', items: [
    { to: '/catalog',         label: '服务目录' },
    { to: '/provision/l3vpn', label: 'L3VPN 开通' },
    { to: '/provision/vpls',  label: 'VPLS 开通' },
    { to: '/services',        label: '服务实例' },
  ]},
  { group: '策略中心', items: [
    { to: '/policies/te',   label: 'TE隧道策略库' },
    { to: '/policies/path', label: '显式路径编辑器' },
    { to: '/policies/qos',  label: 'QoS模板中心' },
    { to: '/policies/sla',  label: 'SLA模板中心' },
  ]},
  { group: '变更中心', items: [
    { to: '/changes',  label: '变更单列表' },
    { to: '/deploy',   label: '发布控制台' },
    { to: '/rollback', label: '回滚中心' },
  ]},
  { group: '运营中心', items: [
    { to: '/performance', label: '性能监控' },
    { to: '/sla',         label: 'SLA 看板' },
    { to: '/reports',     label: '报表中心' },
    { to: '/audit',       label: '审计日志' },
  ]},
  { group: '系统管理', items: [
    { to: '/system', label: '系统配置' },
  ]},
]

const PAGE_TITLES = {
  '/dashboard':          '工作台首页 (P02)',
  '/alarms':             '告警中心 (P04)',
  '/orders':             '工单列表 (P06)',
  '/devices':            '设备列表 (P08)',
  '/topology':           '拓扑地图 (P10)',
  '/pools/interfaces':   '接口资源池 (P11)',
  '/pools/ip':           'IP地址池 (P12)',
  '/pools/vlan':         'VLAN/标签池 (P13)',
  '/catalog':            '服务目录 (P14)',
  '/provision/l3vpn':    'L3VPN开通向导 (P15)',
  '/provision/vpls':     'VPLS开通向导 (P16)',
  '/services':           '服务实例列表 (P17)',
  '/policies/te':        'TE隧道策略库 (P19)',
  '/policies/path':      '显式路径编辑器 (P20)',
  '/policies/qos':       'QoS模板中心 (P21)',
  '/policies/sla':       'SLA模板中心 (P22)',
  '/changes':            '变更单列表 (P23)',
  '/deploy':             '发布控制台 (P26)',
  '/rollback':           '回滚中心 (P27)',
  '/performance':        '性能监控 (P28)',
  '/sla':                'SLA看板 (P29)',
  '/reports':            '报表中心 (P30)',
  '/audit':              '审计日志 (P31)',
  '/system':             '系统管理 (P32)',
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const currentPath = window.location.pathname
  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) => currentPath.startsWith(k))?.[1] || 'SDN 控制器'

  const handleLogout = async () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <nav style={{
        width: 220, background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0, overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)', letterSpacing: '0.5px' }}>◆ SDN CTRL</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, fontFamily: 'var(--mono)' }}>
            v1.0 · {user?.username || 'guest'}
          </div>
        </div>

        {/* Nav */}
        {NAV.map(group => (
          <div key={group.group} style={{ padding: '8px 0' }}>
            <div style={{
              fontSize: 10, color: 'var(--text3)', padding: '6px 16px 4px',
              letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500,
            }}>{group.group}</div>
            {group.items.map(item => (
              <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 16px',
                fontSize: 12,
                color: isActive ? 'var(--blue)' : 'var(--text2)',
                background: isActive ? 'rgba(88,166,255,0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--blue)' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
              })}
              onMouseEnter={e => { if (!e.currentTarget.style.background.includes('rgba')) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text)' }}}
              onMouseLeave={e => { if (!e.currentTarget.className.includes('active')) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '' }}}
              >
                <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.6 }} />
                {item.label}
                {item.badge && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, background: 'var(--red)',
                    color: '#fff', borderRadius: 10, padding: '1px 5px', fontWeight: 600,
                  }}>{item.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{
          background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
          padding: '0 20px', height: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{pageTitle}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 'var(--r)', fontWeight: 500,
              background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid #1a4d1a',
            }}>● 系统正常</span>
            <span style={{ color: 'var(--text3)', fontSize: 11 }}>|</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{user?.username}</span>
            <button onClick={handleLogout} style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 'var(--r)',
              border: '1px solid var(--border2)', background: 'transparent',
              color: 'var(--text3)', cursor: 'pointer',
            }}>退出</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
