# Laporan revisi LOKAVA — iOS-first refinement

Tanggal paket: 1 November 2026

## Perubahan yang diterapkan pada source code

1. **Tampilan dashboard**
   - Seller dan admin dashboard memakai sistem visual iOS-inspired: font sistem, permukaan membulat, navigasi blur, kartu lembut, tombol lebih mudah disentuh, dan responsif.
   - Form, statistik, panel, navigasi, dan kartu tindakan diberi hierarki visual yang lebih jelas.
   - Animasi hover/transisi menggunakan easing halus; dukungan `prefers-reduced-motion` tetap dijaga.
   - Safe-area iPhone diperhitungkan pada viewport dan ruang bawah halaman.

2. **Lokasi penjual tanpa Google Maps API**
   - Tombol Ambil GPS meminta lokasi satu kali hanya setelah ditekan dan setelah izin browser diberikan.
   - Tidak ada pelacakan lokasi terus-menerus.
   - Koordinat manual dan parsing tautan Google Maps tetap tersedia.
   - Tautan pendek yang tidak mengandung koordinat tetap dapat disimpan sebagai tautan navigasi; sistem tidak membuat koordinat palsu.
   - Peta publik menggunakan OpenStreetMap; tautan navigasi Google Maps dibuat dari koordinat tersimpan.
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` tidak diperlukan.

3. **Promosi**
   - Beranda membaca feed promosi aktif secara terpisah dari banner editorial.
   - Promosi aktif yang lolos persetujuan pembayaran dan konten ditampilkan pada bagian Promosi Pilihan.
   - Banner dapat berganti otomatis dengan interval 6,5 detik dan tersedia kontrol manual.
   - Ditambahkan halaman `/promosi` untuk daftar promosi aktif (hingga 100 item dari endpoint saat ini).
   - Pelaporan tayangan/klik dan jaminan jumlah exposure belum termasuk revisi ini; jangan menjual paket dengan klaim metrik terukur sebelum fitur itu ditambahkan dan diuji.

4. **PWA**
   - Metadata Apple web-app dan viewport safe-area ditambahkan untuk pengalaman pemasangan ke layar utama iPhone.
   - Manifest dan ikon PWA yang ada dipertahankan.

5. **Fitur yang dipertahankan**
   - Alur autentikasi admin dan penjual tidak diganti.
   - Jalur unggah Cloudinary tidak diganti.
   - API Firebase, Telegram, moderasi, transaksi, dan struktur konten inti dipertahankan kecuali yang disebutkan di atas.

## Pemeriksaan yang berhasil

- `scripts/check-lokava-source.mjs`: lulus.
- `scripts/check-cloudinary-media.mjs`: lulus.
- `scripts/check-seo.mjs`: lulus.
- Transpilasi sintaks TypeScript/TSX: 93 file, 0 diagnostic sintaks.
- Pemeriksaan parser tautan Google Maps dan validasi host tetap lulus melalui source check.

## Belum dapat diverifikasi

- `npm install` tidak selesai dalam batas waktu lingkungan ini. Arsip asal tidak menyertakan `package-lock.json`, sehingga tidak dibuat lockfile parsial atau lockfile yang tidak tervalidasi.
- Karena dependency tidak berhasil dipasang, `npm run typecheck`, `npm run lint`, dan `npm run build` belum dapat dijalankan secara penuh.
- Firebase live, Cloudinary live, Telegram webhook/callback dan foto pembayaran, izin GPS pada perangkat nyata, browser E2E, aksesibilitas, serta deployment Vercel belum diuji dari lingkungan ini.
- Pembuatan paket ini tidak melakukan push GitHub atau deployment ke Vercel.

## Langkah verifikasi sebelum produksi

1. Ekstrak ZIP dan jalankan `npm install` dengan akses npm registry, menggunakan Node.js 22 atau lebih baru.
2. Jalankan `npm run typecheck`, `npm run source:check`, `npm run media:check`, `npm run seo:check`, dan `npm run build`.
3. Uji GPS di iPhone/Android melalui HTTPS dan periksa izin lokasi.
4. Uji satu transaksi promosi dari pengajuan hingga pembayaran dan persetujuan konten.
5. Uji Telegram webhook dengan rahasia dan grup yang sudah dikonfigurasi.
6. Deploy ke Vercel Preview terlebih dahulu; lakukan smoke test sebelum Production.

**Penting:** LOKAVA tetap aplikasi web Next.js yang disiapkan sebagai PWA. Tampilan dan interaksi dibuat menyerupai aplikasi iOS, tetapi ini bukan aplikasi Swift native App Store.
