/**
 * CS2 Haftalık Kasa / Care Package Drop Takip ve Haftalık Geçmiş Sistemi.
 *
 * Counter-Strike 2 haftalık drop hakları her Çarşamba 01:00 UTC
 * (Türkiye saati ile Çarşamba 04:00 GMT+3) itibarıyla sıfırlanır.
 * Her yeni Çarşamba geldiğinde mevcut hafta otomatik olarak yeni haftaya geçer
 * ve önceki haftalarda alınan kasalar haftalık geçmişte ("Geçen Hafta", "2 Hafta Önce" vb.) görünür.
 */

export interface Cs2DropRecord {
  /** Haftanın Çarşamba başlangıç anahtarı (Örn: "2026-11-04") */
  weekKey: string;
  /** Okunabilir hafta aralığı (Örn: "4 Kas – 11 Kas") */
  weekLabel: string;
  /** O hafta düşürülen kasa / eşya adı */
  caseName: string;
  /** İşaretlenme zamanı (ISO) */
  claimedAt: string;
}

export interface Cs2WeekSlot {
  weekKey: string;
  title: string; // "Bu Hafta", "Geçen Hafta", "2 Hafta Önce", "3 Hafta Önce"
  shortTitle: string; // "Bu Hf.", "Geçen Hf.", "2 Hf. Önce", "3 Hf. Önce"
  dateRangeLabel: string; // "4 Kas - 11 Kas"
  startDate: Date;
  endDate: Date;
  isCurrentWeek: boolean;
}

export const CS2_POPULAR_CASES = [
  'Kilowatt Case',
  'Gallery Case',
  'Dreams & Nightmares Case',
  'Revolution Case',
  'Recoil Case',
  'Fracture Case',
  'Snakebite Case',
  'Weapon Case / Nadir Drop',
];

const TR_MONTHS_SHORT = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

function formatShortDayMonth(d: Date): string {
  return `${d.getUTCDate()} ${TR_MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function toWeekKey(resetDate: Date): string {
  const y = resetDate.getUTCFullYear();
  const m = String(resetDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(resetDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Verilen tarihin ait olduğu CS2 haftasının Çarşamba 01:00 UTC başlangıç zamanını döner.
 */
export function getCurrentCs2ResetTime(now: Date = new Date()): Date {
  const current = new Date(now);
  const utcDay = current.getUTCDay(); // 0 = Pazar, 3 = Çarşamba
  const utcHour = current.getUTCHours();

  let daysSinceReset = (utcDay - 3 + 7) % 7;
  if (daysSinceReset === 0 && utcHour < 1) {
    daysSinceReset = 7;
  }

  return new Date(
    Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate() - daysSinceReset,
      1, // 01:00 UTC = 04:00 TSİ
      0,
      0,
      0
    )
  );
}

/**
 * Bir sonraki CS2 haftalık drop sıfırlanma zamanını (gelecek Çarşamba 01:00 UTC) döner.
 */
export function getNextCs2ResetTime(now: Date = new Date()): Date {
  const lastReset = getCurrentCs2ResetTime(now);
  return new Date(lastReset.getTime() + 7 * 24 * 60 * 60 * 1000);
}

/**
 * Bir sonraki Çarşamba sıfırlanmasına kalan süreyi okunabilir metin olarak döner.
 */
export function formatTimeUntilNextCs2Reset(now: Date = new Date()): string {
  const nextReset = getNextCs2ResetTime(now);
  const diffMs = Math.max(0, nextReset.getTime() - now.getTime());
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}g ${hours}s`;
  }
  if (hours > 0) {
    return `${hours}s ${mins}dk`;
  }
  return `${mins}dk`;
}

/**
 * Son N haftanın (Bu Hafta, Geçen Hafta, 2 Hafta Önce...) CS2 hafta dilimlerini döner.
 */
export function getRecentCs2Weeks(count = 4, now: Date = new Date()): Cs2WeekSlot[] {
  const currentStart = getCurrentCs2ResetTime(now);
  const slots: Cs2WeekSlot[] = [];

  for (let i = 0; i < count; i++) {
    const startDate = new Date(currentStart.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekKey = toWeekKey(startDate);
    const dateRangeLabel = `${formatShortDayMonth(startDate)} – ${formatShortDayMonth(endDate)}`;

    const title =
      i === 0
        ? 'Bu Hafta'
        : i === 1
        ? 'Geçen Hafta'
        : `${i} Hafta Önce`;

    const shortTitle =
      i === 0
        ? 'Bu Hafta'
        : i === 1
        ? 'Geçen Hf.'
        : `${i} Hf. Önce`;

    slots.push({
      weekKey,
      title,
      shortTitle,
      dateRangeLabel,
      startDate,
      endDate,
      isCurrentWeek: i === 0,
    });
  }

  return slots;
}

/**
 * Hesabın belirli bir hafta anahtarı (`weekKey`) için kasa kaydını bulur.
 */
export function getDropRecordForWeek(
  account: {
    csLastDropAt?: Date | string | null;
    csLastCaseName?: string;
    csDropHistory?: Cs2DropRecord[];
  },
  weekKey: string
): Cs2DropRecord | null {
  const history = Array.isArray(account.csDropHistory) ? account.csDropHistory : [];
  const found = history.find((h) => h && h.weekKey === weekKey);
  if (found) return found;

  // Geriye dönük uyumluluk: csLastDropAt varsa ve o haftaya denk geliyorsa
  if (account.csLastDropAt) {
    const d = new Date(account.csLastDropAt);
    if (!isNaN(d.getTime()) && d.getTime() > 0) {
      const dropWeekStart = getCurrentCs2ResetTime(d);
      const dropWeekKey = toWeekKey(dropWeekStart);
      if (dropWeekKey === weekKey) {
        const endDate = new Date(dropWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        return {
          weekKey,
          weekLabel: `${formatShortDayMonth(dropWeekStart)} – ${formatShortDayMonth(endDate)}`,
          caseName: account.csLastCaseName || 'Kasa Alındı',
          claimedAt: d.toISOString(),
        };
      }
    }
  }

  return null;
}

/**
 * Bu haftanın kasasının alınıp alınmadığını döner.
 */
export function hasClaimedCs2DropThisWeek(
  csLastDropAt?: Date | string | null,
  now: Date = new Date(),
  csDropHistory?: Cs2DropRecord[]
): boolean {
  const currentWeekKey = toWeekKey(getCurrentCs2ResetTime(now));
  if (Array.isArray(csDropHistory) && csDropHistory.some((h) => h?.weekKey === currentWeekKey)) {
    return true;
  }
  if (!csLastDropAt) return false;
  const dropDate = new Date(csLastDropAt);
  if (isNaN(dropDate.getTime()) || dropDate.getTime() <= 0) return false;

  const currentReset = getCurrentCs2ResetTime(now);
  return dropDate.getTime() >= currentReset.getTime();
}

/**
 * Hesabın CS2 kasa takibine dahil olup olmadığını belirler.
 */
export function isAccountCs2DropTracked(account: {
  game?: string;
  csDropTracked?: boolean;
}): boolean {
  if (typeof account.csDropTracked === 'boolean') {
    return account.csDropTracked;
  }
  return (account.game || '').toLowerCase() === 'cs2';
}
