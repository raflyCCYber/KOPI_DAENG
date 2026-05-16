import { createServer } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApiRequest } from './api-server.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const DIST_DIR = path.join(__dirname, 'dist')
const DIST_ROOT = path.resolve(DIST_DIR)

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'

  const resolvedPath = path.resolve(DIST_ROOT, `.${pathname}`)

  if (!resolvedPath.startsWith(`${DIST_ROOT}${path.sep}`) && resolvedPath !== DIST_ROOT) {
    res.writeHead(403, { 'Content-Type': 'text/plain' })
    res.end('Forbidden')
    return
  }

  try {
    const stats = await fs.stat(resolvedPath)
    if (stats.isDirectory()) {
      return serveFile(path.join(resolvedPath, 'index.html'), res)
    }
    return serveFile(resolvedPath, res)
  } catch (err) {
    return serveFile(path.join(DIST_ROOT, 'index.html'), res)
  }
}

async function serveFile(filePath, res) {
  try {
    const content = await fs.readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    res.writeHead(200, { 'Content-Type': contentType })
    res.end(content)
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (url.pathname.startsWith('/api')) {
    return handleApiRequest(req, res)
  }

  return serveStatic(req, res)
})

server.listen(PORT, () => {
  console.log(`\n✅ Production server running at http://localhost:${PORT}`)
  console.log('📦 Serving static files from', DIST_DIR)
  console.log('📡 API available at /api/*')
})
