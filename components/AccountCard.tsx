'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { AccountData } from '@/app/actions/accounts';
import { deleteAccount } from '@/app/actions/accounts';
import { syncAccount } from '@/app/actions/accountSync';
import StatusBadge from './StatusBadge';
import RankBadge from './RankBadge';
import PlatformBadge from './PlatformBadge';
import RiotIdDisplay from './RiotIdDisplay';
import { ddragon } from '@/lib/riot/ddragon';
import type { AccountStatus } from '@/models/Account';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface AccountCardProps {
  account: AccountData;
  viewMode?: 'grid' | 'compact-grid' | 'list';
  onStatusClick?: (status: AccountStatus) => void;
  onPlatformClick?: (platform: string) => void;
  onRankClick?: (rank: string) => void;
  onCategoryClick?: (category: string) => void;
  onGameClick?: (game: string) => void;
  onEditClick?: (account: AccountData) => void;
}

function getRankStyle(rank?: string, unrankedLabel?: string) {
  if (!rank || rank.toUpperCase() === 'UNRANKED') {
    return {
      tierTitle: unrankedLabel || 'Unranked',
      lpText: 'Unranked',
      tierColor: 'text-slate-400',
      borderColor: 'border-blue-500/20 hover:border-blue-400/50',
      glowColor: 'hover:shadow-[0_0_25px_rgba(61,155,233,0.12)]',
      accentGradient: 'from-blue-500/10',
    };
  }

  const parts = rank.trim().split(' ');
  const tier = parts[0]?.toLowerCase() || '';
  const tierTitle = parts.slice(0, 2).join(' ') || rank;
  const lpText = parts.slice(2).join(' ') || '0 LP';

  switch (tier) {
    case 'challenger':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-amber-300 font-extrabold tracking-wide drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
        borderColor: 'border-amber-400/40 hover:border-amber-300',
        glowColor: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.25)]',
        accentGradient: 'from-amber-500/20',
      };
    case 'grandmaster':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-rose-400 font-extrabold tracking-wide drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]',
        borderColor: 'border-rose-500/40 hover:border-rose-400',
        glowColor: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.25)]',
        accentGradient: 'from-rose-500/20',
      };
    case 'master':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-purple-400 font-extrabold tracking-wide drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]',
        borderColor: 'border-purple-500/40 hover:border-purple-400',
        glowColor: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]',
        accentGradient: 'from-purple-500/20',
      };
    case 'diamond':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-cyan-300 font-bold tracking-wide drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]',
        borderColor: 'border-cyan-500/35 hover:border-cyan-400',
        glowColor: 'hover:shadow-[0_0_25px_rgba(6,182,212,0.2)]',
        accentGradient: 'from-cyan-500/15',
      };
    case 'emerald':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-emerald-300 font-bold tracking-wide drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]',
        borderColor: 'border-emerald-500/35 hover:border-emerald-400',
        glowColor: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]',
        accentGradient: 'from-emerald-500/15',
      };
    case 'platinum':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-teal-300 font-bold tracking-wide drop-shadow-[0_0_6px_rgba(20,184,166,0.4)]',
        borderColor: 'border-teal-500/35 hover:border-teal-400',
        glowColor: 'hover:shadow-[0_0_25px_rgba(20,184,166,0.2)]',
        accentGradient: 'from-teal-500/15',
      };
    case 'gold':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-amber-300 font-bold tracking-wide drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]',
        borderColor: 'border-amber-500/35 hover:border-amber-400',
        glowColor: 'hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]',
        accentGradient: 'from-amber-500/15',
      };
    case 'silver':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-slate-200 font-semibold tracking-wide',
        borderColor: 'border-slate-500/30 hover:border-slate-400',
        glowColor: 'hover:shadow-[0_0_20px_rgba(148,163,184,0.15)]',
        accentGradient: 'from-slate-500/10',
      };
    case 'bronze':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-amber-500 font-semibold tracking-wide',
        borderColor: 'border-amber-700/30 hover:border-amber-600',
        glowColor: 'hover:shadow-[0_0_20px_rgba(180,83,9,0.15)]',
        accentGradient: 'from-amber-700/10',
      };
    case 'iron':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-stone-400 font-semibold tracking-wide',
        borderColor: 'border-stone-700/30 hover:border-stone-600',
        glowColor: 'hover:shadow-[0_0_15px_rgba(120,113,108,0.15)]',
        accentGradient: 'from-stone-700/10',
      };
    default:
      return {
        tierTitle: rank,
        lpText: '',
        tierColor: 'text-slate-300 font-semibold',
        borderColor: 'border-blue-500/20 hover:border-blue-400/50',
        glowColor: 'hover:shadow-[0_0_25px_rgba(61,155,233,0.12)]',
        accentGradient: 'from-blue-500/10',
      };
  }
}

