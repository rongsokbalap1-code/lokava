# Kontrol Admin LOKAVA melalui Grup Telegram

## Fitur

- Pengajuan profil usaha dan produk mengirim pesan dengan tombol **Setujui** dan **Tolak**.
- Bukti pembayaran yang disimpan secara privat di Cloudinary dikirim ke grup sebagai foto melalui URL bertanda tangan, bersama tombol keputusan pembayaran.
- Setelah pembayaran promosi disetujui, bot mengirim pesan kedua untuk persetujuan akhir promosi produk.
- Semua tindakan grup disimpan ke Firestore (`adminActivityLogs`) dengan ID Telegram, nama/username, waktu, dan sumber `telegram_group`.
- Satu pengajuan hanya dapat diputuskan satu kali. Tombol lama akan ditolak bila status sudah berubah.
- Semua anggota grup yang dapat melihat pesan tombol diberi wewenang melakukan keputusan, sesuai keputusan pemilik LOKAVA. ID grup tetap dibatasi oleh `TELEGRAM_CHAT_ID`.

## Environment Vercel

Pertahankan nilai yang sudah berjalan dan tambahkan:

- `TELEGRAM_WEBHOOK_SECRET`: rahasia acak 32–64 karakter; hanya huruf, angka, `_` atau `-`.
- Pastikan `TELEGRAM_BOT_TOKEN` adalah token bot yang benar.
- Pastikan `TELEGRAM_CHAT_ID` adalah ID grup yang benar (umumnya diawali `-100`).

Setelah menambah/mengubah environment variable, lakukan redeploy.

## Daftarkan webhook Telegram

Jalankan sekali dari Cloud Shell atau terminal tepercaya. Isi `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_WEBHOOK_SECRET` di environment terminal secara privat, jangan tempelkan nilainya ke chat atau repository.

```bash
curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=https://lokava.vercel.app/api/telegram/webhook" \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
  --data-urlencode 'allowed_updates=["callback_query"]'
```

Periksa status webhook:

```bash
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Webhook memeriksa header rahasia Telegram dan menolak update dari grup selain `TELEGRAM_CHAT_ID`.

## Catatan keamanan pembayaran

Foto bukti pembayaran bersifat privat di Cloudinary, tetapi setelah dikirim ke grup, seluruh anggota grup dapat melihat dan menyimpannya. Hanya unggah bukti pembayaran yang tidak berisi PIN, kata sandi, OTP, atau data identitas yang tidak diperlukan. Keputusan pembayaran tetap harus berdasarkan pemeriksaan dana masuk secara manual; bot tidak memverifikasi transfer otomatis.

## Diagnostik HTTP 403

Setiap kegagalan pengiriman menyimpan status HTTP dan `description` asli dari Telegram ke koleksi `notifications`. Dashboard admin menampilkan penjelasan tersebut agar 403 tidak lagi hanya terlihat sebagai kode angka.


## Pembaruan real-time dashboard

- Dashboard admin berlangganan langsung ke koleksi Firestore `businesses`, `products`, `transactions`, dan `promotions` menggunakan `onSnapshot`.
- Dashboard penjual berlangganan ke data milik penjual pada `businesses`, `products`, `transactions`, dan `promotions`.
- Ketika tombol **Setujui** atau **Tolak** ditekan, webhook menulis perubahan melalui Firebase Admin SDK. Listener Firestore akan menerima perubahan dan memperbarui dashboard tanpa perlu memuat ulang halaman.
- Pemeriksaan status keanggotaan dilakukan melalui Telegram `getChatMember`. Bot harus menjadi administrator grup agar pemeriksaan anggota lain dapat diandalkan.
- Tombol di grup tetap hanya **Setujui** dan **Tolak**.

## Langkah aktivasi setelah deploy

1. Di Vercel, pastikan `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, dan `TELEGRAM_WEBHOOK_SECRET` tersedia untuk Production.
2. Deploy versi terbaru.
3. Daftarkan webhook dengan perintah `setWebhook` di atas menggunakan token dan secret yang sama.
4. Periksa `getWebhookInfo`; pastikan URL menunjuk ke `/api/telegram/webhook` dan tidak ada `last_error_message`.
5. Uji satu pengajuan percobaan. Tekan **Setujui** atau **Tolak** dari grup dan pastikan pesan Telegram berubah serta status admin dan penjual berubah otomatis tanpa refresh.
6. Jika callback tidak diproses, periksa `getWebhookInfo`, log fungsi Vercel untuk `/api/telegram/webhook`, dan pastikan bot masih administrator grup.
