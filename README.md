# 📶 Customer WiFi Manager — Expo

Aplikasi mobile berbasis **React Native (Expo)** untuk manajemen WiFi pelanggan melalui portal modem secara **otomatis**.

---

## ✅ Fitur yang Sudah Jalan

### 1. Otomasi Login Modem
- Membuka portal modem via WebView (`http://<IP_MODEM>`)
- Mengisi username & password secara otomatis (`injectedJavaScript`)
- Klik tombol Login otomatis
- Mendukung berbagai selector form (ZTE, Huawei, dsb)

### 2. Navigasi Otomatis: Network → WLAN
- Setelah login berhasil, klik menu **Network** secara otomatis
- Setelah halaman Network terbuka, klik submenu **WLAN** secara otomatis
- Menggunakan ID elemen ZTE: `mmNet`, `smWLAN`
- Fallback: panggil langsung fungsi JS modem `OnMenuItemClick()` + `openLink()`

### 3. Progress Card UI
- Tampilan progress 3 langkah saat otomasi berjalan:
  - ⏳ / ✓ Login otomatis
  - ⏳ / ✓ Membuka menu Network
  - ⏳ / ✓ Membuka pengaturan WLAN
- Auto-hilang 2.5 detik setelah selesai
- Animasi fade in/out

### 4. Dev Terminal
- `npm run dev` → jalankan Expo + tampilkan QR code otomatis di bawah output
- `npm run qr` → tampilkan ulang QR code saja

---

## 📁 Struktur File Penting

```
customer_wifi_manager_expo/
├── src/
│   ├── screens/
│   │   ├── ModemWebViewScreen.tsx   ← Inti otomasi WebView modem
│   │   ├── DashboardScreen.tsx      ← Halaman utama app
│   │   ├── CredentialsScreen.tsx    ← Input IP & kredensial modem
│   │   ├── SplashScreen.tsx         ← Splash screen
│   │   ├── PingTesterScreen.tsx     ← Tes koneksi ping
│   │   └── NetworkGuideScreen.tsx   ← Panduan jaringan
│   └── navigation/
│       └── AppNavigator.tsx         ← Navigasi antar layar
├── expo-dev.js                      ← Wrapper terminal (QR auto-print)
├── show-qr.js                       ← Script tampil QR standalone
├── package.json
└── README.md
```

---

## 🔄 Alur Otomasi (ModemWebViewScreen)

```
Buka http://<IP>
    │
    ▼
[AUTOFILL_SUCCESS]  ← Form login terdeteksi & diisi otomatis
    │
    ▼
[LOGIN_CLICKED]     ← Tombol login diklik
    │
    ├─ navPhase = 'network'
    ├─ Progress: Login ✓
    └─ setTimeout → injectClickNetwork()
          │
          ▼
    [NAV_NETWORK_CLICKED]  ← Menu Network berhasil diklik
          │
          ├─ navPhase = 'wlan'
          ├─ Progress: Network ✓
          └─ setTimeout → injectClickWlan()
                │
                ▼
          [NAV_WLAN_CLICKED]  ← Halaman WLAN terbuka
                │
                ├─ navPhase = 'done'
                ├─ Progress: WLAN ✓
                └─ hideCard() setelah 2.5 detik
```

---

## 🧩 Teknik Injeksi JavaScript

### `injectClickNetwork`
Mencari elemen dengan ID/teks "Network" di DOM, klik parent TR yang punya `onclick`.

### `injectClickWlan` (ZTE-specific)
4 strategi berurutan:
1. Cari `id="smWLAN"` → naik ke parent `<tr>` → klik
2. Panggil langsung `OnMenuItemClick('mmNet','smWLAN')` + `openLink(...)`
3. Cari `<tr onclick*="smWLAN">`
4. Cari teks "WLAN" exact → klik parent TR

### Retry Mechanism
Setiap fungsi inject di-retry beberapa kali dengan interval berbeda (1s, 2s, 3.5s, dll) karena halaman modem load lambat. Guard `navPhaseRef.current` memastikan retry berhenti begitu berhasil.

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

Scan QR code dengan **Expo Go** di HP yang terhubung WiFi yang sama.

---

## ⚙️ Konfigurasi Modem

Modem yang didukung: **ZTE** (diuji dengan firmware ZTE PON)

URL login: `http://192.168.1.1` (default)

Kredensial diinput di layar **CredentialsScreen** sebelum membuka WebView.

---

## 🚧 Rencana Fitur Berikutnya

- [ ] Baca SSID & password WiFi dari halaman WLAN → tampil di app
- [ ] Form ganti nama WiFi (SSID) dari dalam app
- [ ] Form ganti password WiFi dari dalam app
- [ ] Submit perubahan otomatis ke modem
- [ ] Dukungan multi-modem (simpan beberapa profil IP)

---

## 📝 Catatan Teknis

- Modem ZTE menyimpan SSID di field `ESSID` dan password di `KeyPassphrase`
- Navigasi menu ZTE menggunakan fungsi JS: `openLink()`, `OnMenuItemClick()`
- Format URL halaman WLAN: `getpage.gch?pid=1002&nextpage=pon_net_wlan_conf1_t.gch`
- `react-native-webview` digunakan untuk render portal modem
- Semua komunikasi WebView ↔ RN via `window.ReactNativeWebView.postMessage()`

---

*Dibuat dengan React Native + Expo | ZTE Modem Automation*
