'use server';

/**
 * Dinamik Sistem Ayarları, MongoDB Bağlantısı ve Riot API Anahtarı Server Actions.
 *
 * API anahtarını ve MongoDB URI ayarlarını doğrular, veritabanında saklar
 * ve çalışma zamanında dinamik olarak günceller.
 *
 * @module app/actions/settings
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import dbConnect, {
  DbEngine,
  getMongoUri,
  isSqliteMode,
  reconnectMongo,
  saveDbConfig,
} from '@/lib/db/mongoose';
import {
  getSqliteStats,
  importMongoCollectionsToSqlite,
  MongoToSqliteResult,
} from '@/lib/db/sqlite';
import Setting from '@/models/Setting';

const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local');

export interface ApiKeyStatus {
  hasKey: boolean;
  maskedKey: string;
  source: 'database' | 'none';
  updatedAt?: Date;
}

export interface MongoStatus {
  engine: DbEngine;
  connected: boolean;
  uri: string;
  maskedUri: string;
  sqlitePath?: string;
  sqliteSizeKB?: number;
  sqliteRecords?: number;
  error?: string;
}

/**
 * Aktif Riot API anahtarını sadece veritabanından döner.
 */
export async function getActiveApiKey(): Promise<string> {
  try {
    await dbConnect();
    const doc = await Setting.findOne({ key: 'RIOT_API_KEY' }).lean<{ value: string } | null>();
    if (doc?.value && doc.value.trim().startsWith('RGAPI-')) {
      return doc.value.trim();
    }
  } catch (err) {
    console.error('[Settings] API Key veritabanından okunamadı:', err);
  }

  return '';
}

/**
 * Mevcut API Key durumunu döner.
 */
export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  try {
    await dbConnect();
    const doc = await Setting.findOne({ key: 'RIOT_API_KEY' }).lean<{ value: string; updatedAt: Date } | null>();

    if (doc?.value && doc.value.trim().length > 5) {
      const val = doc.value.trim();
      const masked = `${val.slice(0, 9)}...${val.slice(-4)}`;
      return {
        hasKey: true,
        maskedKey: masked,
        source: 'database',
        updatedAt: doc.updatedAt,
      };
    }
  } catch (err) {
    console.error('[Settings] API Key durumu alınamadı:', err);
  }

  return {
    hasKey: false,
    maskedKey: '',
    source: 'none',
  };
}

/**
 * Veritabanı motoru durumunu (Yerel SQLite veya Opsiyonel MongoDB) döner.
 */
