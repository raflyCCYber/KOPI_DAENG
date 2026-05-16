export const getDefaultApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.VITE_API_BASE || '/api'
  }

  const explicit = import.meta.env.VITE_API_BASE
  if (explicit) {
    return explicit
  }

  const { hostname, port } = window.location
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'

  if (!isLocalhost) {
    return '/api'
  }

  if (port === '3000') {
    return '/api'
  }

  return 'http://localhost:3002/api'
}

export const API_BASE = getDefaultApiBase()
const ADMIN_SESSION_KEY = 'daeng-kopi-admin-session'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function loadAdminSession() {
  if (!canUseStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

let adminSession = loadAdminSession()

function persistAdminSession() {
  if (!canUseStorage()) {
    return
  }

  if (!adminSession) {
    window.localStorage.removeItem(ADMIN_SESSION_KEY)
    return
  }

  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminSession))
}

export function getAdminSession() {
  return adminSession
}

export function setAdminSession(nextSession) {
  adminSession = nextSession?.auth?.token ? nextSession : null
  persistAdminSession()
  return adminSession
}

export function clearAdminSession() {
  adminSession = null
  persistAdminSession()
}

function getAdminHeaders({ required = false } = {}) {
  const token = adminSession?.auth?.token
  if (!token) {
    if (required) {
      throw new Error('Admin authentication required')
    }

    return {}
  }

  return {
    Authorization: `Bearer ${token}`
  }
}

async function request(path, options = {}, requestOptions = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(requestOptions.admin ? getAdminHeaders({ required: requestOptions.required !== false }) : {}),
      ...(options.headers || {})
    },
    ...options
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json()
}

export const menuAPI = {
  getAll: () => request('/menu'),
  create: (payload) => request('/menu', { method: 'POST', body: JSON.stringify(payload) }, { admin: true }),
  update: (id, payload) => request(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, { admin: true }),
  delete: (id) => request(`/menu/${id}`, { method: 'DELETE' }, { admin: true })
}

export const ordersAPI = {
  getAll: () => request('/orders'),
  create: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, { admin: true, required: false })
}

export const tablesAPI = {
  getStatus: () => request('/tables/status')
}

export const adminAPI = {
  login: (payload) => request('/admin/login', { method: 'POST', body: JSON.stringify(payload) })
}

export const settingsAPI = {
  get: () => request('/settings'),
  update: (payload) => request('/settings', { method: 'PUT', body: JSON.stringify(payload) }, { admin: true })
}

export const stockAPI = {
  update: async (id, stock) => menuAPI.update(id, { stock })
}

export const reportsAPI = {
  getStats: () => request('/reports/stats')
}
