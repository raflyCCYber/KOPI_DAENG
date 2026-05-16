import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SEED_DIR = path.join(__dirname, 'db')
const DB_DIR = process.env.DB_DIR ? path.resolve(process.env.DB_DIR) : path.join(__dirname, '.runtime', 'db')
const API_PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 3002
const AUTH_TOKEN_TTL_MS = 1000 * 60 * 60 * 12
const PUBLIC_ORDER_UPDATE_FIELDS = new Set(['paymentProof', 'paymentProofStatus', 'proofSentWhatsappAt', 'proofSentToNumber'])

const DEFAULT_SETTINGS = {
  whatsappNumber: '',
  updatedAt: null
}

const toBase64Url = (value) => Buffer.from(value).toString('base64url')
const fromBase64Url = (value) => Buffer.from(value, 'base64url').toString('utf8')

function parseJsonText(text) {
  const normalizedText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  return JSON.parse(normalizedText)
}

function getAdminPasswordFingerprint(admins) {
  return admins
    .map((admin) => `${admin.username}:${admin.password}`)
    .sort()
    .join('|')
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

function isAdminPasswordMatch(admin, rawPassword) {
  const storedPassword = String(admin?.password || '')
  if (storedPassword.startsWith('sha256:')) {
    return storedPassword.slice('sha256:'.length) === hashValue(rawPassword)
  }

  return storedPassword === rawPassword
}

function getAuthSecret(admins) {
  const configuredSecret = process.env.ADMIN_AUTH_SECRET || ''
  return crypto
    .createHash('sha256')
    .update(configuredSecret || getAdminPasswordFingerprint(admins) || 'daeng-kopi-admin-auth')
    .digest('hex')
}

function createTokenSignature(encodedPayload, secret) {
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

function createAdminToken(admin, admins) {
  const payload = {
    sub: admin.id,
    username: admin.username,
    role: admin.role || 'admin',
    exp: Date.now() + AUTH_TOKEN_TTL_MS
  }
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = createTokenSignature(encodedPayload, getAuthSecret(admins))

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(payload.exp).toISOString()
  }
}

function verifyAdminToken(token, admins) {
  if (!token) return null

  const [encodedPayload, providedSignature] = token.split('.')
  if (!encodedPayload || !providedSignature) {
    return null
  }

  const expectedSignature = createTokenSignature(encodedPayload, getAuthSecret(admins))
  const providedBuffer = Buffer.from(providedSignature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload))
    if (!payload?.sub || !payload?.exp || payload.exp < Date.now()) {
      return null
    }

    return admins.find((admin) => admin.id === payload.sub && admin.username === payload.username) || null
  } catch {
    return null
  }
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (typeof authHeader !== 'string') {
    return null
  }

  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token
}

function getAuthenticatedAdmin(req, admins) {
  return verifyAdminToken(getBearerToken(req), admins)
}

function sendUnauthorized(res) {
  return sendJson(res, 401, { message: 'Akses admin diperlukan.' })
}

function sanitizePublicOrderUpdate(body) {
  const entries = Object.entries(body || {})
  const invalidKeys = entries.filter(([key]) => !PUBLIC_ORDER_UPDATE_FIELDS.has(key)).map(([key]) => key)

  if (invalidKeys.length > 0) {
    return {
      ok: false,
      invalidKeys,
      updates: {}
    }
  }

  const updates = Object.fromEntries(entries.filter(([key]) => PUBLIC_ORDER_UPDATE_FIELDS.has(key)))
  if (updates.paymentProofStatus && updates.paymentProofStatus !== 'sent_whatsapp') {
    return {
      ok: false,
      invalidKeys: ['paymentProofStatus'],
      updates: {}
    }
  }

  return {
    ok: Object.keys(updates).length > 0,
    invalidKeys: [],
    updates
  }
}

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify(payload, null, 2))
}

const sendText = (res, statusCode, message) => {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(message)
}

