'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AccountData } from '@/app/actions/accounts';
import {
  updateAccount,
  updateAccountNotes,
  updateAccountUsername,
  updateAccountStatus,
  updateAccountPlatform,
  updateAccountCategory,
  updateAccountGame,
  toggleCs2DropClaim,
  deleteAccount,
} from '@/app/actions/accounts';
import type { CategoryData } from '@/app/actions/categories';
import type { AccountStatus } from '@/models/Account';
import { syncAccount, syncMatchHistory } from '@/app/actions/accountSync';
import {
  CS2_POPULAR_CASES,
  formatTimeUntilNextCs2Reset,
  getRecentCs2Weeks,
  getDropRecordForWeek,
  hasClaimedCs2DropThisWeek,
  isAccountCs2DropTracked,
} from '@/lib/cs2/dropTracker';
import StatusBadge from '@/components/StatusBadge';
import RankBadge from '@/components/RankBadge';
import PlatformBadge from '@/components/PlatformBadge';
import RiotIdDisplay from '@/components/RiotIdDisplay';
import { ddragon } from '@/lib/riot/ddragon';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import EditAccountModal from '@/components/EditAccountModal';
import type { PlatformData } from '@/app/actions/platforms';

interface AccountDetailClientProps {
  account: AccountData;
  categories?: CategoryData[];
  platforms?: PlatformData[];
}

