# 📶 Customer WiFi Manager — Expo

Aplikasi mobile berbasis **React Native (Expo)** untuk manajemen WiFi pelanggan melalui portal modem secara **otomatis**.

---

## ✅ Fitur yang Sudah Jalan

### 1. Otomasi Login & Navigasi Modem
- Membuka portal modem via WebView (`http://<IP_MODEM>`)
- Mengisi username & password secara otomatis (`injectedJavaScript`)
- Klik tombol Login otomatis
- Navigasi otomatis: **Network → WLAN** dengan mekanisme retry berlapis.

### 2. Panel Kontrol Native (SSID & Password WiFi)
- Membaca SSID & password aktif dari modem dan menampilkannya di aplikasi secara aman.
- Form ganti nama WiFi (SSID) dan kata sandi langsung dari UI aplikasi native.
- Konfirmasi penyimpanan WiFi nirkabel aman dengan validasi kekuatan kata sandi (minimal 8 karakter).
- Proses pembaruan WiFi aman dengan hitung mundur **60 detik** yang melacak tahapan restart modul wireless modem secara proporsional.

### 3. Keamanan Sesi (Session Security Hardening)
- **Inactivity Timer 3 Menit:** Sesi otomatis dibatasi hingga 3 menit tanpa aktivitas.
- **Visual Radar Dot Countdown:** Indikator visual berupa titik cyan bercahaya di tepi radar terluar yang berputar 360 derajat melacak sisa waktu sesi secara dinamis.
- **Interaksi Reset Sesi:** Sentuhan apa pun pada layar aplikasi secara instan mereset timer inaktivitas ke awal (titik radar melompat kembali ke Jam 12).
- **Auto-Logout Force:** Deteksi habis waktu sesi (timeout) atau deteksi halaman login secara otomatis memicu penghapusan cookie/session aktif di modem (`flogout` submit) melalui Modal kustom native untuk mencegah konflik autentikasi.

### 4. Reboot Satu Tombol (One-Click Reboot)
- Otomasi navigasi ke menu Manajemen → Reboot Sistem di portal modem ZTE.
- Melakukan bypass konfirmasi dialog JavaScript modem secara otomatis.
- Visualisasi countdown reboot **60 detik** dengan notifikasi error yang disaring untuk menjaga kestabilan UI ketika koneksi modem sedang terputus sementara.

### 5. Mode Teknisi (Technician Mode)
- Menampilkan diagnostik daya optik GPON fiber (Rx/Tx power, temperatur, bias current, voltage).
- Tampilan detail perangkat terhubung yang membaca tabel DHCP leases router.
- Mode Debug WebView untuk inspeksi elemen web modem secara langsung.

---

## 📁 Struktur File Penting

```
customer_wifi_manager_expo/
├── src/
├── src/
│   ├── screens/
│   │   ├── ModemWebViewScreen.tsx   ← Inti otomasi WebView modem, diagnostik, & form ganti WiFi
│   │   ├── DashboardScreen.tsx      ← Halaman utama app
│   │   ├── CredentialsScreen.tsx    ← Input IP & kredensial modem
│   │   ├── SplashScreen.tsx         ← Splash screen
│   │   ├── PingTesterScreen.tsx     ← Tes koneksi ping ke gateway/internet
│   │   └── NetworkGuideScreen.tsx   ← Panduan jaringan & pemecahan masalah
│   └── navigation/
│       └── AppNavigator.tsx         ← Navigasi antar layar
├── expo-dev.js                      ← Wrapper terminal (QR auto-print)
├── show-qr.js                       ← Script tampil QR standalone
├── package.json
└── README.md
```

---

## 🔄 Alur Otomasi & Sesi (ModemWebViewScreen)

```
       Buka http://<IP>
               │
               ▼
   [AUTOFILL_SUCCESS] (Login Otomatis)
               │
               ▼
        [LOGIN_CLICKED]
               │
   ┌───────────┴───────────┐
   ▼                       ▼
Mode User               Mode Teknisi
(Navigasi WLAN)         (Navigasi Diagnostik / DHCP)
   │                       │
   ▼                       ▼
Selesai Baca Data       Selesai Baca Data
   │                       │
   └───────────┬───────────┘
               │
               ▼
     Mulai Timer Inaktivitas (3 Menit)
     * Radar Dot berputar 360°
     * Interaksi sentuh = Reset ke 0
               │
         Waktu Habis / Login Terbuka
               │
               ▼
     Tampilkan Modal Sesi Berakhir
     * Jalankan handleBackWithLogout()
     * Bersihkan Sesi Modem
```

---

## 🧩 Teknik Injeksi JavaScript

### `injectClickNetwork`
Mencari elemen dengan ID/teks "Network" di DOM, klik parent TR yang punya `onclick`.

### `injectClickWlan` (ZTE-specific)
Strategi pencarian WLAN di modem ZTE F663V3A:
1. Cari `id="smWLAN"` → naik ke parent `<tr>` → klik
2. Panggil langsung `OnMenuItemClick('mmNet','smWLAN')` + `openLink(...)`
3. Cari `<tr onclick*="smWLAN">`
4. Cari teks "WLAN" exact → klik parent TR

### Bypass Reboot Confirmation
Mengekstrak fungsi `msgCallback()` atau `uiDoReboot()` bawaan firmware modem ZTE, serta meng-override fungsi `window.confirm` agar selalu bernilai `true` untuk menghindari pop-up dialog yang memblokir otomasi di latar belakang.

---

## 📱 Cara Menjalankan

```powershell
# Install dependencies
npm install

# Jalankan development server + QR code
npm run dev

# Tampilkan QR code saja
npm run qr
```

Scan QR code dengan **Expo Go** di HP yang terhubung WiFi yang sama dengan modem.

---

## ⚙️ Konfigurasi Modem

Modem yang didukung: **ZTE F663V3A** (dan modem dengan firmware ZTE PON sejenis)

URL login: `http://192.168.1.1` (default)

Kredensial diinput di layar **CredentialsScreen** sebelum membuka WebView.

---

## 📝 Catatan Teknis

- Sesi inaktivitas dikontrol oleh linear `Animated.Value` dengan `useNativeDriver: true` agar performa UI tetap responsif pada frame rate tinggi di platform seluler.
- Overlay loading keluar (`isLoggingOut`) dirender menggunakan native `<Modal>` guna mencegah tabrakan visual (overlapping) di atas modal lainnya.
- Semua komunikasi WebView ↔ React Native via `window.ReactNativeWebView.postMessage()`.

---

*Dibuat dengan React Native + Expo | ZTE Modem Automation*
