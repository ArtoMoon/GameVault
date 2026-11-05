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
import Platform from '@/models/Platform';
import { getPuuidByRiotId } from '@/lib/riot/account';
import { parseRiotId, sanitizeRiotId } from '@/lib/riot/utils';
import { fetchAlbionCharacter, formatFame } from '@/lib/albion/api';

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
    csDropTracked:
      typeof a.csDropTracked === 'boolean'
        ? a.csDropTracked
        : (a.game || '').toLowerCase() === 'cs2',
    csLastDropAt: a.csLastDropAt ? new Date(a.csLastDropAt) : null,
    csTotalDrops: typeof a.csTotalDrops === 'number' ? a.csTotalDrops : 0,
    csLastCaseName: a.csLastCaseName ?? '',
    csPrime: typeof a.csPrime === 'boolean' ? a.csPrime : true,
    lastCheckedAt: a.lastCheckedAt ? new Date(a.lastCheckedAt) : new Date(0),
    createdAt: a.createdAt ? new Date(a.createdAt) : new Date(0),
    updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(0),
  })) as AccountData[];
}

export interface Cs2AccountInitOptions {
  csDropTracked?: boolean;
  csClaimedThisWeek?: boolean;
  csLastCaseName?: string;
  csTotalDrops?: number;
  csPrime?: boolean;
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
  platform?: string,
  username?: string,
  game = 'lol',
  category = '',
  level?: number,
  rank?: string,
  csOptions?: Cs2AccountInitOptions
): Promise<{
  success: boolean;
  error?: string;
  account?: AccountData;
}> {
  try {
    await dbConnect();

    const cleanGame = (game || 'lol').toLowerCase().trim();
    const cleanCategory = category ? category.trim() : '';
    const cleanUsername = username ? sanitizeRiotId(username) : '';
    const isRiotGame = ['lol', 'valorant', 'tft'].includes(cleanGame);
    const isCs2 = cleanGame === 'cs2' || cleanGame.includes('counter-strike');

    // Eğer CS2 hesabı ekleniyorsa ve henüz Steam/CS2 platformu yoksa otomatik oluştur
    if (isCs2) {
      const existingCsPlatform = await Platform.findOne({
        $or: [{ slug: 'steam' }, { slug: 'cs2' }, { 'games.slug': 'cs2' }],
      }).lean();
      if (!existingCsPlatform) {
        await Platform.create({
          slug: 'steam',
          name: 'Steam / CS2',
          icon: '🔫',
          color: '#38bdf8',
          description: 'Counter-Strike 2 haftalık kasa takibi ve Steam hesapları.',
          apiType: 'steam',
          isDefault: true,
          order: 2,
          games: [
            {
              slug: 'cs2',
              name: 'Counter-Strike 2',
              icon: '🔫',
              apiType: 'steam',
              description: 'CS2 Prime hesapları, Premier rating ve haftalık kasa drop takibi.',
            },
          ],
        });
      }
    }

    let gameName = '';
    let normalizedRiotId = '';
    let puuid = '';

    if (isRiotGame) {
      const cleaned = sanitizeRiotId(riotId);
      if (!cleaned.includes('#')) {
        return {
          success: false,
          error: 'Riot oyunları için format: "GameName#TAG" (Örn: Faker#KR1) olmalıdır.',
        };
      }
      const parsed = parseRiotId(cleaned);
      gameName = parsed.gameName;
      normalizedRiotId = `${parsed.gameName}#${parsed.tagLine}`;

      // PUUID çek (account-v1)
      const riotPlatform = (platform || 'TR1').toUpperCase();
      try {
        puuid = await getPuuidByRiotId(
          parsed.gameName,
          parsed.tagLine,
          riotPlatform as import('@/lib/riot/client').RiotPlatform
        );
      } catch (apiErr) {
        if (cleanGame === 'lol' || cleanGame === 'tft') {
          throw apiErr;
        }
        puuid = '';
      }
    } else {
      // Riot harici platformlar (Albion, Steam, Epic, vb.)
      const cleaned = sanitizeRiotId(riotId);
      if (!cleaned) {
        return { success: false, error: 'Hesap / Karakter adı boş bırakılamaz.' };
      }
      gameName = cleaned;
      normalizedRiotId = cleaned;
      puuid = '';
    }

    let isAlbion = cleanGame === 'albion' || cleanGame.includes('albion');
    if (!isAlbion) {
      const pDoc = await Platform.findOne({
        $or: [
          { 'games.slug': cleanGame, 'games.apiType': 'albion' },
          { slug: cleanGame, apiType: 'albion' },
          { 'games.slug': cleanGame, apiType: 'albion' },
        ],
      }).lean();
      if (pDoc) isAlbion = true;
    }

    const resolvedPlatform =
      platform && platform.trim()
        ? platform.trim()
        : isRiotGame
        ? 'TR1'
        : isAlbion
        ? 'Europe'
        : 'Global';

    let resolvedLevel =
      level !== undefined && !isNaN(Number(level)) ? Math.max(0, Number(level)) : 1;
    let resolvedRank = rank && rank.trim() ? rank.trim() : 'UNRANKED';
    let autoNotes = '';
    let resolvedAvatarUrl = '';

    // Albion Online Karakter API Sorgusu
    if (isAlbion) {
      try {
        const albionRes = await fetchAlbionCharacter(normalizedRiotId, resolvedPlatform);
        if (albionRes.success && albionRes.data) {
          const d = albionRes.data;
          puuid = d.id;
          gameName = d.name;
          normalizedRiotId = d.name; // Resmi büyük/küçük harf düzeni
          resolvedAvatarUrl = d.avatarUrl;
          if (!rank || !rank.trim()) {
            resolvedRank = d.suggestedRank;
          }
          if (level === undefined || isNaN(Number(level))) {
            resolvedLevel = d.calculatedLevel;
          }
          autoNotes = `[Albion API] Toplam Fame: ${d.formattedFame} | PvP: ${formatFame(d.killFame)} | PvE: ${formatFame(d.pveTotal)}${d.guildName ? ' | Guild: ' + d.guildName : ''}`;
        }
      } catch {
        // API yanıt vermezse manuel verilerle devam et
      }
    }

    // Duplicate kontrolü
    const existing = await Account.findOne({
      riotId: {
        $regex: new RegExp(
          `^${normalizedRiotId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          'i'
        ),
      },
    }).lean();
    if (existing) {
      return {
        success: false,
        error: `Bu hesap (${normalizedRiotId}) zaten kayıtlı.`,
      };
    }

    const resolvedCsDropTracked =
      typeof csOptions?.csDropTracked === 'boolean'
        ? csOptions.csDropTracked
        : isCs2;
    const resolvedCsClaimed = Boolean(csOptions?.csClaimedThisWeek);
    const resolvedCsLastDropAt = resolvedCsClaimed ? new Date() : null;
    const resolvedCsTotalDrops =
      typeof csOptions?.csTotalDrops === 'number' && !isNaN(csOptions.csTotalDrops)
        ? Math.max(0, csOptions.csTotalDrops)
        : resolvedCsClaimed
        ? 1
        : 0;
    const resolvedCsLastCaseName = csOptions?.csLastCaseName?.trim() || '';
    const resolvedCsPrime =
      typeof csOptions?.csPrime === 'boolean' ? csOptions.csPrime : true;

    // Kaydet
    const account = await Account.create({
      riotId: normalizedRiotId,
      username: cleanUsername,
      puuid,
      summonerName: gameName,
      platform: resolvedPlatform,
      status: 'available',
      game: cleanGame,
      category: cleanCategory,
      level: resolvedLevel,
      rank: resolvedRank,
      avatarUrl: resolvedAvatarUrl || undefined,
      notes: autoNotes || undefined,
      csDropTracked: resolvedCsDropTracked,
      csLastDropAt: resolvedCsLastDropAt,
      csTotalDrops: resolvedCsTotalDrops,
      csLastCaseName: resolvedCsLastCaseName,
      csPrime: resolvedCsPrime,
      lastCheckedAt: new Date(),
    });

    revalidatePath('/');
    revalidatePath('/platform');

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

export interface UpdateAccountPayload {
  riotId?: string;
  username?: string;
  platform?: string;
  game?: string;
  category?: string;
  status?: AccountStatus;
  level?: number;
  rank?: string;
  notes?: string;
  avatarUrl?: string;
  csDropTracked?: boolean;
  csLastDropAt?: Date | string | null;
  csTotalDrops?: number;
  csLastCaseName?: string;
  csPrime?: boolean;
}

/**
 * Hesabın tüm veya belirli alanlarını platforma göre günceller.
 */
export async function updateAccount(
  id: string,
  payload: UpdateAccountPayload
): Promise<{ success: boolean; error?: string; account?: AccountData }> {
  try {
    await dbConnect();

    const existing = await Account.findById(id);
    if (!existing) {
      return { success: false, error: 'Hesap bulunamadı.' };
    }

    const updates: Record<string, unknown> = {};

    if (payload.riotId !== undefined) {
      const cleanName = sanitizeRiotId(payload.riotId);
      if (!cleanName) {
        return { success: false, error: 'Hesap adı boş olamaz.' };
      }
      const dup = await Account.findOne({
        _id: { $ne: id },
        riotId: {
          $regex: new RegExp(
            `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i'
          ),
        },
      }).lean();
      if (dup) {
        return {
          success: false,
          error: `"${cleanName}" adında başka bir hesap zaten mevcut.`,
        };
      }
      updates.riotId = cleanName;
      updates.summonerName = cleanName.includes('#')
        ? cleanName.split('#')[0]
        : cleanName;
    }

    if (payload.username !== undefined) {
      updates.username = sanitizeRiotId(payload.username);
    }

    if (payload.platform !== undefined) {
      updates.platform = payload.platform.trim();
    }

    if (payload.game !== undefined) {
      updates.game = payload.game.toLowerCase().trim();
    }

    if (payload.category !== undefined) {
      updates.category = payload.category.trim();
    }

    if (payload.status !== undefined) {
      updates.status = payload.status;
    }

    if (payload.level !== undefined && !isNaN(Number(payload.level))) {
      updates.level = Math.max(0, Number(payload.level));
    }

    if (payload.rank !== undefined) {
      updates.rank = payload.rank.trim() || 'UNRANKED';
    }

    if (payload.notes !== undefined) {
      updates.notes = payload.notes.trim();
    }

    if (payload.avatarUrl !== undefined) {
      updates.avatarUrl = payload.avatarUrl.trim();
    }

    if (typeof payload.csDropTracked === 'boolean') {
      updates.csDropTracked = payload.csDropTracked;
    }

    if (payload.csLastDropAt !== undefined) {
      updates.csLastDropAt = payload.csLastDropAt ? new Date(payload.csLastDropAt) : null;
    }

    if (payload.csTotalDrops !== undefined && !isNaN(Number(payload.csTotalDrops))) {
      updates.csTotalDrops = Math.max(0, Number(payload.csTotalDrops));
    }

    if (payload.csLastCaseName !== undefined) {
      updates.csLastCaseName = payload.csLastCaseName.trim();
    }

    if (typeof payload.csPrime === 'boolean') {
      updates.csPrime = payload.csPrime;
    }

    const updated = await Account.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean<IAccount>();

    if (!updated) {
      return { success: false, error: 'Hesap güncellenemedi.' };
    }

    revalidatePath('/');
    revalidatePath('/platform');
    revalidatePath(`/accounts/${id}`);

    return {
      success: true,
      account: {
        ...updated,
        _id: String((updated as IAccount & { _id: unknown })._id),
      } as AccountData,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata.';
    return { success: false, error: message };
  }
}

