# Catatan validasi redesign LOKAVA v2.21.0

## Perubahan yang diperiksa

- Halaman publik utama diringkas menjadi halaman penemuan dan setiap kategori tetap mengarah ke route publik tersendiri.
- Navigasi tab bawah ditambahkan untuk halaman publik dan disembunyikan pada area admin/penjual.
- Admin mendapatkan route section: `overview`, `businesses`, `products`, `payments`, `deletions`, `content`, `users`, `settings`, `notifications`, dan `audit` di bawah `/admin/dashboard`.
- Penjual mendapatkan route section: `overview`, `profil-usaha`, `produk`, `paket`, `promosi`, dan `pengaturan` di bawah `/penjual/dashboard`.
- Komponen autentikasi dan operasi API yang sudah ada dipertahankan; route baru menggunakan komponen workspace yang sama agar perilaku autentikasi dan data tidak diduplikasi.
- PWA icon diperbarui dan `.env.example` serta `.gitignore` disediakan.

## Pemeriksaan yang berhasil

- `node scripts/check-lokava-source.mjs` — lulus.
- `node scripts/check-cloudinary-media.mjs` — lulus.
- `NODE_PATH=/opt/nvm/versions/node/v22.16.0/lib/node_modules node scripts/check-seo.mjs` — lulus.
- Parser TypeScript global: 81 file TS/TSX diparse, 0 syntax error.
- Parser PostCSS global: `app/globals.css` berhasil diparse.

## Pemeriksaan yang belum dapat dilakukan

- `npm ci` tidak selesai karena akses registry paket tidak tersedia pada lingkungan pengerjaan; percobaan offline juga tidak memiliki seluruh paket di cache.
- Karena dependensi Next.js tidak berhasil dipasang, `npm run typecheck` dan `npm run build` belum dapat dijalankan. Percobaan build berhenti dengan `next: not found`.
- Firebase Authentication, Firestore, Cloudinary upload, Telegram, dan deployment Vercel tidak dapat diuji tanpa kredensial proyek operator.

## Sebelum deploy

1. Jalankan `npm ci` pada lingkungan yang memiliki akses registry.
2. Jalankan `npm run typecheck` dan `npm run build`.
3. Isi environment variables dari `.env.example` di Vercel; jangan commit `.env` atau private key.
4. Uji role admin/penjual, aturan Firestore, unggah media Cloudinary, dan alur pembayaran di Firebase Emulator/staging.
5. Periksa foto hero dan atribusinya; gambar diambil dari Wikimedia Commons dan dimuat dari thumbnail host Wikimedia.
