/**
 * show-qr.js
 * Tampilkan QR code Expo Go di terminal kapan saja.
 * Jalankan: npm run qr
 */

const os = require('os');
const qrcode = require('qrcode-terminal');

// Ambil IP lokal secara otomatis (prioritas: 192.168.x.x → 10.x.x.x → lainnya)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push({ ip: iface.address, name });
      }
    }
  }

  // Prioritas 1: 192.168.x.x (WiFi/LAN rumah)
  const wifi = candidates.find(c => c.ip.startsWith('192.168.'));
  if (wifi) return wifi.ip;

  // Prioritas 2: 10.x.x.x (jaringan lokal lain)
  const local10 = candidates.find(c => c.ip.startsWith('10.'));
  if (local10) return local10.ip;

  // Fallback: IP pertama yang tersedia
  return candidates[0]?.ip || 'localhost';
}

const ip = getLocalIP();
const port = 8081;
const expoUrl = `exp://${ip}:${port}`;
const webUrl = `http://localhost:${port}`;

// Bersihkan layar
console.clear();

// Header
console.log('\x1b[36m╔══════════════════════════════════════╗\x1b[0m');
console.log('\x1b[36m║         EXPO GO - QR CODE            ║\x1b[0m');
console.log('\x1b[36m╚══════════════════════════════════════╝\x1b[0m');
console.log('');

// Generate QR code
qrcode.generate(expoUrl, { small: true }, (code) => {
  console.log(code);
  console.log('\x1b[33m📱 Expo URL  : ' + expoUrl + '\x1b[0m');
  console.log('\x1b[32m🌐 Web URL   : ' + webUrl + '\x1b[0m');
  console.log('');
  console.log('\x1b[90mScan dengan Expo Go (Android) atau Camera (iOS)\x1b[0m');
  console.log('\x1b[90mPastikan Expo sudah berjalan: npm run dev\x1b[0m');
  console.log('');
});
