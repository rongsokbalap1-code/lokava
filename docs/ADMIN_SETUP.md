# LOKAVA administrator setup

The admin workspace lives at `/admin/dashboard`. The client checks for the trusted Firebase ID token custom claim `admin: true`. Review decisions now go through `POST /api/admin/review`, which verifies a revoked-aware Firebase ID token on the server and writes the decision plus an audit event in one Firestore transaction.

## Required operator steps

1. Create the admin user in Firebase Authentication through a controlled operator workflow.
2. Assign the `admin: true` custom claim using a trusted Firebase Admin SDK process running outside the public browser app. Never assign the claim from a client page, URL, user-editable Firestore field, or form.
3. Set `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY` as server-only environment variables in local `.env.local` and the deployment environment. The server helper converts escaped `\n` sequences in the private key to actual newlines. Never prefix these secrets with `NEXT_PUBLIC_` or commit them.
4. Apply `firestore.rules` to the intended Firebase project and test with the Firebase Emulator.
5. Sign in at `/penjual/masuk`, then visit `/admin/dashboard`. If the claim was added after the user signed in, sign out and back in to refresh the ID token.
6. Test approve/revision flows with disposable records before handling any real submissions.

## Current behavior

- The admin page reads businesses and products from Firestore, displays an overview and provides basic search.
- Approving a record sets `status: published`, `approvalStatus: approved`, `verified: true`, and review metadata using the server Admin SDK.
- Requesting a revision requires a reason and sets `status: rejected`, `approvalStatus: rejected`, `verified: false`, and review metadata.
- Both decisions write a corresponding `adminActivityLogs` record atomically with the content update. The collection is client-write-denied by Firestore Rules.
- Public Firestore reads are governed by the `published()` rule requiring `status == published` and `approvalStatus == approved`.
- Seller rules block owner updates to review metadata and approval fields.

## Release blockers

The moderation mutation now uses a trusted server handler, but this remains an initial implementation. Before production, add pagination and bounded queries, rate limiting/monitoring, verify every status transition against the PRD, and test the route and Firestore Rules in the Emulator. The admin list still uses client Firestore reads; the UI gate is not itself a security boundary.


## Konfigurasi Cloudinary untuk semua unggahan foto (v2.12.0)

Tambahkan environment variables server-side berikut di `.env.local` dan lingkungan deployment:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Jangan gunakan prefix `NEXT_PUBLIC_` untuk nilai-nilai tersebut dan jangan commit secret ke GitHub.

Semua foto yang diunggah lewat aplikasi disimpan di Cloudinary:

- QR pembayaran admin: asset `upload` publik, karena QR ditampilkan ke penjual.
- Foto usaha dan produk: asset `upload` publik, dengan folder per pemilik dan rekaman.
- Bukti pembayaran: asset `authenticated` privat; URL pengiriman bertanda tangan hanya diberikan oleh API admin setelah verifikasi custom claim.

Firebase Storage tidak digunakan untuk alur unggah aplikasi. `storage.rules` deny-all untuk mencegah akses klien langsung ke bucket lama. QR lama yang tersimpan sebagai base64 harus diunggah ulang dari dashboard admin. Bukti pembayaran lama yang masih memiliki `proofObjectPath` di Firebase Storage harus diunggah ulang ke Cloudinary sebelum admin dapat menyetujui transaksi tersebut. Pastikan paket Cloudinary dan kredensialnya aktif sebelum menguji upload.

## QA wajib

1. Uji unggah QR admin, simpan pengaturan, reload halaman, dan pastikan URL Cloudinary yang sama ditampilkan pada dashboard penjual.
2. Uji unggah foto usaha/produk, batas kuota tiap paket, penghapusan foto, dan pemisahan kepemilikan dua akun.
3. Uji bukti pembayaran sebagai asset `authenticated`: penjual lain dan non-admin tidak boleh mendapatkan URL bukti.
4. Pastikan tidak ada `data:image/...base64` atau object path Firebase Storage yang baru ditulis oleh alur aplikasi.
5. Jalankan `npm run typecheck`, `npm run build`, Firebase Emulator tests, dan browser QA sebelum production.
