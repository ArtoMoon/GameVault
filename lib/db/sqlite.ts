/**
 * Gömülü Yerel SQLite Veritabanı Motoru (`node:sqlite` + WAL Modu).
 *
 * Sıfır kurulum, sıfır harici servis gereksinimi ile milisaniyenin altında
 * okuma/yazma hızı sağlar. Verileri kullanıcı profilinde (`%APPDATA%/GameVault/gamevault.sqlite`)
 * tek bir taşınabilir dosyada saklar.
 *
 * Mongoose modellerinin (`Account`, `Platform`, `Category`, `Setting`) kullandığı
 * tüm sorgu desenlerini (`find`, `findOne`, `findById`, `create`, `findByIdAndUpdate`,
 * `findOneAndUpdate`, `findByIdAndDelete`, `updateOne`, `updateMany`, `bulkWrite`,
 * `countDocuments`, `.sort()`, `.select()`, `.lean()`, `.save()`, `.toObject()`)
 * birebir destekler; böylece uygulama kodunda hiçbir değişiklik gerekmez.
 *
 * @module lib/db/sqlite
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

interface SqliteStatement {
  all: (...params: unknown[]) => unknown[];
  get: (...params: unknown[]) => unknown;
  run: (...params: unknown[]) => unknown;
}

interface SqliteDatabase {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatement;
}

export type CollectionName = 'accounts' | 'platforms' | 'categories' | 'settings';

const COLLECTION_DEFAULTS: Record<CollectionName, () => Record<string, unknown>> = {
  accounts: () => ({
    riotId: '',
    username: '',
    puuid: '',
    summonerName: '',
    level: 0,
    rank: 'UNRANKED',
    lastMatchId: '',
    platform: 'TR1',
    status: 'available',
    profileIconId: 1,
    avatarUrl: '',
    ranks: null,
    matches: [],
    lastCheckedAt: null,
    notes: '',
    game: 'lol',
    category: '',
  }),
  platforms: () => ({
    slug: '',
    name: '',
    icon: '🎮',
    color: '#3b82f6',
    description: '',
    games: [],
    isDefault: false,
    order: 0,
    apiType: 'manual',
  }),
  categories: () => ({
    name: '',
    color: '#3b82f6',
    icon: '📁',
    description: '',
  }),
  settings: () => ({
    key: '',
    value: '',
  }),
};

const DATE_FIELDS = new Set(['createdAt', 'updatedAt', 'lastCheckedAt']);

export function getAppDataDir(): string {
  const base =
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : path.join(os.homedir(), '.local', 'share'));
  const dir = path.join(base, 'GameVault');
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Fallback to current working directory if APPDATA is restricted
    const fallback = path.join(process.cwd(), '.data');
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
  return dir;
}

export function getSqlitePath(): string {
  return path.join(getAppDataDir(), 'gamevault.sqlite');
}

declare global {
  var _sqliteDb: SqliteDatabase | undefined;
  var _mongoToSqliteMigrated: boolean | undefined;
}

function getSqliteDb(): SqliteDatabase {
  if (global._sqliteDb) return global._sqliteDb;

  // Use createRequire so webpack/Next.js does not attempt to bundle the Node built-in `node:sqlite`
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createRequire } = require('module') as typeof import('module');
  const nodeRequire = createRequire(__filename);
  const { DatabaseSync } = nodeRequire('node:sqlite') as {
    DatabaseSync: new (filename: string) => SqliteDatabase;
  };
  const dbPath = getSqlitePath();
  const db = new DatabaseSync(dbPath);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA temp_store = MEMORY;
    PRAGMA cache_size = -8000;

    CREATE TABLE IF NOT EXISTS records (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (collection, id)
    );
    CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);
  `);

  global._sqliteDb = db;
  return db;
}

function reviveDates<T extends Record<string, unknown>>(raw: T): T {
  const out: Record<string, unknown> = { ...raw };
  for (const field of DATE_FIELDS) {
    const val = out[field];
    if (typeof val === 'string' || typeof val === 'number') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) out[field] = d;
    }
  }
  return out as T;
}

function getByPath(obj: unknown, dottedPath: string): unknown {
  const parts = dottedPath.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      return cur.map((item) => getByPath(item, parts.slice(parts.indexOf(part)).join('.')));
    }
    if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

function matchCondition(actual: unknown, cond: unknown): boolean {
  if (Array.isArray(actual) && !Array.isArray(cond)) {
    return actual.some((item) => matchCondition(item, cond));
  }
  if (cond instanceof RegExp) {
    return typeof actual === 'string' && cond.test(actual);
  }
  if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
    const c = cond as Record<string, unknown>;
    if ('$regex' in c) {
      const pattern = c.$regex;
      const flags = typeof c.$options === 'string' ? c.$options : '';
      const regex =
        pattern instanceof RegExp
          ? new RegExp(pattern.source, flags || pattern.flags)
          : new RegExp(String(pattern), flags);
      return typeof actual === 'string' && regex.test(actual);
    }
    if ('$ne' in c) {
      return String(actual) !== String(c.$ne);
    }
    if ('$in' in c && Array.isArray(c.$in)) {
      return c.$in.includes(actual);
    }
  }
  return actual === cond || (actual !== undefined && String(actual) === String(cond));
}

function matchesFilter(doc: Record<string, unknown>, filter?: Record<string, unknown>): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, cond] of Object.entries(filter)) {
    if (cond === undefined) continue;
    if (key === '$or' && Array.isArray(cond)) {
      const anyMatch = cond.some((sub) => matchesFilter(doc, sub as Record<string, unknown>));
      if (!anyMatch) return false;
      continue;
    }
    const actual = getByPath(doc, key);
    if (!matchCondition(actual, cond)) return false;
  }
  return true;
}

function compareValues(a: unknown, b: unknown): number {
  const av = a instanceof Date ? a.getTime() : typeof a === 'boolean' ? (a ? 1 : 0) : a;
  const bv = b instanceof Date ? b.getTime() : typeof b === 'boolean' ? (b ? 1 : 0) : b;
  if (av === bv) return 0;
  if (av === undefined || av === null) return -1;
  if (bv === undefined || bv === null) return 1;
  return av > bv ? 1 : -1;
}

function sortDocs<T extends Record<string, unknown>>(
  docs: T[],
  sortSpec?: Record<string, 1 | -1 | number>
): T[] {
  if (!sortSpec || Object.keys(sortSpec).length === 0) return docs;
  const entries = Object.entries(sortSpec);
  return [...docs].sort((a, b) => {
    for (const [field, dir] of entries) {
      const cmp = compareValues(a[field], b[field]);
      if (cmp !== 0) return dir < 0 ? -cmp : cmp;
    }
    return 0;
  });
}

function readAllFromSqlite(collection: CollectionName): Record<string, unknown>[] {
  const db = getSqliteDb();
  const stmt = db.prepare('SELECT data FROM records WHERE collection = ?');
  const rows = stmt.all(collection) as { data: string }[];
  const out: Record<string, unknown>[] = [];
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.data) as Record<string, unknown>;
      out.push(reviveDates(parsed));
    } catch {
      // Skip malformed row
    }
  }
  return out;
}

function writeToSqlite(collection: CollectionName, doc: Record<string, unknown>): void {
  const db = getSqliteDb();
  const id = String(doc._id);
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO records (collection, id, data, updated_at) VALUES (?, ?, ?, ?)'
  );
  stmt.run(collection, id, JSON.stringify(doc), Date.now());
}

function deleteFromSqlite(collection: CollectionName, id: string): void {
  const db = getSqliteDb();
  const stmt = db.prepare('DELETE FROM records WHERE collection = ? AND id = ?');
  stmt.run(collection, String(id));
}

function attachDocMethods<T extends Record<string, unknown>>(
  collection: CollectionName,
  raw: T
): T & { toObject: () => T; save: () => Promise<T> } {
  const copy = { ...raw } as T & { toObject: () => T; save: () => Promise<T> };
  Object.defineProperty(copy, 'toObject', {
    enumerable: false,
    value: () => {
      const clean = { ...(copy as Record<string, unknown>) };
      return reviveDates(clean) as T;
    },
  });
  Object.defineProperty(copy, 'save', {
    enumerable: false,
    value: async () => {
      (copy as Record<string, unknown>).updatedAt = new Date();
      const plain = { ...(copy as Record<string, unknown>) };
      writeToSqlite(collection, plain);
      return copy;
    },
  });
  return copy;
}

class SqliteQuery<T> implements PromiseLike<T> {
  private sortSpec?: Record<string, number>;
  private selectFields?: string[];
  private isLean = false;

  constructor(
    private collection: CollectionName,
    private filter: Record<string, unknown>,
    private single: boolean
  ) {}

  sort(spec: Record<string, number>): this {
    this.sortSpec = spec;
    return this;
  }

  select(fields: string): this {
    this.selectFields = fields
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return this;
  }

  lean<R = T>(): SqliteQuery<R> {
    this.isLean = true;
    return this as unknown as SqliteQuery<R>;
  }

  private execute(): T {
    let docs = readAllFromSqlite(this.collection).filter((d) => matchesFilter(d, this.filter));
    if (this.sortSpec) {
      docs = sortDocs(docs, this.sortSpec);
    }
    if (this.selectFields && this.selectFields.length > 0) {
      const fields = new Set(['_id', ...this.selectFields]);
      docs = docs.map((d) => {
        const picked: Record<string, unknown> = {};
        for (const f of fields) {
          if (f in d) picked[f] = d[f];
        }
        return picked;
      });
    }
    if (this.single) {
      const first = docs[0] ?? null;
      if (!first) return null as unknown as T;
      return (this.isLean ? first : attachDocMethods(this.collection, first)) as unknown as T;
    }
    return (
      this.isLean ? docs : docs.map((d) => attachDocMethods(this.collection, d))
    ) as unknown as T;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
    } catch (err) {
      return Promise.reject(err).then(onfulfilled, onrejected);
    }
  }
}

function applyUpdateOperators(
  target: Record<string, unknown>,
  update: Record<string, unknown>,
  isInsert: boolean
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...target };
  const hasDollar = Object.keys(update).some((k) => k.startsWith('$'));

  if (hasDollar) {
    if (update.$set && typeof update.$set === 'object') {
      Object.assign(next, update.$set);
    }
    if (isInsert && update.$setOnInsert && typeof update.$setOnInsert === 'object') {
      Object.assign(next, update.$setOnInsert);
    }
  } else {
    for (const [k, v] of Object.entries(update)) {
      if (v !== undefined) next[k] = v;
    }
  }
  next.updatedAt = new Date();
  return reviveDates(next);
}

function buildNewDocument(
  collection: CollectionName,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const now = new Date();
  const defaults = COLLECTION_DEFAULTS[collection]();
  const doc: Record<string, unknown> = {
    ...defaults,
    _id: payload._id ? String(payload._id) : crypto.randomUUID(),
    createdAt: payload.createdAt ? new Date(payload.createdAt as string) : now,
    updatedAt: payload.updatedAt ? new Date(payload.updatedAt as string) : now,
  };
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) doc[k] = v;
  }
  return reviveDates(doc);
}

export function createSqliteCollectionAdapter(collection: CollectionName) {
  return {
    find(filter: Record<string, unknown> = {}) {
      return new SqliteQuery<Record<string, unknown>[]>(collection, filter, false);
    },

    findOne(filter: Record<string, unknown> = {}) {
      return new SqliteQuery<Record<string, unknown> | null>(collection, filter, true);
    },

    findById(id: string) {
      return new SqliteQuery<Record<string, unknown> | null>(collection, { _id: String(id) }, true);
    },

    async create(payload: Record<string, unknown>) {
      const doc = buildNewDocument(collection, payload);
      writeToSqlite(collection, doc);
      return attachDocMethods(collection, doc);
    },

    findByIdAndUpdate(
      id: string,
      update: Record<string, unknown>,
      options?: { new?: boolean; upsert?: boolean }
    ) {
      const existing = readAllFromSqlite(collection).find((d) => String(d._id) === String(id));
      let result: Record<string, unknown> | null = null;
      if (existing) {
        result = applyUpdateOperators(existing, update, false);
        writeToSqlite(collection, result);
      } else if (options?.upsert) {
        const base = buildNewDocument(collection, { _id: String(id) });
        result = applyUpdateOperators(base, update, true);
        writeToSqlite(collection, result);
      }
      return {
        lean: async <R = Record<string, unknown> | null>() => (result as unknown as R),
        then: <TResult1 = unknown, TResult2 = never>(
          onfulfilled?: ((v: unknown) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((r: unknown) => TResult2 | PromiseLike<TResult2>) | null
        ) =>
          Promise.resolve(result ? attachDocMethods(collection, result) : null).then(
            onfulfilled,
            onrejected
          ),
      };
    },

    async findOneAndUpdate(
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
      options?: { upsert?: boolean; new?: boolean }
    ) {
      const existing = readAllFromSqlite(collection).find((d) => matchesFilter(d, filter));
      if (existing) {
        const updated = applyUpdateOperators(existing, update, false);
        writeToSqlite(collection, updated);
        return attachDocMethods(collection, updated);
      }
      if (options?.upsert) {
        const seed: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(filter)) {
          if (!k.startsWith('$') && (typeof v === 'string' || typeof v === 'number')) {
            seed[k] = v;
          }
        }
        const base = buildNewDocument(collection, seed);
        const created = applyUpdateOperators(base, update, true);
        writeToSqlite(collection, created);
        return attachDocMethods(collection, created);
      }
      return null;
    },

    async findByIdAndDelete(id: string) {
      const existing = readAllFromSqlite(collection).find((d) => String(d._id) === String(id));
      if (!existing) return null;
      deleteFromSqlite(collection, String(id));
      return attachDocMethods(collection, existing);
    },

    async updateOne(
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
      options?: { upsert?: boolean }
    ) {
      const res = await this.findOneAndUpdate(filter, update, options);
      return { acknowledged: true, modifiedCount: res ? 1 : 0 };
    },

    async updateMany(filter: Record<string, unknown>, update: Record<string, unknown>) {
      const matching = readAllFromSqlite(collection).filter((d) => matchesFilter(d, filter));
      for (const doc of matching) {
        const updated = applyUpdateOperators(doc, update, false);
        writeToSqlite(collection, updated);
      }
      return { acknowledged: true, modifiedCount: matching.length };
    },

    async countDocuments(filter: Record<string, unknown> = {}) {
      return readAllFromSqlite(collection).filter((d) => matchesFilter(d, filter)).length;
    },

    async bulkWrite(
      ops: {
        updateOne?: {
          filter: Record<string, unknown>;
          update: Record<string, unknown>;
          upsert?: boolean;
        };
      }[]
    ) {
      for (const op of ops) {
        if (op.updateOne) {
          await this.updateOne(op.updateOne.filter, op.updateOne.update, {
            upsert: op.updateOne.upsert,
          });
        }
      }
      return { ok: 1 };
    },
  };
}

/** SQLite veritabanı istatistiklerini döner (dosya yolu, boyut, kayıt sayısı). */
export function getSqliteStats(): { path: string; sizeKB: number; totalRecords: number } {
  const dbPath = getSqlitePath();
  const db = getSqliteDb();
  let sizeKB = 0;
  try {
    if (fs.existsSync(dbPath)) {
      sizeKB = Math.round((fs.statSync(dbPath).size / 1024) * 10) / 10;
    }
  } catch {
    // ignore
  }
  let totalRecords = 0;
  try {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM records').get() as { cnt?: number };
    totalRecords = Number(row?.cnt || 0);
  } catch {
    // ignore
  }
  return { path: dbPath, sizeKB, totalRecords };
}

