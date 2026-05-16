# Daeng Kopi - Database & API Setup

## Database Structure

Repository ini memakai dua lapisan data:

- `db/`: seed data yang aman untuk di-commit
- `DB_DIR` runtime: data operasional yang ditulis backend saat aplikasi berjalan. Default lokal adalah `./.runtime/db`

Saat file runtime belum ada, backend akan menyalin seed yang sesuai dari `db/`.

### Menu Database (`db/menu.json`)
Menyimpan data menu kopi dengan struktur:
```json
{
  "id": 1,
  "name": "Espresso",
  "category": "Coffee",
  "description": "Strong and bold black coffee",
  "price": 25000,
  "stock": 12,
  "image": "espresso.jpg"
}
```

### Orders Database (`db/orders.json`)
Menyimpan semua pesanan dengan struktur:
```json
{
  "id": "ORD001",
  "customerId": "CUST001",
  "customerName": "John Doe",
  "tableId": "table-1",
  "items": [
    {
      "id": 1,
      "name": "Espresso",
      "price": 25000,
      "qty": 2
    }
  ],
  "total": 85000,
  "status": "completed",
  "paymentMethod": "cash",
  "date": "2026-05-10",
  "timestamp": "2026-05-10T14:30:00Z"
}
```

### Admins Database (`db/admins.json`)
Menyimpan akun admin:
```json
{
  "id": "ADMIN001",
  "username": "__SET_ADMIN_USERNAME__",
  "password": "sha256:__SET_ADMIN_PASSWORD_SHA256__",
  "name": "Owner",
  "email": "owner@example.com",
  "role": "superadmin"
}
```

Gunakan hash `sha256:` untuk password admin sebelum deploy ke hosting publik.

Contoh membuat hash password di PowerShell:

```powershell
$hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes("ganti-password-anda"))).ToLower()
"sha256:$hash"
```

## API Server

API server berjalan di `http://localhost:3002`

### Menjalankan API Server

```powershell
npm run dev:api
```

### Health Check

```text
GET /api/health
```

## Catatan Auth

- `POST /api/admin/login` menghasilkan token Bearer.
- Endpoint mutasi admin memerlukan header `Authorization: Bearer <token>`.
- `PUT /api/orders/:id` tanpa token hanya menerima field publik terkait bukti bayar customer.
