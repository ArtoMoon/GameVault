import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { autoMigrateFromMongoIfNeeded, getAppDataDir } from '@/lib/db/sqlite';

/**
 * Veritabanı Bağlantı ve Motor Yöneticisi (SQLite Varsayılan + Opsiyonel MongoDB).
 *
 * Varsayılan olarak sıfır kurulum gerektiren gömülü yerel SQLite (`node:sqlite` + WAL)
 * kullanılır. Kullanıcı ayarlardan opsiyonel olarak MongoDB (`mongodb://` veya `mongodb+srv://`)
 * motoruna geçiş yapabilir.
 *
 * @module lib/db/mongoose
 */

export type DbEngine = 'sqlite' | 'mongodb';

export interface DbConfig {
  engine: DbEngine;
  mongoUri: string;
}

const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/mylol';

function getConfigPath(): string {
  return path.join(getAppDataDir(), 'db-config.json');
}

declare global {
  var _mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
  var _dbConfigCache: DbConfig | undefined;
}

const cache = global._mongooseCache ?? {
  conn: null,
  promise: null,
};
if (!global._mongooseCache) {
  global._mongooseCache = cache;
}

export function getDbConfig(): DbConfig {
  if (global._dbConfigCache) return global._dbConfigCache;

  const cfgPath = getConfigPath();
  try {
    if (fs.existsSync(cfgPath)) {
      const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as Partial<DbConfig>;
      const cfg: DbConfig = {
        engine: raw.engine === 'mongodb' ? 'mongodb' : 'sqlite',
        mongoUri: (raw.mongoUri || process.env.MONGODB_URI || DEFAULT_MONGO_URI).trim(),
      };
      global._dbConfigCache = cfg;
      return cfg;
    }
  } catch {
    // ignore and use default
  }

  const defaultCfg: DbConfig = {
    engine: 'sqlite',
    mongoUri: (process.env.MONGODB_URI || DEFAULT_MONGO_URI).trim(),
  };
  global._dbConfigCache = defaultCfg;
  return defaultCfg;
}

export function saveDbConfig(next: Partial<DbConfig>): DbConfig {
  const current = getDbConfig();
  const merged: DbConfig = {
    engine: next.engine ?? current.engine,
    mongoUri: (next.mongoUri ?? current.mongoUri ?? DEFAULT_MONGO_URI).trim(),
  };
  global._dbConfigCache = merged;
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(merged, null, 2), 'utf8');
  } catch (e) {
    console.warn('[DB] db-config.json yazılamadı:', e);
  }
  return merged;
}

export function isSqliteMode(): boolean {
  return getDbConfig().engine === 'sqlite';
}

export function getMongoUri(): string {
  return getDbConfig().mongoUri || DEFAULT_MONGO_URI;
}

/**
 * Aktif veritabanı motoruna bağlanır:
 * - `sqlite` modunda anında döner (harici bağlantı gerekmez).
 * - `mongodb` modunda Mongoose bağlantısını kurar/önbellekten döner; bağlantı
 *   kurulamazsa uygulamanın çökmemesi için otomatik olarak yerel SQLite'a düşer.
 */
export default async function dbConnect(): Promise<typeof mongoose> {
  if (isSqliteMode()) {
    await autoMigrateFromMongoIfNeeded(getMongoUri());
    return mongoose;
  }

  if (cache.conn && mongoose.connection.readyState === 1) {
    return cache.conn;
  }

  const uri = getMongoUri();

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 3500,
      })
      .then((instance) => {
        cache.conn = instance;
        return instance;
      })
      .catch((err) => {
        cache.promise = null;
        cache.conn = null;
        throw err;
      });
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (err) {
    cache.promise = null;
    cache.conn = null;
    throw err;
  }
}

/**
 * Mevcut MongoDB bağlantısını kapatır ve yeni URI ile yeniden bağlanır.
 */
export async function reconnectMongo(newUri: string): Promise<typeof mongoose> {
  if (cache.conn || mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
  cache.conn = null;
  cache.promise = null;

  process.env.MONGODB_URI = newUri.trim();
  saveDbConfig({ engine: 'mongodb', mongoUri: newUri.trim() });
  return dbConnect();
}
