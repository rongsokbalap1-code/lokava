# LOKAVA implementation status — v2.20.0 (28 October 2026)

## v2.20.0 SEO additions
- [x] National-intent metadata defaults and per-page canonical metadata; homepage is a server wrapper around its client component.
- [x] Per-record SEO title/description overrides and slug editing in admin content management.
- [x] Draft helper for article content based only on supplied form facts, with editorial verification reminders.
- [x] JSON-LD for Organization/WebSite and public entity detail pages.
- [x] Sitemap uses paginated published/approved content, filters thin/unverified pages, and only includes regional landing pages with at least three indexable items.
- [x] `/wilayah/[slug]` pages for areas with enough real content.
- [x] `scripts/check-seo.mjs` for dynamic canonical-origin, absolute URL, slug, indexability, and JSON-LD escaping checks.
- [x] Admin settings for HTTPS canonical domain, global search-indexing switch, and Google Search Console verification token. The saved domain drives canonical URLs, JSON-LD, sitemap, and robots metadata; `NEXT_PUBLIC_SITE_URL` remains a fallback.
- [x] TypeScript/TSX syntax transpilation check: 91 files checked after v2.20 changes without syntax diagnostics.
- [x] SEO helper, source route, and Cloudinary media audits passed after v2.20 changes.
- [ ] Full dependency-backed typecheck/build, live Google Search Console validation, schema validation and production crawl still required.


## v2.18.0 additions in source
- [x] Seller location picker using Leaflet/OpenStreetMap: click map to set latitude/longitude automatically; no coordinates are saved until a pin is selected.
- [x] Optional Google Maps link input with HTTPS host validation and coordinate parsing for `@lat,lng`, query coordinates, and `!3d/!4d` formats. Short links that cannot be resolved are retained as public navigation links without inventing coordinates.
- [x] Public navigation link prefers the validated saved Google Maps link; otherwise it is generated from valid coordinates.
- [x] Database-backed public directories/details for destinations, businesses, products, articles, and packages; public map only pins approved records with valid coordinates.
- [x] Public search API, public explore/banners/categories APIs, dynamic sitemap/robots, custom 404/error states, and draft privacy/terms/seller-policy pages.
- [x] Anonymous rating endpoint with aggregate display and 24-hour hashed-identity cooldown; `RATING_HASH_SECRET` is required.
- [x] Typed local favorites (`id`, `type`, `addedAt`) with legacy string compatibility.
- [x] Admin content CRUD/archive for destinations, articles, packages, categories, banners, and admin content media upload to Cloudinary.
- [x] Product-to-business association; public products and product promotions require a published/approved associated business.
- [x] Configurable server-enforced plan product limits and photo quotas in admin payment settings.
- [x] Seller account-deletion request and admin review/complete/reject flow; completion archives seller content, attempts seller-photo cleanup, deletes Firebase Authentication account, and retains transaction/audit records.
- [x] Best-effort Telegram notifications with one retry and private notification-status logs for key submission/payment/moderation/deletion events.
- [x] Admin user listing and account suspension/activation; suspended seller content is hidden until re-enabled. Admin roles cannot be assigned from the panel.
- [x] Admin site settings for SEO title/description, official email/WhatsApp/address, and social links; public contact and root metadata read saved settings.
- [x] Admin audit-log and notification-log viewers.
- [x] Public PWA manifest and 192/512 app icons; dynamic sitemap/robots routes and configurable public metadata.
- [x] `source:check` static route/map helper checks and expanded Cloudinary media-flow audit.

## Release status
- [x] TypeScript/TSX syntax transpilation check: 86 files checked during this work session without syntax diagnostics (rerun after any later edits).
- [x] Google Maps URL/coordinate parser tests: 7/7 passed during this work session.
- [x] Cloudinary media source audit: passed after the latest source changes.
- [ ] `npm install` and full `npm run typecheck`: blocked in this environment because the package registry was unavailable and dependencies are not installed.
- [ ] `npm run build`: not run successfully; do not consider this release production-ready until it passes in a dependency-enabled environment.
- [ ] Firebase Emulator/Firestore Rules, Cloudinary live, Telegram, browser/responsive QA, accessibility and security tests: not run.
- [ ] Real operator contact, reviewed legal policy, verified live data, environment configuration, GitHub push and deployment: not completed by this package-generation step.

## Historical notes — v2.17.0 and earlier