function calculateWinRate(wins: number, losses: number) {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

const GAME_LABELS: Record<string, string> = {
  albion: '🛡️ Albion Online',
  valorant: '🎯 Valorant',
  tft: '♟️ TFT',
  cs2: '🔫 Counter-Strike 2',
  dota2: '🛡️ Dota 2',
  fortnite: '⛏️ Fortnite',
  other: '🎮 Diğer Oyun',
  lol: '⚔️ League of Legends',
};

const CS2_RANK_PRESETS = [
  'UNRANKED',
  '5,000 CS',
  '10,000 CS',
  '15,000 CS',
  '20,000+ CS',
  'Silver',
  'Gold Nova',
  'Master Guardian',
  'Legendary Eagle',
  'Global Elite',
];

const ALBION_RANK_PRESETS = [
  'Tier 4',
  'Tier 5',
  'Tier 6',
  'Tier 7',
  'Tier 8',
  'Elder',
  'Master',
];

const LOL_RANK_PRESETS = [
  'UNRANKED',
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
];

export default function AccountDetailClient({
  account: initialAccount,
  categories = [],
  platforms = [],
}: AccountDetailClientProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [account, setAccount] = useState<AccountData>(initialAccount);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Satır içi düzenleme state'leri
  const [riotIdInput, setRiotIdInput] = useState(initialAccount.riotId ?? '');
  const [isEditingRiotId, setIsEditingRiotId] = useState(false);

  const [notes, setNotes] = useState(initialAccount.notes ?? '');
  const [username, setUsername] = useState(initialAccount.username ?? '');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isUsernameRevealed, setIsUsernameRevealed] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);

  const [levelInput, setLevelInput] = useState<number>(initialAccount.level ?? 1);
  const [rankInput, setRankInput] = useState<string>(initialAccount.rank || 'UNRANKED');
  const [totalDropsInput, setTotalDropsInput] = useState<number>(
    initialAccount.csTotalDrops ?? 0
  );
  const [selectedCaseName, setSelectedCaseName] = useState<string>(
    initialAccount.csLastCaseName || CS2_POPULAR_CASES[0]
  );
  const [customCaseInput, setCustomCaseInput] = useState<string>('');
  const [weekCaseSelections, setWeekCaseSelections] = useState<Record<string, string>>({});

  const [isPending, startTransition] = useTransition();
  const [isSyncingMatches, startMatchSync] = useTransition();

  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [matchSyncMsg, setMatchSyncMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [platformMsg, setPlatformMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialAccount) {
      setAccount((prev) => ({
        ...prev,
        ...initialAccount,
        matches:
          initialAccount.matches && initialAccount.matches.length > 0
            ? initialAccount.matches
            : prev.matches,
        ranks:
          initialAccount.ranks?.solo || initialAccount.ranks?.flex
            ? initialAccount.ranks
            : prev.ranks,
      }));
      setRiotIdInput(initialAccount.riotId ?? '');
      setNotes(initialAccount.notes ?? '');
      setUsername(initialAccount.username ?? '');
      setLevelInput(initialAccount.level ?? 1);
      setRankInput(initialAccount.rank || 'UNRANKED');
      setTotalDropsInput(initialAccount.csTotalDrops ?? 0);
      if (initialAccount.csLastCaseName) {
        setSelectedCaseName(initialAccount.csLastCaseName);
      }
    }
  }, [initialAccount]);

  const cleanGame = (account.game || 'lol').toLowerCase();
  const isCs2 = cleanGame === 'cs2';
  const isAlbion = cleanGame === 'albion' || cleanGame.includes('albion');
  const isRiotGame = !isCs2 && ['lol', 'valorant', 'tft'].includes(cleanGame);
  const csTracked = isAccountCs2DropTracked(account);
  const csClaimedThisWeek = hasClaimedCs2DropThisWeek(
    account.csLastDropAt,
    new Date(),
    account.csDropHistory
  );
  const recentWeeks = getRecentCs2Weeks(8);
  const dropHistory = Array.isArray(account.csDropHistory)
    ? account.csDropHistory
    : [];

  // Kasa bazlı istatistik dağılımı
  const caseBreakdown: Record<string, number> = {};
  for (const item of dropHistory) {
    if (item?.caseName) {
      caseBreakdown[item.caseName] = (caseBreakdown[item.caseName] || 0) + 1;
    }
  }

  const ranks = account.ranks || { solo: null, flex: null };
  const matches = account.matches || [];
  const profileIconId = account.profileIconId || 1;

  const [logGameName, logTagLine] = account.riotId.split('#');
  const platform = (account.platform || 'TR1').toUpperCase();
  const LOG_REGION: Record<string, string> = {
    TR1: 'tr',
    EUW1: 'euw',
    EUN1: 'eune',
    NA1: 'na1',
    KR: 'kr',
    BR1: 'br1',
    LA1: 'lan',
    LA2: 'las',
    OC1: 'oce',
    JP1: 'jp',
    RU: 'ru',
  };
  const logRegion = LOG_REGION[platform] || platform.toLowerCase();
  const leagueOfGraphsUrl =
    logGameName && logTagLine
      ? `https://www.leagueofgraphs.com/summoner/${logRegion}/${encodeURIComponent(
          logGameName
        )}-${encodeURIComponent(logTagLine)}`
      : null;

  function showToast(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  }

  function handleSaveRiotId() {
    if (!riotIdInput.trim()) return;
    startTransition(async () => {
      const res = await updateAccount(account._id, { riotId: riotIdInput.trim() });
      if (res.success && res.account) {
        setAccount((prev) => ({ ...prev, ...res.account }));
        setIsEditingRiotId(false);
        showToast('✅ Hesap adı güncellendi.');
        router.refresh();
      } else {
        showToast('❌ ' + (res.error || 'Güncellenemedi'));
      }
    });
  }

  function handleSaveLevelAndRank(nextLevel?: number, nextRank?: string) {
    const lv = nextLevel !== undefined ? nextLevel : levelInput;
    const rk = nextRank !== undefined ? nextRank : rankInput;
    setLevelInput(lv);
    setRankInput(rk);
    startTransition(async () => {
      const res = await updateAccount(account._id, {
        level: Math.max(0, Number(lv) || 0),
        rank: rk.trim() || 'UNRANKED',
      });
      if (res.success && res.account) {
        setAccount((prev) => ({ ...prev, ...res.account }));
        showToast('✅ Seviye ve Rank güncellendi.');
        router.refresh();
      }
    });
  }

  function handleToggleCsTracking(nextVal: boolean) {
    setAccount((prev) => ({ ...prev, csDropTracked: nextVal }));
    startTransition(async () => {
      const res = await updateAccount(account._id, { csDropTracked: nextVal });
      if (res.success && res.account) {
        setAccount((prev) => ({ ...prev, ...res.account }));
        showToast(nextVal ? '✅ CS2 Kasa Takibi açıldı.' : 'ℹ️ CS2 Kasa Takibi kapatıldı.');
        router.refresh();
      }
    });
  }

  function handleTogglePrime(nextPrime: boolean) {
    setAccount((prev) => ({ ...prev, csPrime: nextPrime }));
    startTransition(async () => {
      const res = await updateAccount(account._id, { csPrime: nextPrime });
      if (res.success && res.account) {
        setAccount((prev) => ({ ...prev, ...res.account }));
        showToast(nextPrime ? '⭐ Prime Aktif olarak işaretlendi.' : '⚪ Prime Yok olarak işaretlendi.');
        router.refresh();
      }
    });
  }

  function handleSaveTotalDrops(nextTotal: number) {
    const cleanTotal = Math.max(0, Number(nextTotal) || 0);
    setTotalDropsInput(cleanTotal);
    startTransition(async () => {
      const res = await updateAccount(account._id, { csTotalDrops: cleanTotal });
      if (res.success && res.account) {
        setAccount((prev) => ({ ...prev, ...res.account }));
        showToast(`✅ Toplam kasa sayısı (${cleanTotal}) güncellendi.`);
        router.refresh();
      }
    });
  }

  function handleWeekDropAction(
    weekKey: string,
    weekLabel: string,
    claimed: boolean,
    caseNameOverride?: string
  ) {
    const effectiveCase =
      (caseNameOverride ?? customCaseInput.trim()) ||
      selectedCaseName ||
      'Kasa Alındı';

    startTransition(async () => {
      const res = await toggleCs2DropClaim(
        account._id,
        claimed,
        effectiveCase,
        weekKey,
        weekLabel
      );
      if (res.success && res.account) {
        setAccount((prev) => ({ ...prev, ...res.account }));
        setTotalDropsInput(res.account.csTotalDrops ?? 0);
        showToast(
          claimed
            ? `✅ ${weekLabel} haftası için "${effectiveCase}" kaydedildi!`
            : `↩ ${weekLabel} haftası kasa kaydı kaldırıldı.`
        );
        router.refresh();
      } else {
        showToast('❌ ' + (res.error || 'Hata oluştu'));
      }
    });
  }

  function handleStatusChange(newStatus: AccountStatus) {
    const oldStatus = account.status;
    setAccount((prev) => ({ ...prev, status: newStatus }));
    setStatusMsg(null);
    startTransition(async () => {
      const res = await updateAccountStatus(account._id, newStatus);
      if (res.success) {
        showToast(`✅ ${t('status_updated')}`);
        router.refresh();
      } else {
        setAccount((prev) => ({ ...prev, status: oldStatus }));
        showToast('❌ ' + (res.error || 'Failed'));
      }
    });
  }

  function handlePlatformChange(newPlatform: string) {
    const oldPlatform = account.platform;
    setAccount((prev) => ({ ...prev, platform: newPlatform }));
    setPlatformMsg(null);
    startTransition(async () => {
      const res = await updateAccountPlatform(account._id, newPlatform);
      if (res.success) {
        setPlatformMsg('✅ Sunucu / bölge güncellendi.');
        setTimeout(() => setPlatformMsg(null), 4000);
        router.refresh();
      } else {
        setAccount((prev) => ({ ...prev, platform: oldPlatform }));
        setPlatformMsg('❌ ' + (res.error || 'Failed'));
      }
    });
  }

  function handleCategoryChange(newCategory: string) {
    const oldCat = account.category;
    setAccount((prev) => ({ ...prev, category: newCategory }));
    startTransition(async () => {
      const res = await updateAccountCategory(account._id, newCategory);
      if (res.success) {
        showToast('✅ Kategori güncellendi.');
        router.refresh();
      } else {
        setAccount((prev) => ({ ...prev, category: oldCat }));
      }
    });
  }

  function handleGameChange(newGame: string) {
    const oldGame = account.game;
    setAccount((prev) => ({
      ...prev,
      game: newGame,
      ...(newGame.toLowerCase() === 'cs2' ? { csDropTracked: true } : {}),
    }));
    startTransition(async () => {
      const res = await updateAccountGame(account._id, newGame);
      if (res.success) {
        showToast('✅ Oyun modülü güncellendi.');
        router.refresh();
      } else {
        setAccount((prev) => ({ ...prev, game: oldGame }));
      }
    });
  }

  function handleSaveNotes() {
    setSaveMsg(null);
    startTransition(async () => {
      const result = await updateAccountNotes(account._id, notes);
      setSaveMsg(
        result.success
          ? `✅ ${language === 'tr' ? 'Not kaydedildi.' : 'Note saved.'}`
          : `❌ ${result.error}`
      );
    });
  }

  function handleSaveUsername() {
    startTransition(async () => {
      const result = await updateAccountUsername(account._id, username);
      if (result.success) {
        setAccount((prev) => ({ ...prev, username }));
        setIsEditingUsername(false);
        showToast('✅ Giriş kullanıcı adı kaydedildi.');
      }
    });
  }

  function copyUsername() {
    if (!account.username) return;
    navigator.clipboard.writeText(account.username);
    setCopiedUser(true);
    setTimeout(() => setCopiedUser(false), 2000);
  }

  function handleDeleteAccount() {
    if (!confirm(t('delete_confirm'))) return;
    startTransition(async () => {
      const res = await deleteAccount(account._id);
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete account');
      }
    });
  }

  function handleCheck() {
    setCheckMsg(null);
    startTransition(async () => {
      try {
        const result = await syncAccount(account._id);
        if (result.success) {
          if (result.updatedAccount) {
            setAccount((prev) => ({
              ...prev,
              ...result.updatedAccount,
            }));
          }
          const matchCount = result.updatedAccount?.matches?.length ?? 0;
          setCheckMsg(
            matchCount === 0
              ? '✅ Seviye ve rank güncellendi.'
              : `✅ Tüm veriler ve son ${matchCount} maç güncellendi.`
          );
          router.refresh();
          setTimeout(() => setCheckMsg(null), 5000);
        } else {
          setCheckMsg(`Hata: ${result.error}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error';
        setCheckMsg(`Hata: ${msg}`);
      }
    });
  }

  function handleSyncMatches() {
    setMatchSyncMsg(null);
    startMatchSync(async () => {
      try {
        const result = await syncMatchHistory(account._id);
        if (result.success) {
          if (result.updatedAccount) {
            setAccount((prev) => ({
              ...prev,
              ...result.updatedAccount,
            }));
          }
          const matchCount = result.updatedAccount?.matches?.length ?? 0;
          setMatchSyncMsg(
            matchCount === 0
              ? 'ℹ️ Bu hesapta Riot API üzerinde oynanmış maç bulunamadı (0 maç).'
              : `✅ Son ${matchCount} maç ve rank bilgileri başarıyla güncellendi!`
          );
          router.refresh();
          setTimeout(() => setMatchSyncMsg(null), 5000);
        } else {
          setMatchSyncMsg(`❌ Hata: ${result.error}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error';
        setMatchSyncMsg(`❌ Hata: ${msg}`);
      }
    });
  }

  const lastChecked = account.lastCheckedAt
    ? new Date(account.lastCheckedAt).toLocaleString(
        language === 'tr' ? 'tr-TR' : 'en-US'
      )
    : t('never');

  const createdAt = account.createdAt
    ? new Date(account.createdAt).toLocaleDateString(
        language === 'tr' ? 'tr-TR' : 'en-US'
      )
    : '–';

  const wins = matches.filter((m) => m.win).length;
  const recentWinRate =
    matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;
  const avgKills =
    matches.length > 0
      ? (matches.reduce((a, b) => a + b.kills, 0) / matches.length).toFixed(1)
      : 0;
  const avgDeaths =
    matches.length > 0
      ? (matches.reduce((a, b) => a + b.deaths, 0) / matches.length).toFixed(1)
      : 0;
  const avgAssists =
    matches.length > 0
      ? (matches.reduce((a, b) => a + b.assists, 0) / matches.length).toFixed(1)
      : 0;

  const activePresetList = isCs2
    ? CS2_RANK_PRESETS
    : isAlbion
    ? ALBION_RANK_PRESETS
    : LOL_RANK_PRESETS;

  const currentWeekSlot = recentWeeks[0];

  return (
    <div className="space-y-6">
      {/* ── 1. ÜST PROFİL HERO KARTI ── */}
      <div className="card overflow-hidden relative">
        <div
          className="h-28 relative overflow-hidden border-b border-white/[0.06]"
          style={{
            background:
              'radial-gradient(45rem 18rem at 15% 0%, rgba(139, 92, 246, 0.28), transparent 65%), radial-gradient(40rem 16rem at 85% 100%, rgba(6, 182, 212, 0.2), transparent 65%), linear-gradient(180deg, rgba(23, 27, 40, 0.9), rgba(11, 13, 21, 0.95))',
          }}
        >
          <div className="absolute inset-0 opacity-25 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>

        <div className="px-6 pb-6 relative">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 -mt-12">
            {/* Sol: Avatar + Kimlik */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-5 min-w-0">
              <div className="w-24 h-24 rounded-2xl border-2 border-white/15 overflow-hidden bg-ink-850 relative shadow-2xl shrink-0 flex items-center justify-center ring-4 ring-ink-950/70">
                {cleanGame === 'lol' ? (
                  <Image
                    src={ddragon.profileIcon(profileIconId)}
                    alt="Profile Icon"
                    width={96}
                    height={96}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : account.avatarUrl || isAlbion ? (
                  <img
                    src={
                      account.avatarUrl ||
                      'https://albion-log.com/avatars/male/AVATAR_07.webp'
                    }
                    alt="Profile Avatar"
                    className="w-full h-full object-cover scale-[2.2] transform origin-center"
                  />
                ) : (
                  <span className="text-4xl">
                    {cleanGame === 'valorant'
                      ? '🎯'
                      : cleanGame === 'tft'
                      ? '♟️'
                      : isCs2
                      ? '🔫'
                      : '🎮'}
                  </span>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-ink-950/85 backdrop-blur-md text-center text-[11px] font-bold tabular-nums text-accent-300 py-0.5 border-t border-white/10">
                  Lv. {account.level || 1}
                </div>
              </div>

              <div className="min-w-0 space-y-2 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="chip">
                    {GAME_LABELS[cleanGame] || GAME_LABELS.lol}
                  </span>
                  {account.category && (
                    <span className="chip !text-accent-300 !bg-accent-500/10 !border-accent-400/25">
                      🏷️ {account.category}
                    </span>
                  )}
                  <PlatformBadge platform={account.platform} />
                  <StatusBadge status={account.status} />
                  {csTracked && (
                    <span
                      className={`chip font-bold ${
                        csClaimedThisWeek
                          ? '!text-emerald-300 !bg-emerald-500/15 !border-emerald-400/35'
                          : '!text-amber-300 !bg-amber-500/15 !border-amber-400/40'
                      }`}
                    >
                      {csClaimedThisWeek
                        ? '✅ Bu Hafta Kasa Alındı'
                        : '📦 Kasa Hazır (Bekliyor)'}
                    </span>
                  )}
                  {(isCs2 || csTracked) && (
                    <span
                      className={`chip ${
                        account.csPrime !== false
                          ? '!text-emerald-300 !bg-emerald-500/10 !border-emerald-500/25'
                          : '!text-text-muted'
                      }`}
                    >
                      {account.csPrime !== false ? '⭐ Prime Aktif' : '⚪ Prime Yok'}
                    </span>
                  )}
                </div>

                {/* Hesap Adı (Satır İçi Düzenlenebilir) */}
                <div className="flex items-center gap-3 flex-wrap">
                  {isEditingRiotId ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={riotIdInput}
                        onChange={(e) => setRiotIdInput(e.target.value)}
                        className="input !h-9 !w-64 text-sm font-bold"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveRiotId}
                        disabled={isPending}
                        className="btn btn-success btn-sm"
                      >
                        ✓ Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRiotIdInput(account.riotId);
                          setIsEditingRiotId(false);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <RiotIdDisplay
                        riotId={account.riotId}
                        textClassName="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
                        tagClassName="text-xs font-mono text-accent-300 bg-accent-500/10 border-accent-400/25"
                      />
                      <button
                        type="button"
                        onClick={() => setIsEditingRiotId(true)}
                        className="btn btn-ghost btn-sm !h-7 !px-2 text-xs"
                        title="Hesap adını değiştir"
                      >
                        ✏️ Adı Değiştir
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                  <span className="tabular-nums">
                    {t('added_label')}:{' '}
                    <strong className="text-text-secondary font-medium">
                      {createdAt}
                    </strong>
                  </span>
                  <span className="text-white/15">•</span>
                  <span className="tabular-nums">
                    {t('th_last_checked')}:{' '}
                    <strong className="text-text-secondary font-medium">
                      {lastChecked}
                    </strong>
                  </span>
                  {leagueOfGraphsUrl && cleanGame === 'lol' && (
                    <a
                      href={leagueOfGraphsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chip hover:!border-emerald-400/40 hover:!text-emerald-300 hover:!bg-emerald-500/10 transition-colors"
                      title="League of Graphs"
                    >
                      <span>↗ League of Graphs</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Sağ: Aksiyon Butonları */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="btn btn-secondary"
                title="Tüm Alanları Modalda Düzenle"
              >
                <span>⚙️</span>
                <span>Gelişmiş Düzenle</span>
              </button>

              {(isRiotGame || isAlbion) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCheck}
                  disabled={isPending || isSyncingMatches}
                >
                  {isPending ? '⏳ ...' : `🔄 ${t('sync_btn')} (API)`}
                </button>
              )}

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isPending || isSyncingMatches}
                className="btn btn-danger"
                title={t('delete_account_btn')}
              >
                <span>🗑️</span>
                <span>{t('delete_account_btn')}</span>
              </button>
            </div>
          </div>

          {/* Geri bildirim mesajları */}
          {(statusMsg || platformMsg || checkMsg) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {statusMsg && (
                <p className="text-xs font-medium text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  {statusMsg}
                </p>
              )}
              {platformMsg && (
                <p className="text-xs font-medium text-sky-300 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20">
                  {platformMsg}
                </p>
              )}
              {checkMsg && (
                <p className="text-xs font-medium text-accent-300 bg-accent-500/10 px-3 py-1.5 rounded-lg border border-accent-500/20">
                  {checkMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. ANA İÇERİK IZGARASI ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SOL SÜTUN: Tüm Hesap Ayarları, Giriş, Seviye, Rank, Notlar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Hızlı Hesap & Giriş Ayarları Kartı */}
          <div className="card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="eyebrow flex items-center gap-1.5">
                <span>⚙️</span>
                <span>Hızlı Hesap Ayarları</span>
              </h3>
              <span className="text-[10px] text-text-muted">Anında Kaydedilir</span>
            </div>

            {/* Giriş Kullanıcı Adı (Username) */}
            <div className="p-3.5 bg-black/25 border border-white/[0.07] rounded-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="label !mb-1">🔑 {t('label_username')}</span>
                  {isEditingUsername ? (
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('label_username')}
                        className="input !h-8 !text-xs font-mono"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveUsername}
                        disabled={isPending}
                        className="btn btn-success btn-sm"
                        title={t('save')}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setUsername(account.username ?? '');
                          setIsEditingUsername(false);
                        }}
                        className="btn btn-secondary btn-sm"
                        title={t('cancel')}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      {account.username ? (
                        <>
                          {isUsernameRevealed ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                onClick={() => setIsUsernameRevealed(false)}
                                className="text-sm font-mono font-bold text-accent-300 truncate cursor-pointer hover:opacity-80"
                                title={t('hide_username')}
                              >
                                {account.username}
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsUsernameRevealed(false)}
                                className="text-text-muted hover:text-white transition-colors p-0.5 cursor-pointer text-xs"
                                title={t('hide_username')}
                              >
                                🙈
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsUsernameRevealed(true)}
                              className="group flex items-center gap-2 cursor-pointer text-left bg-transparent border-none p-0"
                              title={t('show_username')}
                            >
                              <span className="text-sm font-mono tracking-widest text-text-muted group-hover:text-accent-300 transition-colors">
                                ••••••••
                              </span>
                              <span className="text-[11px] text-text-muted group-hover:text-accent-400 transition-colors flex items-center gap-1">
                                👁️ {t('show_username')}
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={copyUsername}
                            className="text-xs text-text-muted hover:text-accent-300 transition-colors p-0.5 cursor-pointer"
                            title="Kopyala"
                          >
                            {copiedUser ? '✅' : '📋'}
                          </button>
                        </>
                      ) : (
                        <span className="text-text-muted text-xs italic">
                          {t('not_set')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {!isEditingUsername && (
                  <button
                    onClick={() => setIsEditingUsername(true)}
                    className="btn btn-secondary btn-sm shrink-0"
                    title={t('edit_label')}
                  >
                    ✏️ {t('edit_label')}
                  </button>
                )}
              </div>
            </div>

            <div className="divider" />

            {/* Hızlı Seçiciler: Durum, Bölge, Oyun, Kategori, CS2 Kasa Takibi, Prime */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center gap-3">
                <span className="text-xs text-text-secondary font-medium shrink-0">
                  📌 {t('status_select_label')}:
                </span>
                <select
                  className="input !h-9 !py-0 !text-xs max-w-[195px]"
                  value={account.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as AccountStatus)
                  }
                  disabled={isPending}
                >
                  <option value="available">✅ {t('status_available')}</option>
                  <option value="archived">📁 {t('status_archived')}</option>
                  <option value="active">🎮 {t('status_active')}</option>
                  <option value="level">⚡ {t('status_level')}</option>
                  <option value="error_checking">
                    🚫 {t('status_error_checking')}
                  </option>
                </select>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span className="text-xs text-text-secondary font-medium shrink-0">
                  🌐 {isAlbion ? 'Albion Sunucusu:' : t('th_region') + ':'}
                </span>
                <select
                  className="input !h-9 !py-0 !text-xs max-w-[195px]"
                  value={
                    account.platform ||
                    (isAlbion ? 'Europe' : isRiotGame ? 'TR1' : 'Global')
                  }
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  disabled={isPending}
                >
                  {isAlbion ? (
                    <>
                      <option value="Europe">🇪🇺 Albion Europe (Avrupa)</option>
                      <option value="Americas">🇺🇸 Albion Americas (Batı)</option>
                      <option value="Asia">🌏 Albion Asia (Doğu)</option>
                      <option value="Global">🌐 Global</option>
                    </>
                  ) : isRiotGame ? (
                    <>
                      <option value="TR1">{t('platform_tr')}</option>
                      <option value="EUW1">{t('platform_euw')}</option>
                      <option value="EUN1">{t('platform_eun')}</option>
                      <option value="NA1">{t('platform_na')}</option>
                      <option value="KR">{t('platform_kr')}</option>
                      <option value="BR1">{t('platform_br')}</option>
                      <option value="RU">{t('platform_ru')}</option>
                    </>
                  ) : (
                    <>
                      <option value="Global">🌐 Global / Steam</option>
                      <option value="Europe">🇪🇺 Europe</option>
                      <option value="North America">🇺🇸 North America</option>
                      <option value="Turkey">🇹🇷 Turkey</option>
                      <option value="Asia">🌏 Asia</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span className="text-xs text-text-secondary font-medium shrink-0">
                  🎮 Oyun Modülü:
                </span>
                <select
                  className="input !h-9 !py-0 !text-xs max-w-[195px]"
                  value={account.game || 'lol'}
                  onChange={(e) => handleGameChange(e.target.value)}
                  disabled={isPending}
                >
                  {platforms && platforms.length > 0 ? (
                    platforms.flatMap((p) =>
                      p.games.map((g) => (
                        <option key={g.slug} value={g.slug}>
                          {g.icon || '🎮'} {g.name} ({p.name})
                        </option>
                      ))
                    )
                  ) : (
                    <>
                      <option value="lol">⚔️ League of Legends</option>
                      <option value="valorant">🎯 Valorant</option>
                      <option value="tft">♟️ TFT</option>
                      <option value="albion">🛡️ Albion</option>
                    </>
                  )}
                  <option value="cs2">🔫 Counter-Strike 2 (CS2)</option>
                  <option value="other">🎮 Diğer Oyunlar</option>
                </select>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span className="text-xs text-text-secondary font-medium shrink-0">
                  🏷️ Kategori:
                </span>
                <select
                  className="input !h-9 !py-0 !text-xs max-w-[195px]"
                  value={account.category || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={isPending}
                >
                  <option value="">📁 Kategorisiz</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center gap-3 pt-1">
                <span className="text-xs text-text-secondary font-medium shrink-0">
                  📦 CS2 Kasa Takibi:
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleCsTracking(!csTracked)}
                  disabled={isPending}
                  className={`h-8 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    csTracked
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-text-muted hover:text-white'
                  }`}
                >
                  {csTracked ? '✓ Aktif (Açık)' : 'Kapalı (Aç)'}
                </button>
              </div>

              {(csTracked || isCs2) && (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-xs text-text-secondary font-medium shrink-0">
                    ⭐ CS2 Prime Statüsü:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePrime(account.csPrime === false)}
                    disabled={isPending}
                    className={`h-8 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      account.csPrime !== false
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-text-muted hover:text-white'
                    }`}
                  >
                    {account.csPrime !== false ? '⭐ Prime Aktif' : '⚪ Prime Yok'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── SEVİYE & RANK DOĞRUDAN DÜZENLEME KARTI ── */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="eyebrow flex items-center gap-1.5">
                <span>🏆</span>
                <span>Seviye & Rank / Derece Ayarları</span>
              </h3>
            </div>

            {cleanGame === 'lol' && (ranks.solo || ranks.flex) && (
              <div className="space-y-3 pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-4 p-3 bg-white/[0.025] rounded-xl border border-white/[0.06]">
                  <RankBadge
                    rank={ranks.solo?.formattedRank || account.rank || 'UNRANKED'}
                    size={52}
                  />
                  <div className="min-w-0">
                    <p className="eyebrow !text-[10px]">{t('solo_duo')}</p>
                    <p className="text-base font-bold text-white truncate">
                      {ranks.solo ? ranks.solo.formattedRank : account.rank}
                    </p>
                    {ranks.solo && (
                      <p className="text-xs text-text-secondary tabular-nums">
                        {ranks.solo.wins}W - {ranks.solo.losses}L (
                        {calculateWinRate(ranks.solo.wins, ranks.solo.losses)}% WR)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seviye Düzenleyici */}
            <div>
              <label className="label">⚡ Hesap Seviyesi (Level)</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveLevelAndRank(Math.max(0, levelInput - 1), undefined)}
                  disabled={isPending}
                  className="btn btn-secondary btn-sm !h-9 !w-9 font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  value={levelInput}
                  onChange={(e) => setLevelInput(parseInt(e.target.value, 10) || 0)}
                  className="input !h-9 text-center font-bold tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => handleSaveLevelAndRank(levelInput + 1, undefined)}
                  disabled={isPending}
                  className="btn btn-secondary btn-sm !h-9 !w-9 font-bold"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveLevelAndRank(levelInput, rankInput)}
                  disabled={isPending}
                  className="btn btn-primary btn-sm !h-9"
                >
                  Kaydet
                </button>
              </div>
            </div>

            {/* Rank / Premier / Tier Düzenleyici */}
            <div>
              <label className="label">
                🏆 {isCs2 ? 'CS2 Premier / Rank' : isAlbion ? 'Albion Tier / Rank' : 'Rank / Lig'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={rankInput}
                  onChange={(e) => setRankInput(e.target.value)}
                  placeholder={isCs2 ? 'Örn: 15,400 CS' : 'Örn: GOLD II'}
                  className="input !h-9 text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={() => handleSaveLevelAndRank(levelInput, rankInput)}
                  disabled={isPending}
                  className="btn btn-primary btn-sm !h-9"
                >
                  Kaydet
                </button>
              </div>

              {/* Hızlı Rank Seçim Çipleri */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {activePresetList.map((pr) => {
                  const isSel = rankInput.toUpperCase() === pr.toUpperCase();
                  return (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => handleSaveLevelAndRank(levelInput, pr)}
                      disabled={isPending}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-accent-500/25 border-accent-400/50 text-white'
                          : 'bg-white/[0.03] border-white/[0.07] text-text-secondary hover:text-white'
                      }`}
                    >
                      {pr}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── NOTLAR KARTI ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📝</span>
                <span>{t('notes_title')}</span>
              </h2>
              <span className="text-[11px] text-text-muted tabular-nums">
                {notes.length}/500
              </span>
            </div>
            <textarea
              className="input min-h-[110px] resize-y"
              placeholder={t('notes_placeholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-3">
              <span
                className={`text-xs font-medium ${
                  saveMsg?.includes('✅') ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {saveMsg}
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSaveNotes}
                disabled={isPending}
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>

        {/* SAĞ SÜTUN: CS2 Haftalık Kasa Takip Merkezi & Maç / Platform Detayları */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* ── 📦 CS2 HAFTALIK KASA & DROP TAKİP MERKEZİ ── */}
          {csTracked ? (
            <div className="card p-6 space-y-6">
              {/* Başlık & Sıfırlanma Sayacı */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.07]">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/35 text-2xl flex items-center justify-center shrink-0">
                    📦
                  </div>
                  <div>
                    <div className="eyebrow !text-amber-300 mb-0.5">
                      CS2 CARE PACKAGE & HAFTALIK DROP SİSTEMİ
                    </div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
                      <span>Haftalık Kasa Takip Merkezi</span>
                      <span
                        className={`chip font-bold ${
                          csClaimedThisWeek
                            ? '!bg-emerald-500/20 !border-emerald-400/40 !text-emerald-300'
                            : '!bg-amber-500/20 !border-amber-400/50 !text-amber-300'
                        }`}
                      >
                        {csClaimedThisWeek ? '✅ Bu Hafta Alındı' : '📦 Kasa Hazır!'}
                      </span>
                    </h2>
                    <p className="text-xs text-text-secondary mt-1">
                      Her Çarşamba saat 04:00&apos;te (TSİ) yeni hafta otomatik başlar ve önceki haftalarda aldığınız kasalar aşağıda haftalık geçmişe işlenir.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                  <span className="chip !bg-amber-500/15 !border-amber-400/30 !text-amber-300 font-mono">
                    ⏳ Sıfırlanmaya: {formatTimeUntilNextCs2Reset()}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    Mevcut Dönem: {currentWeekSlot.dateRangeLabel}
                  </span>
                </div>
              </div>

              {/* 4'lü Özet İstatistik Kutuları */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.07] flex items-center justify-between">
                  <div>
                    <div className="text-xs text-text-muted">Bu Haftaki Durum</div>
                    <div
                      className={`text-base font-extrabold mt-1 ${
                        csClaimedThisWeek ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {csClaimedThisWeek ? '✅ Kasa Alındı' : '📦 Düşürülmeye Hazır'}
                    </div>
                  </div>
                  <span className="text-2xl">{csClaimedThisWeek ? '✅' : '📦'}</span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.07]">
                  <div className="text-xs text-text-muted mb-1">
                    Toplam Düşürülen Kasa
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveTotalDrops(totalDropsInput - 1)}
                      disabled={isPending}
                      className="btn btn-secondary btn-sm !h-7 !w-7 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={totalDropsInput}
                      onChange={(e) =>
                        setTotalDropsInput(parseInt(e.target.value, 10) || 0)
                      }
                      onBlur={() => handleSaveTotalDrops(totalDropsInput)}
                      className="input !h-7 !w-16 text-center font-bold tabular-nums text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveTotalDrops(totalDropsInput + 1)}
                      disabled={isPending}
                      className="btn btn-secondary btn-sm !h-7 !w-7 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.07] flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-text-muted">Son Alınan Kasa</div>
                    <div className="text-sm font-bold text-white truncate mt-1">
                      {account.csLastCaseName || 'Henüz Kayıt Yok'}
                    </div>
                  </div>
                  <span className="text-xl shrink-0">🎁</span>
                </div>
              </div>

              {/* Bu Haftanın Kasasını Seç & Kaydet */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.07] space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>
                      Bu Hafta ({currentWeekSlot.dateRangeLabel}) Düşen Kasayı Seçin ve İşaretleyin
                    </span>
                  </span>
                </div>

                {/* Hızlı Kasa Seçim Butonları */}
                <div className="flex flex-wrap gap-2">
                  {CS2_POPULAR_CASES.map((cName) => {
                    const isSelected =
                      !customCaseInput && selectedCaseName === cName;
                    return (
                      <button
                        key={cName}
                        type="button"
                        onClick={() => {
                          setSelectedCaseName(cName);
                          setCustomCaseInput('');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-[0_0_15px_-4px_rgba(245,158,11,0.5)]'
                            : 'bg-white/[0.03] border-white/[0.07] text-text-secondary hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        <span>📦</span>
                        <span>{cName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Özel Kasa Adı + İşaretle Butonları */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                  <input
                    type="text"
                    value={customCaseInput}
                    onChange={(e) => setCustomCaseInput(e.target.value)}
                    placeholder="Veya özel kasa / skin / charm adı yazın (Örn: Bravo Case, AWP Skin...)"
                    className="input !h-10 text-xs flex-1"
                  />

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      handleWeekDropAction(
                        currentWeekSlot.weekKey,
                        currentWeekSlot.dateRangeLabel,
                        true,
                        customCaseInput.trim() || selectedCaseName
                      )
                    }
                    className="btn btn-primary !h-10 shrink-0"
                  >
                    <span>
                      ✓ Bu Hafta &quot;
                      {customCaseInput.trim() || selectedCaseName}&quot; Alındı Kaydet
                    </span>
                  </button>

                  {csClaimedThisWeek && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        handleWeekDropAction(
                          currentWeekSlot.weekKey,
                          currentWeekSlot.dateRangeLabel,
                          false
                        )
                      }
                      className="btn btn-danger !h-10 shrink-0"
                    >
                      <span>↩ Bu Haftayı Sıfırla</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 📅 SON 8 HAFTALIK DETAYLI KASA TAKVİMİ (BU HAFTA + ÖNCEKİ 7 HAFTA) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>📅</span>
                      <span>Haftalık Drop Takvimi & Önceki Haftalar (Son 8 Hafta)</span>
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Geçmiş haftalarda aldığınız kasaları görebilir veya dilediğiniz haftanın kasa kaydını değiştirebilirsiniz.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recentWeeks.map((w) => {
                    const rec = getDropRecordForWeek(account, w.weekKey);
                    const isClaimed = Boolean(rec);
                    const weekSelectedCase =
                      weekCaseSelections[w.weekKey] ||
                      rec?.caseName ||
                      selectedCaseName;

                    return (
                      <div
                        key={w.weekKey}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          isClaimed
                            ? 'bg-emerald-500/[0.07] border-emerald-500/30'
                            : w.isCurrentWeek
                            ? 'bg-amber-500/[0.08] border-amber-400/35'
                            : 'bg-white/[0.02] border-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-white">
                                {w.title}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/35 text-text-secondary">
                                {w.dateRangeLabel}
                              </span>
                            </div>
                            <div
                              className={`text-xs font-bold mt-1.5 flex items-center gap-1.5 ${
                                isClaimed
                                  ? 'text-emerald-300'
                                  : w.isCurrentWeek
                                  ? 'text-amber-300'
                                  : 'text-text-muted'
                              }`}
                            >
                              {rec ? (
                                <>
                                  <span>✅ {rec.caseName}</span>
                                </>
                              ) : w.isCurrentWeek ? (
                                <span>⏳ Bekliyor (Kasa Hazır)</span>
                              ) : (
                                <span>➖ Bu Hafta Kasa Alınmadı</span>
                              )}
                            </div>
                            {rec?.claimedAt && (
                              <div className="text-[10px] text-text-muted mt-0.5 font-mono">
                                Kayıt:{' '}
                                {new Date(rec.claimedAt).toLocaleString('tr-TR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </div>

                          <span
                            className={`text-lg shrink-0 ${
                              isClaimed ? 'opacity-100' : 'opacity-50'
                            }`}
                          >
                            {isClaimed ? '📦' : w.isCurrentWeek ? '⏳' : '⚪'}
                          </span>
                        </div>

                        {/* Hafta İçi Kasa Seçici + İşaretle/Kaldır */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.06]">
                          <select
                            value={weekSelectedCase}
                            onChange={(e) =>
                              setWeekCaseSelections((prev) => ({
                                ...prev,
                                [w.weekKey]: e.target.value,
                              }))
                            }
                            disabled={isPending}
                            className="h-7 flex-1 min-w-0 rounded-lg bg-ink-950/80 border border-white/10 px-2 text-[11px] text-text-primary cursor-pointer truncate"
                          >
                            {CS2_POPULAR_CASES.map((cName) => (
                              <option key={cName} value={cName}>
                                {cName}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleWeekDropAction(
                                w.weekKey,
                                w.dateRangeLabel,
                                true,
                                weekSelectedCase
                              )
                            }
                            className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer shrink-0"
                          >
                            {isClaimed ? 'Güncelle' : '✓ Ekle'}
                          </button>

                          {isClaimed && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                handleWeekDropAction(
                                  w.weekKey,
                                  w.dateRangeLabel,
                                  false
                                )
                              }
                              className="h-7 px-2 rounded-lg text-[11px] font-bold bg-red-500/15 border border-red-400/30 text-red-300 hover:bg-red-500/25 cursor-pointer shrink-0"
                              title="Bu haftanın kaydını sil"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 📊 KASA DAĞILIMI ÖZETİ */}
              {Object.keys(caseBreakdown).length > 0 && (
                <div className="pt-4 border-t border-white/[0.07]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5">
                    📊 Düşürülen Kasa Dağılımı
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(caseBreakdown).map(([cName, count]) => (
                      <span
                        key={cName}
                        className="chip !h-7 !px-3 !bg-amber-500/10 !border-amber-400/30 !text-amber-200"
                      >
                        <span>📦 {cName}</span>
                        <strong className="font-mono text-white ml-1">x{count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📦</span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    CS2 Haftalık Kasa Takibi
                  </h3>
                  <p className="text-xs text-text-muted">
                    Bu hesap için haftalık kasa ve drop takvimini aktif etmek ister misiniz?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleCsTracking(true)}
                disabled={isPending}
                className="btn btn-primary btn-sm shrink-0"
              >
                📦 Kasa Takibini Aç
              </button>
            </div>
          )}

          {/* ── RIOT LOL MAÇ GEÇMİŞİ (Sadece LoL ise) ── */}
          {cleanGame === 'lol' && (
            <>
              <div className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow mb-1">RIOT API</p>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {matches.length > 0
                        ? t('recent_matches_title').replace(
                            '{count}',
                            String(matches.length)
                          )
                        : t('match_history')}
                    </h2>
                  </div>

                  <div className="flex flex-col items-stretch sm:items-end shrink-0">
                    <button
                      className="btn btn-primary"
                      onClick={handleSyncMatches}
                      disabled={isPending || isSyncingMatches}
                    >
                      {isSyncingMatches ? (
                        <>
                          <span className="inline-block animate-spin">⏳</span>
                          <span>{t('fetching_matches')}</span>
                        </>
                      ) : (
                        <>
                          <span>⚔️</span>
                          <span>
                            {matches.length > 0
                              ? t('update_matches')
                              : t('fetch_matches')}
                          </span>
                        </>
                      )}
                    </button>
                    {matchSyncMsg && (
                      <span className="text-xs mt-1.5 font-medium text-emerald-400">
                        {matchSyncMsg}
                      </span>
                    )}
                  </div>
                </div>

                {matches.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5 pt-5 border-t border-white/[0.06]">
                    <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.06] flex items-center justify-between">
                      <div>
                        <p className="text-xs text-text-muted mb-1">Win Rate</p>
                        <div className="flex items-baseline gap-2.5 tabular-nums">
                          <span
                            className={`text-2xl font-bold ${
                              recentWinRate >= 50
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {recentWinRate}% WR
                          </span>
                          <span className="text-xs text-text-secondary">
                            ({wins}W {matches.length - wins}L)
                          </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-400/20 flex items-center justify-center text-lg">
                        🏆
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.06] flex items-center justify-between">
                      <div>
                        <p className="text-xs text-text-muted mb-1">
                          {t('avg_kda')}
                        </p>
                        <p className="text-2xl font-bold text-white tabular-nums">
                          {avgKills} /{' '}
                          <span className="text-rose-400">{avgDeaths}</span> /{' '}
                          {avgAssists}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-glow-500/10 border border-glow-400/20 flex items-center justify-center text-lg">
                        ⚔️
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {matches.length > 0 && (
                <div className="flex flex-col gap-2.5 stagger">
                  {matches.map((match) => (
                    <div
                      key={match.matchId}
                      className="card card-interactive p-3.5 sm:px-5 flex flex-col sm:flex-row items-center gap-4 overflow-hidden"
                      style={{
                        background: match.win
                          ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(255, 255, 255, 0.02) 45%)'
                          : 'linear-gradient(90deg, rgba(244, 63, 94, 0.08) 0%, rgba(255, 255, 255, 0.02) 45%)',
                      }}
                    >
                      <span
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          match.win ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                      />
                      <div className="w-24 flex flex-col items-center sm:items-start text-center sm:text-left shrink-0">
                        <span
                          className={`text-xs font-extrabold uppercase tracking-wider ${
                            match.win ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {match.win ? t('victory') : t('defeat')}
                        </span>
                        <span className="text-xs text-text-muted tabular-nums mt-0.5">
                          {Math.floor(match.gameDuration / 60)}m{' '}
                          {match.gameDuration % 60}s
                        </span>
                      </div>

                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/15 bg-ink-850">
                          <Image
                            src={ddragon.champion(match.championName)}
                            alt={match.championName}
                            width={48}
                            height={48}
                            unoptimized
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-center sm:items-start w-28 shrink-0 tabular-nums">
                        <span className="text-sm font-bold text-white">
                          {match.kills} /{' '}
                          <span className="text-rose-400">{match.deaths}</span> /{' '}
                          {match.assists}
                        </span>
                        <span className="text-[11px] text-text-muted mt-0.5">
                          {match.cs} CS
                        </span>
                      </div>

                      <div className="sm:ml-auto text-right">
                        <span className="chip font-mono !text-[10px] uppercase">
                          {match.lane === 'NONE' ? 'ARAM / SPECIAL' : match.lane}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Gelişmiş Hesap Düzenleme Modalı */}
      <EditAccountModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        account={account}
        categories={categories}
        platformsList={platforms}
        onAccountUpdated={(updated) => {
          setAccount(updated);
          router.refresh();
        }}
      />
    </div>
  );
}
