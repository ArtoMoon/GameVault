/**
 * Next.js Standalone Build Hazırlık Scripti.
 *
 * `output: 'standalone'` derlemesinden sonra public/ ve .next/static/ klasörlerini
 * .next/standalone içine kopyalar ve Windows uyumluluğu için tüm sembolik bağları (symlink/junction)
 * gerçek fiziksel dosyalara dönüştürür (dereference).
 *
 * @module scripts/prepare-standalone
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const staticSrc = path.join(rootDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(standaloneDir, 'public');

/**
 * Bir klasörü özyinelemeli olarak kopyalar.
 *
 * @param {string} src
 * @param {string} dest
 */
function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Klasördeki tüm symlink / junction noktalarını gerçek fiziksel klasör kopyasıyla değiştirir.
 *
 * @param {string} dir
 */
function dereferenceDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir);

  for (const name of entries) {
    const fullPath = path.join(dir, name);
    try {
      const stat = fs.lstatSync(fullPath);

      if (stat.isSymbolicLink()) {
        const target = fs.realpathSync(fullPath);
        fs.unlinkSync(fullPath);
        if (fs.existsSync(target)) {
          const targetStat = fs.statSync(target);
          if (targetStat.isDirectory()) {
            copyRecursiveSync(target, fullPath);
          } else {
            fs.copyFileSync(target, fullPath);
          }
        }
      } else if (stat.isDirectory()) {
        dereferenceDirectory(fullPath);
      }
    } catch (err) {
      // Hata durumunda devam et
    }
  }
}

function main() {
  console.log('[Build] Standalone statik dosyaları hazırlanıyor...');

  if (!fs.existsSync(standaloneDir)) {
    console.error('[Build Hata] .next/standalone dizini bulunamadı! Önce next build çalıştırılmalı.');
    process.exit(1);
  }

  // 1. .next/static -> .next/standalone/.next/static
  if (fs.existsSync(staticSrc)) {
    copyRecursiveSync(staticSrc, staticDest);
    console.log('[Build] ✓ .next/static kopyalandı.');
  }

  // 2. public -> .next/standalone/public
  if (fs.existsSync(publicSrc)) {
    copyRecursiveSync(publicSrc, publicDest);
    console.log('[Build] ✓ public/ kopyalandı.');
  }

  // 3. .env.local kopyala
  const envLocalSrc = path.join(rootDir, '.env.local');
  const envLocalDest = path.join(standaloneDir, '.env.local');
  if (fs.existsSync(envLocalSrc)) {
    fs.copyFileSync(envLocalSrc, envLocalDest);
    console.log('[Build] ✓ .env.local kopyalandı.');
  }

  // 3. Symlink/Junction dereferencing (Windows EPERM önleme)
  console.log('[Build] Symlink ve junction noktaları fiziksel dosyalara dönüştürülüyor...');
  dereferenceDirectory(standaloneDir);
  console.log('[Build] ✓ Tüm bağlantılar fiziksel dosyalara dönüştürüldü.');

  console.log('[Build] ✓ Standalone masaüstü paketi hazır.');
}

main();
