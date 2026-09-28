'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { AccountData } from '@/app/actions/accounts';
import type { AccountStatus } from '@/models/Account';
import { getCategories, CategoryData } from '@/app/actions/categories';
import { PlatformData } from '@/app/actions/platforms';
import AccountTable from '@/components/AccountTable';
import AddAccountForm from '@/components/AddAccountForm';
import AccountSyncButton from '@/components/AccountSyncButton';
import CategoryManagerModal from '@/components/CategoryManagerModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface GameAccountsViewProps {
  accounts: AccountData[];
  initialCategories?: CategoryData[];
  initialPlatforms?: PlatformData[];
  platformSlug: string;
  gameSlug: string;
  initialAddOpen?: boolean;
}

export default function GameAccountsView({
  accounts,
  initialCategories = [],
  initialPlatforms = [],
  platformSlug,
  gameSlug,
  initialAddOpen = false,
}: GameAccountsViewProps) {
  const { t } = useLanguage();

  const [statusFilter, setStatusFilter] = useState<AccountStatus | ''>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(initialAddOpen);
  const [, startTransition] = useTransition();

  const refreshCategories = () => {
    startTransition(async () => {
      const fresh = await getCategories();
      setCategories(fresh);
    });
  };

  const currentPlatform =
    initialPlatforms.find((p) => p.slug === platformSlug) ||
    initialPlatforms[0] || {
      slug: platformSlug || 'riot',
      name: 'Riot Games',
      icon: '🔴',
      color: '#ef4444',
      games: [],
    };

  const currentGame =
    currentPlatform.games.find((g) => g.slug === gameSlug) || {
      slug: gameSlug || 'lol',
      name: gameSlug ? gameSlug.toUpperCase() : 'League of Legends',
      icon: '🎮',
      description: 'Hesap takibi.',
    };

  // Seçili oyuna göre filtrelenmiş hesaplar
  const scopedAccounts = accounts.filter((a) => {
    const matchesGame = (a.game || 'lol').toLowerCase() === currentGame.slug.toLowerCase();
    const matchesCat = !categoryFilter || a.category === categoryFilter;
    return matchesGame && matchesCat;
  });

  const total = scopedAccounts.length;
  const available = scopedAccounts.filter((a) => a.status === 'available').length;
  const archived = scopedAccounts.filter((a) => a.status === 'archived').length;
  const active = scopedAccounts.filter((a) => a.status === 'active').length;
  const levelCount = scopedAccounts.filter((a) => a.status === 'level').length;
  const errored = scopedAccounts.filter((a) => a.status === 'error_checking').length;

  const toggleStatus = (status: AccountStatus | '') => {
    setStatusFilter((prev) => (prev === status ? '' : status));
  };

  return (
    <div className="space-y-6">
      {/* ── 1. ÜST GEZİNME VE GERİ DÖNÜŞ BARI ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="bg-[#070e1a]/80 px-4 py-2 rounded-2xl border border-white/5 backdrop-blur-md flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
          <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
            <span>🏠</span>
            <span>{t('nav_home')}</span>
          </Link>
          <span className="text-slate-600">/</span>
          <Link
            href={`/platform/${currentPlatform.slug}`}
            className="hover:text-white transition-colors flex items-center gap-1 text-slate-300"
          >
            <span>{currentPlatform.icon}</span>
            <span>{currentPlatform.name}</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-yellow-400 font-bold flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-0.5 rounded-lg border border-yellow-500/25">
            <span>{currentGame.icon}</span>
            <span>{currentGame.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-yellow-400/20 text-yellow-300 font-mono ml-0.5">
              {total}
            </span>
          </span>
        </nav>

        {/* Platforma Geri Dön Butonu */}
        <Link
          href={`/platform/${currentPlatform.slug}`}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0d1829] hover:bg-[#152542] text-slate-300 hover:text-white border border-white/10 hover:border-blue-400/40 transition-all self-start sm:self-auto cursor-pointer"
        >
          <span>←</span>
          <span>{currentPlatform.name} Oyunlarına Dön</span>
        </Link>
      </div>

      {/* ── 2. OYUN KOMUTA BAŞLIĞI ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#070e1a]/90 border border-white/5 p-4 sm:p-5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
            {currentGame.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight">
                {currentGame.name} Hesapları
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                {total} Hesap
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentPlatform.name} • {currentGame.description || `${currentGame.name} hesap ve envanter yönetimi`}
            </p>
          </div>
        </div>

        {/* Aksiyon Butonları Grubu */}
        <div className="flex flex-wrap items-center gap-2.5">
          <AccountSyncButton />

          <button
            type="button"
            onClick={() => setIsCatModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0e192d] hover:bg-[#152542] text-slate-300 hover:text-white border border-white/10 hover:border-blue-400/40 transition-all cursor-pointer shadow-sm hover:-translate-y-0.5 active:translate-y-0"
            title="Kategorileri Yönet"
          >
            <span>⚙️</span>
            <span>{t('manage_categories') || 'Kategoriler'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
              isAddOpen
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-2 ring-yellow-400/50'
                : 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
            }`}
          >
            <span>{isAddOpen ? '✕' : '➕'}</span>
            <span>{isAddOpen ? 'Kapat' : t('modal_add_title')}</span>
          </button>
        </div>
      </div>

      {/* ── 3. AÇILIR / KAPANIR HESAP EKLEME FORMU ── */}
      {isAddOpen && (
        <div className="bg-gradient-to-b from-[#0a1424] to-[#070e1a] border border-blue-500/25 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl animate-fade-in relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {currentPlatform.name} ({currentGame.name}) İçin {t('modal_add_title') || 'Yeni Hesap Ekle'}
              </h3>
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
            platformsList={initialPlatforms}
            defaultGame={currentGame.slug}
          />
        </div>
      )}

      {/* ── 4. KOMPAKT HUD METRİK ŞERİDİ ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Toplam */}
        <button
          onClick={() => toggleStatus('')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === ''
              ? 'bg-[#122340] border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
              : 'bg-[#070e1a]/60 border-white/5 hover:border-white/20'
          }`}
        >
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('stat_total')}</div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">{total}</div>
        </button>

        {/* Hazır */}
        <button
          onClick={() => toggleStatus('available')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'available'
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-[#070e1a]/60 border-white/5 hover:border-emerald-500/30'
          }`}
        >
          <div className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">{t('stat_available')}</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{available}</div>
        </button>

        {/* Aktif */}
        <button
          onClick={() => toggleStatus('active')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'active'
              ? 'bg-blue-950/40 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
              : 'bg-[#070e1a]/60 border-white/5 hover:border-blue-500/30'
          }`}
        >
          <div className="text-[10px] font-semibold text-blue-400/80 uppercase tracking-wider">{t('stat_active')}</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-0.5">{active}</div>
        </button>

        {/* Kasılıyor */}
        <button
          onClick={() => toggleStatus('level')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'level'
              ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'bg-[#070e1a]/60 border-white/5 hover:border-purple-500/30'
          }`}
        >
          <div className="text-[10px] font-semibold text-purple-400/80 uppercase tracking-wider">{t('stat_level')}</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-0.5">{levelCount}</div>
        </button>

        {/* Arşiv */}
        <button
          onClick={() => toggleStatus('archived')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'archived'
              ? 'bg-slate-800/40 border-slate-400/60'
              : 'bg-[#070e1a]/60 border-white/5 hover:border-white/20'
          }`}
        >
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('stat_archived')}</div>
          <div className="text-xl font-bold font-mono text-slate-400 mt-0.5">{archived}</div>
        </button>

        {/* Hata / Ban */}
        <button
          onClick={() => toggleStatus('error_checking')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'error_checking'
              ? 'bg-rose-950/40 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
              : 'bg-[#070e1a]/60 border-white/5 hover:border-rose-500/30'
          }`}
        >
          <div className="text-[10px] font-semibold text-rose-400/80 uppercase tracking-wider">{t('stat_banned')}</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">{errored}</div>
        </button>
      </div>

      {/* ── 5. KATEGORİ FİLTRELEME ÇİPLERİ ── */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <span>🏷️</span> Kategori:
          </span>
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              !categoryFilter
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5 hover:bg-white/10'
            }`}
          >
            Tümü ({accounts.filter((a) => (a.game || 'lol').toLowerCase() === currentGame.slug.toLowerCase()).length})
          </button>

          {categories.map((c) => {
            const isSelected = categoryFilter === c.name;
            const count = accounts.filter(
              (a) => (a.game || 'lol').toLowerCase() === currentGame.slug.toLowerCase() && a.category === c.name
            ).length;

            return (
              <button
                key={c._id}
                onClick={() => setCategoryFilter(isSelected ? '' : c.name)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'border shadow-sm font-bold'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5 hover:bg-white/10'
                }`}
                style={{
                  backgroundColor: isSelected ? `${c.color}25` : undefined,
                  borderColor: isSelected ? `${c.color}60` : undefined,
                  color: isSelected ? c.color : undefined,
                }}
              >
                <span>{c.icon}</span>
                <span>{c.name}</span>
                <span className="text-[10px] font-mono opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── 6. HESAP TABLOSU / LİSTESİ ── */}
      <AccountTable
        accounts={scopedAccounts}
        categories={categories}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
      />

      {/* ── 7. KATEGORİ MODALI ── */}
      <CategoryManagerModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories}
        onCategoriesChange={refreshCategories}
      />
    </div>
  );
}
