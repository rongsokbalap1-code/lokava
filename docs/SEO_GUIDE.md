# Panduan SEO LOKAVA v2.20.0

## Apa yang otomatis dilakukan aplikasi

- Metadata global berbahasa Indonesia, judul/deskripsi per halaman, canonical, Open Graph, Twitter Cards, dan robots metadata.
- Structured data JSON-LD: Organization dan WebSite di root; TouristAttraction, LocalBusiness, Product, Article, TouristTrip, serta CollectionPage untuk halaman wilayah.
- Sitemap dinamis hanya memuat halaman katalog yang publik, disetujui, terverifikasi bila relevan, dan memenuhi ambang kelengkapan dasar.
- Halaman `/wilayah/[slug]` tersedia hanya jika setidaknya tiga konten publik yang layak diindeks menggunakan nilai `area` yang sama.
- Konten yang belum lengkap dapat tetap dibuka oleh pengunjung, tetapi diberi `noindex` dan tidak dimasukkan sitemap sampai memenuhi ambang SEO.
- Dashboard admin menyimpan `slug`, `seoTitle`, dan `seoDescription`. Tombol draf artikel hanya menggunakan data yang dimasukkan editor dan menambahkan pengingat verifikasi; editor tetap bertanggung jawab atas fakta, sumber, dan kelayakan publikasi.

## Konfigurasi wajib sebelum peluncuran

1. Buka Dashboard Admin → Pengaturan situs publik, lalu isi Domain utama HTTPS dengan origin domain produksi (contoh format: `https://domain-anda.id`, tanpa path). Nilai yang tersimpan menjadi domain kanonis untuk metadata dan sitemap. `NEXT_PUBLIC_SITE_URL` di hosting tetap menjadi fallback jika kolom domain dikosongkan.
2. Pastikan domain mengarah ke deployment produksi dan halaman dapat dirender tanpa error.
3. Di Dashboard Admin → Pengaturan situs publik, isi judul SEO, deskripsi SEO, token verifikasi Google Search Console, dan tentukan apakah halaman publik boleh diindeks. Jika indeksasi dinonaktifkan, halaman diberi `noindex` dan sitemap dikosongkan; `robots.txt` tetap mengizinkan crawler membaca `noindex`. Data lama di Firestore dapat menimpa nilai default di source sehingga perlu diperbarui secara eksplisit.
4. Verifikasi bahwa halaman destinasi, usaha, produk, artikel, dan paket berisi informasi nyata, deskripsi unik, foto yang sah, serta lokasi/harga hanya bila terverifikasi.
5. Buka `https://domain-anda.id/robots.txt` dan `https://domain-anda.id/sitemap.xml` setelah deployment; pastikan domain serta URL benar.
6. Tambahkan domain ke Google Search Console, verifikasi kepemilikan, kirim sitemap, dan pantau Page indexing, Core Web Vitals, serta performa kueri.
7. Periksa hasil structured data dengan alat pengujian Google setelah halaman publik tersedia. Structured data tidak menjamin rich result.
8. Bangun tautan internal yang berguna antara wilayah, destinasi, artikel, produk, dan usaha. Tambahkan konten wilayah hanya jika memiliki nilai nyata; jangan membuat halaman kosong/duplikat demi kata kunci.

## Target dan batasan

LOKAVA menargetkan kueri wisata Indonesia, wisata Sukabumi/Jawa Barat, destinasi, kuliner, penginapan, produk dan usaha lokal. Cakupan kata kunci nasional akan berkembang mengikuti jumlah dan kualitas data nyata yang dikelola admin. Metadata atau sitemap tidak dapat menggantikan konten, reputasi, performa teknis, backlink yang wajar, dan waktu perayapan. Tidak ada jaminan posisi halaman pertama atau waktu indeksasi tertentu.

## Verifikasi teknis yang harus dilakukan di staging/produksi

- `npm install`, `npm run typecheck`, `npm run build`.
- Periksa canonical pada beranda, direktori, detail, dan halaman wilayah.
- Pastikan konten `draft`, `rejected`, `archived`, tidak terverifikasi, atau tipis tidak masuk sitemap.
- Pastikan JSON-LD valid dan tidak menyatakan data yang tidak tersedia.
- Uji sitemap pada jumlah data lebih dari satu batch Firestore.
- Daftarkan Search Console hanya setelah domain produksi final dan halaman kebijakan ditinjau operator.
