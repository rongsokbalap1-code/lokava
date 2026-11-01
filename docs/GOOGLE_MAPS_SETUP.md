# Lokasi LOKAVA tanpa Google Maps API

LOKAVA tidak memerlukan `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` dan tidak memuat Google Maps JavaScript API.

## Cara penjual menentukan lokasi

1. Buka Profil Usaha.
2. Tekan **Ambil GPS** pada ponsel.
3. Izinkan akses lokasi untuk browser saat diminta.
4. Periksa koordinat yang muncul, lalu simpan profil.
5. Jika perlu, tempel tautan Google Maps atau masukkan latitude dan longitude secara manual.

GPS hanya dipanggil satu kali setelah penjual menekan tombol. LOKAVA tidak melakukan pelacakan lokasi terus-menerus. Tautan Google Maps dibuat otomatis dari koordinat dan dapat diedit.

Tautan pendek seperti `maps.app.goo.gl` dapat disimpan sebagai tautan navigasi, tetapi koordinatnya tidak selalu dapat dibaca tanpa membuka/menyelesaikan redirect. Jika koordinat tidak dapat dibaca, penjual harus menggunakan GPS atau mengisi koordinat manual.

## Peta publik

Halaman peta memakai pratinjau OpenStreetMap tanpa API key. Setiap lokasi memiliki tautan navigasi langsung ke Google Maps menggunakan koordinat tersimpan. Profil yang diedit kembali ke status tinjauan sesuai alur verifikasi yang sudah ada.
