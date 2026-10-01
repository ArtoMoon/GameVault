const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIcoRaw = require('png-to-ico');
const pngToIco = pngToIcoRaw.default || pngToIcoRaw;

const srcLogo = 'C:\\Users\\Gaming\\.gemini\\antigravity-ide\\brain\\3e79c07a-0dee-4161-a915-2e056602651b\\gamevault_logo_1790889490448.jpg';
const rootDir = path.resolve(__dirname, '..');
const tauriIconsDir = path.join(rootDir, 'src-tauri', 'icons');
const publicDir = path.join(rootDir, 'public');
const buildDir = path.join(rootDir, 'build');
const frontendDistDir = path.join(rootDir, 'frontend-dist');

async function main() {
  console.log('[Icons] Modern GameVault ikonları üretiliyor...');

  const sizes = [16, 24, 32, 48, 64, 128, 256, 512];
  const pngBuffers = [];

  for (const s of sizes) {
    const buf = await sharp(srcLogo)
      .resize(s, s, { fit: 'cover' })
      .png()
      .toBuffer();
    pngBuffers.push({ size: s, buffer: buf });

    // Tauri icon dosyaları
    if (s === 32) fs.writeFileSync(path.join(tauriIconsDir, '32x32.png'), buf);
    if (s === 128) {
      fs.writeFileSync(path.join(tauriIconsDir, '128x128.png'), buf);
      fs.writeFileSync(path.join(tauriIconsDir, '128x128@2x.png'), buf);
    }
    if (s === 512) {
      fs.writeFileSync(path.join(tauriIconsDir, 'icon.png'), buf);
      fs.writeFileSync(path.join(publicDir, 'logo.png'), buf);
      fs.writeFileSync(path.join(frontendDistDir, 'logo.png'), buf);
    }
  }

  // Windows Multi-Resolution ICO üretimi (16, 32, 48, 64, 128, 256)
  const icoBuffers = pngBuffers
    .filter(p => [16, 32, 48, 64, 128, 256].includes(p.size))
    .map(p => p.buffer);

  const ico = await pngToIco(icoBuffers);

  fs.writeFileSync(path.join(tauriIconsDir, 'icon.ico'), ico);
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);

  console.log('[Icons] ✓ Tüm ikonlar (ICO, PNG) başarıyla güncellendi!');
}

main().catch(console.error);
