'use server';

import { revalidatePath } from 'next/cache';
import connectMongo from '@/lib/db/mongoose';
import Platform, { IPlatformGame, PlatformApiType } from '@/models/Platform';
import Setting from '@/models/Setting';

export interface PlatformGameData {
  slug: string;
  name: string;
  icon: string;
  description?: string;
  apiType?: PlatformApiType;
}

export interface PlatformData {
  _id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  games: PlatformGameData[];
  apiType?: PlatformApiType;
  isDefault?: boolean;
  order?: number;
}

const DEFAULT_PLATFORMS = [
  {
    slug: 'riot',
    name: 'Riot Games',
    icon: '🔴',
    color: '#ef4444',
    description: 'League of Legends, Valorant ve TFT istemcisi.',
    isDefault: true,
    order: 0,
    apiType: 'riot' as PlatformApiType,
    games: [
      { slug: 'lol', name: 'League of Legends', icon: '⚔️', apiType: 'riot' as PlatformApiType, description: 'Solo/Duo & Esnek ligleri, canlı LP ve son maç takibi.' },
      { slug: 'valorant', name: 'Valorant', icon: '🎯', apiType: 'riot' as PlatformApiType, description: 'Riot ID, sunucu bölgeleri ve istemci giriş notları.' },
      { slug: 'tft', name: 'Teamfight Tactics', icon: '♟️', apiType: 'riot' as PlatformApiType, description: 'Taktik Savaşları ligleri, stratejiler ve hesap takibi.' },
    ],
  },
  {
    slug: 'steam',
    name: 'Steam',
    icon: '💨',
    color: '#38bdf8',
    description: 'Valve Steam oyun kütüphanesi hesapları.',
    isDefault: true,
    order: 1,
    apiType: 'steam' as PlatformApiType,
    games: [
      { slug: 'cs2', name: 'Counter-Strike 2', icon: '🔫', apiType: 'steam' as PlatformApiType, description: 'CS2 hesapları, Premier rating ve Steam girişleri.' },
      { slug: 'dota2', name: 'Dota 2', icon: '🛡️', apiType: 'steam' as PlatformApiType, description: 'Dota 2 MMR ve smurf hesap takibi.' },
    ],
  },
  {
    slug: 'epic',
    name: 'Epic Games',
    icon: '⚡',
    color: '#f59e0b',
    description: 'Epic Games Store hesapları ve kütüphane.',
    isDefault: true,
    order: 2,
    apiType: 'manual' as PlatformApiType,
    games: [
      { slug: 'fortnite', name: 'Fortnite', icon: '⛏️', apiType: 'manual' as PlatformApiType, description: 'Fortnite hesapları ve Battle Pass takibi.' },
    ],
  },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Tüm platformları getirir.
 */
export async function getPlatforms(): Promise<PlatformData[]> {
  try {
    await connectMongo();

    const seedSetting = await Setting.findOne({ key: 'platforms_seeded' });
    if (!seedSetting) {
      const count = await Platform.countDocuments({});
      if (count === 0) {
        for (const def of DEFAULT_PLATFORMS) {
          await Platform.updateOne(
            { slug: def.slug },
            { $setOnInsert: def },
            { upsert: true }
          );
        }
      }
      await Setting.create({ key: 'platforms_seeded', value: 'true' });
    }

    const docs = await Platform.find({})
      .sort({ order: 1, isDefault: -1, createdAt: 1 })
      .lean();

    // Eğer henüz order alanı bulunmayan dokümanlar varsa otomatik sıralama ataması yap
    const hasUnordered = docs.some((d) => typeof d.order !== 'number');
    if (hasUnordered) {
      const updates = docs.map((d, index) => ({
        updateOne: {
          filter: { _id: d._id },
          update: { $set: { order: index } },
        },
      }));
      if (updates.length > 0) {
        await Platform.bulkWrite(updates);
      }
      docs.forEach((d, index) => {
        d.order = index;
      });
    }

    return docs.map((d) => {
      const pApiType: PlatformApiType =
        d.apiType ||
        (d.slug === 'riot'
          ? 'riot'
          : d.slug.includes('albion')
          ? 'albion'
          : d.slug === 'steam'
          ? 'steam'
          : 'manual');

      return {
        _id: String(d._id),
        slug: d.slug,
        name: d.name,
        icon: d.icon || '🎮',
        color: d.color || '#3b82f6',
        description: d.description || '',
        apiType: pApiType,
        games: (d.games || []).map((g: IPlatformGame) => ({
          slug: g.slug,
          name: g.name,
          icon: g.icon || '🎮',
          description: g.description || '',
          apiType: g.apiType || (g.slug.includes('albion') ? 'albion' : pApiType),
        })),
        isDefault: d.isDefault ?? false,
        order: typeof d.order === 'number' ? d.order : 0,
      };
    });
  } catch (err) {
    console.error('[getPlatforms] Hata:', err);
    return DEFAULT_PLATFORMS.map((d, i) => ({
      _id: `fallback-${i}`,
      ...d,
    }));
  }
}

/**
 * Platformların sıralamasını günceller.
 */
export async function reorderPlatforms(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectMongo();
    if (!orderedIds || orderedIds.length === 0) {
      return { success: false, error: 'Sıralama verisi boş olamaz.' };
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index } },
      },
    }));

    await Platform.bulkWrite(bulkOps);

    revalidatePath('/platform');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sıralama güncellenemedi.';
    return { success: false, error: message };
  }
}

