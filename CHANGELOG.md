# Changelog

## v2.19.0 — SEO nasional berbasis konten terverifikasi
- Metadata global ditargetkan untuk wisata Indonesia, destinasi, kuliner, penginapan, dan UMKM; canonical URL diatur per halaman dan tidak dipaksakan ke beranda untuk semua rute.
- Menambahkan metadata SEO per destinasi/usaha/produk/artikel/paket, Open Graph/Twitter Cards, canonical, dan aturan noindex untuk konten tipis atau konten ilustratif.
- Menambahkan structured data JSON-LD untuk WebSite, Organization, TouristAttraction, LocalBusiness, Product, Article, TouristTrip, dan halaman wilayah.
- Sitemap menggunakan data publik yang disetujui dengan pagination terbatas; halaman wilayah hanya dibuat jika ada minimal tiga item nyata yang layak diindeks.
- Dashboard admin dapat menyimpan slug, judul SEO, dan deskripsi SEO khusus; editor artikel mendapatkan pembuat draf awal dari data formulir tanpa mengarang informasi faktual.
- Menambahkan halaman `/wilayah/[slug]` untuk area yang memiliki cukup konten publik yang disetujui.
- Catatan: indeksasi dan peringkat Google tidak dijamin; domain publik, konten nyata, Google Search Console, dan pemantauan pascadeployment tetap diperlukan.

## 2.18.0 — 28 October 2026

- Added interactive seller location selection with Leaflet/OpenStreetMap, device geolocation, Google Maps link parsing, strict URL validation, and public navigation fallback.
- Added database-backed public search/explore, destinations/business/product/article/package details, public map, related content, share controls, typed local favorites, and anonymous rating with anti-abuse cooldown.
- Added admin content management for destinations, articles, packages, categories and banners, with Cloudinary content-media uploads.
- Added configurable plan product limits and photo quotas enforced by server APIs.
- Added admin user listing/suspension, account deletion review workflow, public SEO/contact/social settings, audit-log viewer and notification-log viewer.
- Added Telegram best-effort retry/logging, PWA manifest/icons, dynamic sitemap/robots, legal-policy draft pages, and custom 404/error pages.
- Product records are linked to a seller-owned business; public product content and product promotions require the associated business to be published and approved.
- Added `npm run source:check` and expanded `npm run media:check`.

### Verification limitations

- Source checks passed: 27 required route/file checks and Google Maps URL/coordinate tests.
- Cloudinary source audit passed.
- TypeScript syntax transpilation passed for 86 TS/TSX files.
- Full `npm install`, `npm run typecheck`, and `npm run build` were not completed because dependencies could not be installed in the current environment. Firebase Emulator, Cloudinary live integration, Telegram delivery, browser QA, security review and deployment remain required release gates.


## v2.20.0 — Pengaturan SEO terpusat di Dashboard Admin
- Tambah pengaturan domain utama HTTPS di Dashboard Admin; nilai tersimpan digunakan untuk canonical URL, sitemap, robots, dan structured data. `NEXT_PUBLIC_SITE_URL` tetap menjadi fallback.
- Tambah sakelar indeksasi global untuk mengatur robots metadata, sitemap, dan robots.txt.
- Tambah kolom token verifikasi Google Search Console yang diterapkan sebagai metadata verification.
- Sinkronkan metadata beranda dan halaman detail/listing dengan pengaturan SEO yang tersimpan.
- Tambah validasi domain agar hanya menerima origin HTTPS tanpa path/query/hash.