### v2.17.0 — Profil usaha penjual, WhatsApp, alamat dan peta
- [x] Form dashboard penjual mengelola nomor WhatsApp, alamat, latitude dan longitude bersama nama/kategori/deskripsi usaha.
- [x] Server memvalidasi dan menormalisasi nomor WhatsApp Indonesia (awalan 0 menjadi 62), validasi alamat, serta rentang koordinat.
- [x] Profil usaha dapat diedit setelah dipublikasikan; setiap perubahan mengubah status ke pending dan menyembunyikan profil publik sampai admin meninjau ulang.
- [x] Endpoint publik hanya mengembalikan usaha/produk berstatus published, approvalStatus approved, dan verified true; respons tidak memuat UID pemilik atau metadata privat.
- [x] Beranda menampilkan katalog usaha/produk yang lolos tinjauan, CTA WhatsApp, alamat dan tombol peta bila koordinat valid. Produk menggunakan kontak/lokasi profil usaha pemiliknya bila tersedia.
- [ ] Uji live Firebase/Cloudinary, alur review admin setelah edit, typecheck/build penuh, browser QA dan deployment masih harus dilakukan.

### Archived implementation notes — v2.17.0

#### Implemented in that source bundle
- [x] Responsive public landing page and design tokens.
- [x] Public motion and polish: scroll progress, staggered reveal-on-scroll, slow hero image drift, animated map paths/pins, refined hover/focus microinteractions, card depth, and `prefers-reduced-motion` support.
- [x] Search, category filtering, empty state and user feedback.
- [x] Browser-session favorite toggling and share/copy action.
- [x] Public seller CTA and initial subscription-plan presentation.
- [x] Static-generated detail pages for demo listings, including metadata and clear data-verification warnings.
- [x] Favorites page using the same local browser storage key as the home page.
- [x] Firebase Email/Password sign-in and account creation with navigation to the seller workspace.
- [x] Responsive seller workspace with business/product submission, editing of eligible pending records, deletion of eligible draft products, status labels and review-note display.
- [x] Initial admin control center with Firebase custom-claim gate, operational overview, search, business/product moderation, approve/publish and request-revision actions.
- [x] Firestore rule guardrails against seller editing admin review metadata.
- [x] Seller record APIs for create/edit/delete with token verification, ownership checks, validation and product quota enforcement.
- [x] Firebase client configuration helper.
- [x] Initial Firestore rules with restrictive defaults.
- [x] Setup, deployment and known-limitations documentation.

#### Not complete / not verified in that historical bundle
- [ ] Full PRD page set (distinct destination/business/product/article routes, reviewed privacy/terms pages, custom 404/error pages).
- [x] Persistent favorites hydration on the favorites page and malformed local data recovery.
- [ ] Cross-browser/storage-denial QA for favorites.
- [ ] Real Leaflet/OpenStreetMap map using verified coordinates.
- [ ] Production-grade seller approval enforcement, server session protection, and trusted server authorization. Dashboard UI uses Firebase Auth and Firestore Rules; it is not a trusted server session.
- [ ] Trusted server-side role/ownership authorization audit across all sensitive mutations, including all remaining CRUD routes and all production session controls.
- [ ] Firestore Emulator tests for create allowlists, owner isolation, and unauthorized field changes.
- [x] Server-side product quota enforcement in Firestore transaction (requires emulator testing).
- [x] Initial subscription request + manual admin decision flow, fixed server-side prices, 30-day activation and audit log.
- [ ] Payment proof upload to private storage, configured payment instructions, gateway/webhooks, refunds and reconciliation.
- [ ] Promotion approval/activation/expiry.
- [x] Cloudinary upload endpoints added for QR, seller photos and private payment proofs; [ ] live upload/cleanup integration tests remain outstanding.
- [ ] Telegram notifications, retries and error logs.
- [ ] Anonymous rating endpoint, rate limits and abuse moderation.
- [x] Centralized trusted audit event creation for admin review decisions.
- [ ] Audit log browsing/export, retention policy and account deletion flow.
- [ ] Reviewed legal policies and real production content.
- [ ] Dependency installation, production build, lint/typecheck, automated tests and security tests.
- [ ] GitHub push, Vercel deployment and live smoke test.

## Environment limitation during this bundle preparation
The package registry was unreachable from the current environment, so dependencies could not be installed and a Next.js production build could not be run here. No build, integration or deployment success is claimed.

