'use client';

import { useState, useTransition } from 'react';
import type { AccountData } from '@/app/actions/accounts';
import { toggleCs2DropClaim } from '@/app/actions/accounts';
import type { CategoryData } from '@/app/actions/categories';
import type { PlatformData } from '@/app/actions/platforms';
import type { AccountStatus } from '@/models/Account';
import {
  hasClaimedCs2DropThisWeek,
  isAccountCs2DropTracked,
  formatTimeUntilNextCs2Reset,
} from '@/lib/cs2/dropTracker';
import AccountCard from './AccountCard';
import StatusBadge from './StatusBadge';
import RankBadge from './RankBadge';
import PlatformBadge, { FlagTR, FlagEU, FlagUS } from './PlatformBadge';
import RiotIdDisplay from './RiotIdDisplay';
import EditAccountModal from './EditAccountModal';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface AccountTableProps {
  accounts: AccountData[];
  categories?: CategoryData[];
  platformsList?: PlatformData[];
  hideCategoryBar?: boolean;
  onOpenCategoriesModal?: () => void;
  statusFilter?: AccountStatus | '';
  onStatusFilterChange?: (status: AccountStatus | '') => void;
  platformFilter?: string;
  onPlatformFilterChange?: (platform: string) => void;
  gameFilter?: string;
  onGameFilterChange?: (game: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (category: string) => void;
  gameSlug?: string;
}

type ViewMode = 'grid' | 'compact-grid' | 'list' | 'table';
type SortOption = 'lastChecked' | 'level_desc' | 'level_asc' | 'riotId_asc';

export default function AccountTable({
  accounts,
  categories = [],
  platformsList = [],
  hideCategoryBar = false,
  onOpenCategoriesModal,
  statusFilter: controlledStatus,
  onStatusFilterChange,
  platformFilter: controlledPlatform,
  onPlatformFilterChange,
  gameFilter: controlledGame,
  onGameFilterChange,
  categoryFilter: controlledCategory,
  onCategoryFilterChange,
  gameSlug,
}: AccountTableProps) {
  const { t } = useLanguage();

  const activeGame = (gameSlug || controlledGame || '').toLowerCase();
  const isAlbion = activeGame === 'albion';
  const isLoL = !activeGame || activeGame === 'lol';

  const rankOptions = isAlbion
    ? [
        { value: '', label: 'Tüm Ranklar' },
        { value: 'Tier 4', label: 'Tier 4' },
        { value: 'Tier 5', label: 'Tier 5' },
        { value: 'Tier 6', label: 'Tier 6' },
        { value: 'Tier 7', label: 'Tier 7' },
        { value: 'Tier 8', label: 'Tier 8' },
        { value: 'Elder', label: 'Elder' },
        { value: 'Master', label: 'Master' },
      ]
    : [
        { value: '', label: t('rank_all') },
        { value: 'UNRANKED', label: t('rank_unranked') },
        { value: 'IRON', label: t('rank_iron') },
        { value: 'BRONZE', label: t('rank_bronze') },
        { value: 'SILVER', label: t('rank_silver') },
        { value: 'GOLD', label: t('rank_gold') },
        { value: 'PLATINUM', label: t('rank_platinum') },
        { value: 'EMERALD', label: t('rank_emerald') },
        { value: 'DIAMOND', label: t('rank_diamond') },
        { value: 'MASTER+', label: t('rank_master_plus') },
      ];

  const [internalStatus, setInternalStatus] = useState<AccountStatus | ''>('');
  const [internalPlatform, setInternalPlatform] = useState('');
  const [internalGame, setInternalGame] = useState('');
  const [internalCategory, setInternalCategory] = useState('');
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<'30+' | '<30' | ''>('');
  const [csDropFilter, setCsDropFilter] = useState<'ready' | 'claimed' | ''>('');
  const [sortBy, setSortBy] = useState<SortOption>('lastChecked');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [editingAccount, setEditingAccount] = useState<AccountData | null>(null);
  const [, startTableTransition] = useTransition();

  // Controlled vs internal state
  const statusFilter = controlledStatus !== undefined ? controlledStatus : internalStatus;
  const setStatusFilter = (val: AccountStatus | '') => {
    if (onStatusFilterChange) onStatusFilterChange(val);
    else setInternalStatus(val);
  };

  const platformFilter = controlledPlatform !== undefined ? controlledPlatform : internalPlatform;
  const setPlatformFilter = (val: string) => {
    if (onPlatformFilterChange) onPlatformFilterChange(val);
    else setInternalPlatform(val);
  };

  const gameFilter = controlledGame !== undefined ? controlledGame : internalGame;
  const setGameFilter = (val: string) => {
    if (onGameFilterChange) onGameFilterChange(val);
    else setInternalGame(val);
  };

  const categoryFilter = controlledCategory !== undefined ? controlledCategory : internalCategory;
  const setCategoryFilter = (val: string) => {
    if (onCategoryFilterChange) onCategoryFilterChange(val);
    else setInternalCategory(val);
  };

  // Live counts for status tags
  const totalCount = accounts.length;
  const availableCount = accounts.filter((a) => a.status === 'available').length;
  const archivedCount = accounts.filter((a) => a.status === 'archived').length;
  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const levelCount = accounts.filter((a) => a.status === 'level').length;
  const errorCount = accounts.filter((a) => a.status === 'error_checking').length;

  // Live counts for platform tags
  const trCount = accounts.filter((a) => (a.platform || 'TR1').toUpperCase() === 'TR1').length;
  const euwCount = accounts.filter((a) => (a.platform || '').toUpperCase() === 'EUW1').length;
  const eunCount = accounts.filter((a) => (a.platform || '').toUpperCase() === 'EUN1').length;
  const naCount = accounts.filter((a) => (a.platform || '').toUpperCase() === 'NA1').length;

  // Live count for 30+ level (Ranked ready)
  const level30Count = accounts.filter((a) => (a.level || 0) >= 30).length;

  // CS2 Kasa Takip sayaçları
  const csTrackedAccounts = accounts.filter(isAccountCs2DropTracked);
  const csReadyCount = csTrackedAccounts.filter(
    (a) => !hasClaimedCs2DropThisWeek(a.csLastDropAt)
  ).length;
  const csClaimedCount = csTrackedAccounts.filter((a) =>
    hasClaimedCs2DropThisWeek(a.csLastDropAt)
  ).length;

  // Filtering
  const filtered = accounts.filter((a) => {
    // 1. Status tag filter (including 'level')
    const matchesStatus = !statusFilter || a.status === statusFilter;

    // 2. Platform tag filter
    const matchesPlatform =
      !platformFilter || (a.platform || 'TR1').toUpperCase() === platformFilter.toUpperCase();

    // 2.1 Game filter
    const matchesGame = !gameFilter || (a.game || 'lol').toLowerCase() === gameFilter.toLowerCase();

    // 2.2 Category filter
    const matchesCategory = !categoryFilter || a.category === categoryFilter;

    // 2.3 CS2 Drop filter
    const matchesCsDrop =
      !csDropFilter ||
      (isAccountCs2DropTracked(a) &&
        (csDropFilter === 'ready'
          ? !hasClaimedCs2DropThisWeek(a.csLastDropAt)
          : hasClaimedCs2DropThisWeek(a.csLastDropAt)));

    // 3. Rank filter
    const aRank = (a.rank || 'UNRANKED').toUpperCase();
    const matchesRank =
      !rankFilter ||
      (rankFilter === 'UNRANKED'
        ? !a.rank || a.rank.toUpperCase() === 'UNRANKED'
        : rankFilter === 'MASTER+'
        ? aRank.includes('MASTER') || aRank.includes('GRANDMASTER') || aRank.includes('CHALLENGER')
        : aRank.startsWith(rankFilter));

    // 4. Level range filter
    const aLevel = a.level || 0;
    const matchesLevel =
      !levelFilter ||
      (levelFilter === '30+' ? aLevel >= 30 : levelFilter === '<30' ? aLevel < 30 : true);

    // 5. Smart search
    const s = search.toLowerCase().trim();
    if (!s)
      return (
        matchesStatus &&
        matchesPlatform &&
        matchesGame &&
        matchesCategory &&
        matchesCsDrop &&
        matchesRank &&
        matchesLevel
      );

    const matchesStatusKeyword =
      (s === 'level' && a.status === 'level') ||
      ((s === 'mevcut' || s === 'available') && a.status === 'available') ||
      ((s === 'arsivlendi' || s === 'arşivlendi' || s === 'archived') && a.status === 'archived') ||
      ((s === 'aktif' || s === 'active') && a.status === 'active') ||
      ((s === 'ban' || s === 'banned') && a.status === 'error_checking');

    const matchesPlatformKeyword =
      (s === 'west' && (a.platform?.toLowerCase() === 'euw1' || a.platform?.toLowerCase() === 'euw')) ||
      (s === 'tr' && (a.platform?.toLowerCase() === 'tr1' || a.platform?.toLowerCase() === 'tr')) ||
      (s === 'eune' && (a.platform?.toLowerCase() === 'eun1' || a.platform?.toLowerCase() === 'eun')) ||
      (s === 'na' && (a.platform?.toLowerCase() === 'na1' || a.platform?.toLowerCase() === 'na'));

    const matchesRankKeyword = (a.rank || '').toLowerCase().includes(s);

    const matchesText =
      a.riotId.toLowerCase().includes(s) ||
      (a.username && a.username.toLowerCase().includes(s)) ||
      (a.summonerName && a.summonerName.toLowerCase().includes(s)) ||
      (a.category && a.category.toLowerCase().includes(s)) ||
      (a.game && a.game.toLowerCase().includes(s)) ||
      (a.notes && a.notes.toLowerCase().includes(s)) ||
      (a.platform && a.platform.toLowerCase().includes(s)) ||
      String(a.level || '').includes(s);

    return (
      matchesStatus &&
      matchesPlatform &&
      matchesGame &&
      matchesCategory &&
      matchesCsDrop &&
      matchesRank &&
      matchesLevel &&
      (matchesText || matchesStatusKeyword || matchesPlatformKeyword || matchesRankKeyword)
    );
  });

  // Sorting
  const sortedAndFiltered = [...filtered].sort((a, b) => {
    if (sortBy === 'level_desc') return (b.level || 0) - (a.level || 0);
    if (sortBy === 'level_asc') return (a.level || 0) - (b.level || 0);
    if (sortBy === 'riotId_asc') return a.riotId.localeCompare(b.riotId);
    if (sortBy === 'lastChecked') {
      const timeA = a.lastCheckedAt ? new Date(a.lastCheckedAt).getTime() : 0;
      const timeB = b.lastCheckedAt ? new Date(b.lastCheckedAt).getTime() : 0;
      return timeB - timeA;
    }
    return 0;
  });

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    statusFilter ||
      platformFilter ||
      gameFilter ||
      categoryFilter ||
      csDropFilter ||
      rankFilter ||
      levelFilter ||
      search
  );

  const clearAllFilters = () => {
    setStatusFilter('');
    setPlatformFilter('');
    setGameFilter('');
    setCategoryFilter('');
    setCsDropFilter('');
    setRankFilter('');
    setLevelFilter('');
    setSearch('');
  };

  return (
    <section className="space-y-4">
      {/* ── 🏷️ KATEGORİ FİLTRE ÇİPLERİ (CATEGORY CHIPS) ── */}
      {!hideCategoryBar && categories && categories.length > 0 && (
        <div className="card p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider pl-1 shrink-0 flex items-center gap-1.5">
              <span>🏷️</span> {t('category') || 'Kategori'}:
            </span>

            {/* Tümü */}
            <button
              type="button"
              onClick={() => setCategoryFilter('')}
              className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 border ${
                categoryFilter === ''
                  ? 'bg-accent-500/15 text-white border-accent-500/35'
                  : 'border-transparent text-text-secondary hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {t('tag_all') || 'Tümü'}
            </button>

            {/* Özel Kategori Çipleri */}
            {categories.map((cat) => {
              const count = accounts.filter((a) => a.category === cat.name).length;
              const isSelected = categoryFilter === cat.name;

              return (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => setCategoryFilter(isSelected ? '' : cat.name)}
                  style={{
                    backgroundColor: isSelected ? `${cat.color}26` : 'transparent',
                    borderColor: isSelected ? cat.color : `${cat.color}30`,
                  }}
                  className={`h-7 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected ? 'text-white' : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/35 font-mono tabular-nums text-text-secondary leading-none">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {onOpenCategoriesModal && (
            <button
              type="button"
              onClick={onOpenCategoriesModal}
              className="btn btn-secondary btn-sm shrink-0"
              title="Kategorileri Düzenle"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Düzenle</span>
            </button>
          )}
        </div>
      )}

      {/* ── 2. SUNUCU, RANK & SEVİYE TAGLARI ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Sunucu Butonları */}
        <div className="segmented overflow-x-auto no-scrollbar">
          <button
            type="button"
            data-active={platformFilter === ''}
            onClick={() => setPlatformFilter('')}
            className="shrink-0"
          >
            {t('all_regions')}
          </button>

          {isAlbion ? (
            <>
              {['Europe', 'Americas', 'Asia', 'Global'].map((srv) => {
                const count = accounts.filter(
                  (a) => (a.platform || '').toLowerCase() === srv.toLowerCase()
                ).length;
                const isSelected = platformFilter.toLowerCase() === srv.toLowerCase();
                return (
                  <button
                    key={srv}
                    type="button"
                    data-active={isSelected}
                    onClick={() => setPlatformFilter(isSelected ? '' : srv)}
                    className="shrink-0"
                  >
                    <span>{srv === 'Europe' ? '🇪🇺' : srv === 'Americas' ? '🇺🇸' : srv === 'Asia' ? '🌏' : '🌐'}</span>
                    <span>{srv}</span>
                    <span className="text-[10px] font-mono tabular-nums opacity-75">({count})</span>
                  </button>
                );
              })}
            </>
          ) : isLoL ? (
            <>
              <button
                type="button"
                data-active={platformFilter === 'TR1'}
                onClick={() => setPlatformFilter(platformFilter === 'TR1' ? '' : 'TR1')}
                className="shrink-0"
              >
                <FlagTR className="w-3.5 h-2.5" />
                <span>TR</span>
                <span className="text-[10px] font-mono tabular-nums opacity-75">({trCount})</span>
              </button>

              <button
                type="button"
                data-active={platformFilter === 'EUW1'}
                onClick={() => setPlatformFilter(platformFilter === 'EUW1' ? '' : 'EUW1')}
                className="shrink-0"
              >
                <FlagEU className="w-3.5 h-2.5" />
                <span>West</span>
                <span className="text-[10px] font-mono tabular-nums opacity-75">({euwCount})</span>
              </button>

              {eunCount > 0 && (
                <button
                  type="button"
                  data-active={platformFilter === 'EUN1'}
                  onClick={() => setPlatformFilter(platformFilter === 'EUN1' ? '' : 'EUN1')}
                  className="shrink-0"
                >
                  <FlagEU className="w-3.5 h-2.5" />
                  <span>EUNE</span>
                  <span className="text-[10px] font-mono tabular-nums opacity-75">({eunCount})</span>
                </button>
              )}

              {naCount > 0 && (
                <button
                  type="button"
                  data-active={platformFilter === 'NA1'}
                  onClick={() => setPlatformFilter(platformFilter === 'NA1' ? '' : 'NA1')}
                  className="shrink-0"
                >
                  <FlagUS className="w-3.5 h-2.5" />
                  <span>NA</span>
                  <span className="text-[10px] font-mono tabular-nums opacity-75">({naCount})</span>
                </button>
              )}
            </>
          ) : (
            Array.from(new Set(accounts.map((a) => a.platform).filter(Boolean))).map((plat) => {
              const count = accounts.filter((a) => a.platform === plat).length;
              const isSelected = platformFilter.toLowerCase() === plat.toLowerCase();
              return (
                <button
                  key={plat}
                  type="button"
                  data-active={isSelected}
                  onClick={() => setPlatformFilter(isSelected ? '' : plat)}
                  className="shrink-0"
                >
                  <span>{plat}</span>
                  <span className="text-[10px] font-mono tabular-nums opacity-75">({count})</span>
                </button>
              );
            })
          )}
        </div>

        {/* 🎯 30+ Level Tag Butonu (Sadece LoL için) */}
        {isLoL && (
          <button
            type="button"
            onClick={() => setLevelFilter(levelFilter === '30+' ? '' : '30+')}
            className={`btn btn-sm ${
              levelFilter === '30+'
                ? 'bg-accent-500/15 text-accent-300 border-accent-500/35'
                : 'btn-secondary'
            }`}
            title="30 seviye ve üzeri (Dereceli maçlara hazır) hesapları filtrele"
          >
            <span>🎯 30+ Level</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.08] font-mono tabular-nums leading-none">
              {level30Count}
            </span>
          </button>
        )}

        {/* 📦 CS2 Haftalık Kasa Filtre Butonları */}
        {(csTrackedAccounts.length > 0 || activeGame === 'cs2') && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCsDropFilter(csDropFilter === 'ready' ? '' : 'ready')}
              className={`btn btn-sm ${
                csDropFilter === 'ready'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                  : 'btn-secondary'
              }`}
              title={`Haftalık CS2 kasası düşürülmeye hazır hesaplar (Sıfırlanmaya: ${formatTimeUntilNextCs2Reset()})`}
            >
              <span>📦 Kasa Hazır</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono tabular-nums leading-none">
                {csReadyCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCsDropFilter(csDropFilter === 'claimed' ? '' : 'claimed')}
              className={`btn btn-sm ${
                csDropFilter === 'claimed'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                  : 'btn-secondary'
              }`}
              title="Bu haftaki CS2 kasası alınmış hesaplar"
            >
              <span>✅ Kasa Alındı</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono tabular-nums leading-none">
                {csClaimedCount}
              </span>
            </button>
          </div>
        )}

        {/* Rank Seçici Dropdown */}
        <select
          id="filter-rank"
          aria-label="Rank filtrele"
          className="input !w-auto !h-9 text-xs cursor-pointer"
          value={rankFilter}
          onChange={(e) => setRankFilter(e.target.value)}
        >
          {rankOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Sıralama Seçici */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-text-muted">{t('sort_by')}</span>
          <select
            id="sort-by"
            aria-label="Hesapları sırala"
            className="input !w-auto !h-9 text-xs cursor-pointer"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="lastChecked">{t('sort_last_checked')}</option>
            <option value="level_desc">{t('sort_level_desc')}</option>
            <option value="level_asc">{t('sort_level_asc')}</option>
            <option value="riotId_asc">{t('sort_riot_id')}</option>
          </select>
        </div>
      </div>

      {/* ── 3. ARAMA VE GÖRÜNÜM SEÇİCİ ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Arama Input */}
        <div className="relative flex-1">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="search-accounts"
            type="text"
            placeholder={
              isAlbion
                ? 'Albion karakteri, kullanıcı adı veya not ara...'
                : isLoL
                ? t('search_placeholder')
                : 'Hesap, kullanıcı adı veya not ara...'
            }
            className="input !pl-10 !pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs px-1.5 py-0.5 rounded-md cursor-pointer"
              title="Aramayı Temizle"
            >
              ✕
            </button>
          )}
        </div>

        {/* Görünüm Modu Seçici */}
        <div className="segmented shrink-0 self-end sm:self-auto">
          <button
            type="button"
            data-active={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
            title="Geniş Grid"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            type="button"
            data-active={viewMode === 'compact-grid'}
            onClick={() => setViewMode('compact-grid')}
            title="Kompakt Grid"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zM4 21a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 21a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" />
            </svg>
          </button>
          <button
            type="button"
            data-active={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            title="Yatay Liste"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            type="button"
            data-active={viewMode === 'table'}
            onClick={() => setViewMode('table')}
            title="Minimal Tablo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 4. AKTİF FİLTRE ROZETLERİ (Chips) ── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 card px-3.5 py-2.5">
          <span className="text-xs text-text-muted font-medium">Aktif Filtreler:</span>

          {statusFilter && (
            <span className="chip !bg-accent-500/12 !text-accent-300 !border-accent-500/25">
              Durum: <strong className="uppercase">{statusFilter}</strong>
              <button type="button" onClick={() => setStatusFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {gameFilter && (
            <span className="chip !bg-glow-500/12 !text-glow-400 !border-glow-500/25">
              Oyun: <strong className="uppercase">{gameFilter}</strong>
              <button type="button" onClick={() => setGameFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {categoryFilter && (
            <span className="chip !bg-accent-500/12 !text-accent-300 !border-accent-500/25">
              Kategori: <strong>{categoryFilter}</strong>
              <button type="button" onClick={() => setCategoryFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {platformFilter && (
            <span className="chip">
              Sunucu: <strong className="text-white">{platformFilter}</strong>
              <button type="button" onClick={() => setPlatformFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {rankFilter && (
            <span className="chip">
              Rank: <strong className="text-white">{rankFilter}</strong>
              <button type="button" onClick={() => setRankFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {levelFilter && (
            <span className="chip">
              Seviye: <strong className="text-white">{levelFilter}</strong>
              <button type="button" onClick={() => setLevelFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {search && (
            <span className="chip">
              Arama: <em className="text-white">&quot;{search}&quot;</em>
              <button type="button" onClick={() => setSearch('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
          >
            {t('clear_filters')}
          </button>
        </div>
      )}

      {/* Sonuç sayısı */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-text-muted">
          <strong className="text-white font-mono tabular-nums">{sortedAndFiltered.length}</strong> {t('accounts_showing')}
          {accounts.length !== sortedAndFiltered.length && (
            <span> ({t('filtered_from').replace('{total}', String(accounts.length))})</span>
          )}
        </p>
      </div>

      {/* ── 5. HESAP LİSTESİ RENDERING ── */}
      {sortedAndFiltered.length === 0 ? (
        <div className="card py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent-500/10 border border-accent-500/20 text-accent-300 flex items-center justify-center mx-auto mb-4 text-2xl">
            🔍
          </div>
          <p className="text-lg font-bold tracking-tight text-white">{t('no_accounts_found')}</p>
          <p className="text-sm text-text-secondary mt-1.5 max-w-md mx-auto">
            {t('no_accounts_desc')}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="btn btn-primary mt-5"
            >
              {t('reset_filters')}
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger">
              {sortedAndFiltered.map((account) => (
                <AccountCard
                  key={account._id}
                  account={account}
                  viewMode="grid"
                  onStatusClick={setStatusFilter}
                  onPlatformClick={setPlatformFilter}
                  onRankClick={setRankFilter}
                  onCategoryClick={setCategoryFilter}
                  onGameClick={setGameFilter}
                  onEditClick={setEditingAccount}
                />
              ))}
            </div>
          )}

          {viewMode === 'compact-grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 stagger">
              {sortedAndFiltered.map((account) => (
                <AccountCard
                  key={account._id}
                  account={account}
                  viewMode="compact-grid"
                  onStatusClick={setStatusFilter}
                  onPlatformClick={setPlatformFilter}
                  onRankClick={setRankFilter}
                  onCategoryClick={setCategoryFilter}
                  onGameClick={setGameFilter}
                  onEditClick={setEditingAccount}
                />
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="flex flex-col gap-3 stagger">
              {sortedAndFiltered.map((account) => (
                <AccountCard
                  key={account._id}
                  account={account}
                  viewMode="list"
                  onStatusClick={setStatusFilter}
                  onPlatformClick={setPlatformFilter}
                  onRankClick={setRankFilter}
                  onCategoryClick={setCategoryFilter}
                  onGameClick={setGameFilter}
                  onEditClick={setEditingAccount}
                />
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="card overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-text-secondary">
                  <thead className="text-[11px] uppercase tracking-wider text-text-muted border-b border-white/[0.06] bg-white/[0.015]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{t('th_account')}</th>
                      <th className="px-4 py-3 font-semibold">Oyun</th>
                      <th className="px-4 py-3 font-semibold">Kategori</th>
                      <th className="px-4 py-3 font-semibold">{t('th_region')}</th>
                      <th className="px-4 py-3 font-semibold">{t('th_status')}</th>
                      <th className="px-4 py-3 font-semibold">CS2 Kasa</th>
                      <th className="px-4 py-3 font-semibold text-center">{t('th_level')}</th>
                      <th className="px-4 py-3 font-semibold">{t('th_rank')}</th>
                      <th className="px-4 py-3 font-semibold">{t('th_last_checked')}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t('th_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAndFiltered.map((account) => (
                      <tr
                        key={account._id}
                        className="border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.025] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <RiotIdDisplay riotId={account.riotId} />
                            <Link
                              href={`/accounts/${account._id}`}
                              className="text-xs text-text-muted hover:text-accent-300 transition-colors"
                              title={t('detail_btn')}
                            >
                              ↗
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            onClick={() => setGameFilter(account.game || 'lol')}
                            className="inline-flex items-center h-5 px-2 rounded-md text-[10px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-text-secondary cursor-pointer transition-colors"
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
                        </td>
                        <td className="px-4 py-3">
                          {account.category ? (
                            <span
                              onClick={() => setCategoryFilter(account.category!)}
                              className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/25 text-accent-300 cursor-pointer transition-colors"
                            >
                              🏷️ {account.category}
                            </span>
                          ) : (
                            <span className="text-text-muted text-xs">–</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <PlatformBadge platform={account.platform} onClick={setPlatformFilter} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={account.status} onClick={setStatusFilter} />
                        </td>
                        <td className="px-4 py-3">
                          {isAccountCs2DropTracked(account) ? (
                            <button
                              type="button"
                              onClick={() =>
                                startTableTransition(async () => {
                                  await toggleCs2DropClaim(
                                    account._id,
                                    !hasClaimedCs2DropThisWeek(account.csLastDropAt)
                                  );
                                })
                              }
                              className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                hasClaimedCs2DropThisWeek(account.csLastDropAt)
                                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                                  : 'bg-amber-500/15 border-amber-400/50 text-amber-300 hover:bg-amber-500/25'
                              }`}
                            >
                              <span>
                                {hasClaimedCs2DropThisWeek(account.csLastDropAt)
                                  ? '✅ Alındı'
                                  : '📦 Hazır'}
                              </span>
                              {(account.csTotalDrops || 0) > 0 && (
                                <span className="font-mono opacity-80">
                                  ({account.csTotalDrops})
                                </span>
                              )}
                            </button>
                          ) : (
                            <span className="text-text-muted text-xs">–</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-bold tabular-nums text-white">
                          {account.level || '–'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <RankBadge rank={account.rank || 'UNRANKED'} size={24} onClick={setRankFilter} />
                            <span className="text-xs text-text-primary">{account.rank || 'UNRANKED'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted font-mono tabular-nums">
                          {account.lastCheckedAt
                            ? new Date(account.lastCheckedAt).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : t('never')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingAccount(account)}
                              className="btn btn-ghost btn-sm btn-icon !w-7 !h-7"
                              title="Hesabı Düzenle"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>
                            <Link
                              href={`/accounts/${account._id}`}
                              className="btn btn-secondary btn-sm !h-7 !px-2.5 text-[11px]"
                            >
                              {t('detail_btn')}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 6. HESAP DÜZENLEME MODALI ── */}
      <EditAccountModal
        isOpen={!!editingAccount}
        onClose={() => setEditingAccount(null)}
        account={editingAccount}
        categories={categories}
        platformsList={platformsList}
        onAccountUpdated={() => {
          setEditingAccount(null);
        }}
      />
    </section>
  );
}
