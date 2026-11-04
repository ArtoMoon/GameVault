/**
 * Hibrit Model Sarmalayıcısı (SQLite Varsayılan ↔ Opsiyonel Mongoose).
 *
 * Aktif veritabanı motoruna (`isSqliteMode()`) göre çağrıları anında yerel
 * SQLite adaptörüne veya Mongoose modeline yönlendirir.
 *
 * @module lib/db/hybridModel
 */

import type { Model } from 'mongoose';
import { isSqliteMode } from '@/lib/db/mongoose';
import { CollectionName, createSqliteCollectionAdapter } from '@/lib/db/sqlite';

export function createHybridModel<TDoc>(
  collection: CollectionName,
  mongooseModel: Model<TDoc>
): Model<TDoc> {
  const sqliteAdapter = createSqliteCollectionAdapter(collection);

  return new Proxy(mongooseModel, {
    get(target, prop, receiver) {
      if (isSqliteMode() && prop in sqliteAdapter) {
        const val = (sqliteAdapter as Record<string | symbol, unknown>)[prop];
        return typeof val === 'function' ? val.bind(sqliteAdapter) : val;
      }
      const orig = Reflect.get(target, prop, receiver);
      return typeof orig === 'function' ? orig.bind(target) : orig;
    },
  });
}
