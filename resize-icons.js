const { Jimp } = require('jimp');
const path = require('path');

async function processImages() {
  try {
    console.log('Mulai memproses dan mengoptimalkan ukuran icon dengan Jimp v1...');
    
    // Load original user logo
    const sourcePath = path.join(__dirname, 'assets', 'image.png');
    const originalImage = await Jimp.read(sourcePath);
    
    // --- 1. MEMBUAT ADAPTIVE ICON (UNTUK ANDROID) ---
    // Ukuran standar: 1024x1024. Logo disusutkan menjadi 680x680 (zona aman ~66%)
    // agar terlihat pas dan tidak kekecilan di launcher Android.
    const adaptiveSize = 1024;
    const logoSizeAndroid = 680;
    
    const adaptiveCanvas = new Jimp({ 
      width: adaptiveSize, 
      height: adaptiveSize,
      color: 0x00000000 // tetap transparan untuk adaptive foreground
    });
    const resizedLogoAndroid = originalImage.clone().resize({ w: logoSizeAndroid, h: logoSizeAndroid });
    
    const xAndroid = (adaptiveSize - logoSizeAndroid) / 2;
    const yAndroid = (adaptiveSize - logoSizeAndroid) / 2;
    
    adaptiveCanvas.composite(resizedLogoAndroid, xAndroid, yAndroid);
    await adaptiveCanvas.write(path.join(__dirname, 'assets', 'adaptive-icon.png'));
    console.log('✅ assets/adaptive-icon.png berhasil dibuat dengan ukuran 680px.');

    // --- 2. MEMBUAT ICON UTAMA (UNTUK HOMESCREEN/STORE) ---
    // Menggunakan background putih solid agar tidak menjadi hitam paksa di iOS/Android lawas
    // Ukuran logo dibuat 900x900 agar terisi penuh dengan sedikit padding manis.
    const iconSize = 1024;
    const logoSizeMain = 900;
    
    const iconCanvas = new Jimp({ 
      width: iconSize, 
      height: iconSize,
      color: 0x00000000 // Latar belakang transparan
    });
    const resizedLogoMain = originalImage.clone().resize({ w: logoSizeMain, h: logoSizeMain });
    
    const xMain = (iconSize - logoSizeMain) / 2;
    const yMain = (iconSize - logoSizeMain) / 2;
    
    iconCanvas.composite(resizedLogoMain, xMain, yMain);
    await iconCanvas.write(path.join(__dirname, 'assets', 'icon.png'));
    console.log('✅ assets/icon.png berhasil dibuat dengan background transparan.');

    // --- 3. MEMBUAT SPLASH SCREEN ICON ---
    // Splash screen icon diubah ukurannya ke 600px agar terlihat proporsional dan jelas.
    const splashSize = 1024;
    const logoSizeSplash = 600;
    
    const splashCanvas = new Jimp({ 
      width: splashSize, 
      height: splashSize,
      color: 0x00000000
    });
    const resizedLogoSplash = originalImage.clone().resize({ w: logoSizeSplash, h: logoSizeSplash });
    
    const xSplash = (splashSize - logoSizeSplash) / 2;
    const ySplash = (splashSize - logoSizeSplash) / 2;
    
    splashCanvas.composite(resizedLogoSplash, xSplash, ySplash);
    await splashCanvas.write(path.join(__dirname, 'assets', 'splash-icon.png'));
    console.log('✅ assets/splash-icon.png berhasil dibuat dengan ukuran 600px.');

    // --- 4. MEMBUAT FAVICON ---
    // Ukuran standar favicon web: 48x48.
    const faviconSize = 48;
    const faviconCanvas = originalImage.clone().resize({ w: faviconSize, h: faviconSize });
    await faviconCanvas.write(path.join(__dirname, 'assets', 'favicon.png'));
    console.log('✅ assets/favicon.png berhasil dibuat.');

    console.log('🎉 Pemrosesan icon selesai dengan sukses!');
  } catch (error) {
    console.error('❌ Gagal memproses gambar:', error);
  }
}

processImages();
