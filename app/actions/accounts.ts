'use server';

/**
 * Hesap yönetimi Server Actions.
 *
 * Tüm veritabanı işlemleri sunucu tarafında gerçekleşir.
 * RIOT_API_KEY ve MONGODB_URI asla istemciye sızdırılmaz.
 *
 * @module app/actions/accounts
 */

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db/mongoose';
import Account, { AccountStatus, IAccount } from '@/models/Account';
import { getPuuidByRiotId } from '@/lib/riot/account';
import { parseRiotId, sanitizeRiotId } from '@/lib/riot/utils';

/** Serializable hesap nesnesi (Mongoose Document olmayan) */
export type AccountData = IAccount & { _id: string };

/** Filtre seçenekleri */
export interface AccountFilters {
  status?: AccountStatus;
  game?: string;
  category?: string;
  search?: string;
}

/**
 * Tüm hesapları veritabanından çeker, isteğe bağlı olarak filtreler.
 *
 * @param {AccountFilters} [filters] - Durum, oyun, kategori ve arama filtresi
 * @returns {Promise<AccountData[]>} Hesap listesi (en son eklenen önce)
 *
 * @example
 * const accounts = await getAccounts({ status: 'available', game: 'lol', category: 'Main' });
 */
export async function getAccounts(
  filters?: AccountFilters
): Promise<AccountData[]> {
  await dbConnect();

  const query: Record<string, unknown> = {};

  if (filters?.status) {
    query.status = filters.status;
  }

  if (filters?.game) {
    query.game = filters.game.toLowerCase();
  }

  if (filters?.category) {
    query.category = filters.category;
  }

  if (filters?.search) {
    query.$or = [
      { riotId: { $regex: filters.search, $options: 'i' } },
      { username: { $regex: filters.search, $options: 'i' } },
      { summonerName: { $regex: filters.search, $options: 'i' } },
      { category: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const accounts = await Account.find(query)
    .sort({ createdAt: -1 })
    .lean<IAccount[]>();

  return accounts.map((a) => ({
    ...a,
    _id: String((a as IAccount & { _id: unknown })._id),
    username: a.username ?? '',
    game: a.game || 'lol',
    category: a.category || '',
    lastCheckedAt: a.lastCheckedAt ? new Date(a.lastCheckedAt) : new Date(0),
    createdAt: a.createdAt ? new Date(a.createdAt) : new Date(0),
    updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(0),
  })) as AccountData[];
}

/**
 * Yeni bir hesap ekler. PUUID yoksa Riot Account v1'den çeker.
 *
 * Süreç:
 *  1. riotId ayrıştır → gameName + tagLine
 *  2. PUUID Riot API'den çek (account-v1, 1 req)
 *  3. MongoDB'ye kaydet (status: available)
 *  4. Dashboard önbelleğini geçersiz kıl
 *
 * Rate-limit ağırlığı: 1 istek (account-v1)
 * DB Mutasyonu: accounts koleksiyonuna yeni belge ekler
 *
 * @param {string} riotId - "GameName#TAG" formatında Riot ID
 * @param {string} [platform] - Riot platform bölgesi (ör: "TR1", "EUW1"). Varsayılan: "TR1"
 * @param {string} [username] - İstemci giriş kullanıcı adı (isteğe bağlı)
 * @param {string} [game] - Oyun türü: 'lol' | 'valorant' | 'tft' | 'other'. Varsayılan: 'lol'
 * @param {string} [category] - Kullanıcı tanımlı kategori adı (örn: "Main", "Smurf"). İsteğe bağlı
 * @returns {Promise<{ success: boolean; error?: string; account?: AccountData }>}
 */
export async function addAccount(
  riotId: string,
  platform = 'TR1',
  username?: string,
  game = 'lol',
  category = ''
): Promise<{
  success: boolean;
  error?: string;
  account?: AccountData;
}> {
  try {
    await dbConnect();

    const cleanGame = (game || 'lol').toLowerCase();
    const cleanCategory = category ? category.trim() : '';

    // Format doğrulama ve görünmez karakter temizleme
    const { gameName, tagLine } = parseRiotId(riotId);
    const normalizedRiotId = `${gameName}#${tagLine}`;
    const cleanUsername = username ? sanitizeRiotId(username) : '';

    // Duplicate kontrolü
    const existing = await Account.findOne({
      riotId: { $regex: new RegExp(`^${normalizedRiotId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    }).lean();
    if (existing) {
      return { success: false, error: `Bu hesap (${normalizedRiotId}) zaten kayıtlı.` };
    }

    // PUUID çek (account-v1)
    let puuid = '';
    try {
      puuid = await getPuuidByRiotId(gameName, tagLine, platform as import('@/lib/riot/client').RiotPlatform);
    } catch (apiErr) {
      if (cleanGame === 'lol' || cleanGame === 'tft') {
        throw apiErr;
      }
      puuid = '';
    }

    // Kaydet
    const account = await Account.create({
      riotId: normalizedRiotId,
      username: cleanUsername,
      puuid,
      summonerName: gameName,
      platform: platform.toUpperCase(),
      status: 'available',
      game: cleanGame,
      category: cleanCategory,
    });

    revalidatePath('/');

    return {
      success: true,
      account: {
        ...(account.toObject() as IAccount),
        _id: String(account._id),
      } as AccountData,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata.';
    return { success: false, error: message };
  }
}

/**
 * Hesabın giriş kullanıcı adı bilgisini günceller.
 *
 * @param {string} id - MongoDB ObjectId (string)
 * @param {string} username - Yeni kullanıcı adı
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function updateAccountUsername(
  id: string,
  username: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    const cleanUsername = sanitizeRiotId(username);

    await Account.findByIdAndUpdate(id, { username: cleanUsername });

    revalidatePath(`/accounts/${id}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata.';
    return { success: false, error: message };
  }
}

/**
 * Hesabı veritabanından siler.
 *
 * DB Mutasyonu: accounts koleksiyonundan _id'ye göre belgeyi siler.
 *
 * @param {string} id - MongoDB ObjectId (string)
 * @returns {Promise<{ success: boolean; error?: string }>}
 *
 * @example
 * await deleteAccount('64abc123...');
 */
export async function deleteAccount(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();

    const result = await Account.findByIdAndDelete(id);

    if (!result) {
      return { success: false, error: 'Hesap bulunamadı.' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata.';
    return { success: false, error: message };
  }
}

/**
 * Hesabın not alanını günceller.
 *
 * DB Mutasyonu: accounts._id'ye karşılık gelen belgenin `notes` alanını günceller.
 *
 * @param {string} id - MongoDB ObjectId (string)
 * @param {string} notes - Yeni not metni (max 500 karakter)
 * @returns {Promise<{ success: boolean; error?: string }>}
 *
 * @example
 * await updateAccountNotes('64abc123...', 'Satışa hazır, iletişim: @user');
 */
export async function updateAccountNotes(
  id: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();

    await Account.findByIdAndUpdate(id, { notes }, { runValidators: true });

    revalidatePath(`/accounts/${id}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata.';
    return { success: false, error: message };
  }
}

/**
 * Hesap durumunu manuel olarak günceller.
 *
 * DB Mutasyonu: accounts._id'ye karşılık gelen belgenin `status` alanını günceller.
 *
 * @param {string} id - MongoDB ObjectId (string)
 * @param {AccountStatus} status - Yeni durum
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function updateAccountStatus(
  id: string,
  status: AccountStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();

    await Account.findByIdAndUpdate(id, { status });

    revalidatePath('/');
    revalidatePath(`/accounts/${id}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata.';
    return { success: false, error: message };
  }
}

/**
 * Hesabın sunucu / platform bölgesini günceller.
 *
 * @param {string} id - MongoDB ObjectId (string)
 * @param {string} platform - Yeni platform kodu (ör: "TR1", "EUW1")
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function updateAccountPlatform(
  id: string,
  platform: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    const cleanPlatform = platform.trim().toUpperCase();

    await Account.findByIdAndUpdate(id, { platform: cleanPlatform });

    revalidatePath('/');
    revalidatePath(`/accounts/${id}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata.';
    return { success: false, error: message };
  }
}

/**
 * Hesabın kategorisini günceller.
 *
 * @param {string} id - MongoDB ObjectId (string)
 * @param {string} category - Kategori adı (örn: "Main", "Smurf")
 */
export async function updateAccountCategory(
  id: string,
  category: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    const cleanCategory = category.trim();

    await Account.findByIdAndUpdate(id, { category: cleanCategory });

    revalidatePath('/');
    revalidatePath(`/accounts/${id}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata.';
    return { success: false, error: message };
  }
}

/**
 * Hesabın ait olduğu oyunu günceller.
 *
 * @param {string} id - MongoDB ObjectId (string)
 * @param {string} game - Oyun kodu (örn: "lol", "valorant", "tft")
 */
export async function updateAccountGame(
  id: string,
  game: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    const cleanGame = (game || 'lol').toLowerCase().trim();

    await Account.findByIdAndUpdate(id, { game: cleanGame });

    revalidatePath('/');
    revalidatePath(`/accounts/${id}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata.';
    return { success: false, error: message };
  }
}

