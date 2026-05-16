# Quick Start

## Lokal Development

1. Install dependency

```powershell
npm install
```

Sebelum login admin, ganti placeholder di `db/admins.json` dan isi `ADMIN_AUTH_SECRET` pada `.env` lokal.

2. Jalankan backend

```powershell
npm run dev:api
```

Backend tersedia di `http://localhost:3002`.

3. Jalankan frontend

```powershell
npm run dev
```

Frontend tersedia di `http://localhost:3001`.

## Production Lokal

1. Build frontend

```powershell
npm run build
```

2. Jalankan server production

```powershell
npm run start
```

Server production akan melayani frontend dan `/api/*` pada origin yang sama.
Seed data dari `db/` akan disalin otomatis ke `./.runtime/db` bila runtime database belum ada.

## Deploy Frontend Static

Untuk GitHub Pages, set variable `VITE_API_BASE` ke URL backend publik Anda sebelum workflow build berjalan.

Contoh:

```text
https://daeng-kopi-api.onrender.com/api
```

## Deploy Backend

- Render: gunakan [render.yaml](render.yaml)
- Railway: gunakan [railway.json](railway.json)
- Set `ADMIN_AUTH_SECRET` di platform hosting
- Arahkan `DB_DIR` ke persistent storage, bukan ke folder seed repo

Health check backend tersedia di `GET /api/health`.
