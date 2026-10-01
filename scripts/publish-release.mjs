
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

  // Check for modern Tauri setup (GameVault or MyLoL), then fallback to Electron
  const tauriGameVaultSetup = path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis', `GameVault_${version}_x64-setup.exe`);
  const tauriMyLoLSetup = path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis', `MyLoL_${version}_x64-setup.exe`);
  const electronSetupFile = path.join(root, 'dist', `MyLoL-Setup-${version}.exe`);

  let setupFile = '';
  let isTauri = false;

  if (fs.existsSync(tauriGameVaultSetup)) {
    setupFile = tauriGameVaultSetup;
    isTauri = true;
    console.log(`⚡ Detected modern GameVault Tauri NSIS installer!`);
  } else if (fs.existsSync(tauriMyLoLSetup)) {
    setupFile = tauriMyLoLSetup;
    isTauri = true;
    console.log(`⚡ Detected modern Tauri NSIS installer!`);
  } else if (fs.existsSync(electronSetupFile)) {
    setupFile = electronSetupFile;
  } else {
    throw new Error(`❌ Setup file not found. Run 'yarn tauri:build' first!`);
  }

  const fileSizeMB = (fs.statSync(setupFile).size / (1024 * 1024)).toFixed(2);
  console.log(`📦 Found setup installer: ${path.basename(setupFile)} (${fileSizeMB} MB)`);

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'GameVault-Release-Uploader',
  };

  const releaseName = `GameVault v${version} - Rebranded, Modern Logo & Ultra-Fast Tauri Desktop`;
  const releaseBody = `## 🎮 GameVault v${version} Release Notes

Welcome to **GameVault** (formerly MyLoL) — the all-new universal gaming dashboard and alt-account manager!

---

### ✨ What's New:

#### 🚀 1. Rebranded to GameVault with Modern Gaming Logo
- **Universal Multi-Game Focus:** Evolved beyond LoL into a universal account hub supporting **Albion Online**, **Riot Games** (LoL, Valorant, TFT), **Steam**, **Epic Games**, **Battle.net**, **EA app**, and custom platforms.
- **Brand New High-Tech Logo:** Modern glowing neon controller shield emblem designed for dark gaming setups.

#### ⚡ 2. Modern Tauri v2 Desktop Engine
- **85% Smaller Setup:** File size slashed from ~185 MB to **~28 MB**!
- **Zero Lag / Fast Startup:** Instant launch with low memory footprint (~40 MB RAM).
- **Auto-Boot Standalone Engine:** Seamless background service orchestration.

#### 🛡️ 3. Albion Online Live API Integration
- Live fame, PvP kills, player guilds, real in-game avatars, and smart tier calculation.

#### 🎛️ 4. Universal Platform & Game Presets
- Drag/reorder platforms, edit platform details, customize colors and API engines.

---

### 📥 Download & Install:
Download **\`GameVault-Setup-${version}.exe\`** from the **Assets** section below to install on Windows.`;

#### 🛡️ 2. Albion Online Live API Integration
- **API Key-Free Character Lookup:** Direct search and account creation powered by Albion Online's official public gameinfo/killboard infrastructure.
- **Real-Time Statistics:** Automatically retrieves **Total Fame**, **PvP Kill Fame**, **PvE Fame**, **Guild**, and **Alliance** data.
- **Smart Tier & Level Calculation:** Dynamic calculation of character levels and Tier rankings (Tier 3 - Tier 8) based on lifetime fame.
- **Regional Server Support:** Full support for Europe (AMS), Americas (US), Asia (SGP), and Global server endpoints.

#### 🎛️ 3. Platform & Game Presets with Custom Ordering
- **Platform Presets:** Built-in ready templates for Albion Online, Riot Games, Steam, Epic Games, Battle.net, EA app, and Ubisoft Connect.
- **Platform Management & Custom Ordering:** Easily customize platform titles, colors, icons, API engine types, reorder platforms dynamically, and restore defaults.

#### 🖼️ 4. Authentic Character Portraits & Square Avatars
- **In-Game Avatars:** Fetches real Albion character portrait assets (\`AVATAR_07\`, etc.) directly from game data.
- **Square Frame Optimization:** Enhanced centered zoom and modern square frames eliminate circular borders and dark margins.

#### ✏️ 5. Universal Platform-Aware Account Editing
- **Comprehensive Edit Modal:** Edit account names, login usernames, platform/server, game, level, tier/rank, status, category, and personal notes from a single modal.
- **Quick Action Buttons:** Added one-click **✏️ Edit** shortcuts across all card and table views.

#### 🏷️ 6. Category Management Fixes
- Prevented default categories (\`Main\`, \`Smurf\`, \`Dereceli\`, \`ARAM / Eğlence\`) from respawning when deleted. A persistent database flag now preserves user category removals.

#### ↩️ 7. Navigation & UI Refinements
- **Smart Back Navigation:** The back button now uses \`router.back()\` to return directly to the previous platform/game view.
- **Visual Glitch Fixes:** Removed duplicate arrow icons (\`← ←\`) and resolved badge clipping in narrow profile headers.

---

### 📥 Download & Install:
Download **\`MyLoL-Setup-${version}.exe\`** from the **Assets** section below to install and run the ultra-fast lightweight desktop application on Windows.`;

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

  // 2. Upload Setup Assets (GameVault-Setup and MyLoL-Setup for compatibility)
  const targetAssetNames = [`GameVault-Setup-${version}.exe`, `MyLoL-Setup-${version}.exe`];
  const fileBuffer = fs.readFileSync(setupFile);

  for (const assetName of targetAssetNames) {
    const existingAsset = release.assets?.find((a) => a.name === assetName);
    if (existingAsset && process.argv.includes('--force')) {
      console.log(`🗑️ Deleting existing asset ${existingAsset.name} (ID: ${existingAsset.id})...`);
      await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, {
        method: 'DELETE',
        headers,
      });
      console.log(`✅ Old asset ${assetName} removed.`);
    }

    const uploadUrl = release.upload_url.replace(/\{(\?name,label)?\}/, '') + `?name=${assetName}`;
    console.log(`⬆️ Uploading ${assetName} (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB)...`);

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
        'User-Agent': 'GameVault-Release-Uploader',
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      console.warn(`Upload warning for ${assetName}: ${await uploadRes.text()}`);
    } else {
      const assetData = await uploadRes.json();
      console.log(`🎉 ${assetName} successfully uploaded: ${assetData.browser_download_url}`);
    }
  }

  console.log(`🔗 Release Page: ${release.html_url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
