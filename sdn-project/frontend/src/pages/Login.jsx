import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mfa, setMfa] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password, mfa || undefined)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || '用户名或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 380, background: 'var(--bg2)',
        border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
        padding: 32,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', letterSpacing: 1 }}>◆ SDN 控制器</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, fontFamily: 'var(--mono)' }}>v1.0 — 网络自动化编排平台</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.3px' }}>用户名</div>
            <input
              value={username} onChange={e => setUsername(e.target.value)}
              placeholder="alice"
              autoFocus
              style={{
                width: '100%', fontSize: 13, padding: '8px 10px',
                border: '1px solid var(--border)', borderRadius: 'var(--r)',
                background: 'var(--bg3)', color: 'var(--text)', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.3px' }}>密码</div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', fontSize: 13, padding: '8px 10px',
                border: '1px solid var(--border)', borderRadius: 'var(--r)',
                background: 'var(--bg3)', color: 'var(--text)', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.3px' }}>MFA 验证码 (可选)</div>
            <input
              value={mfa} onChange={e => setMfa(e.target.value)}
              placeholder="6位数字"
              maxLength={6}
              style={{
                width: '100%', fontSize: 13, padding: '8px 10px',
                border: '1px solid var(--border)', borderRadius: 'var(--r)',
                background: 'var(--bg3)', color: 'var(--text)', outline: 'none',
                fontFamily: 'var(--mono)',
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: 'var(--red)', background: 'var(--red-bg)',
              border: '1px solid #5a1a1a', borderRadius: 'var(--r)',
              padding: '8px 12px', marginBottom: 14,
            }}>{error}</div>
          )}

          <button
            type="submit" disabled={loading || !username || !password}
            style={{
              width: '100%', padding: '10px', fontSize: 13, fontWeight: 500,
              border: '1px solid var(--blue)', borderRadius: 'var(--r)',
              background: loading ? 'var(--bg3)' : 'var(--blue-dim)',
              color: 'var(--text)', cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div style={{
          marginTop: 20, padding: '12px', background: 'var(--bg3)',
          borderRadius: 'var(--r)', fontSize: 11, color: 'var(--text3)',
          fontFamily: 'var(--mono)',
        }}>
          <div style={{ marginBottom: 4, color: 'var(--text2)' }}>默认账号:</div>
          <div>admin / Admin@2026 (SuperAdmin)</div>
          <div>alice / Alice@2026 (ProvisionEngineer)</div>
        </div>
      </div>
    </div>
  )
}
