
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function getGitToken() {
  try {
    const stdout = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const match = stdout.match(/password=(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (err) {
    // ignore
  }
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
}

async function main() {
  const root = process.cwd();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
  const version = pkg.version;
  const tag = `v${version}`;
  
  const owner = 'ArtoMoon';
  const repo = 'lolstock';

  console.log(`🚀 Starting GitHub 
     process for ${tag}...`);

  const token = await getGitToken();
  if (!token) {
    throw new Error('❌ GitHub Token could not be retrieved from git credential manager or GH_TOKEN!');
  }

  const setupFile = path.join(root, 'dist', `MyLoL-Setup-${version}.exe`);
  if (!fs.existsSync(setupFile)) {
    throw new Error(`❌ Setup file not found: ${setupFile}. Please run 'yarn electron:build:setup' first!`);
  }

  const fileSizeMB = (fs.statSync(setupFile).size / (1024 * 1024)).toFixed(2);
  console.log(`📦 Found setup installer: ${path.basename(setupFile)} (${fileSizeMB} MB)`);

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'MyLoL-Release-Uploader',
  };

  const releaseName = `MyLoL v${version} - Albion Online Entegrasyonu, Karakter Avatarı & Platform Düzenleme`;
  const releaseBody = `## 🎮 MyLoL v${version} Yama Notları / Release Notes

Bu güncelleme ile MyLoL'e tam teşekküllü **Albion Online** desteği, canlı killboard API senkronizasyonu, orijinal oyun içi karakter portreleri ve platforma göre özelleştirilebilir hesap düzenleme paneli eklendi!

---

### ✨ Yenilikler ve Geliştirmeler (Changelog):

#### 🛡️ 1. Albion Online Canlı API Entegrasyonu
- **API Anahtarsız Karakter Sorgulama:** Albion Online'ın resmi killboard altyapısı üzerinden karakter adı ile sorgulama desteği eklendi.
- **Canlı İstatistikler:** Karakterin **Toplam Fame**, **PvP Kill Fame**, **PvE Fame**, **Guild (Lonca)** ve **Alliance** bilgileri otomatik olarak çekilir.
- **Otomatik Seviye ve Tier Derecelendirmesi:** Toplam Fame miktarına göre hesaplanan Tier 3 - Tier 8 derecelendirmesi ve seviye hesaplaması entegre edildi.
- **Bölge & Sunucu Desteği:** Albion için Europe (AMS), Americas (US), Asia (SGP) ve Global sunucu seçimleri eklendi.
- **Hatasız Senkronizasyon:** Riot API çağrıları ayrıştırılarak Albion ve diğer harici oyunlarda oluşan hatalı ban/hata (\`error_checking\`) durumu tamamen ortadan kaldırıldı.

#### 🖼️ 2. Gerçek Karakter Avatar & Profil Resmi
- **Orijinal Albion Portresi:** Karakterin oyun içi avatar kimliği (\`AVATAR_07\` vb.) çekilerek orijinal portre görseli entegre edildi.
- **Tam Kare Çerçeve:** Portrelerin köşeden köşeye tam kare oturması için optimize edilmiş ölçekleme ve modern çerçeve tasarımı uygulandı.
- **Tüm Görünümlerde Aktif:** Hesap Detay sayfasının yanı sıra Izgara, Kompakt Izgara ve Liste görünümlerinde de karakter avatarı gösterilir.

#### ✏️ 3. Platforma Göre Hesap Düzenleme (Universal Account Edit Modal)
- **Tüm Alanları Düzenleme:** Hesap adı/karakter adı, giriş kullanıcı adı, platform/sunucu, seviye, lig/tier, durum, kategori ve notlar tek bir pencereden güncellenebilir.
- **Hızlı Erişim:** Tüm kart ve tablo görünümlerine hızlı **✏️ Düzenle** butonları eklendi.

#### 🏷️ 4. Kategori Yönetimi İyileştirmesi
- Silinen varsayılan kategorilerin (\`Main\`, \`Smurf\`, \`Dereceli\`, \`ARAM / Eğlence\`) tekrar kendiliğinden oluşması (\`respawn\`) engellendi. Veritabanına kalıcı ayar bayrağı eklendi.

#### ↩️ 5. Gezinme & Arayüz Düzeltmeleri
- **Geri Gel Tuşu:** Hesap detay sayfasındaki geri dön butonu artık \`router.back()\` ile doğrudan geldiğiniz platform/oyun sayfasına geri döner.
- **Görsel Düzeltmeler:** Çift ok (\`← ←\`) hatası ve rozetlerin taşarak kesilmesi giderildi.

---

### 📥 İndirme ve Kurulum / Download & Install:
Aşağıdaki **Assets** bölümünden **\`MyLoL-Setup-${version}.exe\`** dosyasını indirerek doğrudan kurabilir ve güncel sürümü kullanabilirsiniz.`;

  // 1. Check if release exists
  let release;
  const getRelRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
    headers,
  });

  if (getRelRes.ok) {
    release = await getRelRes.json();
    console.log(`ℹ️ Release ${tag} already exists (ID: ${release.id}). Updating title and description to English...`);
    const patchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/${release.id}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: releaseName,
        body: releaseBody,
      }),
    });
    if (patchRes.ok) {
      release = await patchRes.json();
      console.log(`✅ Release ${tag} successfully updated in English!`);
    } else {
      console.warn(`⚠️ Could not update release text: ${await patchRes.text()}`);
    }
  } else if (getRelRes.status === 404) {
    console.log(`✨ Creating new release ${tag}...`);
    const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag_name: tag,
        target_commitish: 'main',
        name: releaseName,
        body: releaseBody,
        draft: false,
        prerelease: false,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create release: ${createRes.status} ${errText}`);
    }
    release = await createRes.json();
    console.log(`✅ Release created successfully! ID: ${release.id}`);
  } else {
    const errText = await getRelRes.text();
    throw new Error(`Failed to query release: ${getRelRes.status} ${errText}`);
  }

  // 2. Check if asset already exists in release
  const existingAsset = release.assets?.find((a) => a.name === `MyLoL-Setup-${version}.exe`);
  if (existingAsset && !process.argv.includes('--force')) {
    console.log(`📦 Asset ${existingAsset.name} already exists in release: ${existingAsset.browser_download_url}`);
  } else {
    if (existingAsset) {
      console.log(`🗑️ Deleting existing asset ${existingAsset.name} (ID: ${existingAsset.id})...`);
      await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, {
        method: 'DELETE',
        headers,
      });
      console.log(`✅ Old asset removed.`);
    }

    // 3. Upload Setup Asset
    const uploadUrl = release.upload_url.replace(/\{(\?name,label)?\}/, '') + `?name=MyLoL-Setup-${version}.exe`;
    console.log(`⬆️ Uploading ${path.basename(setupFile)} to GitHub Release...`);

    const fileBuffer = fs.readFileSync(setupFile);
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
        'User-Agent': 'MyLoL-Release-Uploader',
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload failed: ${uploadRes.status} ${errText}`);
    }

    const assetData = await uploadRes.json();
    console.log(`🎉 Setup successfully uploaded: ${assetData.browser_download_url}`);
  }

  console.log(`🔗 Release Page: ${release.html_url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