/**
 * Hesabın adını / Riot ID bilgisini günceller.
 */
export async function updateAccountName(
  id: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  return updateAccount(id, { riotId: name });
}

/**
 * Hesabın seviyesini günceller.
 */
export async function updateAccountLevel(
  id: string,
  level: number
): Promise<{ success: boolean; error?: string }> {
  return updateAccount(id, { level });
}

/**
 * Hesabın lig / rank bilgisini günceller.
 */
export async function updateAccountRank(
  id: string,
  rank: string
): Promise<{ success: boolean; error?: string }> {
  return updateAccount(id, { rank });
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

/**
 * CS2 Haftalık Kasa Düşürme (Drop Claim) durumunu tek tıkla işaretler veya geri alır.
 */
export async function toggleCs2DropClaim(
  id: string,
  claimed: boolean,
  caseName?: string
): Promise<{ success: boolean; error?: string; account?: AccountData }> {
  try {
    await dbConnect();
    const existing = await Account.findById(id).lean<IAccount>();
    if (!existing) {
      return { success: false, error: 'Hesap bulunamadı.' };
    }

    const currentTotal =
      typeof existing.csTotalDrops === 'number' ? existing.csTotalDrops : 0;

    const updates: Record<string, unknown> = {
      csDropTracked: true,
      csLastDropAt: claimed ? new Date() : null,
      csTotalDrops: claimed ? currentTotal + 1 : Math.max(0, currentTotal - 1),
    };

    if (caseName !== undefined) {
      updates.csLastCaseName = caseName.trim();
    }

    const updated = await Account.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean<IAccount>();

    revalidatePath('/');
    revalidatePath('/platform');
    revalidatePath(`/accounts/${id}`);

    return {
      success: true,
      account: updated
        ? ({
            ...updated,
            _id: String((updated as IAccount & { _id: unknown })._id),
          } as AccountData)
        : undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Kasa durumu güncellenemedi.';
    return { success: false, error: message };
  }
}