/**
 * Platform bilgilerini düzenler.
 */
export async function updatePlatform(
  id: string,
  updates: {
    name?: string;
    icon?: string;
    color?: string;
    description?: string;
    apiType?: PlatformApiType;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectMongo();
    const p = await Platform.findById(id);
    if (!p) {
      return { success: false, error: 'Platform bulunamadı.' };
    }

    if (updates.name !== undefined && updates.name.trim()) {
      p.name = updates.name.trim();
    }
    if (updates.icon !== undefined && updates.icon.trim()) {
      p.icon = updates.icon.trim();
    }
    if (updates.color !== undefined && updates.color.trim()) {
      p.color = updates.color.trim();
    }
    if (updates.description !== undefined) {
      p.description = updates.description.trim();
    }
    if (updates.apiType !== undefined) {
      p.apiType = updates.apiType;
    }

    await p.save();

    revalidatePath('/platform');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Platform güncellenemedi.';
    return { success: false, error: message };
  }
}

/**
 * Yeni platform ekler (API Şeması desteğiyle).
 */
export async function createPlatform(
  name: string,
  icon = '🎮',
  color = '#3b82f6',
  description = '',
  initialGameName = '',
  initialGameIcon = '🎮',
  gamesList?: { name: string; slug?: string; icon?: string; description?: string; apiType?: PlatformApiType }[],
  apiType: PlatformApiType = 'manual'
): Promise<{ success: boolean; platform?: PlatformData; error?: string }> {
  try {
    await connectMongo();

    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Platform adı gereklidir.' };
    }

    let slug = slugify(trimmed);
    if (!slug) slug = `platform-${Date.now()}`;

    const existing = await Platform.findOne({ slug });
    if (existing) {
      return { success: false, error: `"${trimmed}" platformu veya benzeri zaten mevcut!` };
    }

    // Albion veya Riot adı içeriyorsa otomatik API şeması ata
    const effectiveApiType: PlatformApiType =
      apiType !== 'manual'
        ? apiType
        : slug.includes('albion')
        ? 'albion'
        : slug.includes('riot')
        ? 'riot'
        : slug.includes('steam')
        ? 'steam'
        : 'manual';

    const games: IPlatformGame[] = [];
    if (Array.isArray(gamesList) && gamesList.length > 0) {
      for (const g of gamesList) {
        const gTrimmed = (g.name || '').trim();
        if (gTrimmed) {
          const gSlug = g.slug ? slugify(g.slug) : slugify(gTrimmed);
          games.push({
            name: gTrimmed,
            slug: gSlug || `game-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            icon: (g.icon || '🎮').trim(),
            description: (g.description || '').trim(),
            apiType: g.apiType || effectiveApiType,
          });
        }
      }
    } else if (initialGameName.trim()) {
      const gSlug = slugify(initialGameName.trim());
      games.push({
        name: initialGameName.trim(),
        slug: gSlug || 'game-1',
        icon: initialGameIcon.trim() || '🎮',
        description: '',
        apiType: effectiveApiType,
      });
    }

    const maxDoc = await Platform.findOne({}).sort({ order: -1 }).lean();
    const newOrder = maxDoc && typeof maxDoc.order === 'number' ? maxDoc.order + 1 : 100;

    const created = await Platform.create({
      slug,
      name: trimmed,
      icon: icon.trim() || '🎮',
      color: color.trim() || '#3b82f6',
      description: description.trim(),
      games,
      apiType: effectiveApiType,
      isDefault: false,
      order: newOrder,
    });

    revalidatePath('/platform');
    revalidatePath('/');

    return {
      success: true,
      platform: {
        _id: String(created._id),
        slug: created.slug,
        name: created.name,
        icon: created.icon,
        color: created.color,
        description: created.description,
        games: created.games,
        apiType: created.apiType,
        isDefault: created.isDefault,
        order: created.order,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Platform eklenirken bir hata oluştu.';
    return { success: false, error: message };
  }
}

/**
 * Mevcut bir platforma yeni oyun ekler.
 */
export async function addGameToPlatform(
  platformSlug: string,
  gameName: string,
  gameIcon = '🎮',
  gameDesc = '',
  gameApiType?: PlatformApiType
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectMongo();

    const p = await Platform.findOne({ slug: platformSlug });
    if (!p) {
      return { success: false, error: 'Platform bulunamadı.' };
    }

    const trimmedName = gameName.trim();
    if (!trimmedName) {
      return { success: false, error: 'Oyun adı gereklidir.' };
    }

    const gSlug = slugify(trimmedName);
    const alreadyExists = p.games.some((g) => g.slug === gSlug);
    if (alreadyExists) {
      return { success: false, error: 'Bu oyun bu platformda zaten ekli.' };
    }

    const effectiveApi =
      gameApiType ||
      (gSlug.includes('albion')
        ? 'albion'
        : p.apiType || (p.slug.includes('albion') ? 'albion' : 'manual'));

    p.games.push({
      slug: gSlug,
      name: trimmedName,
      icon: gameIcon.trim() || '🎮',
      description: gameDesc.trim(),
      apiType: effectiveApi,
    });

    await p.save();

    revalidatePath('/platform');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Oyun eklenemedi.';
    return { success: false, error: message };
  }
}

/**
 * Platform siler.
 */
export async function deletePlatform(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await connectMongo();
    await Platform.findByIdAndDelete(id);

    revalidatePath('/platform');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Platform silinemedi.';
    return { success: false, error: message };
  }
}

/**
 * Varsayılan sistem platformlarını (Riot, Steam, Epic) geri yükler / ekler.
 */
export async function restoreDefaultPlatforms(): Promise<{ success: boolean; error?: string }> {
  try {
    await connectMongo();
    for (const def of DEFAULT_PLATFORMS) {
      const existing = await Platform.findOne({ slug: def.slug });
      if (!existing) {
        const maxDoc = await Platform.findOne({}).sort({ order: -1 }).lean();
        const nextOrder = maxDoc && typeof maxDoc.order === 'number' ? maxDoc.order + 1 : 100;
        await Platform.create({
          ...def,
          order: nextOrder,
        });
      }
    }

    revalidatePath('/platform');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Varsayılan platformlar geri yüklenemedi.';
    return { success: false, error: message };
  }
}