async function ensureDbDir() {
  await fs.mkdir(DB_DIR, { recursive: true })
}

async function readJsonFile(fileName, fallback) {
  await ensureDbDir()
  const filePath = path.join(DB_DIR, fileName)
  const seedPath = path.join(SEED_DIR, fileName)

  try {
    const buffer = await fs.readFile(filePath)
    return parseJsonText(buffer.toString('utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        const seedBuffer = await fs.readFile(seedPath)
        const seededValue = parseJsonText(seedBuffer.toString('utf8'))
        await writeJsonFile(fileName, seededValue)
        return seededValue
      } catch (seedError) {
        if (seedError.code !== 'ENOENT') {
          throw seedError
        }
      }

      await writeJsonFile(fileName, fallback)
      return fallback
    }
    throw error
  }
}

async function writeJsonFile(fileName, value) {
  await ensureDbDir()
  const filePath = path.join(DB_DIR, fileName)
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8')
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function buildStats(orders, menu) {
  const completedOrders = orders.filter((order) => order.status === 'completed')
  const pendingOrders = orders.filter((order) => order.status === 'pending')
  const totalRevenue = completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)

  return {
    totalRevenue,
    completedOrders: completedOrders.length,
    pendingOrders: pendingOrders.length,
    totalMenuItems: menu.length,
    timestamp: new Date().toISOString()
  }
}

function getTableStatuses(orders) {
  const totalTables = 14
  const activeOrders = orders.filter((order) => ['pending', 'preparing'].includes(order.status))

  const tables = Array.from({ length: totalTables }, (_, index) => {
    const tableId = `MEJA-${String(index + 1).padStart(2, '0')}`
    const latestOrder = activeOrders
      .filter((order) => String(order.tableId).toUpperCase() === tableId)
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0]

    return {
      tableId,
      status: latestOrder ? 'occupied' : 'available',
      latestOrderId: latestOrder?.id || null,
      latestCustomerName: latestOrder?.customerName || latestOrder?.customer || null
    }
  })

  const occupied = tables.filter((table) => table.status === 'occupied').length
  return {
    totalTables,
    occupied,
    available: totalTables - occupied,
    tables,
    timestamp: new Date().toISOString()
  }
}

function generateOrderId(orders) {
  let nextId = 1001
  while (orders.some((order) => order.id === `ORD${nextId}`)) {
    nextId += 1
  }
  return `ORD${nextId}`
}

