const fs = require('fs');
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const { DatabaseSync } = require('node:sqlite');

async function main() {
  const appData =
    process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const dir = path.join(appData, 'GameVault');
  fs.mkdirSync(dir, { recursive: true });
  const sqlitePath = path.join(dir, 'gamevault.sqlite');

  const db = new DatabaseSync(sqlitePath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS records (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (collection, id)
    );
    CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);
  `);

  const insert = db.prepare(
    'INSERT OR REPLACE INTO records (collection, id, data, updated_at) VALUES (?, ?, ?, ?)'
  );

  // Check `test`, `mylol`, and `gamevault` Mongo databases on localhost
  const uris = [
    process.env.MONGODB_URI,
    'mongodb://127.0.0.1:27017/test',
    'mongodb://127.0.0.1:27017/mylol',
    'mongodb://127.0.0.1:27017/gamevault',
  ].filter(Boolean);

  const totals = { accounts: 0, platforms: 0, categories: 0, settings: 0 };

  for (const uri of [...new Set(uris)]) {
    let conn;
    try {
      conn = await mongoose
        .createConnection(uri, { serverSelectionTimeoutMS: 3000 })
        .asPromise();
      const mdb = conn.db;
      for (const col of ['accounts', 'platforms', 'categories', 'settings']) {
        try {
          const docs = await mdb.collection(col).find({}).toArray();
          for (const d of docs) {
            const id = String(d._id);
            const clean = { ...d, _id: id };
            insert.run(col, id, JSON.stringify(clean), Date.now());
            totals[col] += 1;
          }
          if (docs.length > 0) {
            console.log(`[Migrate] ${uri} -> ${col}: ${docs.length} kayıt taşındı.`);
          }
        } catch {
          // ignore missing collection
        }
      }
    } catch (e) {
      console.warn(`[Migrate] ${uri} bağlanılamadı:`, e.message);
    } finally {
      if (conn) await conn.close().catch(() => {});
    }
  }

  if (totals.platforms > 0) {
    insert.run(
      'settings',
      'seed-platforms',
      JSON.stringify({ _id: 'seed-platforms', key: 'platforms_seeded', value: 'true' }),
      Date.now()
    );
  }
  if (totals.categories > 0) {
    insert.run(
      'settings',
      'seed-categories',
      JSON.stringify({ _id: 'seed-categories', key: 'CATEGORIES_INITIALIZED', value: 'true' }),
      Date.now()
    );
  }

  fs.writeFileSync(
    path.join(dir, 'db-config.json'),
    JSON.stringify({ engine: 'sqlite', mongoUri: 'mongodb://localhost:27017/mylol' }, null, 2),
    'utf8'
  );
  fs.writeFileSync(path.join(dir, 'mongo-migrated.flag'), JSON.stringify(totals, null, 2), 'utf8');

  const cntRow = db.prepare('SELECT COUNT(*) as cnt FROM records').get();
  console.log(`[Migrate] Tamamlandı! SQLite yolu: ${sqlitePath}`);
  console.log(`[Migrate] Toplam SQLite kaydı: ${cntRow.cnt}`, totals);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
