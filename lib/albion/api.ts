/**
 * Albion Online Gameinfo API İstemcisi
 *
 * Albion Online'ın resmi killboard altyapısı (gameinfo API) üzerinden
 * karakter sorgulama, Guild, Alliance, PvP Kill Fame, PvE Fame,
 * Crafting ve Gathering istatistiklerini çeker.
 * Herhangi bir API anahtarı gerektirmez (halka açıktır).
 */

export interface AlbionCharacterData {
  id: string;
  name: string;
  guildId?: string;
  guildName?: string;
  allianceName?: string;
  avatarId?: string;
  ringId?: string;
  avatarUrl: string;
  ringUrl?: string;
  killFame: number;
  deathFame: number;
  fameRatio: number;
  pveTotal: number;
  craftingTotal: number;
  gatheringTotal: number;
  totalFame: number;
  formattedFame: string;
  suggestedRank: string;
  calculatedLevel: number;
}

/**
 * Bölge adına göre Albion Gameinfo API uç noktasını döner.
 */
export function getAlbionBaseUrl(region?: string): string {
  const norm = (region || '').toLowerCase().trim();
  if (norm.includes('europe') || norm.includes('eu') || norm.includes('ams')) {
    return 'https://gameinfo-ams.albiononline.com/api/gameinfo';
  }
  if (norm.includes('asia') || norm.includes('sgp') || norm.includes('sg')) {
    return 'https://gameinfo-sgp.albiononline.com/api/gameinfo';
  }
  // Default: Americas (US)
  return 'https://gameinfo.albiononline.com/api/gameinfo';
}

/**
 * Sayıyı okunabilir Fame formatına çevirir (örn: 15.4M, 850K).
 */
export function formatFame(fame: number): string {
  if (fame >= 1_000_000_000) {
    return `${(fame / 1_000_000_000).toFixed(1)}B`;
  }
  if (fame >= 1_000_000) {
    return `${(fame / 1_000_000).toFixed(1)}M`;
  }
  if (fame >= 1_000) {
    return `${(fame / 1_000).toFixed(0)}K`;
  }
  return String(fame);
}

/**
 * Toplam Fame'e göre tahmini seviye ve Tier derecesi hesaplar.
 */
export function calculateAlbionTierAndLevel(totalFame: number, guildName?: string): { rank: string; level: number } {
  let rank = 'Tier 4 (Adept)';
  let level = 1;

  if (totalFame >= 100_000_000) {
    rank = 'Tier 8 (Elder)';
    level = Math.min(100, Math.floor(totalFame / 2_000_000));
  } else if (totalFame >= 40_000_000) {
    rank = 'Tier 7 (Grandmaster)';
    level = Math.floor(totalFame / 1_000_000);
  } else if (totalFame >= 15_000_000) {
    rank = 'Tier 6 (Master)';
    level = Math.floor(totalFame / 600_000);
  } else if (totalFame >= 3_000_000) {
    rank = 'Tier 5 (Expert)';
    level = Math.floor(totalFame / 300_000);
  } else if (totalFame >= 500_000) {
    rank = 'Tier 4 (Adept)';
    level = Math.max(1, Math.floor(totalFame / 100_000));
  } else {
    rank = 'Tier 3 (Journeyman)';
    level = 1;
  }

  if (guildName) {
    rank = `[${guildName}] ${rank}`;
  }

  return { rank, level };
}

/**
 * Karakter adını ve sunucusunu kullanarak Albion API'den karakter bilgilerini çeker.
 */