export async function handleApiRequest(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true })
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname

  try {
    const menu = await readJsonFile('menu.json', [])
    const orders = await readJsonFile('orders.json', [])
    const admins = await readJsonFile('admins.json', [])
    const settings = await readJsonFile('settings.json', DEFAULT_SETTINGS)

    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, {
        ok: true,
        dbDir: DB_DIR,
        timestamp: new Date().toISOString()
      })
    }

    if (pathname === '/api/menu' && req.method === 'GET') {
      return sendJson(res, 200, menu)
    }

    if (pathname === '/api/menu' && req.method === 'POST') {
      if (!getAuthenticatedAdmin(req, admins)) {
        return sendUnauthorized(res)
      }

      const body = await readBody(req)
      const nextItem = {
        id: menu.length ? Math.max(...menu.map((item) => Number(item.id) || 0)) + 1 : 1,
        stock: 10,
        image: '',
        ...body
      }
      const nextMenu = [...menu, nextItem]
      await writeJsonFile('menu.json', nextMenu)
      return sendJson(res, 201, nextItem)
    }

    if (/^\/api\/menu\/\d+$/.test(pathname) && req.method === 'PUT') {
      if (!getAuthenticatedAdmin(req, admins)) {
        return sendUnauthorized(res)
      }

      const itemId = Number(pathname.split('/').pop())
      const body = await readBody(req)
      const nextMenu = menu.map((item) => item.id === itemId ? { ...item, ...body } : item)
      const updated = nextMenu.find((item) => item.id === itemId)
      await writeJsonFile('menu.json', nextMenu)
      return sendJson(res, 200, updated)
    }

    if (/^\/api\/menu\/\d+$/.test(pathname) && req.method === 'DELETE') {
      if (!getAuthenticatedAdmin(req, admins)) {
        return sendUnauthorized(res)
      }

      const itemId = Number(pathname.split('/').pop())
      const nextMenu = menu.filter((item) => item.id !== itemId)
      await writeJsonFile('menu.json', nextMenu)
      return sendJson(res, 200, { success: true })
    }

    if (pathname === '/api/orders' && req.method === 'GET') {
      return sendJson(res, 200, orders)
    }

    if (pathname === '/api/orders' && req.method === 'POST') {
      const body = await readBody(req)
      const nextOrder = {
        ...body,
        id: body.id || generateOrderId(orders),
        timestamp: body.timestamp || new Date().toISOString()
      }
      const nextOrders = [nextOrder, ...orders]
      await writeJsonFile('orders.json', nextOrders)
      return sendJson(res, 201, nextOrder)
    }

    if (/^\/api\/orders\/[A-Z0-9-]+$/i.test(pathname) && req.method === 'PUT') {
      const orderId = pathname.split('/').pop()
      const body = await readBody(req)
      const authenticatedAdmin = getAuthenticatedAdmin(req, admins)
      const publicUpdate = sanitizePublicOrderUpdate(body)

      if (!authenticatedAdmin && !publicUpdate.ok) {
        return sendJson(res, 403, {
          message: 'Update order ini memerlukan akses admin.',
          invalidFields: publicUpdate.invalidKeys
        })
      }

      const updates = authenticatedAdmin ? body : publicUpdate.updates
      const nextOrders = orders.map((order) => order.id === orderId ? { ...order, ...updates } : order)
      const updated = nextOrders.find((order) => order.id === orderId)
      if (!updated) {
        return sendJson(res, 404, { message: 'Order tidak ditemukan.' })
      }
      await writeJsonFile('orders.json', nextOrders)
      return sendJson(res, 200, updated)
    }

    if (pathname === '/api/settings' && req.method === 'GET') {
      return sendJson(res, 200, settings)
    }

    if (pathname === '/api/settings' && req.method === 'PUT') {
      if (!getAuthenticatedAdmin(req, admins)) {
        return sendUnauthorized(res)
      }

      const body = await readBody(req)
      const nextSettings = {
        ...settings,
        ...body,
        updatedAt: new Date().toISOString()
      }
      await writeJsonFile('settings.json', nextSettings)
      return sendJson(res, 200, nextSettings)
    }

    if (pathname === '/api/reports/stats' && req.method === 'GET') {
      return sendJson(res, 200, buildStats(orders, menu))
    }

    if (pathname === '/api/tables/status' && req.method === 'GET') {
      return sendJson(res, 200, getTableStatuses(orders))
    }

    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const body = await readBody(req)
      const admin = admins.find((item) => item.username === body.username && isAdminPasswordMatch(item, body.password))
      if (!admin) {
        return sendJson(res, 401, { message: 'Username atau password salah.' })
      }
      const auth = createAdminToken(admin, admins)
      return sendJson(res, 200, {
        success: true,
        admin: { ...admin, password: undefined },
        auth
      })
    }

    return sendJson(res, 404, { message: 'Endpoint tidak ditemukan.' })
  } catch (error) {
    return sendJson(res, 500, {
      message: 'Terjadi kesalahan server.',
      detail: error.message
    })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { createServer } = await import('node:http')
  const server = createServer((req, res) => handleApiRequest(req, res))
  server.listen(API_PORT, () => {
    console.log(`\n✅ API server running at http://localhost:${API_PORT}`)
    console.log('📁 DB directory:', DB_DIR)
  })
}