## v2.4 additions to verify
- [ ] Set `admin: true` custom claim using a trusted Firebase Admin SDK process, then sign in and open `/admin/dashboard`.
- [ ] Confirm a non-admin account is denied even if it manually navigates to the admin route.
- [ ] Verify admin queue data, search, approve/publish, and required revision reason in the Firebase Emulator.
- [ ] Confirm sellers cannot edit `reviewNote`, `reviewedBy`, `reviewedAt`, `approvalStatus`, or `verified`.
- [ ] Review admin and seller layouts at phone, tablet, laptop, and wide desktop sizes.

## v2.3 additions to verify
- [ ] Register or sign in with Firebase Email/Password and confirm navigation to `/penjual/dashboard`.
- [ ] Create a business profile; verify it is stored as `pending` and `approvalStatus: pending`.
- [ ] Create a product; verify it is stored as `draft`, `approvalStatus: pending`, and `currency: IDR`.
- [ ] Confirm only the current UID's businesses/products are listed.
- [ ] Try malformed fields or owner/status escalation in the Firebase Emulator; Firestore Rules should reject them.
- [ ] Test permission-denied, missing Firebase configuration, network failure and mobile layout.

## v2.5 public UI verification checklist
- [ ] Review landing page at 360px, 390px, 768px, 1024px, 1440px and ultrawide widths.
- [ ] Confirm reveal animations do not hide content if IntersectionObserver is unavailable.
- [ ] Test keyboard focus across header, search, filters, favorites, seller CTA and plan links.
- [ ] Confirm reduced-motion preference disables nonessential motion.
- [ ] Check external image loading, font fallback, contrast and performance on a slow connection.

## v2.6 server-side moderation checklist
- [ ] Configure server-only Firebase Admin credentials in the deployment environment.
- [ ] Confirm missing server credentials return HTTP 503 without leaking secrets.
- [ ] Test missing, invalid, revoked and non-admin ID tokens (401/403) in the route.
- [ ] Verify approve/revision changes and matching audit event are atomic.
- [ ] Confirm direct client update attempts to business/product review fields are rejected by Firestore Rules.
- [ ] Run typecheck, production build, Firestore Emulator tests and an authenticated staging smoke test.


## v2.7.0 — seller creation API and product quota guardrails

- Added `POST /api/seller/records` for seller business/product creation with Firebase ID token verification and input validation.
- Product creation counts owner products and checks a server-managed active subscription within a Firestore transaction before creating a draft. Initial limits: FREE 3, PREMIUM 50, BISNIS 200.
- Firestore rules block direct client creation of business/product documents and prevent product owners from changing moderation status.
- The subscription schema is assumed to use `ownerUid`, `status: active`, `planId`, and optional `expiresAt`; verify against the final subscription implementation before production.
- Build, typecheck, emulator security tests, concurrency/load tests, and live Firebase tests remain outstanding.


## v2.8.0 update

- Added authenticated seller PATCH and DELETE API methods with owner UID verification on the server.
- Editing business/product records resets moderation state to pending/draft and clears prior review notes.
- Deleting published/approved products is blocked; business deletion is intentionally not offered.
- Seller dashboard now has edit controls for non-published records, cancel actions, and delete controls for eligible products.
- Production typecheck/build, Firebase Emulator rules tests, and responsive browser QA remain required before release.


## v2.9.0 — Langganan dan pembayaran manual (awal)

- [x] Endpoint server membuat permintaan langganan dengan harga paket ditentukan server.
- [x] Dashboard penjual menampilkan paket dan status permintaan.
- [x] Dashboard admin menampilkan transaksi subscription dan endpoint keputusan pembayaran.
- [x] Aktivasi langganan 30 hari dan pencatatan audit dalam transaksi Firestore.
- [ ] Rekening/metode pembayaran resmi, unggah bukti privat, gateway, webhook, refund, dan rekonsiliasi belum tersedia.
- [ ] Build produksi, pengujian emulator, dan pengujian visual browser belum terverifikasi.


## v2.9.0 — Langganan & pembayaran awal
- [x] Server creates a pending subscription request with fixed plan pricing and a reference code.
- [x] Seller dashboard shows package options and payment-request history.
- [x] Admin dashboard lists subscription transactions and can approve/reject them through a claim-verified server API.
- [x] Approval activates a 30-day subscription and records an admin audit entry; existing active subscription records are superseded.
- [ ] Payment destination, private proof upload, gateway/webhooks, refund, reconciliation and automated payment confirmation are not implemented.
- [ ] Full typecheck/build and Firebase Emulator tests remain unverified because dependencies could not be installed in this environment.


## v2.10.0 — Editable plans and payment methods

