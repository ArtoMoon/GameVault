'use server';

import { revalidatePath } from 'next/cache';
import connectMongo from '@/lib/db/mongoose';
import Platform, { IPlatformGame } from '@/models/Platform';

export interface PlatformGameData {
  slug: string;
  name: string;
  icon: string;
  description?: string;
}

export interface PlatformData {
  _id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  games: PlatformGameData[];
  isDefault?: boolean;
}

const DEFAULT_PLATFORMS = [
  {
    slug: 'riot',
    name: 'Riot Games',
    icon: '🔴',
    color: '#ef4444',
    description: 'League of Legends, Valorant ve TFT istemcisi.',
    isDefault: true,
    games: [
      { slug: 'lol', name: 'League of Legends', icon: '⚔️', description: 'Solo/Duo & Esnek ligleri, canlı LP ve son maç takibi.' },
      { slug: 'valorant', name: 'Valorant', icon: '🎯', description: 'Riot ID, sunucu bölgeleri ve istemci giriş notları.' },
      { slug: 'tft', name: 'Teamfight Tactics', icon: '♟️', description: 'Taktik Savaşları ligleri, stratejiler ve hesap takibi.' },
    ],
  },
  {
    slug: 'steam',
    name: 'Steam',
    icon: '💨',
    color: '#38bdf8',
    description: 'Valve Steam oyun kütüphanesi hesapları.',
    isDefault: true,
    games: [
      { slug: 'cs2', name: 'Counter-Strike 2', icon: '🔫', description: 'CS2 hesapları, Premier rating ve Steam girişleri.' },
      { slug: 'dota2', name: 'Dota 2', icon: '🛡️', description: 'Dota 2 MMR ve smurf hesap takibi.' },
    ],
  },
  {
    slug: 'epic',
    name: 'Epic Games',
    icon: '⚡',
    color: '#f59e0b',
    description: 'Epic Games Store hesapları ve kütüphane.',
    isDefault: true,
    games: [
      { slug: 'fortnite', name: 'Fortnite', icon: '⛏️', description: 'Fortnite hesapları ve Battle Pass takibi.' },
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
 * Tüm platformları getirir. Veritabanı boşsa varsayılan platformları ekler.
 */
export async function getPlatforms(): Promise<PlatformData[]> {
  try {
    await connectMongo();

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

    const docs = await Platform.find({})
      .sort({ isDefault: -1, createdAt: 1 })
      .lean();

    return docs.map((d) => ({
      _id: String(d._id),
      slug: d.slug,
      name: d.name,
      icon: d.icon || '🎮',
      color: d.color || '#3b82f6',
      description: d.description || '',
      games: (d.games || []).map((g: IPlatformGame) => ({
        slug: g.slug,
        name: g.name,
        icon: g.icon || '🎮',
        description: g.description || '',
      })),
      isDefault: d.isDefault ?? false,
    }));
  } catch (err) {
    console.error('[getPlatforms] Hata:', err);
    return DEFAULT_PLATFORMS.map((d, i) => ({
      _id: `fallback-${i}`,
      ...d,
    }));
  }
}

/**
 * Yeni platform ekler.
 */
export async function createPlatform(
  name: string,
  icon = '🎮',
  color = '#3b82f6',
  description = '',
  initialGameName = '',
  initialGameIcon = '🎮'
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

    const games: IPlatformGame[] = [];
    if (initialGameName.trim()) {
      const gSlug = slugify(initialGameName.trim());
      games.push({
        name: initialGameName.trim(),
        slug: gSlug || 'game-1',
        icon: initialGameIcon.trim() || '🎮',
        description: '',
      });
    }

    const created = await Platform.create({
      slug,
      name: trimmed,
      icon: icon.trim() || '🎮',
      color: color.trim() || '#3b82f6',
      description: description.trim(),
      games,
      isDefault: false,
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
        isDefault: created.isDefault,
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
  gameDesc = ''
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

    p.games.push({
      slug: gSlug,
      name: trimmedName,
      icon: gameIcon.trim() || '🎮',
      description: gameDesc.trim(),
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
