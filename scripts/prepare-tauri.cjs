const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const resourcesDir = path.join(rootDir, 'src-tauri', 'resources');
const targetNode = path.join(resourcesDir, 'node.exe');

if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

if (!fs.existsSync(targetNode)) {
  console.log('[Tauri Prep] node.exe kopyalanıyor:', process.execPath);
  fs.copyFileSync(process.execPath, targetNode);
  console.log('[Tauri Prep] ✓ node.exe src-tauri/resources içine yerleştirildi.');
} else {
  console.log('[Tauri Prep] ✓ node.exe zaten mevcut.');
}