- [x] Admin can edit prices for FREE, PREMIUM, and BISNIS through a claim-verified API.
- [x] Admin can upload/remove a QR image, edit its label/instructions, and enable/disable QR payments.
- [x] Admin can edit bank name, account name, account number, instructions, and enable/disable bank transfer.
- [x] Seller dashboard loads server-managed plan prices and displays enabled payment options.
- [x] New subscription transactions snapshot the selected payment instructions and configured price.
- [x] Historical v2.10 QR data-URL storage is superseded by Cloudinary in v2.12; old settings must be re-uploaded/migrated.
- [ ] No proof-of-payment upload or automated gateway/webhook is included; admin must verify funds manually.
- [ ] Full dependency installation, typecheck, production build, Firebase Emulator tests, security review, and mobile browser QA remain outstanding.


## v2.11.0 — Private payment proof upload (historical; superseded by Cloudinary in v2.12)

- [x] Seller can upload a payment proof image (JPEG/PNG/WebP, max 2 MB) for their own pending subscription transaction.
- [x] Server validates Firebase ID token, ownership, transaction status, MIME type, image signature and size before storing to a private Firebase Storage object path.
- [x] Admin could request a signed URL in that historical version; v2.12 uses authenticated Cloudinary delivery URLs instead.
- [x] Seller dashboard shows proof upload state and permits replacement while transaction remains pending.
- [x] Seller payments API omits the private object path from its response.
- [x] Added restrictive `storage.rules` to block direct browser access to legacy Firebase Storage objects.
- [x] Admin payment table exposes a secure proof-view action when a proof exists.
- [x] Server blocks subscription approval unless the transaction has a matching stored proof object; the proof path is rechecked against the transaction before activation.
- [ ] Legacy Firebase Storage proof assets must be re-uploaded or migrated before approving their transactions.
- [ ] Confirm Cloudinary authenticated assets are not configured for public delivery and test signed delivery in staging.
- [ ] Run typecheck, production build, upload size/content tests, owner-isolation tests, emulator/staging tests and mobile browser QA.


## v2.12.0 — Cloudinary for all app-uploaded photos

- [x] QR payment images are uploaded to Cloudinary by an admin-only API; Firestore stores only URL and public ID metadata.
- [x] Payment proofs are stored as Cloudinary authenticated images; admin proof endpoint verifies `admin: true` before generating a signed delivery URL.
- [x] Seller business/product image API uploads to Cloudinary and enforces owner, record status, file signature/size, and package photo quotas.
- [x] Seller UI can upload and remove photos for pending/draft records; deleting a draft product also attempts Cloudinary asset cleanup.
- [x] Firebase Storage app upload flows removed; storage rules remain deny-all for legacy bucket protection.
- [ ] Configure and test Cloudinary credentials in staging.
- [ ] Re-upload legacy QR images saved as base64 and re-upload/migrate legacy Firebase Storage payment proofs.
- [ ] Run typecheck/build, Cloudinary integration tests, quota concurrency tests, private asset access tests, and mobile browser QA.


## v2.15.0 — Cloudinary scope clarified for app-uploaded images

- Removed the static Unsplash-to-Cloudinary migration script and its npm command; the project does not need to migrate decorative/UI images.
- Clarified image policy: seller business/product photos, admin payment QR images, and seller subscription payment proofs use Cloudinary; UI animations, icons, decorations, banners, layout illustrations, and demo imagery stay as app assets/demo sources.
- Reworked `npm run media:check` to audit the required upload endpoint and security markers rather than reject static UI images. It does not connect to Cloudinary or prove live account behavior.
- [ ] Configure Cloudinary credentials and verify upload/delete flows in staging.
- [ ] Re-upload legacy QR images and re-upload/migrate pending legacy Firebase Storage payment proofs before approving older transactions.
- [ ] Run typecheck/build, Firebase Emulator tests, Cloudinary integration/security tests, and responsive browser QA before production.


## v2.16.0 — Promosi berbayar
- Ditambahkan alur seller mengajukan promosi untuk konten yang sudah approved/published.
- Harga/durasi promosi dapat dikonfigurasi admin.
- Bukti pembayaran wajib diunggah privat ke Cloudinary; admin memverifikasi pembayaran dan menyetujui konten secara terpisah.
- Ditambahkan slot promosi aktif di beranda publik dan halaman detail promosi.
- Validasi live Firebase/Cloudinary, build produksi, dan QA browser masih harus dilakukan dengan konfigurasi lingkungan yang sebenarnya.
