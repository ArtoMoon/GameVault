'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { AccountData } from '@/app/actions/accounts';
import type { AccountStatus } from '@/models/Account';
import { getCategories, CategoryData } from '@/app/actions/categories';
import AccountTable from '@/components/AccountTable';
import AddAccountForm from '@/components/AddAccountForm';
import CategoryManagerModal from '@/components/CategoryManagerModal';
import DashboardHeader from '@/components/DashboardHeader';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface DashboardViewProps {
  accounts: AccountData[];
  initialCategories?: CategoryData[];
  initialGameFilter?: string;
  initialAddOpen?: boolean;
}

export default function DashboardView({
  accounts,
  initialCategories = [],
  initialGameFilter = '',
  initialAddOpen,
}: DashboardViewProps) {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<AccountStatus | ''>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [gameFilter, setGameFilter] = useState<string>(initialGameFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(
    initialAddOpen !== undefined ? initialAddOpen : accounts.length === 0
  );
  const [, startTransition] = useTransition();

  const refreshCategories = () => {
    startTransition(async () => {
      const fresh = await getCategories();
      setCategories(fresh);
    });
  };

  // İstatistik sayıları (Aktif oyun/kategori filtresine göre)
  const scopedAccounts = accounts.filter((a) => {
    const matchesGame = !gameFilter || (a.game || 'lol').toLowerCase() === gameFilter.toLowerCase();
    const matchesCat = !categoryFilter || a.category === categoryFilter;
    return matchesGame && matchesCat;
  });

  const total = scopedAccounts.length;
  const available = scopedAccounts.filter((a) => a.status === 'available').length;
  const archived = scopedAccounts.filter((a) => a.status === 'archived').length;
  const active = scopedAccounts.filter((a) => a.status === 'active').length;
  const levelCount = scopedAccounts.filter((a) => a.status === 'level').length;
  const errored = scopedAccounts.filter((a) => a.status === 'error_checking').length;

  // Oyun sayıları (Tüm hesaplar genelinde)
  const gameCounts = {
    all: accounts.length,
    lol: accounts.filter((a) => (a.game || 'lol') === 'lol').length,
    valorant: accounts.filter((a) => a.game === 'valorant').length,
    tft: accounts.filter((a) => a.game === 'tft').length,
    other: accounts.filter((a) => a.game === 'other').length,
  };

  const toggleStatus = (status: AccountStatus | '') => {
    setStatusFilter((prev) => (prev === status ? '' : status));
  };

  return (
    <div className="space-y-5">
      {/* ── 📍 BREADCRUMB & OYUN HİYERARŞİSİ (HESAPLAR > OYUN) ── */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 px-1">
        <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
          <span>🏠</span>
          <span>{t('nav_home')}</span>
        </Link>
        <span className="text-slate-600">/</span>
        <button
          type="button"
          onClick={() => setGameFilter('')}
          className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1 ${
            !gameFilter ? 'text-white font-bold' : ''
          }`}
        >
          <span>🎮</span>
          <span>{t('nav_accounts')}</span>
        </button>
        {gameFilter && (
          <>
            <span className="text-slate-600">/</span>
            <span className="text-yellow-400 font-bold flex items-center gap-1.5 bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/20">
              <span>{gameFilter === 'lol' ? '⚔️ League of Legends' : gameFilter === 'valorant' ? '🎯 Valorant' : gameFilter === 'tft' ? '♟️ TFT' : '🎮 Diğer Oyunlar'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-yellow-400/20 text-yellow-300 font-mono">
                {scopedAccounts.length}
              </span>
            </span>
          </>
        )}
      </div>

      {/* ── 1. KOMUT MERKEZİ BAŞLIĞI (COMMAND HEADER) ── */}
      <DashboardHeader
        isAddOpen={isAddOpen}
        onToggleAdd={() => setIsAddOpen((prev) => !prev)}
        onOpenCategories={() => setIsCatModalOpen(true)}
        totalAccounts={accounts.length}
      />

      {/* ── 2. AÇILIR / KAPANIR HESAP EKLEME PANELİ (COLLAPSIBLE ADD DRAWER) ── */}
      {isAddOpen && (
        <div className="bg-gradient-to-b from-[#0a1424] to-[#070e1a] border border-blue-500/25 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl animate-fade-in relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {t('modal_add_title') || 'Yeni Hesap Ekle'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              ✕ Kapat
            </button>
          </div>

          <AddAccountForm
            categories={categories}
            onCategoriesChange={refreshCategories}
          />
        </div>
      )}

      {/* ── 3. OYUN SEÇİM SEKMELERİ (ESPORTS GAME TABS) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          type="button"
          onClick={() => setGameFilter('')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            gameFilter === ''
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-102 ring-1 ring-blue-400/50'
              : 'bg-[#091120]/90 text-slate-400 hover:text-white border border-white/5 hover:border-white/15'
          }`}
        >
          <span>🌐 Tüm Oyunlar</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
            {gameCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setGameFilter(gameFilter === 'lol' ? '' : 'lol')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            gameFilter === 'lol'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-102 ring-1 ring-yellow-400/50'
              : 'bg-[#091120]/90 text-slate-400 hover:text-white border border-white/5 hover:border-yellow-500/20'
          }`}
        >
          <span>⚔️ League of Legends</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
            {gameCounts.lol}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setGameFilter(gameFilter === 'valorant' ? '' : 'valorant')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            gameFilter === 'valorant'
              ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] scale-102 ring-1 ring-rose-400/50'
              : 'bg-[#091120]/90 text-slate-400 hover:text-white border border-white/5 hover:border-rose-500/20'
          }`}
        >
          <span>🎯 Valorant</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
            {gameCounts.valorant}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setGameFilter(gameFilter === 'tft' ? '' : 'tft')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            gameFilter === 'tft'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-102 ring-1 ring-purple-400/50'
              : 'bg-[#091120]/90 text-slate-400 hover:text-white border border-white/5 hover:border-purple-500/20'
          }`}
        >
          <span>♟️ TFT</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
            {gameCounts.tft}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setGameFilter(gameFilter === 'other' ? '' : 'other')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            gameFilter === 'other'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-102 ring-1 ring-emerald-400/50'
              : 'bg-[#091120]/90 text-slate-400 hover:text-white border border-white/5 hover:border-emerald-500/20'
          }`}
        >
          <span>🎮 Diğer Oyunlar</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
            {gameCounts.other}
          </span>
        </button>
      </div>

      {/* ── 4. KOMPAKT HUD METRİK ÇERÇEVESİ (COMPACT HUD METRICS STRIP) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Toplam */}
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          className={`p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer text-left border ${
            statusFilter === ''
              ? 'bg-[#0e1d35] border-blue-400/60 shadow-[0_0_15px_rgba(59,130,246,0.25)] ring-1 ring-blue-400/40'
              : 'bg-[#070e1a]/85 border-white/5 hover:border-white/15 hover:bg-[#0a1424]'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg shrink-0">
            🗂️
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-white font-mono leading-none">
              {total}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider truncate mt-0.5">
              {t('stat_total')}
            </div>
          </div>
        </button>

        {/* Mevcut / Hazır */}
        <button
          type="button"
          onClick={() => toggleStatus('available')}
          className={`p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer text-left border ${
            statusFilter === 'available'
              ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/40'
              : 'bg-[#070e1a]/85 border-white/5 hover:border-emerald-500/30 hover:bg-[#0a1424]'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg shrink-0">
            ✅
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-white font-mono leading-none">
              {available}
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider truncate mt-0.5">
              {t('stat_available')}
            </div>
          </div>
        </button>

        {/* Aktif */}
        <button
          type="button"
          onClick={() => toggleStatus('active')}
          className={`p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer text-left border ${
            statusFilter === 'active'
              ? 'bg-blue-950/40 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-1 ring-blue-400/40'
              : 'bg-[#070e1a]/85 border-white/5 hover:border-blue-500/30 hover:bg-[#0a1424]'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg shrink-0">
            🎮
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-white font-mono leading-none">
              {active}
            </div>
            <div className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider truncate mt-0.5">
              {t('stat_active')}
            </div>
          </div>
        </button>

        {/* Level Kasılan */}
        <button
          type="button"
          onClick={() => toggleStatus('level')}
          className={`p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer text-left border ${
            statusFilter === 'level'
              ? 'bg-purple-950/40 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.35)] ring-1 ring-purple-400/40'
              : 'bg-[#070e1a]/85 border-white/5 hover:border-purple-500/30 hover:bg-[#0a1424]'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-lg shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-white font-mono leading-none">
              {levelCount}
            </div>
            <div className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider truncate mt-0.5">
              {t('stat_level')}
            </div>
          </div>
        </button>

        {/* Arşiv */}
        <button
          type="button"
          onClick={() => toggleStatus('archived')}
          className={`p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer text-left border ${
            statusFilter === 'archived'
              ? 'bg-rose-950/40 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-400/40'
              : 'bg-[#070e1a]/85 border-white/5 hover:border-rose-500/30 hover:bg-[#0a1424]'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-lg shrink-0">
            📁
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-white font-mono leading-none">
              {archived}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider truncate mt-0.5">
              {t('stat_archived')}
            </div>
          </div>
        </button>

        {/* Ban / Kontrol */}
        <button
          type="button"
          onClick={() => toggleStatus('error_checking')}
          className={`p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer text-left border ${
            statusFilter === 'error_checking'
              ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/40'
              : 'bg-[#070e1a]/85 border-white/5 hover:border-amber-500/30 hover:bg-[#0a1424]'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg shrink-0">
            🚫
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-white font-mono leading-none">
              {errored}
            </div>
            <div className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider truncate mt-0.5">
              {t('stat_banned')}
            </div>
          </div>
        </button>
      </div>

      {/* ── 5. HESAP LİSTESİ & KATEGORİ ARAÇ ÇUBUĞU ── */}
      <div>
        <AccountTable
          accounts={accounts}
          categories={categories}
          onOpenCategoriesModal={() => setIsCatModalOpen(true)}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          platformFilter={platformFilter}
          onPlatformFilterChange={setPlatformFilter}
          gameFilter={gameFilter}
          onGameFilterChange={setGameFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
        />
      </div>

      {/* ── 6. KATEGORİ YÖNETİM MODALI ── */}
      <CategoryManagerModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories}
        onCategoriesChange={refreshCategories}
      />
    </div>
  );
}
