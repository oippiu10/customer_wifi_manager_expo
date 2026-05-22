# 📡 NetGateway - Router Portal & Network Utility

Aplikasi mobile berbasis **React Native Expo** untuk memudahkan pengguna atau teknisi ISP mengakses portal konfigurasi modem (seperti `192.168.1.1`) secara aman di dalam aplikasi, dilengkapi dengan alat diagnosa jaringan (*Network Utilities*) bawaan yang modern dan elegan.

---

## 🎨 Tampilan & Desain Premium
Aplikasi ini dirancang dengan antarmuka gelap (*cyberpunk-dark theme*) menggunakan warna aksen cyan `#06B6D4` dan biru `#3B82F6` yang futuristik, animasi progress loading bar yang mewah, serta tata letak kartu yang responsif.

---

## 📁 Struktur Berkas Proyek (`src/`)
Proyek ini sangat minimalis dan bersih dari file-file yang tidak digunakan:
*   `src/navigation/AppNavigator.tsx` — Sistem navigasi internal berbasis status yang super stabil dan zero-dependency.
*   `src/screens/SplashScreen.tsx` — Animasi memuat awal dengan bar proses dinamis.
*   `src/screens/DashboardScreen.tsx` — Pusat kontrol utama, kolom input IP modem, dan menu shortcut cepat.
*   `src/screens/ModemWebViewScreen.tsx` — Pembungkus WebView modem dengan navigasi kustom (*Back*, *Forward*, *Refresh*, *Home*).
*   `src/screens/CredentialsScreen.tsx` — Database password admin bawaan pabrik modem ISP (ZTE, Huawei, dll.) dengan fitur pencarian dan salin satu ketukan.
*   `src/screens/PingTesterScreen.tsx` — Konsol diagnosa latensi real-time bergaya terminal hacker dengan statistik detail.
*   `src/screens/NetworkGuideScreen.tsx` — Pusat edukasi mandiri pelanggan jika internet mati atau LOS merah.

---

## 🚀 Panduan Menjalankan Aplikasi

Aplikasi sekarang berada langsung di folder utama (root), jadi Anda bisa langsung menjalankannya tanpa perlu masuk ke subfolder!

### Langkah 1: Buka Terminal Anda
Buka Terminal Anda langsung di folder proyek utama ini.

### Langkah 2: Jalankan Perintah Expo
Jalankan perintah berikut untuk memulai server Expo dengan membersihkan cache agar semua komponen terpasang dengan benar:
```bash
npx expo start -c
```

### Langkah 3: Pindai Kode QR
1. Unduh aplikasi **Expo Go** di Google Play Store (Android) atau App Store (iOS).
2. Hubungkan HP Anda ke **jaringan WiFi yang sama** dengan komputer Anda.
3. Buka aplikasi Expo Go, pilih **Scan QR Code**, dan arahkan kamera ke kode QR yang muncul di terminal Anda.
4. Aplikasi akan termuat secara mulus dalam hitungan detik!

---

## ⚡ Fitur Alat Diagnosa Jaringan
1.  **IP Suggestion Badge:** Memudahkan pengisian IP cepat ke `192.168.1.1`, `192.168.0.1`, atau `10.0.0.1`.
2.  **Terminal RTT Logger:** Menampilkan durasi respons HEAD request ke modem secara *real-time* lengkap dengan status log.
3.  **Dynamic Network Stats:** Menampilkan jumlah paket terkirim, diterima, persentase kegagalan (RTO), serta Rata-rata Latensi.
