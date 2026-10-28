## v2.18.0 — end-to-end release checklist

- [ ] Install dependencies with `npm install`; run `npm run source:check`, `npm run media:check`, `npm run typecheck`, and `npm run build`.
- [ ] Configure `RATING_HASH_SECRET`, canonical `NEXT_PUBLIC_SITE_URL`, Firebase Admin and Cloudinary environment values in staging.
- [ ] Seller location picker: click map; verify both coordinates persist; verify marker recenters; paste Google Maps URL with `@lat,lng`, `?q=lat,lng`, encoded comma, and `!3d/!4d`; paste short maps link with no coordinates and verify pin is cleared while link remains saved.
- [ ] Verify invalid HTTP URLs and non-Google hosts are rejected; a link without parseable coordinates does not produce an invented marker.
- [ ] Verify business public page shows saved address, WhatsApp, Google Maps link and OSM map only when coordinates exist. Test profile edit returns to pending and public profile disappears until admin re-approves.
- [ ] Create product linked to a seller-owned business; verify public product/contact/map are tied to that exact business. Verify product is hidden if its business is not published/approved.
- [ ] Create/admin-publish destination, article, package, category and banner; verify each public route/API shows it. Verify draft/archived content is hidden.
- [ ] Upload admin content photo; verify Cloudinary asset and saved photo metadata. Test wrong MIME/signature, >5 MB, missing token and non-admin 403.
- [ ] Search `/cari` across business, product, destination, article and package; verify no demo records are presented as live content.
- [ ] Favorites: add business, product, destination, article and package; refresh and verify typed IDs/time persist; remove each; verify old string-only favorites remain readable. Test private browsing/storage disabled.
- [ ] Ratings: with `RATING_HASH_SECRET`, submit 1–5 stars; verify aggregate updates; second submission from same identity within 24 hours returns 429; invalid target/value and non-public content are rejected. Verify raw rating docs are not client-readable.
- [ ] Change package price, duration, product count and all photo quotas in admin; verify public plan data, product creation and media upload enforce the new settings server-side. Test boundary and concurrent requests.
- [ ] Account deletion: seller requests; admin must mark reviewing before complete; rejection requires a reason; completion archives profiles/products, attempts Cloudinary photo cleanup, deletes Firebase Auth account and retains transaction/audit. Test retry path when Auth deletion fails.
- [ ] Configure Telegram and verify submission/payment/moderation/deletion messages; deliberately invalidate token and verify core operation is not rolled back and failure is logged.
- [ ] Review privacy/terms/seller policy drafts and replace missing operator identity/contact/complaint/refund details before publication.
- [ ] Admin user management: disable a non-admin account; verify Firebase Auth is disabled and published seller records are hidden; re-enable and verify only previously published/approved records are restored. Confirm admin roles cannot be changed from the UI.
- [ ] Admin site settings: save SEO title/description and contact/social fields; verify `/api/public/site-settings`, `/kontak`, root metadata after cache revalidation, and sitemap canonical origin. Test invalid email, WhatsApp and non-HTTPS social links.
- [ ] Audit/notifications: verify admin actions are recorded in `adminActivityLogs`; Telegram sent/skipped/failed status is visible in admin logs without storing full message bodies or credentials.
- [ ] PWA: validate manifest, 192/512 PNG icons, theme/background colors, and installability in supported browsers.
- [ ] Run Firebase Emulator security tests, Cloudinary staging tests, keyboard/accessibility checks, and browser QA at 360, 390, 768, 1024 and 1440px.
- [ ] Deploy Preview, run live smoke tests, then separately approve Production deployment. Record test results; do not infer success from syntax checks.



