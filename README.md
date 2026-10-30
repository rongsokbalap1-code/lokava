
## v2.18.0 — Penyelesaian alur utama dan lokasi otomatis
Penjual mengisi dan memperbarui WhatsApp, alamat, serta koordinat peta dari dashboard. Perubahan pada profil yang telah dipublikasikan otomatis kembali ke antrean admin dan tidak ditampilkan ke publik sampai disetujui ulang. Beranda memuat katalog usaha dan produk yang sudah diterbitkan dan diverifikasi; tombol WhatsApp memakai nomor yang dinormalisasi server, sementara tombol peta hanya muncul bila kedua koordinat valid.

# LOKAVA Premium — Website Lokava

**Release source:** v2.18.0 (28 Oktober 2026).

**Tagline:** Jelajahi Keindahan Sukabumi Selatan  
**Dokumen acuan:** `docs/source/PRD_FINAL_LOKAVA_PREMIUM_v2.0.pdf`, 14 Oktober 2026.

This repository is a Next.js + TypeScript + Firebase implementation package, currently version **2.20.0**, with public directories/details, seller/admin workspaces, location pin selection, Google Maps link support, moderation, manual payments, paid promotions, ratings, content management and account-deletion workflow. It is **not evidence of a production-complete platform** until the full build, configured-service tests, security tests, legal review and live smoke tests pass.

## Current contents

- Responsive editorial-style landing page with responsive navigation and mobile bottom navigation.
- Public search across approved records, category filters, typed local-device favorites, share/copy link, empty state and feedback toast.
- Public sections for travel discovery, map information, seller onboarding CTA, and plan comparison.
- Public UI polish in v2.5: scroll-progress indicator, staggered reveal-on-scroll, hero image drift, animated map lines and pins, refined hover/focus states, elevated cards, reduced-motion support, and responsive motion adjustments.
- Database-backed public detail routes for approved destinations, businesses, products, articles and packages, with metadata, WhatsApp/map links, and content-safe empty/error states.
- Local favorites page backed by the same device-local `localStorage` key as the landing page.
- Firebase Email/Password sign-in and account creation at `/penjual/masuk`, with navigation to `/penjual/dashboard`.
- Seller workspace with responsive navigation, business submission, product draft creation, record status and revision-note display. Business/product photos are uploaded through authenticated server APIs and stored in Cloudinary with plan-based photo quotas. Business/product create, edit and product delete operations go through `/api/seller/records`, which verifies Firebase ID tokens and ownership server-side.
- Initial admin control center at `/admin/dashboard`, protected in the UI by a forced-refresh Firebase ID token check for the trusted `admin: true` custom claim. Admin QR payment images are stored in Cloudinary; Firestore stores only Cloudinary URL/public ID metadata.
- Admin review queue for businesses/products, approve/publish and request-revision actions with a required reason.
- Trusted server-side moderation endpoint (`POST /api/admin/review`) verifies Firebase ID tokens and requires the trusted `admin: true` custom claim.
- Atomic Firestore review updates plus centralized `adminActivityLogs` records through Firebase Admin SDK.
- Firestore rule guardrails preventing seller updates to admin review fields.
- Firestore blocks direct browser creation of businesses/products so sellers cannot bypass server-side quota checks. Product creation uses a Firestore transaction to check the current plan quota and create the draft atomically: FREE 3, PREMIUM 50, BISNIS 200. Active plan is read from server-managed `subscriptions` records (`ownerUid`, `status: active`, `planId`, optional `expiresAt`).
- Server-enforced product quotas: FREE 3, PREMIUM 50, BISNIS 200. Default prices are only starting values; authorized admins can edit prices for all plans from the admin dashboard. New transactions snapshot the server-managed price.
- Initial seller subscription-request flow: `/api/seller/payments` creates a server-priced pending transaction and seller UI displays its status. Payment proof uploads use Cloudinary authenticated assets; they are not stored in Firebase Storage. Admin UI lists pending subscription requests and `/api/admin/payments` can approve/reject; approval creates a 30-day subscription and an audit record.
- Firebase client initialization helper that refuses to initialize without configuration.
- Baseline Firestore rules with deny-by-default catch-all and restrictive rules for sensitive records.
- PWA manifest/icons, dynamic sitemap/robots, `.env.example`, deployment/security notes, end-to-end flow documentation and manual QA checklist.

## Public design and motion notes

