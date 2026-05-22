const { spawn } = require('child_process');
const qrcode = require('qrcode-terminal');
const net = require('net');
const os = require('os');

// ── Deteksi IP ────────────────────────────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push(iface.address);
      }
    }
  }
  return (
    candidates.find(ip => ip.startsWith('192.168.')) ||
    candidates.find(ip => ip.startsWith('10.')) ||
    candidates[0] ||
    'localhost'
  );
}

// ── Tampilkan QR (dicetak di BAWAH output Expo) ───────────
function showQR() {
  const ip = getLocalIP();
  const expoUrl = `exp://${ip}:8081`;
  const webUrl  = `http://localhost:8081`;

  // Cetak di bawah output Expo yang sudah ada (JANGAN clear screen)
  console.log('\n\x1b[36m╔══════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║         EXPO GO - QR CODE            ║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════╝\x1b[0m\n');

  qrcode.generate(expoUrl, { small: true }, (qr) => {
    console.log(qr);
    console.log('\x1b[33m📱 Expo URL  : ' + expoUrl + '\x1b[0m');
    console.log('\x1b[32m🌐 Web URL   : ' + webUrl + '\x1b[0m\n');
    console.log('\x1b[90ma=Android  w=Web  r=Reload  m=Menu  Ctrl+C=Stop\x1b[0m\n');
  });
}

// ── Polling port sampai terbuka ───────────────────────────
function waitForPort(port, callback) {
  let attempts = 0;
  const check = () => {
    const client = new net.Socket();
    client.setTimeout(500);
    client.on('connect', () => { client.destroy(); callback(); });
    client.on('error', () => { client.destroy(); if (++attempts < 90) setTimeout(check, 1000); });
    client.on('timeout', () => { client.destroy(); if (++attempts < 90) setTimeout(check, 1000); });
    client.connect(port, '127.0.0.1');
  };
  setTimeout(check, 3000); // mulai polling setelah 3 detik
}

// ── Jalankan Expo (TTY penuh agar tidak error) ────────────
console.log('\x1b[33mMemulai Expo, harap tunggu...\x1b[0m\n');

const expo = spawn('npx', ['expo', 'start'], {
  stdio: 'inherit', // TTY penuh, Expo tidak error
  shell: true,
});

let shown = false;
waitForPort(8081, () => {
  if (shown) return;
  shown = true;
  // Tunggu 7 detik setelah port terbuka agar Expo selesai render semua UI-nya dulu
  setTimeout(showQR, 7000);
});

expo.on('close', (code) => process.exit(code || 0));
