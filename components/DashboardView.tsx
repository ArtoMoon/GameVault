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
    <div className="space-y-6 animate-fade-up">
      {/* ── 📍 BREADCRUMB & OYUN HİYERARŞİSİ (HESAPLAR > OYUN) ── */}
      <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
        <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
          <span>{t('nav_home')}</span>
        </Link>
        <span className="text-white/20">/</span>
        <button
          type="button"
          onClick={() => setGameFilter('')}
          className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
            !gameFilter ? 'text-text-primary font-semibold' : ''
          }`}
        >
          <span>{t('nav_accounts')}</span>
        </button>
        {gameFilter && (
          <>
            <span className="text-white/20">/</span>
            <span className="chip !border-accent-400/30 !bg-accent-500/10 !text-accent-300">
              <span>
                {gameFilter === 'lol'
                  ? '⚔️ League of Legends'
                  : gameFilter === 'valorant'
                  ? '🎯 Valorant'
                  : gameFilter === 'tft'
                  ? '♟️ TFT'
                  : '🎮 Diğer Oyunlar'}
              </span>
              <span className="text-[10px] px-1.5 rounded-full bg-accent-400/20 text-white tabular-nums">
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
        <div className="card p-5 md:p-6 animate-scale-in">
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white tracking-tight">
                {t('modal_add_title') || 'Yeni Hesap Ekle'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="btn btn-ghost btn-sm text-text-muted hover:text-white"
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
      <div className="overflow-x-auto no-scrollbar">
        <div className="segmented">
          <button
            type="button"
            data-active={gameFilter === ''}
            onClick={() => setGameFilter('')}
          >
            <span>🌐 Tüm Oyunlar</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.07] tabular-nums">
              {gameCounts.all}
            </span>
          </button>

          <button
            type="button"
            data-active={gameFilter === 'lol'}
            onClick={() => setGameFilter(gameFilter === 'lol' ? '' : 'lol')}
          >
            <span>⚔️ League of Legends</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.07] tabular-nums">
              {gameCounts.lol}
            </span>
          </button>

          <button
            type="button"
            data-active={gameFilter === 'valorant'}
            onClick={() => setGameFilter(gameFilter === 'valorant' ? '' : 'valorant')}
          >
            <span>🎯 Valorant</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.07] tabular-nums">
              {gameCounts.valorant}
            </span>
          </button>

          <button
            type="button"
            data-active={gameFilter === 'tft'}
            onClick={() => setGameFilter(gameFilter === 'tft' ? '' : 'tft')}
          >
            <span>♟️ TFT</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.07] tabular-nums">
              {gameCounts.tft}
            </span>
          </button>

          <button
            type="button"
            data-active={gameFilter === 'other'}
            onClick={() => setGameFilter(gameFilter === 'other' ? '' : 'other')}
          >
            <span>🎮 Diğer Oyunlar</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.07] tabular-nums">
              {gameCounts.other}
            </span>
          </button>
        </div>
      </div>

      {/* ── 4. KOMPAKT HUD METRİK ÇERÇEVESİ (COMPACT HUD METRICS STRIP) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger">
        {/* Toplam */}
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          className={`card card-interactive p-4 flex items-center gap-3.5 text-left cursor-pointer ${
            statusFilter === ''
              ? '!border-accent-400/50 !bg-accent-500/[0.08]'
              : ''
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-accent-500/15 text-accent-300 flex items-center justify-center text-base shrink-0">
            🗂️
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tabular-nums text-white leading-none">
              {total}
            </div>
            <div className="text-xs text-text-muted truncate mt-1">
              {t('stat_total')}
            </div>
          </div>
        </button>

        {/* Mevcut / Hazır */}
        <button
          type="button"
          onClick={() => toggleStatus('available')}
          className={`card card-interactive p-4 flex items-center gap-3.5 text-left cursor-pointer ${
            statusFilter === 'available'
              ? '!border-emerald-400/50 !bg-emerald-500/[0.08]'
              : ''
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-base shrink-0">
            ✅
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tabular-nums text-white leading-none">
              {available}
            </div>
            <div className="text-xs text-emerald-400/90 truncate mt-1">
              {t('stat_available')}
            </div>
          </div>
        </button>

        {/* Aktif */}
        <button
          type="button"
          onClick={() => toggleStatus('active')}
          className={`card card-interactive p-4 flex items-center gap-3.5 text-left cursor-pointer ${
            statusFilter === 'active'
              ? '!border-sky-400/50 !bg-sky-500/[0.08]'
              : ''
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center text-base shrink-0">
            🎮
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tabular-nums text-white leading-none">
              {active}
            </div>
            <div className="text-xs text-sky-400/90 truncate mt-1">
              {t('stat_active')}
            </div>
          </div>
        </button>

        {/* Level Kasılan */}
        <button
          type="button"
          onClick={() => toggleStatus('level')}
          className={`card card-interactive p-4 flex items-center gap-3.5 text-left cursor-pointer ${
            statusFilter === 'level'
              ? '!border-accent-400/50 !bg-accent-500/[0.08]'
              : ''
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-accent-500/15 text-accent-300 flex items-center justify-center text-base shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tabular-nums text-white leading-none">
              {levelCount}
            </div>
            <div className="text-xs text-accent-300 truncate mt-1">
              {t('stat_level')}
            </div>
          </div>
        </button>

        {/* Arşiv */}
        <button
          type="button"
          onClick={() => toggleStatus('archived')}
          className={`card card-interactive p-4 flex items-center gap-3.5 text-left cursor-pointer ${
            statusFilter === 'archived'
              ? '!border-zinc-400/50 !bg-zinc-500/[0.08]'
              : ''
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-500/15 text-zinc-400 flex items-center justify-center text-base shrink-0">
            📁
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tabular-nums text-white leading-none">
              {archived}
            </div>
            <div className="text-xs text-text-muted truncate mt-1">
              {t('stat_archived')}
            </div>
          </div>
        </button>

        {/* Ban / Kontrol */}
        <button
          type="button"
          onClick={() => toggleStatus('error_checking')}
          className={`card card-interactive p-4 flex items-center gap-3.5 text-left cursor-pointer ${
            statusFilter === 'error_checking'
              ? '!border-amber-400/50 !bg-amber-500/[0.08]'
              : ''
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-base shrink-0">
            🚫
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tabular-nums text-white leading-none">
              {errored}
            </div>
            <div className="text-xs text-amber-400/90 truncate mt-1">
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
