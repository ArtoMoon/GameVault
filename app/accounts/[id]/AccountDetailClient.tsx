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

interface AccountDetailClientProps {
  account: AccountData;
  categories?: CategoryData[];
}

function calculateWinRate(wins: number, losses: number) {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

export default function AccountDetailClient({
  account: initialAccount,
  categories = [],
}: AccountDetailClientProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [account, setAccount] = useState<AccountData>(initialAccount);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* SOL SÜTUN (Profil, Ranklar, Notlar) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Profil Kartı */}
        <div className="bg-[#0e192d]/85 border border-[#3d9be9]/18 rounded-2xl overflow-hidden shadow-lg backdrop-blur-md">
          <div className="h-24 bg-gradient-to-r from-blue-900 to-slate-900" />
          <div className="px-6 pb-6 relative flex flex-col">
            <div className="flex justify-between items-start -mt-12 mb-4">
              <div className="w-24 h-24 rounded-2xl border-4 border-[#0e192d] overflow-hidden bg-slate-800 relative shadow-xl shrink-0">
                <Image
                  src={ddragon.profileIcon(profileIconId)}
                  alt="Profile Icon"
                  width={96}
                  height={96}
                  unoptimized
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-center text-xs font-bold text-white py-0.5">
                  {account.level}
                </div>
              </div>
              <div className="mt-14 shrink-0 flex items-center gap-2">
                <PlatformBadge platform={account.platform} />
                <StatusBadge status={account.status} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-white/10 text-slate-300 border border-white/10">
                  {account.game === 'valorant' ? '🎯 Valorant' : account.game === 'tft' ? '♟️ TFT' : account.game === 'other' ? '🎮 Diğer Oyun' : '⚔️ League of Legends'}
                </span>
                {account.category && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                    🏷️ {account.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <RiotIdDisplay
                  riotId={account.riotId}
                  textClassName="text-2xl font-extrabold text-white tracking-tight"
                  tagClassName="text-sm font-mono text-amber-300/90 bg-amber-400/10 border-amber-400/20"
                />
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <p className="text-xs text-slate-400">
                  {t('added_label')}: {createdAt}
                </p>
                {leagueOfGraphsUrl && (
                  <a
                    href={leagueOfGraphsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#1a6b3c]/15 text-emerald-300 border border-emerald-500/25 hover:bg-[#1a6b3c]/30 hover:border-emerald-400/50 transition-all group cursor-pointer"
                    title="League of Graphs"
                  >
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                    <span>League of Graphs</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px]">
                      ↗
                    </span>
                  </a>
                )}
              </div>
            </div>

            {/* Kullanıcı Adı (Giriş) */}
            <div className="mt-4 p-3 bg-black/30 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 block">
                    {t('label_username')}
                  </span>
                  {isEditingUsername ? (
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('label_username')}
                        className="bg-[#0f1923] border border-blue-500/40 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none w-full focus:border-blue-400"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveUsername}
                        disabled={isPending}
                        className="px-2.5 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 text-xs rounded-lg font-semibold cursor-pointer"
                        title={t('save')}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setUsername(account.username ?? '');
                          setIsEditingUsername(false);
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-400 text-xs rounded-lg cursor-pointer"
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
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() => setIsUsernameRevealed(false)}
                                className="text-sm font-mono font-bold text-amber-300 truncate cursor-pointer hover:opacity-80"
                                title={t('hide_username')}
                              >
                                {account.username}
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsUsernameRevealed(false)}
                                className="text-slate-400 hover:text-white transition-colors p-0.5 cursor-pointer text-xs"
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
                              <span className="text-sm font-mono tracking-widest text-slate-400 group-hover:text-amber-300 transition-colors">
                                ••••••••
                              </span>
                              <span className="text-[0.7rem] text-slate-500 group-hover:text-blue-400 transition-colors flex items-center gap-1">
                                👁️ {t('show_username')}
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={copyUsername}
                            className="text-xs text-slate-400 hover:text-amber-300 transition-colors p-0.5 cursor-pointer"
                            title="Copy"
                          >
                            {copiedUser ? '✅' : '📋'}
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-500 text-xs font-sans italic">
                          {t('not_set')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {!isEditingUsername && (
                  <button
                    onClick={() => setIsEditingUsername(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                    title={t('edit_label')}
                  >
                    ✏️ {t('edit_label')}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 text-sm flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">
                  {t('status_select_label')}:
                </span>
                <select
                  className="bg-[#0f1923] border border-blue-500/30 hover:border-blue-400 rounded-lg px-2.5 py-1 text-xs text-[#e8f0fe] cursor-pointer outline-none transition-colors font-medium"
                  value={account.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as AccountStatus)
                  }
                  disabled={isPending}
                >
                  <option value="available" className="bg-[#0f1923]">
                    ✅ {t('status_available')}
                  </option>
                  <option value="archived" className="bg-[#0f1923]">
                    📁 {t('status_archived')}
                  </option>
                  <option value="active" className="bg-[#0f1923]">
                    🎮 {t('status_active')}
                  </option>
                  <option value="level" className="bg-[#0f1923]">
                    ⚡ {t('status_level')}
                  </option>
                  <option value="error_checking" className="bg-[#0f1923]">
                    🚫 {t('status_error_checking')}
                  </option>
                </select>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">
                  {t('th_region')}:
                </span>
                <select
                  className="bg-[#0f1923] border border-blue-500/30 hover:border-blue-400 rounded-lg px-2.5 py-1 text-xs text-[#e8f0fe] cursor-pointer outline-none transition-colors font-medium"
                  value={(account.platform || 'TR1').toUpperCase()}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  disabled={isPending}
                >
                  <option value="TR1" className="bg-[#0f1923]">
                    {t('platform_tr')}
                  </option>
                  <option value="EUW1" className="bg-[#0f1923]">
                    {t('platform_euw')}
                  </option>
                  <option value="EUN1" className="bg-[#0f1923]">
                    {t('platform_eun')}
                  </option>
                  <option value="NA1" className="bg-[#0f1923]">
                    {t('platform_na')}
                  </option>
                  <option value="KR" className="bg-[#0f1923]">
                    {t('platform_kr')}
                  </option>
                  <option value="BR1" className="bg-[#0f1923]">
                    {t('platform_br')}
                  </option>
                  <option value="RU" className="bg-[#0f1923]">
                    {t('platform_ru')}
                  </option>
                </select>
              </div>

              {/* Oyun Seçici */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Oyun:</span>
                <select
                  className="bg-[#0f1923] border border-blue-500/30 hover:border-blue-400 rounded-lg px-2.5 py-1 text-xs text-[#e8f0fe] cursor-pointer outline-none transition-colors font-medium"
                  value={account.game || 'lol'}
                  onChange={(e) => handleGameChange(e.target.value)}
                  disabled={isPending}
                >
                  <option value="lol" className="bg-[#0f1923]">⚔️ League of Legends</option>
                  <option value="valorant" className="bg-[#0f1923]">🎯 Valorant</option>
                  <option value="tft" className="bg-[#0f1923]">♟️ TFT</option>
                  <option value="other" className="bg-[#0f1923]">🎮 Diğer Oyunlar</option>
                </select>
              </div>

              {/* Kategori Seçici */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Kategori:</span>
                <select
                  className="bg-[#0f1923] border border-yellow-500/30 hover:border-yellow-400 rounded-lg px-2.5 py-1 text-xs text-[#e8f0fe] cursor-pointer outline-none transition-colors font-medium"
                  value={account.category || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={isPending}
                >
                  <option value="" className="bg-[#0f1923] text-slate-400">📁 Kategorisiz</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name} className="bg-[#0f1923]">
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">{t('th_last_checked')}:</span>
                <span className="text-white font-medium">{lastChecked}</span>
              </div>
            </div>

            {statusMsg && (
              <p className="text-xs text-center mt-2 font-medium text-emerald-400 bg-emerald-500/10 py-1.5 rounded-lg border border-emerald-500/20">
                {statusMsg}
              </p>
            )}

            {platformMsg && (
              <p className="text-xs text-center mt-2 font-medium text-sky-400 bg-sky-500/10 py-1.5 rounded-lg border border-sky-500/20">
                {platformMsg}
              </p>
            )}

            {/* Senkronize Et & Hesabı Sil Butonları */}
            <div className="flex items-center gap-2 mt-4">
              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 hover:border-blue-500/50 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                onClick={handleCheck}
                disabled={isPending || isSyncingMatches}
              >
                {isPending ? '⏳ ...' : `🔄 ${t('sync_btn')} (API)`}
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isPending || isSyncingMatches}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                title={t('delete_account_btn')}
              >
                <span>🗑️</span>
                <span>{t('delete_account_btn')}</span>
              </button>
            </div>

            {checkMsg && (
              <p className="text-xs text-center mt-2 text-slate-300">
                {checkMsg}
              </p>
            )}
          </div>
        </div>

        {/* Rank Kartları */}
        <div className="bg-[#0e192d]/85 border border-[#3d9be9]/18 rounded-2xl p-5 shadow-lg backdrop-blur-md flex flex-col gap-4">
          {/* Solo/Duo */}
          <div className="flex items-center gap-4 p-3 bg-black/20 rounded-xl border border-white/5">
            <div className="w-16 h-16 flex items-center justify-center">
              <RankBadge
                rank={ranks.solo?.formattedRank || account.rank || 'UNRANKED'}
                size={64}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 font-semibold mb-1">
                {t('solo_duo')}
              </p>
              {ranks.solo ? (
                <>
                  <p className="text-lg font-bold text-white leading-none">
                    {ranks.solo.formattedRank}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    <span className="text-green-400">
                      {ranks.solo.wins}
                      {t('stat_win_char')}
                    </span>{' '}
                    -{' '}
                    <span className="text-red-400">
                      {ranks.solo.losses}
                      {t('stat_loss_char')}
                    </span>
                    <span className="mx-2">•</span>
                    Win Rate{' '}
                    <strong className="text-white">
                      {calculateWinRate(ranks.solo.wins, ranks.solo.losses)}%
                    </strong>
                  </p>
                </>
              ) : account.rank && account.rank !== 'UNRANKED' ? (
                <>
                  <p className="text-lg font-bold text-slate-300 leading-none">
                    {account.rank}
                  </p>
                  <p className="text-[0.65rem] text-amber-500/80 mt-1 uppercase tracking-wider font-semibold">
                    {language === 'tr'
                      ? 'Geçmiş Sezon / Kayıtlı'
                      : 'Previous Season / Saved'}
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-slate-500">
                  {t('unranked')}
                </p>
              )}
            </div>
          </div>

          {/* Flex */}
          <div className="flex items-center gap-4 p-3 bg-black/20 rounded-xl border border-white/5">
            <div className="w-14 h-14 flex items-center justify-center opacity-80">
              <RankBadge
                rank={ranks.flex?.formattedRank || 'UNRANKED'}
                size={48}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 font-semibold mb-1">
                {t('flex')}
              </p>
              {ranks.flex ? (
                <>
                  <p className="text-sm font-bold text-white leading-none">
                    {ranks.flex.formattedRank}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    <span className="text-green-400">
                      {ranks.flex.wins}
                      {t('stat_win_char')}
                    </span>{' '}
                    -{' '}
                    <span className="text-red-400">
                      {ranks.flex.losses}
                      {t('stat_loss_char')}
                    </span>
                    <span className="mx-2">•</span>
                    WR{' '}
                    <strong className="text-white">
                      {calculateWinRate(ranks.flex.wins, ranks.flex.losses)}%
                    </strong>
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-slate-500">
                  {t('unranked')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Notlar */}
        <div className="bg-[#0e192d]/85 border border-[#3d9be9]/18 rounded-2xl p-5 shadow-lg backdrop-blur-md">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            📝 {t('notes_title')}
          </h2>
          <textarea
            className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-[#e8f0fe] font-sans min-h-[100px] resize-y outline-none transition-all focus:border-yellow-500/50 focus:bg-black/50"
            placeholder={t('notes_placeholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-3">
            <span
              className={`text-xs font-medium ${
                saveMsg?.includes('✅') ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {saveMsg}
            </span>
            <button
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-[#050e18] bg-gradient-to-br from-yellow-400 to-yellow-600 hover:scale-105 transition-transform disabled:opacity-50 cursor-pointer"
              onClick={handleSaveNotes}
              disabled={isPending}
            >
              {t('save')}
            </button>
          </div>
        </div>
      </div>

      {/* SAĞ SÜTUN (Maç Geçmişi) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Maç Geçmişi Üst Barı - Daima Görünür */}
        <div className="bg-[#0e192d]/85 border border-[#3d9be9]/18 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg backdrop-blur-md">
          {matches.length > 0 ? (
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-slate-400 font-semibold mb-1">
                  {t('recent_matches_title').replace(
                    '{count}',
                    String(matches.length)
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-2xl font-bold ${
                      recentWinRate >= 50 ? 'text-blue-400' : 'text-red-400'
                    }`}
                  >
                    {recentWinRate}% WR
                  </span>
                  <span className="text-sm text-slate-400">
                    ({wins}
                    {t('stat_win_char')} {matches.length - wins}
                    {t('stat_loss_char')})
                  </span>
                </div>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <p className="text-xs text-slate-400 font-semibold mb-1">
                  {t('avg_kda')}
                </p>
                <p className="text-lg font-bold text-white">
                  {avgKills} <span className="text-slate-500">/</span>{' '}
                  <span className="text-red-400">{avgDeaths}</span>{' '}
                  <span className="text-slate-500">/</span> {avgAssists}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🎮 {t('match_history')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'tr'
                  ? 'Riot API üzerinden son 5 karşılaşma ve dereceli (Solo/Flex) rank bilgileri'
                  : 'Recent 5 matches and ranked info via Riot API'}
              </p>
            </div>
          )}

          {/* Maçları Güncelle / Çek Butonu */}
          <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
            <button
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600/30 border border-indigo-500/40 hover:bg-indigo-600/50 hover:border-indigo-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
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
                    ? 'text-green-400'
                    : matchSyncMsg.includes('ℹ️') || matchSyncMsg.includes('⚠️')
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {matchSyncMsg}
              </span>
            )}
          </div>
        </div>

        {/* Maç Kartları / Boş Durum */}
        <div className="flex flex-col gap-2">
          {matches.length === 0 ? (
            <div className="bg-[#0e192d]/50 border border-white/10 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${
                  account.lastCheckedAt
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'bg-indigo-500/10 border border-indigo-500/20'
                }`}
              >
                {account.lastCheckedAt ? '📭' : '🎮'}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {t('no_matches_title')}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {t('no_matches_desc')}
                </p>
              </div>
              <button
                className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:scale-105 active:scale-95"
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
                  className={`text-xs mt-2 font-medium ${
                    matchSyncMsg.includes('✅')
                      ? 'text-green-400'
                      : matchSyncMsg.includes('ℹ️') ||
                        matchSyncMsg.includes('⚠️')
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {matchSyncMsg}
                </p>
              )}
            </div>
          ) : (
            matches.map((match) => (
              <div
                key={match.matchId}
                className={`flex flex-col sm:flex-row items-center gap-4 p-3 pr-6 rounded-xl border-l-4 shadow-sm bg-black/20 transition-colors hover:bg-black/40
                  ${
                    match.win
                      ? 'border-l-blue-500/80 border-y border-r border-blue-500/10'
                      : 'border-l-red-500/80 border-y border-r border-red-500/10'
                  }
                `}
              >
                {/* Sonuç & Süre */}
                <div className="w-20 flex flex-col items-center sm:items-start text-center sm:text-left shrink-0">
                  <span
                    className={`text-sm font-bold ${
                      match.win ? 'text-blue-400' : 'text-red-400'
                    }`}
                  >
                    {match.win ? t('victory') : t('defeat')}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5">
                    {Math.floor(match.gameDuration / 60)}m{' '}
                    {match.gameDuration % 60}s
                  </span>
                </div>

                {/* Şampiyon */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#14233c]">
                    <Image
                      src={ddragon.champion(match.championName)}
                      alt={match.championName}
                      width={48}
                      height={48}
                      unoptimized
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-black/80 rounded px-1 border border-white/10 text-[0.6rem] font-bold text-white">
                    {match.championName}
                  </div>
                </div>

                {/* KDA & CS */}
                <div className="flex flex-col items-center sm:items-start w-28 shrink-0">
                  <span className="text-sm font-bold text-white tracking-wide">
                    {match.kills}{' '}
                    <span className="text-slate-500">/</span>{' '}
                    <span className="text-red-400">{match.deaths}</span>{' '}
                    <span className="text-slate-500">/</span> {match.assists}
                  </span>
                  <span className="text-[0.65rem] text-slate-400 mt-1">
                    <strong className="text-slate-300">{match.cs}</strong> CS (
                    {(match.cs / (match.gameDuration / 60)).toFixed(1)}/m)
                  </span>
                </div>

                {/* Eşyalar */}
                <div className="flex items-center gap-1 mt-2 sm:mt-0 flex-wrap justify-center sm:justify-start">
                  {match.items.slice(0, 6).map((itemId, i) => {
                    const itemUrl = ddragon.item(itemId);
                    return itemUrl ? (
                      <div
                        key={i}
                        className="w-6 h-6 rounded bg-slate-800 border border-black/50 overflow-hidden"
                      >
                        <Image
                          src={itemUrl}
                          alt="item"
                          width={24}
                          height={24}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div
                        key={i}
                        className="w-6 h-6 rounded bg-white/5 border border-white/10"
                      />
                    );
                  })}
                </div>

                {/* Rol / Şerit */}
                <div className="sm:ml-auto text-right text-xs text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-white/5 font-mono text-[10px] text-slate-300">
                    {match.lane === 'NONE' ? 'ARAM / SPECIAL' : match.lane}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