## v2.17.0 — Kontak dan lokasi profil penjual
- [ ] Buat profil usaha dengan WhatsApp `0812...`; pastikan Firestore menyimpan format angka dengan prefix `62`.
- [ ] Tolak nomor terlalu pendek/panjang, alamat kosong, koordinat di luar rentang, dan pasangan latitude/longitude yang hanya diisi satu.
- [ ] Pastikan penjual hanya dapat mengedit profil miliknya; perubahan profil published mengembalikan status ke pending dan tidak lagi muncul di katalog publik sampai disetujui ulang.
- [ ] Admin menyetujui ulang profil yang diedit; setelah itu profil muncul kembali dengan nomor WhatsApp/alamat/lokasi terbaru.
- [ ] Endpoint publik tidak mengembalikan profil pending/rejected atau UID pemilik, catatan review, maupun metadata privat.
- [ ] Tombol WhatsApp membuka nomor yang benar dengan pesan URL-encoded; nomor tidak valid tidak menghasilkan tautan.
- [ ] Tombol peta muncul hanya saat latitude dan longitude valid dan membuka koordinat profil penjual.
- [ ] Produk terverifikasi menampilkan kontak dan lokasi profil usaha milik penjual yang sama, jika profil tersebut tersedia.
- [ ] Uji tampilan dashboard/katalog di ponsel, tablet dan desktop; jalankan typecheck/build dan Firebase Emulator tests.
# QA checklist before release

## Visual and accessibility
- [ ] Check 320px, 375px, 390px, 768px, 1024px, 1440px and wide desktop viewports.
- [ ] No horizontal overflow; test mobile safe areas and keyboard-open forms.
- [ ] Keyboard focus, labels, contrast, alt text and reduced-motion behavior.
- [ ] Review real screenshots for home, search, details, seller dashboard and admin dashboard.

## Public experience
- [ ] Search across destinations, businesses, products, packages and articles.
- [ ] Filters update results and preserve query appropriately.
- [ ] Favorites persist across reloads; deleted/malformed local data is handled.
- [ ] Share API and clipboard fallback; accessible feedback.
- [ ] WhatsApp number normalization, encoding and invalid/missing number behavior.
- [ ] Published content only; no unverified prices, hours, coordinates or ratings.

## Security
- [ ] Anonymous cannot read private records or write ratings directly.
- [ ] Seller A cannot read/update/delete Seller B's records.
- [ ] Role escalation, price manipulation, quota bypass and fake approvals fail.
- [ ] Payment proofs are private; transaction writes are server-only and idempotent.
- [ ] Admin operations require trusted server-verified claims and audit records.
- [ ] Secrets absent from client bundles, Git history, logs and repository.

## Business flows
- [ ] Quota below/at/above limit and parallel uploads.
- [ ] Subscription expiry/downgrade does not silently delete assets.
- [ ] Manual payment, proof submitted, approval/rejection and duplicate request behavior.
- [ ] Promotion cannot activate before payment/content approval and expires correctly.
- [ ] Account deletion request and retention handling.

## Integrations and release
- [ ] Cloudinary signature, ownership, type/size/dimensions, retries and deletion.
- [ ] Telegram configured; failure does not cancel core operation and retry is safe.
- [ ] Leaflet attribution, valid/missing coordinates, tile failure fallback.
- [ ] `npm run typecheck`, `npm run build`, tests and security rules tests.
- [ ] Deploy Preview; verify environment; production smoke test and record outcomes.

## v2.2 additions to verify
- [ ] Open each `/detail/<slug>` route; unknown slugs should return the framework 404.
- [ ] Verify metadata/title and data-not-verified notice on detail pages.
- [ ] Save a card on the home page, open `/favorit`, refresh, remove it, and confirm home state updates after reload.
- [ ] Test favorites with malformed localStorage and storage disabled/private browsing.
- [ ] With Firebase Email/Password enabled, test `/penjual/masuk` register/login, invalid credentials, duplicate email, disabled provider, and missing config.
- [ ] Confirm the authentication page never claims the seller dashboard is active and no admin registration is exposed.


## v2.3 seller workspace additions
- [ ] Sign in/register then confirm redirect to `/penjual/dashboard`.
- [ ] Create pending business profile and draft product; refresh and confirm records persist.
- [ ] Confirm owner UID query isolation with two separate test accounts.
- [ ] Use Firebase Emulator to test invalid extra fields, forged ownerUid, fake approval status, negative price and cross-owner reads/updates.
- [ ] Confirm workspace never reports verification or publication as complete.


