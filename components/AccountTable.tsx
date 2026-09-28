'use client';

import { useState } from 'react';
import type { AccountData } from '@/app/actions/accounts';
import type { CategoryData } from '@/app/actions/categories';
import type { AccountStatus } from '@/models/Account';
import AccountCard from './AccountCard';
import StatusBadge from './StatusBadge';
import RankBadge from './RankBadge';
import PlatformBadge, { FlagTR, FlagEU, FlagUS } from './PlatformBadge';
import RiotIdDisplay from './RiotIdDisplay';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface AccountTableProps {
  accounts: AccountData[];
  categories?: CategoryData[];
  onOpenCategoriesModal?: () => void;
  statusFilter?: AccountStatus | '';
  onStatusFilterChange?: (status: AccountStatus | '') => void;
  platformFilter?: string;
  onPlatformFilterChange?: (platform: string) => void;
  gameFilter?: string;
  onGameFilterChange?: (game: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (category: string) => void;
}

type ViewMode = 'grid' | 'compact-grid' | 'list' | 'table';
type SortOption = 'lastChecked' | 'level_desc' | 'level_asc' | 'riotId_asc';

export default function AccountTable({
  accounts,
  categories = [],
  onOpenCategoriesModal,
  statusFilter: controlledStatus,
  onStatusFilterChange,
  platformFilter: controlledPlatform,
  onPlatformFilterChange,
  gameFilter: controlledGame,
  onGameFilterChange,
  categoryFilter: controlledCategory,
  onCategoryFilterChange,
}: AccountTableProps) {
  const { t } = useLanguage();

  const rankOptions = [
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
  const [sortBy, setSortBy] = useState<SortOption>('lastChecked');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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
    if (!s) return matchesStatus && matchesPlatform && matchesGame && matchesCategory && matchesRank && matchesLevel;

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
    statusFilter || platformFilter || gameFilter || categoryFilter || rankFilter || levelFilter || search
  );

  const clearAllFilters = () => {
    setStatusFilter('');
    setPlatformFilter('');
    setGameFilter('');
    setCategoryFilter('');
    setRankFilter('');
    setLevelFilter('');
    setSearch('');
  };

  return (
    <section>
      {/* ── 🏷️ KATEGORİ FİLTRE ÇİPLERİ (CATEGORY CHIPS) ── */}
      {categories && categories.length > 0 && (
        <div className="mb-4 bg-[#08101e]/80 p-3 rounded-2xl border border-white/5 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 shrink-0 flex items-center gap-1.5">
              <span>🏷️</span> {t('category') || 'Kategori'}:
            </span>

            {/* Tümü */}
            <button
              type="button"
              onClick={() => setCategoryFilter('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                categoryFilter === ''
                  ? 'bg-white/15 text-white border border-white/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                    backgroundColor: isSelected ? `${cat.color}35` : 'transparent',
                    borderColor: isSelected ? cat.color : `${cat.color}30`,
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected ? 'text-white shadow-sm scale-105' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono text-slate-300">
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
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title="Kategorileri Düzenle"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Düzenle</span>
            </button>
          )}
        </div>
      )}

      {/* ── 2. SUNUCU, RANK & SEVİYE TAGLARI ── */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        {/* Sunucu Butonları */}
        <div className="flex items-center gap-1.5 bg-[#0a1322]/70 p-1.5 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setPlatformFilter('')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
              platformFilter === ''
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('all_regions')}
          </button>

          <button
            type="button"
            onClick={() => setPlatformFilter(platformFilter === 'TR1' ? '' : 'TR1')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              platformFilter === 'TR1'
                ? 'bg-rose-500/25 text-rose-200 border border-rose-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FlagTR className="w-3.5 h-2.5" />
            <span>TR</span>
            <span className="text-[10px] font-mono opacity-80">({trCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatformFilter(platformFilter === 'EUW1' ? '' : 'EUW1')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              platformFilter === 'EUW1'
                ? 'bg-sky-500/25 text-sky-200 border border-sky-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FlagEU className="w-3.5 h-2.5" />
            <span>West</span>
            <span className="text-[10px] font-mono opacity-80">({euwCount})</span>
          </button>

          {eunCount > 0 && (
            <button
              type="button"
              onClick={() => setPlatformFilter(platformFilter === 'EUN1' ? '' : 'EUN1')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                platformFilter === 'EUN1'
                  ? 'bg-teal-500/25 text-teal-200 border border-teal-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FlagEU className="w-3.5 h-2.5" />
              <span>EUNE</span>
              <span className="text-[10px] font-mono opacity-80">({eunCount})</span>
            </button>
          )}

          {naCount > 0 && (
            <button
              type="button"
              onClick={() => setPlatformFilter(platformFilter === 'NA1' ? '' : 'NA1')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                platformFilter === 'NA1'
                  ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FlagUS className="w-3.5 h-2.5" />
              <span>NA</span>
              <span className="text-[10px] font-mono opacity-80">({naCount})</span>
            </button>
          )}
        </div>

        {/* 🎯 30+ Level Tag Butonu */}
        <button
          type="button"
          onClick={() => setLevelFilter(levelFilter === '30+' ? '' : '30+')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            levelFilter === '30+'
              ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'bg-[#0a1322]/70 text-slate-400 border border-white/5 hover:border-amber-500/30 hover:text-amber-300'
          }`}
          title="30 seviye ve üzeri (Dereceli maçlara hazır) hesapları filtrele"
        >
          <span>🎯 30+ Level</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
            {level30Count}
          </span>
        </button>

        {/* Rank Seçici Dropdown */}
        <select
          id="filter-rank"
          aria-label="Rank filtrele"
          className="bg-[#0a1322]/90 border border-white/10 hover:border-blue-400/40 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none cursor-pointer transition-colors"
          value={rankFilter}
          onChange={(e) => setRankFilter(e.target.value)}
        >
          {rankOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0f1923] text-[#e8f0fe]">
              {opt.label}
            </option>
          ))}
        </select>

        {/* Sıralama Seçici */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-slate-500">{t('sort_by')}</span>
          <select
            id="sort-by"
            aria-label="Hesapları sırala"
            className="bg-[#0a1322]/90 border border-white/10 hover:border-blue-400/40 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none cursor-pointer transition-colors"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="lastChecked" className="bg-[#0f1923]">{t('sort_last_checked')}</option>
            <option value="level_desc" className="bg-[#0f1923]">{t('sort_level_desc')}</option>
            <option value="level_asc" className="bg-[#0f1923]">{t('sort_level_asc')}</option>
            <option value="riotId_asc" className="bg-[#0f1923]">{t('sort_riot_id')}</option>
          </select>
        </div>
      </div>

      {/* ── 3. ARAMA VE GÖRÜNÜM SEÇİCİ ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* Arama Input */}
        <div className="relative flex-1">
          <input
            id="search-accounts"
            type="text"
            placeholder={t('search_placeholder')}
            className="w-full bg-[#0a1322]/90 border border-white/10 rounded-xl px-4 py-2.5 text-[#e8f0fe] font-sans text-sm outline-none transition-colors focus:border-blue-400 placeholder:text-slate-500 pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1 py-0.5 rounded cursor-pointer"
              title="Aramayı Temizle"
            >
              ✕
            </button>
          )}
        </div>

        {/* Görünüm Modu Seçici */}
        <div className="flex items-center bg-[#0a1322]/90 border border-white/10 rounded-xl overflow-hidden shrink-0 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-[#3d9be9]/20 text-blue-400 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
            title="Geniş Grid"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('compact-grid')}
            className={`px-3 py-2 text-sm border-l border-white/10 transition-colors cursor-pointer ${
              viewMode === 'compact-grid' ? 'bg-[#3d9be9]/20 text-blue-400 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
            title="Kompakt Grid"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zM4 21a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 21a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm border-l border-white/10 transition-colors cursor-pointer ${
              viewMode === 'list' ? 'bg-[#3d9be9]/20 text-blue-400 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
            title="Yatay Liste"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 text-sm border-l border-white/10 transition-colors cursor-pointer ${
              viewMode === 'table' ? 'bg-[#3d9be9]/20 text-blue-400 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
            title="Minimal Tablo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 4. AKTİF FİLTRE ROZETLERİ (Chips) ── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-blue-500/5 border border-blue-500/15 rounded-xl px-3.5 py-2">
          <span className="text-xs text-slate-400 font-medium">Aktif Filtreler:</span>

          {statusFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-purple-500/20 text-purple-200 border border-purple-500/40">
              Durum: <strong className="uppercase">{statusFilter}</strong>
              <button onClick={() => setStatusFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {gameFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
              Oyun: <strong className="uppercase">{gameFilter}</strong>
              <button onClick={() => setGameFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {categoryFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-yellow-500/20 text-yellow-200 border border-yellow-500/40">
              Kategori: <strong>{categoryFilter}</strong>
              <button onClick={() => setCategoryFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {platformFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-rose-500/20 text-rose-200 border border-rose-500/40">
              Sunucu: <strong>{platformFilter}</strong>
              <button onClick={() => setPlatformFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {rankFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-yellow-500/20 text-yellow-200 border border-yellow-500/40">
              Rank: <strong>{rankFilter}</strong>
              <button onClick={() => setRankFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {levelFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-amber-500/20 text-amber-200 border border-amber-500/40">
              Seviye: <strong>{levelFilter}</strong>
              <button onClick={() => setLevelFilter('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          {search && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-slate-700/50 text-slate-200 border border-slate-600">
              Arama: <em>&quot;{search}&quot;</em>
              <button onClick={() => setSearch('')} className="hover:text-white cursor-pointer">✕</button>
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="ml-auto text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline underline-offset-2"
          >
            {t('clear_filters')}
          </button>
        </div>
      )}

      {/* Sonuç sayısı */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-xs text-slate-400">
          <strong className="text-white font-mono">{sortedAndFiltered.length}</strong> {t('accounts_showing')}
          {accounts.length !== sortedAndFiltered.length && (
            <span> ({t('filtered_from').replace('{total}', String(accounts.length))})</span>
          )}
        </p>
      </div>

      {/* ── 5. HESAP LİSTESİ RENDERING ── */}
      {sortedAndFiltered.length === 0 ? (
        <div className="text-center py-16 bg-[#0a1322]/85 rounded-2xl border border-white/5 shadow-xl">
          <span className="text-5xl opacity-40 block mb-4">🔍</span>
          <p className="text-lg font-bold text-white">{t('no_accounts_found')}</p>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            {t('no_accounts_desc')}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md"
            >
              {t('reset_filters')}
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                />
              ))}
            </div>
          )}

          {viewMode === 'compact-grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
                />
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="flex flex-col gap-3">
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
                />
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="overflow-x-auto bg-[#0a1322]/85 rounded-2xl border border-white/5 shadow-xl">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-[#050e18]/90 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t('th_account')}</th>
                    <th className="px-4 py-3 font-semibold">Oyun</th>
                    <th className="px-4 py-3 font-semibold">Kategori</th>
                    <th className="px-4 py-3 font-semibold">{t('th_region')}</th>
                    <th className="px-4 py-3 font-semibold">{t('th_status')}</th>
                    <th className="px-4 py-3 font-semibold text-center">{t('th_level')}</th>
                    <th className="px-4 py-3 font-semibold">{t('th_rank')}</th>
                    <th className="px-4 py-3 font-semibold">{t('th_last_checked')}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t('th_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedAndFiltered.map((account) => (
                    <tr key={account._id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <RiotIdDisplay riotId={account.riotId} />
                          <Link
                            href={`/accounts/${account._id}`}
                            className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
                            title={t('detail_btn')}
                          >
                            ↗
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          onClick={() => setGameFilter(account.game || 'lol')}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
                        >
                          {account.game === 'valorant' ? '🎯 VAL' : account.game === 'tft' ? '♟️ TFT' : account.game === 'other' ? '🎮 OYUN' : '⚔️ LoL'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {account.category ? (
                          <span
                            onClick={() => setCategoryFilter(account.category!)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-300 cursor-pointer transition-colors"
                          >
                            🏷️ {account.category}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">–</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <PlatformBadge platform={account.platform} onClick={setPlatformFilter} />
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={account.status} onClick={setStatusFilter} />
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-white">
                        {account.level || '–'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <RankBadge rank={account.rank || 'UNRANKED'} size={24} onClick={setRankFilter} />
                          <span className="text-xs">{account.rank || 'UNRANKED'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">
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
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/accounts/${account._id}`}
                          className="text-blue-400 hover:text-blue-300 font-medium text-xs bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors inline-block"
                        >
                          {t('detail_btn')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
