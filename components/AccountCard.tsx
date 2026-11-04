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
      tierColor: 'text-text-secondary font-semibold',
      accentGradient: 'from-white/[0.04]',
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
        tierColor: 'text-amber-300 font-bold tracking-tight',
        accentGradient: 'from-amber-500/15',
      };
    case 'grandmaster':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-rose-300 font-bold tracking-tight',
        accentGradient: 'from-rose-500/15',
      };
    case 'master':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-accent-300 font-bold tracking-tight',
        accentGradient: 'from-accent-500/18',
      };
    case 'diamond':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-cyan-300 font-bold tracking-tight',
        accentGradient: 'from-cyan-500/14',
      };
    case 'emerald':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-emerald-300 font-bold tracking-tight',
        accentGradient: 'from-emerald-500/14',
      };
    case 'platinum':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-teal-300 font-bold tracking-tight',
        accentGradient: 'from-teal-500/14',
      };
    case 'gold':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-amber-300 font-bold tracking-tight',
        accentGradient: 'from-amber-500/12',
      };
    case 'silver':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-zinc-200 font-semibold tracking-tight',
        accentGradient: 'from-zinc-400/10',
      };
    case 'bronze':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-orange-300 font-semibold tracking-tight',
        accentGradient: 'from-orange-500/10',
      };
    case 'iron':
      return {
        tierTitle,
        lpText,
        tierColor: 'text-stone-400 font-semibold tracking-tight',
        accentGradient: 'from-stone-500/10',
      };
    default:
      return {
        tierTitle: rank,
        lpText: '',
        tierColor: 'text-text-primary font-semibold',
        accentGradient: 'from-accent-500/10',
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

function getGameBadgeLabel(game?: string) {
  switch (game) {
    case 'albion':
      return '🛡️ Albion';
    case 'valorant':
      return '🎯 VAL';
    case 'tft':
      return '♟️ TFT';
    case 'cs2':
      return '🔫 CS2';
    case 'dota2':
      return '🛡️ Dota2';
    case 'other':
      return '🎮 OYUN';
    default:
      return '⚔️ LoL';
  }
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
  const totalGames = soloRank ? soloRank.wins + soloRank.losses : 0;
  const winRate = totalGames > 0 && soloRank ? Math.round((soloRank.wins / totalGames) * 100) : null;

  function handleDelete() {
    if (!confirm(t('delete_confirm'))) return;
    startTransition(async () => {
      await deleteAccount(account._id);
    });
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

  const statusBarColors: Record<AccountStatus, string> = {
    available: 'bg-emerald-400',
    archived: 'bg-zinc-500',
    active: 'bg-sky-400',
    level: 'bg-amber-400',
    error_checking: 'bg-red-400',
  };

  // ----- LIST VIEW -----
  if (viewMode === 'list') {
    return (
      <div
        className={`card card-interactive group flex items-center gap-4 px-4 py-3 overflow-hidden ${
          isPending ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <span className={`absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full ${statusBarColors[account.status]}`} />

        {/* Profile Avatar */}
        <div className="relative pl-1 shrink-0">
          <div className="w-10 h-10 rounded-xl border border-white/10 bg-ink-800 overflow-hidden flex items-center justify-center">
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
          <span className="absolute -bottom-1 -right-1 bg-ink-900/95 text-text-primary text-[9px] font-mono tabular-nums font-semibold px-1 py-0.5 rounded-md border border-white/10 leading-none">
            {account.level || 1}
          </span>
        </div>

        {/* Identifier: Platform & Game & Category & Riot ID */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <PlatformBadge platform={account.platform} onClick={onPlatformClick} />
            <span
              onClick={() => onGameClick?.(account.game || 'lol')}
              className="inline-flex items-center h-5 px-2 rounded-md text-[10px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-text-secondary cursor-pointer transition-colors"
            >
              {getGameBadgeLabel(account.game)}
            </span>
            {account.category && (
              <span
                onClick={() => onCategoryClick?.(account.category!)}
                className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/25 text-accent-300 cursor-pointer transition-colors"
              >
                🏷️ {account.category}
              </span>
            )}
            <RiotIdDisplay riotId={account.riotId} textClassName="text-sm font-bold text-white" />
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>
              {t('th_last_checked')}: {relativeTime}
            </span>
          </div>
        </div>

        {/* Rank Showcase */}
        <div className="flex items-center gap-3 px-4 border-l border-white/[0.06] min-w-[175px]">
          <RankBadge rank={account.rank || 'UNRANKED'} size={32} onClick={onRankClick} />
          <div className="flex flex-col min-w-0">
            <span className={`text-xs leading-tight truncate ${rankStyle.tierColor}`}>
              {rankStyle.tierTitle}
            </span>
            <span className="text-[11px] text-text-muted tabular-nums">
              {winRate !== null
                ? `${winRate}% WR (${soloRank?.wins}${t('stat_win_char')} ${soloRank?.losses}${t('stat_loss_char')})`
                : rankStyle.lpText}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="px-4 border-l border-white/[0.06] shrink-0">
          <StatusBadge status={account.status} onClick={onStatusClick} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pl-1 shrink-0">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon !w-8 !h-8"
            onClick={handleCheck}
            disabled={isPending}
            title={t('sync_btn')}
          >
            <SyncIcon spinning={isPending} />
          </button>
          {onEditClick && (
            <button
              type="button"
              onClick={() => onEditClick(account)}
              className="btn btn-ghost btn-sm btn-icon !w-8 !h-8"
              title="Hesabı Düzenle"
            >
              <EditIcon />
            </button>
          )}
          <Link
            href={`/accounts/${account._id}`}
            className="btn btn-secondary btn-sm"
          >
            {t('detail_btn')}
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon !w-8 !h-8 hover:!text-red-300 hover:!bg-red-500/10"
            onClick={handleDelete}
            disabled={isPending}
            title={t('delete_btn')}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    );
  }

  // ----- GRID & COMPACT-GRID VIEW -----
  const isCompact = viewMode === 'compact-grid';

  return (
    <div
      className={`card card-interactive group flex flex-col rounded-2xl overflow-hidden ${
        isPending ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      {/* Top Ambient Glow Gradient */}
      <div
        className={`absolute top-0 inset-x-0 h-20 bg-gradient-to-b ${rankStyle.accentGradient} to-transparent pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
      />

      <div className={`${isCompact ? 'p-3.5 gap-3' : 'p-4 gap-3.5'} flex flex-col flex-1 relative z-10`}>
        {/* Header: Profile Icon + Platform + Riot ID + Direct Link */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar with level badge */}
            <div className="relative shrink-0">
              <div
                className={`${
                  isCompact ? 'w-10 h-10' : 'w-11 h-11'
                } rounded-xl border border-white/10 bg-ink-800 overflow-hidden group-hover:border-accent-400/40 transition-colors flex items-center justify-center`}
              >
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
              <span className="absolute -bottom-1 -right-1 bg-ink-900/95 text-text-primary text-[9.5px] font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded-md border border-white/12 leading-none">
                {account.level || 1}
              </span>
            </div>

            {/* Platform, Game, Category & Riot ID */}
            <div className="min-w-0 flex-1 flex flex-col">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap mb-0.5">
                <PlatformBadge platform={account.platform} onClick={onPlatformClick} />
                <span
                  onClick={() => onGameClick?.(account.game || 'lol')}
                  className="inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-text-secondary cursor-pointer transition-colors"
                >
                  {getGameBadgeLabel(account.game)}
                </span>
                {account.category && (
                  <span
                    onClick={() => onCategoryClick?.(account.category!)}
                    className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/25 text-accent-300 cursor-pointer transition-colors"
                  >
                    🏷️ {account.category}
                  </span>
                )}
              </div>
              <RiotIdDisplay
                riotId={account.riotId}
                textClassName={`${isCompact ? 'text-xs' : 'text-sm'} font-bold text-white tracking-tight`}
              />
            </div>
          </div>

          {/* Quick arrow */}
          <Link
            href={`/accounts/${account._id}`}
            className="btn btn-ghost btn-sm btn-icon !w-7 !h-7 shrink-0 opacity-70 group-hover:opacity-100"
            title={t('detail_btn')}
          >
            <ArrowUpRightIcon />
          </Link>
        </div>

        {/* Hero Rank Section */}
        <div className="bg-ink-950/55 border border-white/[0.06] rounded-xl p-2.5 flex items-center justify-between gap-3 group-hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <RankBadge rank={account.rank || 'UNRANKED'} size={isCompact ? 34 : 38} onClick={onRankClick} />
            <div className="flex flex-col min-w-0">
              <span className={`text-xs truncate leading-tight ${rankStyle.tierColor}`}>
                {rankStyle.tierTitle}
              </span>
              <span className="text-[11px] text-text-muted font-medium tabular-nums truncate mt-0.5">
                {rankStyle.lpText}
              </span>
            </div>
          </div>

          {/* WinRate or Last Check */}
          {winRate !== null ? (
            <div className="flex flex-col items-end shrink-0 tabular-nums">
              <span className="text-[11px] font-bold text-emerald-300 font-mono">
                {winRate}% WR
              </span>
              <span className="text-[10px] text-text-muted font-mono">
                {soloRank?.wins}
                {t('stat_win_char')} {soloRank?.losses}
                {t('stat_loss_char')}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-text-muted tabular-nums shrink-0">
              {relativeTime}
            </span>
          )}
        </div>

        {/* Check feedback toast */}
        {checkMsg && (
          <div
            className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 animate-fade-in ${
              checkMsg.ok
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                : 'bg-red-500/10 border-red-500/25 text-red-300'
            }`}
          >
            <span>{checkMsg.ok ? '✓' : '✗'}</span>
            <span className="truncate">{checkMsg.text}</span>
          </div>
        )}

        {/* Footer: Status + Subtle Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06] mt-auto">
          <StatusBadge status={account.status} onClick={onStatusClick} />

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCheck}
              disabled={isPending}
              className="btn btn-ghost btn-sm !h-7 !px-2 text-[11px]"
              title={t('sync_btn')}
            >
              <SyncIcon spinning={isPending} />
              {!isCompact && <span>{isPending ? t('checking_btn') : t('check_btn')}</span>}
            </button>

            {onEditClick && (
              <button
                type="button"
                onClick={() => onEditClick(account)}
                className="btn btn-ghost btn-sm btn-icon !w-7 !h-7"
                title="Hesabı Düzenle"
              >
                <EditIcon />
              </button>
            )}

            <Link
              href={`/accounts/${account._id}`}
              className="btn btn-secondary btn-sm !h-7 !px-2.5 text-[11px]"
            >
              {t('detail_btn')}
            </Link>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="btn btn-ghost btn-sm btn-icon !w-7 !h-7 hover:!text-red-300 hover:!bg-red-500/10"
              title={t('delete_btn')}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? 'animate-spin-slow' : ''}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}