## v2.4 admin dashboard additions
- [ ] Admin route rejects accounts without Firebase custom claim `admin: true`; claim must be assigned only through a trusted process.
- [ ] Verify business/product list, status labels, search and refresh behavior against the Firebase Emulator.
- [ ] Approve a pending business/product and confirm `status: published`, `approvalStatus: approved`, and `verified: true`.
- [ ] Request a revision with a reason; confirm the note is visible to the owner and the item is not public.
- [ ] Confirm seller updates to `reviewNote`, `reviewedBy`, `reviewedAt`, approval status, verified status, owner UID, and subscription/payment fields are rejected by Rules.
- [ ] Confirm mobile admin sidebar/navigation and table horizontal scrolling are usable at 320–390px.
- [ ] Confirm admin decisions create a matching `adminActivityLogs` event atomically with the record update.


## v2.6 trusted moderation API
- [ ] Request without Authorization header returns 401.
- [ ] Invalid/revoked token returns 401; authenticated non-admin returns 403.
- [ ] Missing Admin SDK environment variables returns 503 without disclosing credential values.
- [ ] Invalid collection, malformed ID, invalid decision and short revision reason return 400.
- [ ] Approve/revision persists expected status and exactly one matching audit event.
- [ ] Missing record returns 404; duplicate approve returns 409.
- [ ] Direct client writes to admin review fields and adminActivityLogs are denied by Rules.

- [ ] Verify seller API rejects missing/invalid/revoked Firebase ID tokens.
- [ ] Verify direct client create on `businesses` and `products` is denied by Firestore Rules.
- [ ] Verify product quota defaults to FREE=3 and respects trusted active PREMIUM/BISNIS subscription records.
- [ ] Run concurrent product-create requests near quota limit and verify transaction prevents over-quota creation.
- [ ] Verify seller cannot update `status`, `approvalStatus`, `verified`, plan, or payment fields directly.


## Seller CRUD regression checks (v2.8)
- [ ] Seller can edit their own pending/rejected business; status returns to pending and review note is cleared.
- [ ] Seller can edit their own draft/rejected product; moderation returns to pending/draft.
- [ ] Seller cannot edit a record owned by another UID.
- [ ] Seller cannot edit or delete a published/approved product through API.
- [ ] Seller can delete their own non-published product and quota count updates after reload.
- [ ] Dashboard edit forms prefill values and cancel resets the form.
- [ ] Keyboard focus, mobile layout, and confirmation dialog are usable on phone and desktop.


## Langganan & pembayaran v2.9
- [ ] Seller token valid dapat membuat permintaan paket PREMIUM dan BISNIS.
- [ ] Harga yang dikirim client diabaikan; server menetapkan nominal paket.
- [ ] Seller tidak dapat membuat permintaan kedua saat masih ada transaksi subscription berstatus pending.
- [ ] Seller lain tidak dapat membaca transaksi milik akun lain.
- [ ] Non-admin mendapat 403 pada endpoint admin payments.
- [ ] Admin hanya dapat memproses transaksi pending dengan nominal dan plan yang valid.
- [ ] Persetujuan mencatat audit dan mengaktifkan langganan selama 30 hari.
- [ ] Langganan aktif sebelumnya ditandai superseded saat paket baru diaktifkan.
- [ ] Penolakan memerlukan alasan dan tidak mengaktifkan langganan.
- [ ] Jangan mengaktifkan pembayaran kecuali dana telah diverifikasi di rekening resmi.
- [ ] Uji semua alur di Firebase Emulator dan build produksi sebelum deployment.


## v2.10.0 payment settings
- [ ] Admin-only API rejects missing, invalid, revoked and non-admin tokens.
- [ ] Admin can edit all three package prices and changes appear on seller dashboard after refresh.
- [ ] QR upload rejects unsupported formats and files over 240 KB; preview, save, clear and reload work.
- [ ] Bank name, account name, account number and instructions persist and are shown to sellers.
- [ ] Disabled methods cannot be selected by sellers; server rejects direct requests for disabled methods.
- [ ] New transactions snapshot price and selected payment instructions; editing settings later does not alter old transaction snapshots.
- [ ] Price values are server-owned, clients cannot edit transactions, and admin approval rejects malformed amount snapshots.
- [ ] Verify mobile UI at 360px, 390px, tablet and desktop; run typecheck/build and Firestore Emulator tests.


