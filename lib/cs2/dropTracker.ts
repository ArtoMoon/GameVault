/**
 * CS2 Haftalık Kasa / Care Package Drop Takip Yardımcıları.
 *
 * Counter-Strike 2 haftalık drop hakları her Çarşamba 01:00 UTC
 * (Türkiye saati ile Çarşamba 04:00 GMT+3) itibarıyla sıfırlanır.
 */

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

/**
 * İçinde bulunduğumuz haftanın CS2 drop sıfırlanma başlangıç zamanını (Çarşamba 01:00 UTC) döner.
 */
export function getCurrentCs2ResetTime(now: Date = new Date()): Date {
  const current = new Date(now);
  const utcDay = current.getUTCDay(); // 0 = Pazar, 3 = Çarşamba
  const utcHour = current.getUTCHours();

  // Çarşamba (3) günü saat 01:00 UTC'den önceysek bir önceki haftanın Çarşambasını baz al
  let daysSinceReset = (utcDay - 3 + 7) % 7;
  if (daysSinceReset === 0 && utcHour < 1) {
    daysSinceReset = 7;
  }

  const resetDate = new Date(
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

  return resetDate;
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
 * Verilen son kasa alınma tarihinin bu haftaki sıfırlanmadan sonra olup olmadığını kontrol eder.
 * `true` ise bu haftanın kasası zaten alınmış demektir.
 * `false` ise yeni hafta başlamış veya henüz alınmamış (Kasa Hazır!) demektir.
 */
export function hasClaimedCs2DropThisWeek(
  csLastDropAt?: Date | string | null,
  now: Date = new Date()
): boolean {
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
