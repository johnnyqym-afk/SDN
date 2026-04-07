import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('sdn_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('sdn_refresh')
      if (refresh) {
        try {
          const r = await axios.post('/auth/refresh-token', { refresh_token: refresh })
          const newToken = r.data.data.access_token
          localStorage.setItem('sdn_token', newToken)
          err.config.headers.Authorization = `Bearer ${newToken}`
          return api(err.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api

// ─── API modules ───

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
}

export const dashboardApi = {
  getSummary: () => api.get('/api/v1/dashboard/summary'),
}

export const devicesApi = {
  list: (params) => api.get('/api/v1/inventory/devices', { params }),
  get: (id) => api.get(`/api/v1/inventory/devices/${id}`),
  create: (data) => api.post('/api/v1/inventory/devices', data),
  getInterfaces: (params) => api.get('/api/v1/inventory/interfaces', { params }),
  getLinks: (params) => api.get('/api/v1/inventory/links', { params }),
}

export const alarmsApi = {
  list: (params) => api.get('/api/v1/alarms', { params }),
  get: (id) => api.get(`/api/v1/alarms/${id}`),
  acknowledge: (id) => api.put(`/api/v1/alarms/${id}/acknowledge`),
  close: (id) => api.put(`/api/v1/alarms/${id}/close`),
}

export const ordersApi = {
  list: (params) => api.get('/api/v1/orders', { params }),
  get: (id) => api.get(`/api/v1/orders/${id}`),
  create: (data) => api.post('/api/v1/orders', data),
  submit: (id) => api.post(`/api/v1/orders/${id}/submit`),
  approve: (id) => api.post(`/api/v1/orders/${id}/approve`),
}

export const servicesApi = {
  list: (params) => api.get('/api/v1/services', { params }),
  get: (id) => api.get(`/api/v1/services/${id}`),
  planL3vpn: (data) => api.post('/api/v1/services/l3vpn/plan', data),
  planVpls: (data) => api.post('/api/v1/services/vpls/plan', data),
}

export const changesApi = {
  list: (params) => api.get('/api/v1/changes', { params }),
  get: (id) => api.get(`/api/v1/changes/${id}`),
  precheck: (id) => api.post(`/api/v1/changes/${id}/precheck`),
  submit: (id) => api.post(`/api/v1/changes/${id}/submit`),
  approve: (id) => api.post(`/api/v1/changes/${id}/approve`),
}

export const deployApi = {
  start: (data) => api.post('/api/v1/deployments', data),
  rollback: (data) => api.post('/api/v1/deployments/rollbacks', data),
}

export const slaApi = {
  getDashboard: () => api.get('/api/v1/sla/dashboard'),
  getViolations: () => api.get('/api/v1/sla/violations'),
}

export const auditApi = {
  list: (params) => api.get('/api/v1/audit/logs', { params }),
}

export const poolsApi = {
  getInterfaces: () => api.get('/api/v1/pools/interfaces'),
  getIp: () => api.get('/api/v1/pools/ipam'),
  getLabels: () => api.get('/api/v1/pools/labels'),
}