## v2.11.0 — Bukti pembayaran privat
- [ ] Konfigurasikan Cloudinary credentials di environment staging; jangan set Firebase Storage untuk alur foto baru.
- [ ] Uji unggahan JPG/PNG/WebP yang valid di bawah 2 MB.
- [ ] Uji penolakan file >2 MB, tipe MIME tidak diizinkan, dan bytes yang tidak sesuai signature gambar.
- [ ] Uji bahwa penjual A tidak dapat mengunggah ke transaksi milik penjual B.
- [ ] Uji unggah hanya diizinkan saat transaksi subscription masih `pending`.
- [ ] Uji URL bukti hanya diberikan kepada admin, tidak diberikan kepada penjual lain/non-admin, dan kedaluwarsa sesuai konfigurasi.
- [ ] Pastikan bukti memakai Cloudinary authenticated delivery dan endpoint admin saja yang mengeluarkan URL bertanda tangan.
- [ ] Uji ganti bukti: asset Cloudinary sebelumnya dibersihkan setelah public ID baru berhasil disimpan.
- [ ] Confirm admin approval endpoint rejects a pending subscription without a Cloudinary proof and rejects if proof public ID changes during review.


## v2.12.0 — Cloudinary media coverage
- [ ] Admin QR upload requires admin claim and stores only Cloudinary URL/public ID in Firestore.
- [ ] Replacing QR creates a new Cloudinary asset; existing transaction versions keep their old URL snapshots.
- [ ] Seller business photo uploads are limited by active plan: FREE 3 total, PREMIUM 10 total, BISNIS 20 total.
- [ ] Product photos are limited by active plan: FREE 3 total, PREMIUM 5 per product, BISNIS 8 per product.
- [ ] Seller A cannot upload/remove photos on seller B records.
- [ ] Published/approved records reject seller photo changes.
- [ ] Image MIME, signature, size, quota, concurrent uploads, and cleanup behavior are tested.
- [ ] Payment proofs are Cloudinary `authenticated` assets and admin proof endpoint denies non-admin users.
- [ ] Legacy QR data URLs and Firebase Storage proof objects are migrated or re-uploaded; no new Firebase Storage writes occur.
- [ ] `npm run typecheck`, `npm run build`, Firebase Emulator tests, and mobile browser QA pass before production.


## Cloudinary upload-flow audit (v2.15)

- [ ] Configure Cloudinary server-only credentials in `.env.local` and staging.
- [ ] Run `npm run media:check`; verify the required seller/admin upload endpoints include Cloudinary and security checks.
- [ ] Confirm decorative animations, icons, UI illustrations, banners, and demo imagery remain unchanged and are not treated as Cloudinary migration targets.
- [ ] Test seller ownership, published-record restrictions, image MIME/signature/size validation, plan quotas, and concurrent upload behavior.
- [ ] Confirm payment QR upload requires an admin claim and seller payment proofs use Cloudinary `authenticated` assets.
- [ ] Confirm non-admin users cannot retrieve a signed proof URL and that approval fails if the proof asset is missing or changed.
- [ ] Re-upload or carefully migrate legacy QR base64 and pending legacy payment proofs before approving old transactions.
- [ ] Run `npm run typecheck`, `npm run build`, Firebase Emulator tests, Cloudinary staging tests, and mobile browser QA.


## QA promosi berbayar v2.16.0
- [ ] Seller hanya dapat mempromosikan konten miliknya yang sudah dipublikasikan dan disetujui.
- [ ] Nominal dihitung server berdasarkan harga admin dan durasi.
- [ ] Upload bukti wajib, privat, validasi MIME/signature, dan maksimum 2 MB.
- [ ] Admin tidak dapat memverifikasi transaksi tanpa bukti Cloudinary yang tersedia.
- [ ] Pembayaran disetujui memindahkan promosi ke antrean persetujuan konten, bukan langsung aktif.
- [ ] Konten promosi aktif hanya tampil selama rentang tanggal dan hilang setelah kedaluwarsa.
- [ ] Uji penolakan pembayaran/konten, tanggal kedaluwarsa, dan tampilan mobile.
