# Worksheet Master Generator V5.1 — Render Ready

## Isi
- `server.js` — prompt engine + core rules tetap di server
- `public/index.html` — tampilan generator untuk pembeli
- `render.yaml` — konfigurasi Render Blueprint
- `data.json` — database lisensi demo
- `.env.example` — contoh secret

## Deploy tercepat
1. Upload folder ini ke GitHub sebagai repository.
2. Di Render: New → Blueprint.
3. Pilih repository tersebut.
4. Render membaca `render.yaml`.
5. Isi `ADMIN_KEY` dan `LICENSE_SECRET` ketika diminta.
6. Deploy.

Render mendukung Blueprint melalui `render.yaml`. Node versi di proyek ini dipatok ke 24.21.0.

## Buat lisensi
Setelah service aktif, gunakan endpoint admin:
POST /api/admin/create-license
Header:
x-admin-key: ADMIN_KEY

Body:
{"licenseKey":"WS-CLIENT-001","expiresAt":null,"note":"Pembeli 001"}

Contoh curl:
curl -X POST https://DOMAIN-ANDA.onrender.com/api/admin/create-license \
  -H "Content-Type: application/json" \
  -H "x-admin-key: ADMIN_KEY_ANDA" \
  -d '{"licenseKey":"WS-CLIENT-001","note":"Pembeli 001"}'

## Catatan produksi penting
`data.json` cocok untuk demo/testing. Untuk penjualan skala lebih besar, pindahkan data lisensi ke database/Redis agar tidak bergantung pada filesystem instance.

Jangan masukkan `ADMIN_KEY` atau `LICENSE_SECRET` ke GitHub.