export async function getMongoStatus(): Promise<MongoStatus> {
  const currentUri = getMongoUri();
  const sqliteStats = getSqliteStats();

  // Şifreyi maskele (mongodb://user:password@host... ise)
  let masked = currentUri;
  try {
    if (currentUri.includes('@')) {
      masked = currentUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    }
  } catch {
    masked = currentUri;
  }

  if (isSqliteMode()) {
    return {
      engine: 'sqlite',
      connected: true,
      uri: currentUri,
      maskedUri: sqliteStats.path,
      sqlitePath: sqliteStats.path,
      sqliteSizeKB: sqliteStats.sizeKB,
      sqliteRecords: sqliteStats.totalRecords,
    };
  }

  try {
    await dbConnect();
    const isConnected = mongoose.connection.readyState === 1;
    return {
      engine: 'mongodb',
      connected: isConnected,
      uri: currentUri,
      maskedUri: masked,
      sqlitePath: sqliteStats.path,
      sqliteSizeKB: sqliteStats.sizeKB,
      sqliteRecords: sqliteStats.totalRecords,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bağlantı kurulamadı.';
    return {
      engine: 'mongodb',
      connected: false,
      uri: currentUri,
      maskedUri: masked,
      sqlitePath: sqliteStats.path,
      sqliteSizeKB: sqliteStats.sizeKB,
      sqliteRecords: sqliteStats.totalRecords,
      error: msg,
    };
  }
}

/**
 * Veritabanı motorunu (`sqlite` veya `mongodb`) değiştirir.
 */
export async function setDatabaseEngine(
  engine: DbEngine
): Promise<{ success: boolean; error?: string }> {
  try {
    if (engine === 'sqlite') {
      saveDbConfig({ engine: 'sqlite' });
      revalidatePath('/', 'layout');
      return { success: true };
    }

    const uri = getMongoUri();
    const check = await verifyMongoConnection(uri);
    if (!check.valid) {
      return {
        success: false,
        error: check.error || 'MongoDB sunucusuna bağlanılamadı. Önce geçerli bir URI kaydedin.',
      };
    }

    await reconnectMongo(uri);
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Veritabanı motoru değiştirilemedi.';
    return { success: false, error: msg };
  }
}

/**
 * MongoDB üzerindeki tüm verileri (hesaplar, platformlar, kategoriler, ayarlar)
 * yerel SQLite veritabanına taşır ve aktif motoru SQLite yapar.
 */
export async function migrateMongoToSqlite(
  customUri?: string
): Promise<{ success: boolean; counts?: MongoToSqliteResult; error?: string }> {
  const uriToUse = (customUri && customUri.trim()) || getMongoUri();
  try {
    const counts = await importMongoCollectionsToSqlite(uriToUse);
    saveDbConfig({ engine: 'sqlite', mongoUri: uriToUse });
    revalidatePath('/', 'layout');
    revalidatePath('/platform');
    return { success: true, counts };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'MongoDB verileri okunamadı.';
    return {
      success: false,
      error: `MongoDB'den aktarım başarısız (${uriToUse}): ${msg}`,
    };
  }
}

/**
 * Verilen MongoDB URI adresini test eder.
 */
export async function verifyMongoConnection(uriToTest: string): Promise<{ valid: boolean; error?: string }> {
  const cleanUri = uriToTest.trim();
  if (!cleanUri.startsWith('mongodb://') && !cleanUri.startsWith('mongodb+srv://')) {
    return {
      valid: false,
      error: 'MongoDB adresi "mongodb://" veya "mongodb+srv://" ile başlamalıdır.',
    };
  }

  let testConn: mongoose.Connection | null = null;
  try {
    testConn = mongoose.createConnection(cleanUri, {
      serverSelectionTimeoutMS: 4000,
    });
    await testConn.asPromise();
    await testConn.close();
    return { valid: true };
  } catch (err: unknown) {
    if (testConn) {
      try {
        await testConn.close();
      } catch {
        // Ignore
      }
    }
    const msg = err instanceof Error ? err.message : 'Bağlantı hatası oluştu.';
    return {
      valid: false,
      error: `MongoDB bağlantısı başarısız: ${msg}`,
    };
  }
}

/**
 * Yeni MongoDB URI adresini kaydeder ve canlı bağlantıyı yeniler.
 */
export async function saveMongoUri(newUri: string): Promise<{ success: boolean; error?: string }> {
  const cleanUri = newUri.trim();

  // 1. Önce bağlantıyı doğrula
  const verification = await verifyMongoConnection(cleanUri);
  if (!verification.valid) {
    return {
      success: false,
      error: verification.error || 'Bağlantı adresi doğrulanamadı.',
    };
  }

  try {
    // 2. Canlı bağlantıyı yenile
    await reconnectMongo(cleanUri);

    // 3. Veritabanına kaydet
    await Setting.findOneAndUpdate(
      { key: 'MONGODB_URI' },
      { value: cleanUri },
      { upsert: true, new: true }
    );

    // 4. Yeniden başlatmalarda geçerli olması için .env.local dosyasına kaydet
    try {
      let content = '';
      if (fs.existsSync(ENV_LOCAL_PATH)) {
        content = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
      }
      if (content.includes('MONGODB_URI=')) {
        content = content.replace(/MONGODB_URI=.*/g, `MONGODB_URI=${cleanUri}`);
      } else {
        content = `MONGODB_URI=${cleanUri}\n` + content;
      }
      fs.writeFileSync(ENV_LOCAL_PATH, content.trim() + '\n', 'utf8');
    } catch (e) {
      console.warn('[Settings] .env.local MONGODB_URI kaydedilemedi:', e);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'MongoDB ayarı kaydedilemedi.';
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Verilen Riot API anahtarını doğrudan Riot Games sunucusuna test isteği göndererek doğrular.
 */
export async function verifyApiKey(keyToTest: string): Promise<{ valid: boolean; error?: string }> {
  const cleanKey = keyToTest.trim();

  if (!cleanKey.startsWith('RGAPI-')) {
    return {
      valid: false,
      error: 'API anahtarı "RGAPI-" ile başlamalıdır.',
    };
  }

  try {
    const res = await fetch('https://tr1.api.riotgames.com/lol/status/v4/platform-data', {
      headers: {
        'X-Riot-Token': cleanKey,
      },
      cache: 'no-store',
    });

    if (res.status === 200) {
      return { valid: true };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        valid: false,
        error: 'API Anahtarı geçersiz veya 24 saatlik süresi dolmuş! (HTTP ' + res.status + ')',
      };
    }

    return {
      valid: false,
      error: `Riot API yanıt vermedi (HTTP ${res.status})`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bağlantı hatası.';
    return {
      valid: false,
      error: `Bağlantı kurulamadı: ${message}`,
    };
  }
}

/**
 * Yeni Riot API anahtarını sadece veritabanına kaydeder.
 */
export async function saveApiKey(newKey: string): Promise<{ success: boolean; error?: string }> {
  const cleanKey = newKey.trim();

  if (!cleanKey.startsWith('RGAPI-')) {
    return {
      success: false,
      error: 'Geçerli bir Riot API anahtarı giriniz (RGAPI- ile başlamalıdır).',
    };
  }

  // 1. Önce anahtarı test et
  const verification = await verifyApiKey(cleanKey);
  if (!verification.valid) {
    return {
      success: false,
      error: verification.error || 'API anahtarı doğrulanamadı.',
    };
  }

  try {
    // 2. Sadece veritabanına kaydet
    await dbConnect();
    await Setting.findOneAndUpdate(
      { key: 'RIOT_API_KEY' },
      { value: cleanKey },
      { upsert: true, new: true }
    );

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Veritabanına kaydedilemedi.';
    return {
      success: false,
      error: message,
    };
  }
}