The public landing page uses CSS-driven transitions and keyframe animations plus an IntersectionObserver reveal effect. It respects `prefers-reduced-motion` and includes visible keyboard focus states. Animation is intentionally decorative; it does not block navigation or content. The public UI includes decorative animation, icons, layout illustrations, banners, and illustrative demo imagery. These are bundled UI/design assets or demo references and intentionally remain outside Cloudinary. Cloudinary is reserved for images uploaded through app workflows by sellers and administrators (business/product photos and payment QR), plus private payment-proof uploads.

## Important limitations

- Legacy examples in `lib/data.ts` are illustrative reference data only. The public catalog now loads from approved Firestore records and does not use those examples as a live-data fallback.
- Seller dashboard includes a Leaflet/OpenStreetMap pin picker. Sellers may instead paste a validated Google Maps link; coordinates are extracted when available, and unresolvable short links remain usable as public navigation links without invented coordinates.
- Seller record mutations are routed through Firebase Admin server APIs and Firestore blocks direct browser mutations to businesses/products. These routes and rules still require Firebase Emulator and production configuration tests.
- Search queries approved server data through `/api/public/search`. Favorites are device-local and stored with item ID, type and timestamp; cross-device sync is not implemented.
- Admin review, content management, account-deletion decisions and payment decisions are routed through trusted Node.js API routes. Subscription and promotion payments are manual: there is no payment gateway, webhook, refund automation, or automatic reconciliation. Operators must verify incoming funds outside the app before approving a transaction.
- Public detail pages read approved Firestore records and do not invent coordinates, contact numbers, prices, or verification claims. Destinations/articles/packages can be managed by admins through the content workspace.
- Official operator contact details must be configured before launch; the contact page intentionally does not invent an email address or phone number.
- Firestore rules are a starting baseline, not a substitute for emulator/security testing. Admin custom claims must be assigned only by trusted Firebase Admin SDK code or another trusted operator process—never from a public client page. Admin content, user status, moderation and financial state changes are routed through server APIs, but still require security testing before production.
- No real credentials are included. Do not commit `.env` or service account files.

## Requirements

- Node.js 22+ required (Firebase Admin SDK 14)
- npm
- Firebase project for authenticated/server-backed functions

## Instalasi paling mudah di Windows

1. Pasang **Node.js 22 atau lebih baru (LTS disarankan)** dari <https://nodejs.org/en/download> jika belum ada.
2. Ekstrak ZIP proyek ke sebuah folder di laptop.
3. Buka folder `lokava-premium`.
4. Klik dua kali `INSTALL-LOKAVA-WINDOWS.bat` dan tunggu sampai selesai. Skrip ini memeriksa Node.js/npm, membuat `.env.local` dari `.env.example` bila belum ada, lalu memasang dependensi.
5. Setelah instalasi selesai, klik dua kali `JALANKAN-LOKAVA.bat`.
6. Buka <http://localhost:3000> di browser.

Jika Windows menampilkan peringatan keamanan, pastikan file berasal dari ZIP proyek ini sebelum memilih untuk menjalankannya. Kamu juga bisa menjalankan skrip melalui PowerShell.

## Instalasi manual (Windows, macOS, atau Linux)

```bash
npm install
npm run dev
```

Di Windows, `.env.local` dibuat otomatis oleh skrip instalasi. Di macOS/Linux, salin `.env.example` menjadi `.env.local` sebelum menjalankan aplikasi jika diperlukan. Buka `http://localhost:3000`.

**Catatan penting:** menjalankan aplikasi secara lokal tidak otomatis mengaktifkan fitur server yang memerlukan kredensial Firebase Admin atau Cloudinary. Isi `.env.local` dengan konfigurasi milikmu sendiri untuk mengaktifkan layanan terkait. Jangan unggah `.env.local` atau rahasia ke GitHub.

## Administrator setup

1. Create the administrator account directly in Firebase Authentication or through a controlled operator process; do not expose admin registration.
2. Assign the `admin: true` custom claim only with a trusted Firebase Admin SDK process. Never let the browser or a user-editable profile document assign this claim.
3. Set `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY` as server-only environment variables in `.env.local` and the deployment environment. The server helper converts escaped `\\n` sequences in the private key to newlines. Never use a `NEXT_PUBLIC_` prefix for these secrets or commit them.
4. Apply and test `firestore.rules` in the Firebase Emulator. Admin review decisions are processed by `POST /api/admin/review` and write an audit event; other sensitive mutations remain release blockers.
5. Sign in through `/penjual/masuk`, then open `/admin/dashboard`. If the claim was just added, sign out and back in or refresh the ID token.
6. Test approve/revision flows with disposable records before handling any real submissions.

## Seller record management (v2.8)

