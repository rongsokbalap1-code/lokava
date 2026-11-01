# Dependensi dan lockfile

Proyek menggunakan Node.js 22+ dan `firebase-admin` 13.10.x. Versi ini dipilih untuk menghindari jalur `firebase-admin 14.x` → `jwks-rsa 4.x` → `jose 6` yang sebelumnya menghasilkan `ERR_REQUIRE_ESM` pada runtime CommonJS.

Arsip sumber yang diterima berisi `package-lock.json` yang bukan lockfile proyek: metadata root-nya bernama `lokava-fix` dan hanya mencatat `firebase-admin`. Lockfile tersebut tidak aman dipakai untuk `npm ci`, karena tidak mencerminkan dependensi Next.js/React/Cloudinary proyek ini. File yang salah itu sengaja tidak disertakan dalam paket hasil.

Setelah proyek berada di lingkungan dengan akses ke npm registry, jalankan `npm install` pada folder yang sama dengan `package.json`, lalu commit `package-lock.json` hasil lengkap tersebut. Vercel akan menjalankan `npm install` otomatis ketika tidak ada lockfile; setelah lockfile lengkap dibuat dan diuji, gunakan lockfile itu untuk deployment berikutnya.
