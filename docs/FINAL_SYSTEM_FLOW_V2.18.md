# LOKAVA v2.18.0 — Alur sistem dan batas rilis

## 1. Pengunjung

1. Beranda meminta katalog melalui `/api/public/explore`, katalog usaha/produk melalui `/api/public/listings`, paket melalui `/api/public/plans`, banner melalui `/api/public/banners`, dan promosi melalui `/api/public/promotions`.
2. API publik hanya memilih rekaman dengan status publikasi dan persetujuan yang sesuai. Data demo lama tidak lagi menjadi fallback sebagai daftar usaha/destinasi yang terlihat seperti data nyata.
3. Pengunjung dapat membuka `/wisata`, `/usaha`, `/produk`, `/kuliner`, `/penginapan`, `/artikel`, `/paket`, `/peta`, dan detail konten masing-masing.
4. Pencarian lintas koleksi tersedia di `/cari` dan `/api/public/search`.
5. Favorit disimpan di localStorage browser dengan id, tipe konten, dan waktu penyimpanan. Data tidak tersinkron ke perangkat lain.
6. Rating anonim menggunakan `/api/public/ratings`. Rating hanya diterima untuk konten publik yang disetujui; `RATING_HASH_SECRET` wajib diatur. Endpoint membatasi pengiriman berulang per identitas hash dalam 24 jam. Ini mengurangi spam, tetapi bukan bukti identitas unik.
7. Tombol WhatsApp mengarah ke nomor pemilik yang dinormalisasi. Tautan navigasi memakai Google Maps URL yang divalidasi atau dibuat dari koordinat yang valid. LOKAVA tidak memproses checkout produk.

## 2. Penjual

1. Penjual mendaftar/masuk melalui Firebase Authentication email/kata sandi.
2. Profil usaha dibuat melalui `/api/seller/records` dengan status menunggu persetujuan.
3. Lokasi usaha dapat dipilih dengan klik pada peta OpenStreetMap/Leaflet di dashboard. Koordinat tersimpan otomatis saat pin dipilih. Penjual juga dapat menempel tautan HTTPS Google Maps; bila tautan memuat koordinat, sistem membacanya. Tautan pendek yang tidak memuat koordinat tetap disimpan untuk navigasi publik tanpa menciptakan koordinat perkiraan.
4. Foto usaha/produk diunggah melalui `/api/seller/images`; server memvalidasi token, kepemilikan, signature file, kuota, dan status rekaman, lalu mengunggah ke Cloudinary.
5. Produk baru wajib memilih profil usaha yang dimiliki penjual. Produk publik hanya tampil jika produk dan profil usaha terkait sama-sama disetujui.
6. Perubahan profil yang sudah tayang mengembalikan profil ke antrean pemeriksaan admin. Perubahan foto pada rekaman yang sudah tayang memerlukan alur peninjauan; endpoint unggah menolaknya.
7. Permintaan langganan dan promosi dihitung di server berdasarkan pengaturan admin. Bukti pembayaran dikirim ke Cloudinary sebagai aset privat dan tidak otomatis mengaktifkan layanan.
8. Penjual dapat mengajukan penghapusan akun. Penghapusan tidak otomatis terjadi saat permintaan dibuat.

## 3. Admin

1. Semua endpoint admin memverifikasi Firebase ID token dan custom claim `admin: true` di server.
2. Admin meninjau usaha/produk melalui `/api/admin/review`, menyetujui atau meminta perbaikan. Keputusan dicatat ke `adminActivityLogs`.
3. Bagian Konten Situs mengelola destinasi, artikel, paket, kategori, dan banner melalui `/api/admin/content`; media diunggah ke Cloudinary melalui `/api/admin/content/media`.
4. Admin dapat mengatur harga, durasi, kuota produk, batas foto per produk, total foto produk, dan total foto usaha melalui pengaturan pembayaran. Kuota diperiksa di server, bukan hanya pada tampilan.
5. Pembayaran langganan/promosi manual memerlukan pemeriksaan dana. Pembayaran yang disetujui belum otomatis membuat materi promosi tayang; admin harus menyetujui konten secara terpisah.
6. Admin dapat melihat daftar akun, menonaktifkan/mengaktifkan akun penjual (peran admin dilindungi), mengelola SEO/kontak/media sosial situs, serta membaca audit log dan status notifikasi.
7. Admin dapat meninjau permintaan penghapusan akun. Setelah ditandai sedang ditinjau, admin dapat menolak dengan alasan atau menyelesaikan penghapusan. Penyelesaian mengarsipkan profil/produk, menghapus akun Firebase Authentication, berupaya membersihkan foto penjual dari Cloudinary, dan mempertahankan transaksi/audit sesuai kebutuhan retensi.
8. Telegram bersifat opsional; bila dikonfigurasi, sistem mencoba mengirim notifikasi dua kali. Kegagalan notifikasi tidak membatalkan operasi inti.

## 4. Environment penting

- Firebase browser: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
- Firebase Admin server: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`.
- Cloudinary server: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Rating: `RATING_HASH_SECRET` — buat nilai acak panjang dan rahasiakan.
- SEO/canonical: `NEXT_PUBLIC_SITE_URL` — domain HTTPS resmi; diperlukan untuk sitemap absolut.
- Telegram opsional: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

- PWA manifest dan ikon aplikasi tersedia; `NEXT_PUBLIC_SITE_URL` diperlukan untuk sitemap/canonical yang benar.

## 5. Batas rilis

Paket kode dan pemeriksaan sintaks bukan bukti bahwa semua layanan produksi sudah siap. Build penuh, typecheck, Firebase Emulator/Rules, Cloudinary live upload/cleanup, Telegram, browser QA, security review, dan smoke test deployment harus lulus sebelum diumumkan siap produksi. Operator juga harus mengisi kontak resmi dan meninjau kebijakan hukum draf sebelum peluncuran.


## SEO nasional (v2.19.0)

SEO teknis diperluas di `docs/SEO_GUIDE.md`: metadata dan canonical per halaman, JSON-LD, sitemap dari konten publik yang layak diindeks, noindex untuk konten tipis, dan halaman wilayah jika ada sedikitnya tiga item berkualitas. Konfigurasi domain dan Search Console tetap wajib.


## v2.20.0 — Pengaturan SEO terpusat
- Domain kanonis dapat diatur dari Dashboard Admin → Pengaturan situs publik. Nilai digunakan oleh canonical URL, structured data, sitemap, dan robots. Environment `NEXT_PUBLIC_SITE_URL` tetap sebagai fallback jika domain tidak diisi.
- Sakelar indeksasi global mengatur robots metadata dan sitemap. Saat dinonaktifkan, halaman publik tetap bisa dirayapi agar crawler dapat membaca instruksi `noindex`, tetapi sitemap tidak ditautkan dan dikosongkan.
- Token Google Search Console dapat diisi dari dashboard untuk menghasilkan meta verification. Verifikasi DNS tetap dilakukan di penyedia domain.