- `POST /api/seller/records` creates business submissions and draft products; product creation checks server-side plan quota.
- `PATCH /api/seller/records` updates a seller-owned business or product only while it is not published/approved; edits reset moderation to pending/draft.
- `DELETE /api/seller/records` allows a seller to delete their own product only while it is not published/approved. Business deletion is intentionally not offered in the UI.
- Seller dashboard exposes edit actions for non-published records and delete for non-published products.
- These routes use Firebase Admin credentials; install and test Firestore rules and Firebase Emulator before production.

## Cloudinary upload flows and audit (v2.15)

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env.local` or the deployment environment. These are server-only credentials. Seller-uploaded business/product photos, admin-uploaded payment QR images, and seller-uploaded payment proofs use Cloudinary. The decorative/illustrative images used to render the application UI do not need to be moved. Run `npm run media:check` to audit that the required upload endpoints still include their Cloudinary and security checks; this audit does not flag static UI imagery.

## Current release notes

See `docs/FINAL_SYSTEM_FLOW_V2.18.md` for end-to-end user/admin flows, map behavior, environment variables and remaining release gates. Admin can manage destinations, articles, packages, categories, banners, site SEO/contact settings, user suspension, audit logs and notification logs. Content photos upload to Cloudinary. Plan settings include product and media quotas. Anonymous ratings require `RATING_HASH_SECRET`; Telegram notifications require `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. PWA icons and manifest are included.

## Build and checks

```bash
npm run source:check
npm run media:check
npm run typecheck
npm run build
```

Run the checks after dependencies are installed in an environment with package registry access. Do not mark checks passed unless the commands have actually completed successfully.

## Deployment outline