export async function fetchAlbionCharacter(
  characterName: string,
  region?: string
): Promise<{ success: boolean; data?: AlbionCharacterData; error?: string }> {
  try {
    const cleanName = characterName.trim();
    if (!cleanName) {
      return { success: false, error: 'Karakter adı boş olamaz.' };
    }

    const baseUrl = getAlbionBaseUrl(region);
    const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(cleanName)}`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });

    if (!searchRes.ok) {
      return {
        success: false,
        error: `Albion API yanıt vermedi (${searchRes.status}). Sunucu geçici olarak yoğun olabilir.`,
      };
    }

    const searchData = (await searchRes.json()) as {
      players?: Array<{
        Id: string;
        Name: string;
        GuildId?: string;
        GuildName?: string | null;
        AllianceName?: string | null;
        Avatar?: string;
        AvatarRing?: string;
        KillFame?: number;
        DeathFame?: number;
        FameRatio?: number;
      }>;
    };

    if (!searchData.players || searchData.players.length === 0) {
      return {
        success: false,
        error: `"${cleanName}" adında bir karakter ${region || 'Albion'} sunucusunda bulunamadı.`,
      };
    }

    // Tam veya en yakın eşleşmeyi bul (birden fazla varsa avatarı veya fame'i olanı önceliklendir)
    const matchingPlayers = searchData.players.filter(
      (p) => p.Name.toLowerCase() === cleanName.toLowerCase()
    );
    let exactMatch = searchData.players[0];
    if (matchingPlayers.length > 0) {
      exactMatch = matchingPlayers.sort((a, b) => {
        if (a.Avatar && !b.Avatar) return -1;
        if (!a.Avatar && b.Avatar) return 1;
        const fameA = (a.KillFame || 0) + (a.DeathFame || 0);
        const fameB = (b.KillFame || 0) + (b.DeathFame || 0);
        return fameB - fameA;
      })[0];
    }

    // Detaylı oyuncu bilgilerini çek
    const detailUrl = `${baseUrl}/players/${exactMatch.Id}`;
    const detailRes = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });

    let pveTotal = 0;
    let craftingTotal = 0;
    let gatheringTotal = 0;
    let guildName = exactMatch.GuildName || '';
    let allianceName = exactMatch.AllianceName || '';
    let avatarId = exactMatch.Avatar || '';
    let ringId = exactMatch.AvatarRing || '';

    if (detailRes.ok) {
      const detailData = await detailRes.json();
      guildName = detailData.GuildName || guildName;
      allianceName = detailData.AllianceName || allianceName;
      avatarId = detailData.Avatar || avatarId;
      ringId = detailData.AvatarRing || ringId;
      pveTotal = detailData.LifetimeStatistics?.PvE?.Total || 0;
      craftingTotal = detailData.LifetimeStatistics?.Crafting?.Total || 0;
      gatheringTotal = detailData.LifetimeStatistics?.Gathering?.All?.Total || 0;
    }

    // Albion avatar kimliği yoksa varsayılan karizmatik bir avatar ata
    if (!avatarId) {
      avatarId = 'AVATAR_07';
    }

    const avatarUrl = `https://albion-log.com/avatars/male/${avatarId}.webp`;
    const ringUrl = ringId ? `https://albion-log.com/rings/${ringId}.webp` : undefined;

    const killFame = exactMatch.KillFame || 0;
    const deathFame = exactMatch.DeathFame || 0;
    const fameRatio = exactMatch.FameRatio || 0;
    const totalFame = killFame + pveTotal + craftingTotal + gatheringTotal;

    const { rank, level } = calculateAlbionTierAndLevel(totalFame, guildName);

    return {
      success: true,
      data: {
        id: exactMatch.Id,
        name: exactMatch.Name,
        guildId: exactMatch.GuildId,
        guildName,
        allianceName,
        avatarId,
        ringId,
        avatarUrl,
        ringUrl,
        killFame,
        deathFame,
        fameRatio,
        pveTotal,
        craftingTotal,
        gatheringTotal,
        totalFame,
        formattedFame: formatFame(totalFame),
        suggestedRank: rank,
        calculatedLevel: level,
      },
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : 'Albion API sorgusu sırasında bilinmeyen bir hata oluştu.';
    return { success: false, error: msg };
  }
}