export interface MongoToSqliteResult {
  accounts: number;
  platforms: number;
  categories: number;
  settings: number;
  total: number;
}

/**
 * MongoDB üzerindeki tüm koleksiyonları (`accounts`, `platforms`, `categories`, `settings`)
 * yerel SQLite veritabanına taşır (var olan kayıtları günceller / birleştirir).
 */
export async function importMongoCollectionsToSqlite(
  mongoUri: string
): Promise<MongoToSqliteResult> {
  const mongoose = (await import('mongoose')).default;
  const conn = await mongoose
    .createConnection(mongoUri, {
      serverSelectionTimeoutMS: 3000,
    })
    .asPromise();

  const counts: MongoToSqliteResult = {
    accounts: 0,
    platforms: 0,
    categories: 0,
    settings: 0,
    total: 0,
  };

  try {
    const dbNames = Array.from(
      new Set([conn.db?.databaseName, 'test', 'mylol', 'gamevault'].filter(Boolean) as string[])
    );

    const collections: CollectionName[] = ['accounts', 'platforms', 'categories', 'settings'];
    for (const dbName of dbNames) {
      const targetDb = conn.useDb(dbName).db;
      if (!targetDb) continue;
      for (const col of collections) {
        try {
          const docs = await targetDb.collection(col).find({}).toArray();
          for (const raw of docs) {
            const id = String(raw._id);
            const clean: Record<string, unknown> = { ...raw, _id: id };
            writeToSqlite(col, reviveDates(clean));
            counts[col] += 1;
            counts.total += 1;
          }
        } catch {
          // Collection may not exist
        }
      }
    }

    // Kategoriler ve platformlar taşındıysa seed işaretlerini de ekle
    if (counts.platforms > 0) {
      writeToSqlite('settings', {
        _id: 'seed-platforms',
        key: 'platforms_seeded',
        value: 'true',
        updatedAt: new Date(),
      });
    }
    if (counts.categories > 0) {
      writeToSqlite('settings', {
        _id: 'seed-categories',
        key: 'CATEGORIES_INITIALIZED',
        value: 'true',
        updatedAt: new Date(),
      });
    }
  } finally {
    try {
      await conn.close();
    } catch {
      // ignore
    }
  }

  return counts;
}

/**
 * Uygulama ilk kez SQLite modunda açıldığında (ve henüz hesap kaydı yokken),
 * yerel MongoDB'de (`mongodb://localhost:27017/mylol`) veri varsa otomatik olarak
 * SQLite'a aktarır.
 */
export async function autoMigrateFromMongoIfNeeded(mongoUri: string): Promise<void> {
  if (global._mongoToSqliteMigrated) return;
  global._mongoToSqliteMigrated = true;

  const flagPath = path.join(getAppDataDir(), 'mongo-migrated.flag');
  if (fs.existsSync(flagPath)) return;

  try {
    const existingAccounts = readAllFromSqlite('accounts');
    if (existingAccounts.length > 0) {
      fs.writeFileSync(flagPath, new Date().toISOString(), 'utf8');
      return;
    }

    const res = await importMongoCollectionsToSqlite(mongoUri);
    if (res.total > 0) {
      console.log(
        `[SQLite Migration] MongoDB'den ${res.accounts} hesap, ${res.platforms} platform, ${res.categories} kategori SQLite'a taşındı.`
      );
      fs.writeFileSync(flagPath, JSON.stringify(res, null, 2), 'utf8');
    }
  } catch {
    // MongoDB çalışmıyorsa sessizce geç
  }
}

