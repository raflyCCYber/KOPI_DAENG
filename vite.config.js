import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const getPagesBase = (repoName) => {
  if (!repoName || repoName.endsWith('.github.io')) {
    return '/'
  }

  return `/${repoName}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || ''
  const explicitBase = env.VITE_PUBLIC_BASE || process.env.VITE_PUBLIC_BASE || ''
  const base = explicitBase || (process.env.GITHUB_ACTIONS === 'true' ? getPagesBase(repoName) : '/')

  return {
    base,
    plugins: [react()],
    server: {
      port: 3001,
      open: true
    }
  }
})