function formatRelativeTime(
  date?: Date | string | null,
  t?: (k: any) => string,
  lang: string = 'tr'
): string {
  if (!date) return t ? t('time_not_checked') : 'Not checked';
  const d = new Date(date);
  if (isNaN(d.getTime()) || d.getTime() === 0) return t ? t('time_not_checked') : 'Not checked';
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 2) return t ? t('time_just_now') : 'Just now';
  if (diffMins < 60) return t ? t('time_mins_ago').replace('{m}', String(diffMins)) : `${diffMins}m ago`;
  if (diffHours < 24) return t ? t('time_hours_ago').replace('{h}', String(diffHours)) : `${diffHours}h ago`;
  if (diffDays === 1) return t ? t('time_yesterday') : 'Yesterday';
  return d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' });
}

export default function AccountCard({
  account,
  viewMode = 'grid',
  onStatusClick,
  onPlatformClick,
  onRankClick,
  onCategoryClick,
  onGameClick,
  onEditClick,
}: AccountCardProps) {
  const { t, language } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [checkMsg, setCheckMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const rankStyle = getRankStyle(account.rank, t('unranked'));
  const relativeTime = formatRelativeTime(account.lastCheckedAt, t, language);

  const soloRank = account.ranks?.solo;
  const totalGames = soloRank ? (soloRank.wins + soloRank.losses) : 0;
  const winRate = totalGames > 0 && soloRank ? Math.round((soloRank.wins / totalGames) * 100) : null;

  function handleDelete() {
    if (!confirm(t('delete_confirm'))) return;
    startTransition(async () => { await deleteAccount(account._id); });
  }

  function handleCheck() {
    setCheckMsg(null);
    startTransition(async () => {
      const result = await syncAccount(account._id);
      setCheckMsg(
        result.success
          ? { ok: true, text: result.statusChanged ? `Durum: ${result.newStatus}` : 'Bilgiler güncel' }
          : { ok: false, text: result.error ?? 'Hata' }
      );
      if (result.success) {
        setTimeout(() => setCheckMsg(null), 4000);
      }
    });
  }

  const statusColors: Record<AccountStatus, string> = {
    available: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    archived: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
    active: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    level: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]',
    error_checking: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
  };

  // ----- LIST VIEW -----
  if (viewMode === 'list') {
    return (
      <div className={`group relative flex items-center gap-4 bg-gradient-to-r from-[#0d172a]/95 to-[#080f1d]/90 rounded-xl border ${rankStyle.borderColor} overflow-hidden backdrop-blur-md shadow-md transition-all hover:bg-[#132038] p-3 pr-4 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className={`absolute top-0 bottom-0 left-0 w-1 ${statusColors[account.status]}`} />
        
        {/* Profile Avatar */}
        <div className="relative pl-2 shrink-0">
          <div className="w-10 h-10 rounded-lg border border-white/15 bg-slate-800 overflow-hidden shadow-sm flex items-center justify-center">
            {account.game === 'lol' ? (
              <Image 
                src={ddragon.profileIcon(account.profileIconId || 1)} 
                alt="Icon" 
                width={40} 
                height={40} 
                unoptimized 
                className="w-full h-full object-cover"
              />
            ) : account.avatarUrl || account.game === 'albion' ? (
              <img
                src={account.avatarUrl || 'https://albion-log.com/avatars/male/AVATAR_07.webp'}
                alt="Avatar"
                className="w-full h-full object-cover scale-[2.2] transform origin-center"
              />
            ) : (
              <span className="text-lg">
                {account.game === 'valorant' ? '🎯' : account.game === 'tft' ? '♟️' : account.game === 'cs2' ? '🔫' : '🎮'}
              </span>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 bg-black/80 text-white text-[8px] font-mono font-bold px-1 rounded border border-white/20">
            {account.level || 1}
          </span>
        </div>

        {/* Identifier: Platform & Game & Category & Riot ID */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <PlatformBadge platform={account.platform} onClick={onPlatformClick} />
            <span
              onClick={() => onGameClick?.(account.game || 'lol')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
            >
              {account.game === 'valorant' ? '🎯 VAL' : account.game === 'tft' ? '♟️ TFT' : account.game === 'other' ? '🎮 OYUN' : '⚔️ LoL'}
            </span>
            {account.category && (
              <span
                onClick={() => onCategoryClick?.(account.category!)}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-300 cursor-pointer transition-colors"
              >
                🏷️ {account.category}
              </span>
            )}
            <RiotIdDisplay riotId={account.riotId} textClassName="text-sm font-bold text-white" />
            <Link
              href={`/accounts/${account._id}`}
              className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
              title={t('detail_btn')}
            >
              ↗
            </Link>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>🕒 {t('th_last_checked')}: {relativeTime}</span>
          </div>
        </div>

        {/* Rank Showcase */}
        <div className="flex items-center gap-3 px-4 border-l border-white/5 min-w-[170px]">
          <RankBadge rank={account.rank || 'UNRANKED'} size={32} onClick={onRankClick} />
          <div className="flex flex-col">
            <span className={`text-xs font-bold leading-tight ${rankStyle.tierColor}`}>
              {rankStyle.tierTitle}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {winRate !== null ? `${winRate}% WR (${soloRank?.wins}${t('stat_win_char')} ${soloRank?.losses}${t('stat_loss_char')})` : rankStyle.lpText}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="px-4 border-l border-white/5 shrink-0">
          <StatusBadge status={account.status} onClick={onStatusClick} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pl-2 shrink-0">
          <button
            className="flex justify-center items-center bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-300 w-8 h-8 rounded-lg transition-all cursor-pointer"
            onClick={handleCheck}
            disabled={isPending}
            title={t('sync_btn')}
          >
            <span className={isPending ? 'animate-spin-slow' : ''}>↻</span>
          </button>
          {onEditClick && (
            <button
              type="button"
              onClick={() => onEditClick(account)}
              className="flex justify-center items-center bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 w-8 h-8 rounded-lg transition-all cursor-pointer text-xs"
              title="Hesabı Düzenle"
            >
              ✏️
            </button>
          )}
          <Link 
            href={`/accounts/${account._id}`}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-lg text-xs font-medium transition-colors"
          >
            {t('detail_btn')}
          </Link>
          <button
            className="flex justify-center items-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 w-8 h-8 rounded-lg transition-all cursor-pointer"
            onClick={handleDelete}
            disabled={isPending}
            title={t('delete_btn')}
          >
            🗑
          </button>
        </div>
      </div>
    );
  }

  // ----- GRID & COMPACT-GRID VIEW -----
  const isCompact = viewMode === 'compact-grid';
  
  return (
    <div
      className={`group relative flex flex-col bg-gradient-to-b from-[#0f1b2f]/95 via-[#0a1322]/95 to-[#060c16]/98 rounded-2xl border ${rankStyle.borderColor} ${rankStyle.glowColor} backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 shadow-lg overflow-hidden ${
        isPending ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      {/* Top Ambient Glow Gradient */}
      <div className={`absolute top-0 inset-x-0 h-24 bg-gradient-to-b ${rankStyle.accentGradient} to-transparent pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`} />
      
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${statusColors[account.status]}`} />

      <div className={`${isCompact ? 'p-3.5 gap-3' : 'p-4 gap-3.5'} flex flex-col flex-1 relative z-10`}>
        
        {/* Header: Profile Icon + Platform + Riot ID + Direct Link */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            
            {/* Avatar with level badge */}
            <div className="relative shrink-0">
              <div className={`${isCompact ? 'w-10 h-10' : 'w-11 h-11'} rounded-lg border border-white/15 bg-slate-900 overflow-hidden shadow-md group-hover:border-amber-400/40 transition-colors flex items-center justify-center`}>
                {account.game === 'lol' ? (
                  <Image
                    src={ddragon.profileIcon(account.profileIconId || 1)}
                    alt="Avatar"
                    width={44}
                    height={44}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : account.avatarUrl || account.game === 'albion' ? (
                  <img
                    src={account.avatarUrl || 'https://albion-log.com/avatars/male/AVATAR_07.webp'}
                    alt="Avatar"
                    className="w-full h-full object-cover scale-[2.2] transform origin-center"
                  />
                ) : (
                  <span className="text-xl">
                    {account.game === 'valorant'
                      ? '🎯'
                      : account.game === 'tft'
                      ? '♟️'
                      : account.game === 'cs2'
                      ? '🔫'
                      : '🎮'}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 bg-black/90 text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border border-white/20 shadow-xs leading-none">
                {account.level || 1}
              </span>
            </div>

            {/* Platform, Game, Category & Riot ID */}
            <div className="min-w-0 flex-1 flex flex-col">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <PlatformBadge platform={account.platform} onClick={onPlatformClick} />
                <span
                  onClick={() => onGameClick?.(account.game || 'lol')}
                  className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
                >
                  {account.game === 'albion'
                    ? '🛡️ Albion'
                    : account.game === 'valorant'
                    ? '🎯 VAL'
                    : account.game === 'tft'
                    ? '♟️ TFT'
                    : account.game === 'cs2'
                    ? '🔫 CS2'
                    : account.game === 'dota2'
                    ? '🛡️ Dota2'
                    : account.game === 'other'
                    ? '🎮 OYUN'
                    : '⚔️ LoL'}
                </span>
                {account.category && (
                  <span
                    onClick={() => onCategoryClick?.(account.category!)}
                    className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-300 cursor-pointer transition-colors"
                  >
                    🏷️ {account.category}
                  </span>
                )}
                <RiotIdDisplay
                  riotId={account.riotId}
                  textClassName={`${isCompact ? 'text-xs' : 'text-sm'} font-bold text-white tracking-tight`}
                />
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                <span>🕒 {relativeTime}</span>
              </div>
            </div>

          </div>

          {/* Quick arrow */}
          <Link
            href={`/accounts/${account._id}`}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-300 border border-white/10 hover:border-blue-500/30 flex items-center justify-center transition-all shrink-0 text-xs"
            title={t('detail_btn')}
          >
            ↗
          </Link>
        </div>

        {/* Hero Rank Section (Blitz.gg / OP.GG Style) */}
        <div className="bg-[#050b14]/75 border border-white/6 rounded-xl p-2.5 flex items-center justify-between gap-3 group-hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <RankBadge rank={account.rank || 'UNRANKED'} size={isCompact ? 34 : 40} onClick={onRankClick} />
            <div className="flex flex-col min-w-0">
              <span className={`text-xs font-bold truncate leading-tight ${rankStyle.tierColor}`}>
                {rankStyle.tierTitle}
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                {rankStyle.lpText}
              </span>
            </div>
          </div>

          {/* WinRate or Last Check */}
          {winRate !== null ? (
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[11px] font-bold text-emerald-400 font-mono">
                {winRate}% WR
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                {soloRank?.wins}{t('stat_win_char')} {soloRank?.losses}{t('stat_loss_char')}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono shrink-0">
              {relativeTime}
            </span>
          )}
        </div>

        {/* Check feedback toast */}
        {checkMsg && (
          <div className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 ${
            checkMsg.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <span>{checkMsg.ok ? '✓' : '✗'}</span>
            <span className="truncate">{checkMsg.text}</span>
          </div>
        )}

        {/* Footer: Status + Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 mt-auto">
          <StatusBadge status={account.status} onClick={onStatusClick} />

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCheck}
              disabled={isPending}
              className="h-7 px-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 hover:border-blue-400/40 text-blue-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              title={t('sync_btn')}
            >
              <span className={isPending ? 'animate-spin-slow' : ''}>↻</span>
              <span className="text-[11px]">{isPending ? t('checking_btn') : t('check_btn')}</span>
            </button>

            {onEditClick && (
              <button
                type="button"
                onClick={() => onEditClick(account)}
                className="h-7 w-7 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors flex items-center justify-center cursor-pointer text-xs"
                title="Hesabı Düzenle"
              >
                ✏️
              </button>
            )}

            <Link
              href={`/accounts/${account._id}`}
              className="h-7 px-3 rounded-lg bg-gradient-to-r from-blue-600/30 to-blue-500/20 hover:from-blue-600/50 hover:to-blue-500/40 border border-blue-400/30 text-white text-[11px] font-semibold flex items-center gap-1 transition-all"
            >
              {t('detail_btn')}
            </Link>

            <button
              onClick={handleDelete}
              disabled={isPending}
              className="h-7 w-7 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center justify-center cursor-pointer text-xs"
              title={t('delete_btn')}
            >
              🗑
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