1. Create/choose the operator-owned Firebase project and configure Auth, Firestore and approved indexes.
2. Review the Firestore schema and rules; configure server-only Firebase Admin credentials and audit every sensitive mutation route before production.
3. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` server-side only. Also set `RATING_HASH_SECRET`, `NEXT_PUBLIC_SITE_URL`, and optional `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`. All app-uploaded QR, payment-proof, business, and product photos use Cloudinary. Decorative animations, icons, banners, UI illustrations, and demo imagery remain as application assets and are not migrated. Firebase Storage is not used by the app upload flows.
4. Add reviewed real destination, business, product, map-coordinate and policy content.
5. Push the repository to GitHub.
6. Import the repository into Vercel and configure environment variables separately for Preview and Production.
7. Run production build, security tests, responsive screenshot review and live smoke tests before launch.

## Plan values in PRD

- FREE: up to 3 products, 3 product photos total, 3 business profile photos.
- PREMIUM: initial Rp25.000/month, up to 50 products, 5 photos/product, 10 business profile photos.
- BISNIS: initial Rp50.000/month, up to 200 products, 8 photos/product, 20 business profile photos.

Default prices and quotas are starting values and are now editable by admin; product and photo quotas are enforced on the server. The values still require boundary/concurrency tests in Firebase Emulator before production.


## v2.9.0 — Permintaan langganan dan moderasi pembayaran awal

- Penjual dapat membuat permintaan paket PREMIUM atau BISNIS melalui `POST /api/seller/payments`. Harga saat permintaan dibuat dibaca dari pengaturan server, bukan dari browser. Satu permintaan langganan pending per akun diperbolehkan.
- Dashboard penjual menampilkan riwayat permintaan dan kode referensi.
- Dashboard admin memiliki bagian Pembayaran & Paket. `POST /api/admin/payments` memverifikasi custom claim admin, memeriksa nilai transaksi, mencatat audit, dan mengaktifkan langganan berdasarkan durasi yang tersimpan pada transaksi. Langganan aktif sebelumnya ditandai superseded.
- **Batasan pada v2.9:** belum tersedia konfigurasi rekening tujuan, unggah QR, unggah bukti pembayaran, payment gateway, webhook, refund, atau rekonsiliasi otomatis. Detail tersebut mulai ditambahkan pada v2.10, tetapi tetap perlu pengujian dan konfigurasi operator sebelum produksi.
- Sebelum produksi, uji transaksi konkurens, aturan Firestore, query/index, dan alur aktivasi di Firebase Emulator.


## v2.10.0 — Admin-editable package prices and payment instructions

- Added trusted admin API `/api/admin/payment-settings` for editing all plan prices (FREE, PREMIUM, BISNIS), QR payment image/instructions, and bank transfer destination/instructions.
- In v2.10, QR was initially stored as base64 in Firestore; v2.12 supersedes this with Cloudinary upload and Firestore URL/public-ID metadata.
- Seller dashboard loads prices and available payment methods from the server. Sellers can create a subscription request by QR or bank transfer, and the transaction stores a snapshot of the chosen payment instructions.
- Admin approval validates the server-snapshotted amount and uses the transaction duration rather than a hardcoded plan price.
- IMPORTANT: configure Firebase Admin credentials, review Firestore Rules, use only official payment destinations, verify incoming funds manually, and run typecheck/build/emulator tests before production. This is not a payment gateway and does not automatically confirm payment.


### v2.11.0 — Bukti pembayaran privat (storage awal)

- Versi ini awalnya menggunakan Firebase Storage untuk bukti pembayaran. Pada v2.12, alur unggah baru dipindahkan ke Cloudinary.
- Data lama yang masih memiliki `proofObjectPath` di Firebase Storage harus diunggah ulang oleh penjual atau dimigrasikan secara terkontrol sebelum transaksi lama dapat disetujui.

### v2.12.0 — Semua media unggahan aplikasi melalui Cloudinary

- QR pembayaran diunggah melalui endpoint admin terautentikasi ke Cloudinary; Firestore hanya menyimpan `imageUrl` dan `publicId`, bukan base64 gambar.
- Bukti pembayaran diunggah sebagai Cloudinary `authenticated` asset; hanya endpoint admin yang dapat mengeluarkan URL pengiriman bertanda tangan setelah memverifikasi custom claim admin.
- Foto usaha dan produk diunggah ke Cloudinary melalui `/api/seller/images`, dengan pemeriksaan token, kepemilikan, status rekaman, format gambar, ukuran file, serta kuota foto berdasarkan paket.
- Penjual dapat menghapus foto dari rekaman yang belum dipublikasikan; penghapusan produk draft juga membersihkan asset Cloudinary yang terkait.
- Firebase Storage tidak lagi digunakan oleh alur unggah aplikasi. `storage.rules` tetap deny-all sebagai pengaman untuk bucket lama.
- Konfigurasi wajib: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, dan `CLOUDINARY_API_SECRET`, semuanya server-side. Jangan memakai prefix `NEXT_PUBLIC_` untuk API secret.
- Catatan migrasi: QR lama yang tersimpan sebagai data URL harus diunggah ulang melalui dashboard admin. Bukti lama di Firebase Storage perlu diunggah ulang atau dimigrasikan sebelum disetujui. Foto ilustrasi statis pihak ketiga pada landing page masih berupa URL referensi; ganti dengan asset Cloudinary berlisensi/terverifikasi sebelum produksi jika kebijakan proyek mewajibkan seluruh visual website berada di Cloudinary.
- Typecheck, production build, Firebase Emulator, Cloudinary live upload, akses URL authenticated, cleanup, dan browser QA masih harus dijalankan sebelum rilis produksi.


## Promosi berbayar (v2.16.0)
Seller dapat mengajukan produk unggulan, promosi kategori, usaha unggulan, atau banner beranda untuk durasi yang dikonfigurasi admin (7/14/21/30 hari). Harga dasar dan durasi disimpan di `siteSettings/promotions`. Server membuat transaksi promosi dengan nominal snapshot; seller wajib mengunggah bukti pembayaran privat ke Cloudinary. Admin memverifikasi dana dari antrean transaksi, lalu menyetujui atau menolak konten secara terpisah. Hanya promosi berstatus `active` dan `approved` dalam rentang tanggal aktif yang muncul di halaman publik.

## SEO dan cakupan Indonesia

SEO teknis per v2.20.0 mencakup metadata/canonical per halaman, Open Graph/Twitter Cards, JSON-LD, `robots.txt`, sitemap dinamis, dan halaman wilayah yang hanya muncul ketika ada cukup konten publik yang disetujui. Baca `docs/SEO_GUIDE.md` sebelum deployment.

Atur domain utama HTTPS melalui Dashboard Admin → Pengaturan situs publik; `NEXT_PUBLIC_SITE_URL` di hosting menjadi fallback bila kolom domain dikosongkan. Dari panel yang sama, admin dapat mengatur judul/deskripsi SEO, mengaktifkan atau menonaktifkan indeksasi, dan mengisi token verifikasi Google Search Console. Setelah deployment, verifikasi `robots.txt` dan `sitemap.xml`, lalu daftarkan domain dan sitemap di Google Search Console. SEO tidak menjamin posisi tertentu di Google; cakupan nasional bergantung pada kelengkapan dan kualitas konten nyata yang ditinjau admin.
