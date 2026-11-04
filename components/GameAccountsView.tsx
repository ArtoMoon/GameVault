'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

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

  const accentColor = currentPlatform.color || '#8b5cf6';

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── 1. ÜST GEZİNME VE GERİ DÖNÜŞ BARI ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-medium text-text-muted">
          <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
            </svg>
            <span>{t('nav_home')}</span>
          </Link>
          <span className="text-white/20">/</span>
          <Link
            href={`/platform/${currentPlatform.slug}`}
            className="hover:text-white transition-colors flex items-center gap-1 text-text-secondary"
          >
            <span>{currentPlatform.icon}</span>
            <span>{currentPlatform.name}</span>
          </Link>
          <span className="text-white/20">/</span>
          <span
            className="chip text-white font-semibold"
            style={{
              backgroundColor: `${accentColor}1f`,
              borderColor: `${accentColor}45`,
            }}
          >
            <span>{currentGame.icon}</span>
            <span>{currentGame.name}</span>
            <span className="text-[10px] px-1.5 rounded-full bg-white/10 text-white tabular-nums">
              {total}
            </span>
          </span>
        </nav>

        {/* Platforma Geri Dön Butonu */}
        <Link
          href={`/platform/${currentPlatform.slug}`}
          className="btn btn-secondary btn-sm self-start sm:self-auto"
        >
          <span>←</span>
          <span>{currentPlatform.name} Oyunlarına Dön</span>
        </Link>
      </div>

      {/* ── 2. OYUN KOMUTA BAŞLIĞI ── */}
      <div className="card relative overflow-hidden p-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(40rem 20rem at 92% -20%, ${accentColor}28, transparent 65%)`,
          }}
        />
        <div
          className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full"
          style={{ background: accentColor }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl border flex items-center justify-center text-3xl shrink-0 shadow-lg"
              style={{
                backgroundColor: `${accentColor}20`,
                borderColor: `${accentColor}45`,
              }}
            >
              {currentGame.icon}
            </div>
            <div>
              <div className="eyebrow mb-1">{currentPlatform.name}</div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="page-title">{currentGame.name} Hesapları</h1>
                <span className="chip tabular-nums !text-white">
                  {total} Hesap
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-1">
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
              className="btn btn-secondary"
              title="Kategorileri Yönet"
            >
              <span>⚙️</span>
              <span>{t('manage_categories') || 'Kategoriler'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddOpen((prev) => !prev)}
              className={`btn ${isAddOpen ? 'btn-secondary' : 'btn-primary'}`}
            >
              <span>{isAddOpen ? '✕' : '➕'}</span>
              <span>{isAddOpen ? 'Kapat' : t('modal_add_title')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. AÇILIR / KAPANIR HESAP EKLEME FORMU ── */}
      {isAddOpen && (
        <div className="glass rounded-2xl p-5 md:p-6 animate-scale-in relative overflow-hidden">
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                {currentPlatform.name} ({currentGame.name}) İçin {t('modal_add_title') || 'Yeni Hesap Ekle'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="btn btn-ghost btn-sm"
            >
              ✕ Kapat
            </button>
          </div>

          <AddAccountForm
            categories={categories}
            onCategoriesChange={refreshCategories}
            platformsList={initialPlatforms}
            defaultGame={currentGame.slug}
            onAccountAdded={() => {
              router.refresh();
            }}
          />
        </div>
      )}

      {/* ── 4. KOMPAKT HUD METRİK ŞERİDİ ── */}
      <div className="stagger grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Toplam */}
        <button
          type="button"
          onClick={() => toggleStatus('')}
          className={`card p-4 text-left transition-all cursor-pointer ${
            statusFilter === ''
              ? 'border-accent-400/60 bg-accent-500/10 shadow-[0_10px_28px_-14px_rgba(139,92,246,0.5)]'
              : 'hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">{t('stat_total')}</span>
            <span className="w-2 h-2 rounded-full bg-accent-400" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-white mt-1.5">{total}</div>
        </button>

        {/* Hazır */}
        <button
          type="button"
          onClick={() => toggleStatus('available')}
          className={`card p-4 text-left transition-all cursor-pointer ${
            statusFilter === 'available'
              ? 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_10px_28px_-14px_rgba(16,185,129,0.45)]'
              : 'hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">{t('stat_available')}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-emerald-400 mt-1.5">{available}</div>
        </button>

        {/* Aktif */}
        <button
          type="button"
          onClick={() => toggleStatus('active')}
          className={`card p-4 text-left transition-all cursor-pointer ${
            statusFilter === 'active'
              ? 'border-sky-500/60 bg-sky-500/10 shadow-[0_10px_28px_-14px_rgba(56,189,248,0.45)]'
              : 'hover:border-sky-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">{t('stat_active')}</span>
            <span className="w-2 h-2 rounded-full bg-sky-400" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-sky-400 mt-1.5">{active}</div>
        </button>

        {/* Kasılıyor */}
        <button
          type="button"
          onClick={() => toggleStatus('level')}
          className={`card p-4 text-left transition-all cursor-pointer ${
            statusFilter === 'level'
              ? 'border-amber-500/60 bg-amber-500/10 shadow-[0_10px_28px_-14px_rgba(245,158,11,0.45)]'
              : 'hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">{t('stat_level')}</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-amber-400 mt-1.5">{levelCount}</div>
        </button>

        {/* Arşiv */}
        <button
          type="button"
          onClick={() => toggleStatus('archived')}
          className={`card p-4 text-left transition-all cursor-pointer ${
            statusFilter === 'archived'
              ? 'border-zinc-400/50 bg-zinc-500/10'
              : 'hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">{t('stat_archived')}</span>
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-zinc-300 mt-1.5">{archived}</div>
        </button>

        {/* Hata / Ban */}
        <button
          type="button"
          onClick={() => toggleStatus('error_checking')}
          className={`card p-4 text-left transition-all cursor-pointer ${
            statusFilter === 'error_checking'
              ? 'border-red-500/60 bg-red-500/10 shadow-[0_10px_28px_-14px_rgba(239,68,68,0.45)]'
              : 'hover:border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">{t('stat_banned')}</span>
            <span className="w-2 h-2 rounded-full bg-red-400" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-red-400 mt-1.5">{errored}</div>
        </button>
      </div>

      {/* ── 5. KATEGORİ FİLTRELEME ARAÇ ÇUBUĞU (SEGMENTED) ── */}
      {categories.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <span>🏷️</span> Kategori:
          </span>
          <div className="segmented overflow-x-auto no-scrollbar">
            <button
              type="button"
              data-active={!categoryFilter}
              onClick={() => setCategoryFilter('')}
              className="shrink-0 tabular-nums"
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
                  type="button"
                  data-active={isSelected}
                  onClick={() => setCategoryFilter(isSelected ? '' : c.name)}
                  className="shrink-0 tabular-nums"
                  style={
                    isSelected && c.color
                      ? {
                          backgroundColor: `${c.color}28`,
                          color: '#fff',
                        }
                      : undefined
                  }
                >
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                  <span className="text-[11px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6. HESAP TABLOSU / LİSTESİ ── */}
      <AccountTable
        accounts={scopedAccounts}
        categories={categories}
        platformsList={initialPlatforms}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        gameSlug={currentGame.slug}
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
