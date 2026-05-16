# Daeng Kopi Management

Aplikasi pemesanan kopi berbasis React + Vite dengan backend Node.js sederhana dan penyimpanan JSON.

## Stack

- Frontend: React 18 + Vite
- Backend: Node.js HTTP server
- Database: file JSON di folder `db/`
- Deploy frontend: GitHub Pages
- Deploy backend: Render atau Railway

## Menjalankan Lokal

1. Install dependency

```powershell
npm install
```

2. Jalankan backend

```powershell
npm run dev:api
```

3. Jalankan frontend dev server

```powershell
npm run dev
```

4. Build production frontend

```powershell
npm run build
```

5. Jalankan server production lokal

```powershell
npm run start
```

## Environment

Contoh environment ada di `.env.example`.

Variabel penting:

- `VITE_API_BASE`: URL backend untuk frontend static hosting. Contoh: `https://nama-app.onrender.com/api`
- `PORT`: port server production lokal atau platform hosting
- `API_PORT`: port backend lokal jika dijalankan terpisah
- `DB_DIR`: lokasi penyimpanan file JSON runtime backend. Default lokal sekarang `./.runtime/db`
- `ADMIN_AUTH_SECRET`: secret untuk menandatangani token admin server-side

## Seed dan Runtime Data

- Folder `db/` sekarang dipakai sebagai seed data yang aman untuk di-commit.
- Saat backend pertama kali berjalan, seed di `db/` akan otomatis disalin ke runtime directory (`./.runtime/db` secara default).
- Semua perubahan data setelah aplikasi berjalan ditulis ke runtime directory, bukan kembali ke `db/`.
- Folder `.runtime/` sudah masuk `.gitignore`, jadi order/data lokal tidak mudah ikut ter-commit.

## Admin Auth

- Login admin sekarang menghasilkan token Bearer yang wajib ada untuk mutasi admin seperti ubah menu, stok, pengaturan WhatsApp, dan update status order dari dashboard.
- `PUT /api/orders/:id` tanpa token hanya boleh dipakai customer untuk update metadata bukti bayar WhatsApp, bukan untuk mengubah status atau data kasir.
- Password admin mendukung format hash `sha256:<hash>`. Hindari menyimpan password plain text di repo.

Contoh membuat hash password di PowerShell:

```powershell
$hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes("ganti-password-anda"))).ToLower()
"sha256:$hash"
```

## Hosting

### Opsi 1: GitHub Pages + Render

Frontend:

- Push ke branch `main`
- Set GitHub Actions variable `VITE_API_BASE` ke URL backend Render, misalnya `https://daeng-kopi-api.onrender.com/api`
- Workflow [deploy-pages.yml](.github/workflows/deploy-pages.yml) akan build dan publish `dist`

Backend:

- Deploy ke Render memakai [render.yaml](render.yaml)
- Persistent disk dipakai untuk menyimpan data JSON
- Health check backend tersedia di `/api/health`
- Set environment variable `ADMIN_AUTH_SECRET`
- Biarkan `DB_DIR` menuju disk persistence, bukan ke folder seed repo

### Opsi 2: Railway

- Deploy backend memakai [railway.json](railway.json)
- Set `DB_DIR` bila ingin lokasi persistence khusus
- Set `ADMIN_AUTH_SECRET`
- Gunakan URL backend Railway sebagai `VITE_API_BASE` untuk frontend static

## Endpoint Penting

- `GET /api/health`
- `GET /api/menu`
- `POST /api/orders`
- `PUT /api/orders/:id`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/tables/status`

## Checklist Sebelum Push

1. Pastikan `db/admins.json` tidak lagi memakai placeholder dan gunakan hash `sha256:` untuk password admin.
2. Pastikan `.env` lokal tidak ikut ter-commit dan secret produksi hanya diset di platform hosting.
3. Pastikan `.runtime/` tetap tidak terlacak Git; data operasional harus hidup di sana atau di persistent disk hosting.
4. Jalankan verifikasi build frontend dengan `npm install` lalu `npm run build`.
5. Uji login admin, tambah/edit/hapus menu, update transaksi, dan alur customer payment setelah backend aktif.
6. Untuk GitHub Pages, set repository variable `VITE_API_BASE` sebelum push ke `main`.
