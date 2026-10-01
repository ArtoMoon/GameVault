import mongoose, { Document, Model, Schema } from 'mongoose';
import type { PlayerRanks } from '@/lib/riot/rank';
import type { MatchDetail } from '@/lib/riot/matches';

/**
 * Allowed account status values.
 * - `available`     : Hesap mevcut, son kontrol yapıldı
 * - `archived`      : Hesap arşivlendi (inaktif/eski)
 * - `active`        : Hesap aktif kullanımda
 * - `error_checking`: Son kontrol sırasında Riot API hatası oluştu
 */
export type AccountStatus = 'available' | 'archived' | 'active' | 'error_checking' | 'level';

/**
 * Plain-object shape of an Account document (without Mongoose methods).
 */
export interface IAccount {
  /** "GameName#TAG" formatında Riot ID (benzersiz) */
  riotId: string;
  /** Giriş kullanıcı adı (Riot Client login username - isteğe bağlı) */
  username?: string;
  /** Riot Account v1'den çekilen kalıcı PUUID — bir kez kaydedilir, tekrar sorgulanmaz */
  puuid: string;
  /** Summoner v4'ten çekilen görünen isim */
  summonerName: string;
  /** Hesap seviyesi (Summoner v4) */
  level: number;
  /** Sıralama bilgisi, ör: "GOLD II 45 LP" (League v4) */
  rank: string;
  /** Match-v5'ten çekilen en son maç ID'si */
  lastMatchId: string;
  /** Hesap durumu */
  status: AccountStatus;
  /** Riot platform bölgesi (ör: "TR1", "EUW1") */
  platform: string;
  /** Profil ikonu numarası (DataDragon url'si için) */
  profileIconId?: number;
  /** Harici avatar resim URL'si (Albion, Steam, vb.) */
  avatarUrl?: string;
  /** Solo ve Flex rank detayları (Win/Loss dahil) */
  ranks?: PlayerRanks;
  /** Son oynanan maçların detaylı dökümü */
  matches?: MatchDetail[];
  /** Son başarılı Riot API kontrolünün zamanı */
  lastCheckedAt: Date;
  /** Kullanıcı notu (isteğe bağlı) */
  notes?: string;
  /** Oyun türü: 'lol' | 'valorant' | 'tft' | 'other' (Varsayılan: 'lol') */
  game?: string;
  category?: string;
  /** Hesabın oluşturulma zamanı */
  createdAt?: Date;
  /** Hesabın son güncellenme zamanı */
  updatedAt?: Date;
}

/** Mongoose Document tipi */
export interface IAccountDocument extends IAccount, Document {}

const AccountSchema = new Schema<IAccountDocument>(
  {
    riotId: {
      type: String,
      required: [true, 'Hesap / Riot ID zorunludur'],
      unique: true,
      trim: true,
    },
    username: {
      type: String,
      default: '',
      trim: true,
    },
    puuid: {
      type: String,
      default: '',
      trim: true,
    },
    summonerName: {
      type: String,
      default: '',
      trim: true,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
    },
    rank: {
      type: String,
      default: 'UNRANKED',
      trim: true,
    },
    lastMatchId: {
      type: String,
      default: '',
      trim: true,
    },
    platform: {
      type: String,
      default: 'TR1',
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['available', 'archived', 'active', 'error_checking', 'level'] as AccountStatus[],
      default: 'available',
      required: true,
    },
    profileIconId: {
      type: Number,
      default: 1,
    },
    avatarUrl: {
      type: String,
      default: '',
      trim: true,
    },
    ranks: {
      type: Schema.Types.Mixed,
      default: null,
    },
    matches: {
      type: Schema.Types.Mixed,
      default: [],
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Not en fazla 500 karakter olabilir'],
    },
    game: {
      type: String,
      default: 'lol',
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt otomatik
    collection: 'accounts',
    strict: false,
  }
);

// Index: durum filtresi için
AccountSchema.index({ status: 1 });
// Index: oyun filtresi için
AccountSchema.index({ game: 1 });
// Index: kategori filtresi için
AccountSchema.index({ category: 1 });
// Index: son kontrol sıralaması için
AccountSchema.index({ lastCheckedAt: 1 });

/**
 * Account Mongoose modeli.
 * Schema değişikliklerinin hemen devreye girmesi için cache temizlenir.
 */
delete mongoose.models.Account;
const Account: Model<IAccountDocument> =
  mongoose.model<IAccountDocument>('Account', AccountSchema);

export default Account;
