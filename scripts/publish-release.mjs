
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
  const repo = 'GameVault';

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

  const releaseName = `GameVault v${version} - Glassmorphic v2 UI, System Tray & Dynamic Port Engine`;
  const releaseBody = `## 🎮 GameVault v${version} Release Notes

Welcome to **GameVault v${version}** — a complete visual overhaul with a new glassmorphic dark UI, system tray support, in-app update notifications, and a conflict-free desktop server engine!

---

### ✨ What's New in v${version}:

#### 🎨 1. Design System v2 — Complete Glassmorphic UI Overhaul
- **Collapsible Sidebar Navigation:** Replaced the top bar with a sleek, collapsible sidebar featuring dynamic platform & game trees, live DB indicator, and instant language switching.
- **Ink & Aurora Aesthetic:** Deep ink-black surfaces (\`#05060a\`), frosted glass cards, violet-to-cyan accent gradients, and staggered entrance animations across every page and modal.
- **Redesigned Views & Modals:** All-new Home dashboard, Platform showcase, Game account views, Account Detail profile hero & match cards, and 3-step Setup & Settings modal.

#### 📌 2. System Tray & Background Mode ("Minimize to Tray on Close")
- **Stay in the System Tray:** Closing the window (\`X\`) can now minimize GameVault to a small icon in the Windows system tray instead of quitting, with a toggle in **Settings** and a quick **"Minimize to Tray Now"** button.
- **Tray Context Menu:** Left-click the tray icon to restore the window instantly, or right-click for **Open GameVault**, **Minimize to Tray**, and **Quit Completely**.

#### 🔔 3. In-App Update Checker & One-Click Update Button
- Automatically checks GitHub Releases for newer versions and surfaces a glowing **Update Available** button in the sidebar and Settings modal.

#### 🔌 4. Dedicated Dynamic Port & Server Signature Verification
- Eliminated port \`3000\` collisions with other local dev servers. GameVault now binds to a dedicated free port (\`47310+\`) and verifies the \`/api/health\` signature before navigating.

---

### 📥 Download & Install:
Download **\`GameVault-Setup-${version}.exe\`** from the **Assets** section below to install on Windows.`;

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
