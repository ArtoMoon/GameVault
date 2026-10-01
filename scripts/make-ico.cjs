
  /**
 * PNG to Multi-Resolution Windows ICO Converter using png-to-ico.
 *
 * Windows standardı olan 16x16, 32x32, 48x48, 64x64, 128x128 ve 256x256
 * çözünürlüklerini tek bir icon.ico dosyasına paketler.
 *
 * @module scripts/make-ico
 */

const fs = require('fs');
const path = require('path');
const pngToIcoRaw = require('png-to-ico');
const pngToIco = pngToIcoRaw.default || pngToIcoRaw;

const assetsDir = path.join(__dirname, '..', 'electron', 'assets');
const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');

const inputFiles = [
  path.join(assetsDir, 'icon_16.png'),
  path.join(assetsDir, 'icon_32.png'),
  path.join(assetsDir, 'icon_48.png'),
  path.join(assetsDir, 'icon_64.png'),
  path.join(assetsDir, 'icon_128.png'),
  path.join(assetsDir, 'icon_256.png'),
];

async function generate() {
  console.log('[ICO] png-to-ico ile Windows ICO üretiliyor...');
  try {
    const buf = await pngToIco(inputFiles);
    
    
    fs.writeFileSync(path.join(assetsDir, 'icon.ico'), buf);
    
    // 2. build/icon.ico
    if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), buf);

    // 3. public/favicon.ico
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buf);

    console.log('[ICO] ✓ Çok çözünürlüklü geçerli Windows ICO dosyası başarıyla üretildi! Boyut:', buf.length, 'bytes');
  } catch (err) {
    console.error('[ICO Hata]', err);
  }
}

generate();
