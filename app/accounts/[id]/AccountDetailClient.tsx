'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AccountData } from '@/app/actions/accounts';
import {
  updateAccountNotes,
  updateAccountUsername,
  updateAccountStatus,
  updateAccountPlatform,
  updateAccountCategory,
  updateAccountGame,
  deleteAccount,
} from '@/app/actions/accounts';
import type { CategoryData } from '@/app/actions/categories';
import type { AccountStatus } from '@/models/Account';
import { syncAccount, syncMatchHistory } from '@/app/actions/accountSync';
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
  cs2: '🔫 CS2',
  dota2: '🛡️ Dota 2',
  fortnite: '⛏️ Fortnite',
  other: '🎮 Diğer Oyun',
  lol: '⚔️ League of Legends',
};

export default function AccountDetailClient({
  account: initialAccount,
  categories = [],
  platforms = [],
}: AccountDetailClientProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [account, setAccount] = useState<AccountData>(initialAccount);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [notes, setNotes] = useState(initialAccount.notes ?? '');
  const [username, setUsername] = useState(initialAccount.username ?? '');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isUsernameRevealed, setIsUsernameRevealed] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);

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
      setNotes(initialAccount.notes ?? '');
      setUsername(initialAccount.username ?? '');
    }
  }, [initialAccount]);

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

  function handleStatusChange(newStatus: AccountStatus) {
    const oldStatus = account.status;
    setAccount((prev) => ({ ...prev, status: newStatus }));
    setStatusMsg(null);
    startTransition(async () => {
      const res = await updateAccountStatus(account._id, newStatus);
      if (res.success) {
        setStatusMsg(`✅ ${t('status_updated')}`);
        setTimeout(() => setStatusMsg(null), 3000);
        router.refresh();
      } else {
        setAccount((prev) => ({ ...prev, status: oldStatus }));
        setStatusMsg('❌ ' + (res.error || 'Failed'));
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
        setPlatformMsg(
          language === 'tr'
            ? "✅ Sunucu güncellendi. Yeni verileri çekmek için 'Senkronize Et' yapabilirsiniz."
            : '✅ Region updated. You can click Sync to fetch new data.'
        );
        setTimeout(() => setPlatformMsg(null), 5000);
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
        router.refresh();
      } else {
        setAccount((prev) => ({ ...prev, category: oldCat }));
      }
    });
  }

  function handleGameChange(newGame: string) {
    const oldGame = account.game;
    setAccount((prev) => ({ ...prev, game: newGame }));
    startTransition(async () => {
      const res = await updateAccountGame(account._id, newGame);
      if (res.success) {
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
          if (matchCount === 0) {
            setCheckMsg(
              language === 'tr'
                ? result.statusChanged
                  ? `Durum güncellendi → ${result.newStatus}. ℹ️ Oynanmış maç bulunamadı.`
                  : 'Seviye ve rank güncellendi. ℹ️ Bu hesapta oynanmış maç bulunamadı.'
                : 'Stats updated. ℹ️ No matches recorded.'
            );
          } else {
            setCheckMsg(
              language === 'tr'
                ? `✅ Tüm veriler ve son ${matchCount} maç başarıyla güncellendi.`
                : `✅ All data and last ${matchCount} matches successfully updated.`
            );
          }
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
          if (matchCount === 0) {
            setMatchSyncMsg(
              language === 'tr'
                ? 'ℹ️ Bu hesapta Riot API üzerinde oynanmış maç bulunamadı (0 maç).'
                : 'ℹ️ No match history found on Riot API for this account.'
            );
          } else {
            setMatchSyncMsg(
              language === 'tr'
                ? `✅ Son ${matchCount} maç ve rank bilgileri başarıyla güncellendi!`
                : `✅ Last ${matchCount} matches and ranks updated!`
            );
          }
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

  const isRiotGame = ['lol', 'valorant', 'tft'].includes(
    (account.game || '').toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* ÜST PROFİL HERO KARTI */}
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
                {account.game === 'lol' ? (
                  <Image
                    src={ddragon.profileIcon(profileIconId)}
                    alt="Profile Icon"
                    width={96}
                    height={96}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : account.avatarUrl || account.game === 'albion' ? (
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
                    {account.game === 'valorant'
                      ? '🎯'
                      : account.game === 'tft'
                      ? '♟️'
                      : account.game === 'cs2'
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
                    {GAME_LABELS[account.game || 'lol'] || GAME_LABELS.lol}
                  </span>
                  {account.category && (
                    <span className="chip !text-accent-300 !bg-accent-500/10 !border-accent-400/25">
                      🏷️ {account.category}
                    </span>
                  )}
                  <PlatformBadge platform={account.platform} />
                  <StatusBadge status={account.status} />
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <RiotIdDisplay
                    riotId={account.riotId}
                    textClassName="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
                    tagClassName="text-xs font-mono text-accent-300 bg-accent-500/10 border-accent-400/25"
                  />
                </div>

                <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                  <span className="tabular-nums">
                    {t('added_label')}: <strong className="text-text-secondary font-medium">{createdAt}</strong>
                  </span>
                  <span className="text-white/15">•</span>
                  <span className="tabular-nums">
                    {t('th_last_checked')}: <strong className="text-text-secondary font-medium">{lastChecked}</strong>
                  </span>
                  {leagueOfGraphsUrl && account.game === 'lol' && (
                    <a
                      href={leagueOfGraphsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chip hover:!border-emerald-400/40 hover:!text-emerald-300 hover:!bg-emerald-500/10 transition-colors"
                      title="League of Graphs"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                      <span>League of Graphs</span>
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
                title="Hesabı Düzenle"
              >
                <span>✏️</span>
                <span>{ isRiotGame ? 'Düzenle' : 'Platforma Göre Düzenle' }</span>
              </button>

              {isRiotGame && (
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

      {/* ANA İÇERİK IZGARASI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SOL SÜTUN (Giriş Bilgisi, Hızlı Ayarlar, Ranklar, Notlar) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Giriş & Hızlı Ayarlar Kartı */}
          <div className="card p-5 space-y-5">
            {/* Kullanıcı Adı (Giriş) */}
            <div className="p-3.5 bg-black/25 border border-white/[0.07] rounded-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="label !mb-1">{t('label_username')}</span>
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
                            title="Copy"
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

            {/* Hızlı Seçiciler */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center gap-3">
                <span className="text-xs text-text-secondary font-medium shrink-0">
                  {t('status_select_label')}:
                </span>
                <select
                  className="input !h-9 !py-0 !text-xs max-w-[190px]"
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
                  {account.game === 'albion'
                    ? 'Albion Sunucusu:'
                    : t('th_region') + ':'}
                </span>
                <select
                  className="input !h-9 !py-0 !text-xs max-w-[190px]"
                  value={
                    account.platform ||
                    (account.game === 'albion' ? 'Europe' : 'TR1')
                  }
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  disabled={isPending}
                >
                  {account.game === 'albion' ? (
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
                      <option value="Global">🌐 Global</option>
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
                  Oyun:
                </span>
                <select
                  className="input !h-9 !py-0 !text-xs max-w-[190px]"
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
                  <option value="other">🎮 Diğer Oyunlar</option>
                </select>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span className="text-xs text-text-secondary font-medium shrink-0">
                  Kategori:
                </span>
                <select
                  className="input !h-9 !py-0 !text-xs max-w-[190px]"
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
            </div>
          </div>

          {/* Rank Kartları */}
          {account.game === 'lol' ? (
            <div className="card p-5 flex flex-col gap-3.5">
              {/* Solo/Duo */}
              <div className="flex items-center gap-4 p-3.5 bg-white/[0.025] rounded-xl border border-white/[0.06]">
                <div className="w-16 h-16 flex items-center justify-center shrink-0">
                  <RankBadge
                    rank={ranks.solo?.formattedRank || account.rank || 'UNRANKED'}
                    size={64}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="eyebrow !text-[10px] mb-1">{t('solo_duo')}</p>
                  {ranks.solo ? (
                    <>
                      <p className="text-lg font-bold text-white leading-none truncate">
                        {ranks.solo.formattedRank}
                      </p>
                      <p className="text-xs text-text-secondary mt-1.5 tabular-nums">
                        <span className="text-emerald-400 font-semibold">
                          {ranks.solo.wins}
                          {t('stat_win_char')}
                        </span>{' '}
                        -{' '}
                        <span className="text-rose-400 font-semibold">
                          {ranks.solo.losses}
                          {t('stat_loss_char')}
                        </span>
                        <span className="mx-1.5 text-white/20">•</span>
                        Win Rate{' '}
                        <strong className="text-white">
                          {calculateWinRate(ranks.solo.wins, ranks.solo.losses)}%
                        </strong>
                      </p>
                    </>
                  ) : account.rank && account.rank !== 'UNRANKED' ? (
                    <>
                      <p className="text-lg font-bold text-text-primary leading-none">
                        {account.rank}
                      </p>
                      <p className="text-[10px] text-accent-300 mt-1 uppercase tracking-wider font-semibold">
                        {language === 'tr'
                          ? 'Geçmiş Sezon / Kayıtlı'
                          : 'Previous Season / Saved'}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-text-muted">
                      {t('unranked')}
                    </p>
                  )}
                </div>
              </div>

              {/* Flex */}
              <div className="flex items-center gap-4 p-3.5 bg-white/[0.025] rounded-xl border border-white/[0.06]">
                <div className="w-14 h-14 flex items-center justify-center opacity-85 shrink-0">
                  <RankBadge
                    rank={ranks.flex?.formattedRank || 'UNRANKED'}
                    size={48}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="eyebrow !text-[10px] mb-1">{t('flex')}</p>
                  {ranks.flex ? (
                    <>
                      <p className="text-sm font-bold text-white leading-none truncate">
                        {ranks.flex.formattedRank}
                      </p>
                      <p className="text-xs text-text-secondary mt-1.5 tabular-nums">
                        <span className="text-emerald-400 font-semibold">
                          {ranks.flex.wins}
                          {t('stat_win_char')}
                        </span>{' '}
                        -{' '}
                        <span className="text-rose-400 font-semibold">
                          {ranks.flex.losses}
                          {t('stat_loss_char')}
                        </span>
                        <span className="mx-1.5 text-white/20">•</span>
                        WR{' '}
                        <strong className="text-white">
                          {calculateWinRate(ranks.flex.wins, ranks.flex.losses)}%
                        </strong>
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-text-muted">
                      {t('unranked')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-5 flex flex-col gap-3">
              <h3 className="eyebrow flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Karakter & Seviye Durumu</span>
              </h3>

              <div className="p-3 bg-white/[0.025] rounded-xl border border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-text-secondary">Rütbe / Tier:</span>
                <span className="text-sm font-bold text-accent-300">
                  {account.rank ||
                    (account.game === 'albion'
                      ? 'Tier 4 (Adept)'
                      : 'Belirtilmemiş')}
                </span>
              </div>

              <div className="p-3 bg-white/[0.025] rounded-xl border border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-text-secondary">Seviye (Level):</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  Lv. {account.level ?? 1}
                </span>
              </div>

              <div className="p-3 bg-white/[0.025] rounded-xl border border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-text-secondary">Sunucu / Bölge:</span>
                <span className="text-xs font-bold text-glow-400 uppercase">
                  {account.platform ||
                    (account.game === 'albion' ? 'Europe' : 'Global')}
                </span>
              </div>
            </div>
          )}

          {/* Notlar */}
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

        {/* SAĞ SÜTUN */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {account.game === 'lol' ? (
            <>
              {/* Maç Geçmişi Üst Barı & İstatistik Kutuları */}
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
                    {matches.length === 0 && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {language === 'tr'
                          ? 'Riot API üzerinden son 5 karşılaşma ve dereceli (Solo/Flex) rank bilgileri'
                          : 'Recent 5 matches and ranked info via Riot API'}
                      </p>
                    )}
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
                      <span
                        className={`text-xs mt-1.5 font-medium ${
                          matchSyncMsg.includes('✅')
                            ? 'text-emerald-400'
                            : matchSyncMsg.includes('ℹ️') ||
                              matchSyncMsg.includes('⚠️')
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
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
                            ({wins}
                            {t('stat_win_char')} {matches.length - wins}
                            {t('stat_loss_char')})
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
                          {avgKills}{' '}
                          <span className="text-text-muted font-normal">/</span>{' '}
                          <span className="text-rose-400">{avgDeaths}</span>{' '}
                          <span className="text-text-muted font-normal">/</span>{' '}
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

              {/* Maç Kartları / Boş Durum */}
              {matches.length === 0 ? (
                <div className="card p-12 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-accent-500/10 border border-accent-400/20 flex items-center justify-center text-3xl">
                    {account.lastCheckedAt ? '📭' : '🎮'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {t('no_matches_title')}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1 max-w-sm">
                      {t('no_matches_desc')}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary btn-lg"
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
                    <p
                      className={`text-xs mt-1 font-medium ${
                        matchSyncMsg.includes('✅')
                          ? 'text-emerald-400'
                          : matchSyncMsg.includes('ℹ️') ||
                            matchSyncMsg.includes('⚠️')
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {matchSyncMsg}
                    </p>
                  )}
                </div>
              ) : (
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

                      {/* Sonuç & Süre */}
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

                      {/* Şampiyon */}
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
                        <div className="absolute -bottom-1 -right-1 bg-ink-950/90 rounded-md px-1.5 py-0.5 border border-white/10 text-[10px] font-bold text-text-primary">
                          {match.championName}
                        </div>
                      </div>

                      {/* KDA & CS */}
                      <div className="flex flex-col items-center sm:items-start w-28 shrink-0 tabular-nums">
                        <span className="text-sm font-bold text-white tracking-wide">
                          {match.kills}{' '}
                          <span className="text-text-muted font-normal">/</span>{' '}
                          <span className="text-rose-400">{match.deaths}</span>{' '}
                          <span className="text-text-muted font-normal">/</span>{' '}
                          {match.assists}
                        </span>
                        <span className="text-[11px] text-text-muted mt-0.5">
                          <strong className="text-text-secondary">
                            {match.cs}
                          </strong>{' '}
                          CS ({(match.cs / (match.gameDuration / 60)).toFixed(1)}
                          /m)
                        </span>
                      </div>

                      {/* Eşyalar */}
                      <div className="flex items-center gap-1.5 mt-2 sm:mt-0 flex-wrap justify-center sm:justify-start">
                        {match.items.slice(0, 6).map((itemId, i) => {
                          const itemUrl = ddragon.item(itemId);
                          return itemUrl ? (
                            <div
                              key={i}
                              className="w-7 h-7 rounded-lg bg-ink-900 border border-white/10 overflow-hidden"
                            >
                              <Image
                                src={itemUrl}
                                alt="item"
                                width={28}
                                height={28}
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div
                              key={i}
                              className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                            />
                          );
                        })}
                      </div>

                      {/* Rol / Şerit */}
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
          ) : (
            /* Non-LoL Platform Detay & Yönetim Paneli */
            <div className="card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
                <div>
                  <p className="eyebrow mb-1">PLATFORM PROFİLİ</p>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                    <span>⚔️</span>
                    <span>
                      {(account.game || '').toUpperCase()} Karakter & Platform
                      Yönetimi
                    </span>
                  </h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Bu hesap üçüncü taraf platform / bağımsız MMO kategorisinde
                    kayıtlıdır. Tüm parametreleri serbestçe düzenleyebilirsiniz.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="btn btn-primary shrink-0"
                >
                  <span>✏️</span>
                  <span>Platforma Göre Düzenle</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3">
                  <span className="eyebrow flex items-center gap-1.5">
                    <span>🎮</span> Oyun & Platform Detayları
                  </span>
                  <div className="flex justify-between text-xs py-1.5 border-b border-white/[0.05]">
                    <span className="text-text-secondary">Oyun / Modül:</span>
                    <span className="font-semibold text-white uppercase">
                      {account.game || 'Oyun'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-white/[0.05]">
                    <span className="text-text-secondary">Platform:</span>
                    <span className="font-semibold text-glow-400 uppercase">
                      {account.platform || 'Albion'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-text-secondary">Bölge / Sunucu:</span>
                    <span className="font-bold text-accent-300 uppercase">
                      {account.platform || 'Europe'}
                    </span>
                  </div>
                </div>

                <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3">
                  <span className="eyebrow flex items-center gap-1.5">
                    <span>⭐</span> İlerleme & Seviye
                  </span>
                  <div className="flex justify-between text-xs py-1.5 border-b border-white/[0.05]">
                    <span className="text-text-secondary">Mevcut Seviye:</span>
                    <span className="font-bold text-white text-sm tabular-nums">
                      Lv. {account.level ?? 1}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-white/[0.05]">
                    <span className="text-text-secondary">Derece / Tier:</span>
                    <span className="font-bold text-emerald-400">
                      {account.rank || 'Tier 4'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-text-secondary">Kategori:</span>
                    <span className="font-semibold text-accent-300">
                      {account.category || 'Kategorisiz'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-accent-500/[0.08] border border-accent-400/20 text-xs text-text-secondary flex items-start gap-3">
                <span className="text-base shrink-0">💡</span>
                <p className="leading-relaxed">
                  Albion ve diğer harici oyunlarda Riot API yerine
                  özelleştirilmiş platform profili kullanılır. Karakter adı,
                  sunucu (Europe/Americas/Asia), Tier derecesi ve seviye
                  bilgilerinizi{' '}
                  <strong className="text-white">Platforma Göre Düzenle</strong>{' '}
                  butonuna tıklayarak saniyeler içinde güncelleyebilirsiniz.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Platforma Göre Hesap Düzenleme Modalı */}
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
