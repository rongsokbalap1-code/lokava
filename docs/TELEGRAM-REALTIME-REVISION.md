# Revisi Sinkronisasi Telegram Real-time

## Perubahan pada source
- Dashboard admin menggunakan listener Firestore real-time untuk `businesses`, `products`, `transactions`, dan `promotions`.
- Dashboard penjual menggunakan listener real-time terbatas pada dokumen dengan `ownerUid` milik penjual untuk `businesses`, `products`, `transactions`, dan `promotions`.
- Webhook memeriksa status keanggotaan pengguna yang menekan tombol melalui Telegram `getChatMember`.
- Tombol grup tetap hanya dua: **Setujui** dan **Tolak**.
- Listener dibersihkan saat komponen dashboard dilepas agar tidak tertinggal dan tidak menggandakan koneksi.

## Yang perlu diketahui
Listener Firestore hanya akan menerima perubahan dari Firebase yang sama dan jika Firestore Rules mengizinkan pembacaan data terkait. Telegram tetap harus mengirim callback ke endpoint webhook. Karena token bot, secret, Vercel, dan Telegram milik pemilik proyek, pendaftaran webhook dan uji produksi tidak dapat dilakukan dari arsip source ini.

## Aktivasi
Ikuti bagian "Daftarkan webhook Telegram" dan "Langkah aktivasi setelah deploy" di `TELEGRAM_GROUP_CONTROL.md`. Setelah deploy dan webhook aktif, keputusan harus terlihat di dashboard tanpa refresh manual.

## Verifikasi yang dilakukan pada paket ini
- Semua file TypeScript/TSX berhasil diparse oleh TypeScript compiler (96 file, 0 kesalahan sintaks).
- Build Next.js dan typecheck penuh belum dapat dinyatakan lulus karena pemasangan dependency melewati batas waktu.
- Pengujian live Telegram, Firebase, dan Vercel belum dilakukan.
