'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AccountData } from '@/app/actions/accounts';
import type { AccountStatus } from '@/models/Account';
import { getCategories, createCategory, CategoryData } from '@/app/actions/categories';
import { getPlatforms, PlatformData } from '@/app/actions/platforms';
import AccountTable from '@/components/AccountTable';
import AddAccountForm from '@/components/AddAccountForm';
import AccountSyncButton from '@/components/AccountSyncButton';
import CategoryManagerModal from '@/components/CategoryManagerModal';
import PlatformManagerModal from '@/components/PlatformManagerModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface GameAccountsViewProps {
  accounts: AccountData[];
  initialCategories?: CategoryData[];
  initialPlatforms?: PlatformData[];
  platformSlug: string;
  gameSlug?: string;
  initialAddOpen?: boolean;
}

const QUICK_CATEGORY_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#10b981',
  '#eab308',
  '#ef4444',
  '#ec4899',
  '#06b6d4',
];

const QUICK_CATEGORY_ICONS = ['🏷️', '⭐', '⚡', '🏆', '🎯', '⚔️', '🔥', '💎'];

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
  const [platforms, setPlatforms] = useState<PlatformData[]>(initialPlatforms);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(initialAddOpen);

  // Hızlı satır içi kategori ekleme durumu
  const [isQuickCatOpen, setIsQuickCatOpen] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatIcon, setQuickCatIcon] = useState('🏷️');
  const [quickCatColor, setQuickCatColor] = useState('#8b5cf6');
  const [quickCatError, setQuickCatError] = useState('');
  const [isPending, startTransition] = useTransition();

  const refreshCategories = () => {
    startTransition(async () => {
      const fresh = await getCategories();
      setCategories(fresh);
    });
  };

  const refreshPlatforms = () => {
    startTransition(async () => {
      const fresh = await getPlatforms();
      setPlatforms(fresh);
      router.refresh();
    });
  };

  const handleQuickCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickCatName.trim();
    if (!clean) {
      setQuickCatError('Kategori adı girin.');
      return;
    }
    setQuickCatError('');
    startTransition(async () => {
      const res = await createCategory(clean, quickCatColor, quickCatIcon, '');
      if (!res.success) {
        setQuickCatError(res.error || 'Kategori eklenemedi.');
        return;
      }
      const fresh = await getCategories();
      setCategories(fresh);
      setCategoryFilter(clean);
      setQuickCatName('');
      setIsQuickCatOpen(false);
    });
  };

  // Platformu bul (slug doğrudan eşleşebilir veya içindeki oyun slug'ı eşleşebilir)
  const normalizedSlug = (platformSlug || 'riot').toLowerCase();
  const currentPlatform =
    platforms.find((p) => p.slug.toLowerCase() === normalizedSlug) ||
    platforms.find((p) => p.games.some((g) => g.slug.toLowerCase() === normalizedSlug)) ||
    platforms[0] || {
      _id: 'default-riot',
      slug: normalizedSlug,
      name: 'Riot Games',
      icon: '🔴',
      color: '#ef4444',
      games: [],
    };

  // Bu platforma ait tüm oyun anahtarlarını topla (tek birleşik görünüm için)
  const platformGameSlugs = new Set<string>([
    currentPlatform.slug.toLowerCase(),
    ...currentPlatform.games.map((g) => g.slug.toLowerCase()),
  ]);
  if (currentPlatform.slug.toLowerCase() === 'riot' || normalizedSlug === 'lol') {
    platformGameSlugs.add('lol');
    platformGameSlugs.add('valorant');
    platformGameSlugs.add('tft');
  }
  if (currentPlatform.slug.toLowerCase().includes('albion')) {
    platformGameSlugs.add('albion');
  }
  if (currentPlatform.slug.toLowerCase() === 'steam') {
    platformGameSlugs.add('cs2');
    platformGameSlugs.add('dota2');
  }

  const belongsToCurrentPlatform = (a: AccountData) => {
    const accGame = (a.game || 'lol').toLowerCase();
    const accPlat = (a.platform || '').toLowerCase();
    if (gameSlug) {
      return accGame === gameSlug.toLowerCase();
    }
    return platformGameSlugs.has(accGame) || accPlat === currentPlatform.slug.toLowerCase();
  };

  const platformAccounts = accounts.filter(belongsToCurrentPlatform);

  // Kategori filtresi uygulanmış hesaplar
  const scopedAccounts = platformAccounts.filter((a) => {
    const matchesCat = !categoryFilter || a.category === categoryFilter;
    return matchesCat;
  });

  const defaultGameSlug =
    gameSlug ||
    currentPlatform.games[0]?.slug ||
    (currentPlatform.slug.includes('albion') ? 'albion' : 'lol');

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
      {/* ── 1. ÜST GEZİNME VE PLATFORM SEÇİCİ BARI ── */}
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
          <span
            className="chip text-white font-semibold"
            style={{
              backgroundColor: `${accentColor}1f`,
              borderColor: `${accentColor}45`,
            }}
          >
            <span>{currentPlatform.icon}</span>
            <span>{currentPlatform.name}</span>
            <span className="text-[10px] px-1.5 rounded-full bg-white/10 text-white tabular-nums">
              {platformAccounts.length}
            </span>
          </span>
          {categoryFilter && (
            <>
              <span className="text-white/20">/</span>
              <span className="chip !bg-accent-500/20 !border-accent-400/40 !text-white font-semibold">
                <span>🏷️ {categoryFilter}</span>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('')}
                  className="ml-1 hover:text-red-300 cursor-pointer"
                  title="Kategori filtresini kaldır"
                >
                  ✕
                </button>
              </span>
            </>
          )}
        </nav>

        {/* Hızlı Platform Geçiş Sekmeleri */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {platforms.map((p) => {
            const isCurrent = p.slug === currentPlatform.slug;
            return (
              <Link
                key={p._id}
                href={`/platform/${p.slug}`}
                className={`btn btn-sm shrink-0 ${
                  isCurrent ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setIsPlatformModalOpen(true)}
            className="btn btn-ghost btn-sm shrink-0"
            title="Platform Ekle / Yönet"
          >
            <span>⚙️ Platformlar</span>
          </button>
        </div>
      </div>

      {/* ── 2. TEKİL PLATFORM KOMUTA BAŞLIĞI ── */}
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
              {currentPlatform.icon}
            </div>
            <div>
              <div className="eyebrow mb-1">PLATFORM KASASI</div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="page-title">{currentPlatform.name}</h1>
                <span className="chip tabular-nums !text-white">
                  {total} Hesap
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-1">
                {currentPlatform.description || `${currentPlatform.name} hesaplarınızı kategorilere ayırarak tek ekrandan yönetin.`}
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
              title="Kategorileri Ekle / Düzenle"
            >
              <span>🏷️</span>
              <span>{t('manage_categories') || 'Kategorileri Yönet'}</span>
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

      {/* ── 3. KATEGORİ SEKMELERİ VE HIZLI KATEGORİ EKLEME BARI (HER ZAMAN GÖRÜNÜR) ── */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 py-0.5">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-1">
              <span>🏷️</span> Kategoriler:
            </span>

            {/* Tümü */}
            <button
              type="button"
              onClick={() => setCategoryFilter('')}
              className={`h-8 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                !categoryFilter
                  ? 'bg-accent-500/20 text-white border-accent-400/50 shadow-[0_0_20px_-6px_rgba(139,92,246,0.5)]'
                  : 'bg-white/[0.03] border-white/[0.07] text-text-secondary hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span>🗂️</span>
              <span>Tümü</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/35 font-mono tabular-nums text-white/80 leading-none">
                {platformAccounts.length}
              </span>
            </button>

            {/* Mevcut Kategoriler */}
            {categories.map((c) => {
              const isSelected = categoryFilter === c.name;
              const count = platformAccounts.filter((a) => a.category === c.name).length;

              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => setCategoryFilter(isSelected ? '' : c.name)}
                  className={`h-8 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? 'text-white shadow-sm'
                      : 'bg-white/[0.03] border-white/[0.07] text-text-secondary hover:text-white hover:bg-white/[0.06]'
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `${c.color || '#8b5cf6'}28`,
                          borderColor: c.color || '#8b5cf6',
                        }
                      : undefined
                  }
                >
                  <span>{c.icon || '🏷️'}</span>
                  <span>{c.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/35 font-mono tabular-nums text-white/80 leading-none">
                    {count}
                  </span>
                </button>
              );
            })}

            {/* + Kategori Ekle Butonu */}
            <button
              type="button"
              onClick={() => {
                setIsQuickCatOpen((prev) => !prev);
                setQuickCatError('');
              }}
              className={`h-8 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border border-dashed ${
                isQuickCatOpen
                  ? 'bg-accent-500/20 text-accent-200 border-accent-400/60'
                  : 'border-accent-400/35 text-accent-300 hover:text-white hover:bg-accent-500/15 hover:border-accent-400/60'
              }`}
            >
              <span>{isQuickCatOpen ? '✕' : '➕'}</span>
              <span>Kategori Ekle</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCatModalOpen(true)}
            className="btn btn-ghost btn-sm shrink-0"
            title="Tüm Kategorileri Düzenle / Sil"
          >
            <span>⚙️ Düzenle</span>
          </button>
        </div>

        {/* Satır İçi Hızlı Kategori Oluşturma Alanı */}
        {isQuickCatOpen && (
          <form
            onSubmit={handleQuickCreateCategory}
            className="pt-3 border-t border-white/[0.07] flex flex-wrap items-center gap-2.5 animate-fade-in"
          >
            {/* İkon Seçici */}
            <div className="flex items-center gap-1 bg-ink-900/80 border border-white/[0.08] rounded-xl p-1">
              {QUICK_CATEGORY_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setQuickCatIcon(ic)}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-colors cursor-pointer ${
                    quickCatIcon === ic
                      ? 'bg-accent-500/25 border border-accent-400/50'
                      : 'hover:bg-white/[0.06]'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>

            {/* Kategori Adı */}
            <input
              type="text"
              value={quickCatName}
              onChange={(e) => setQuickCatName(e.target.value)}
              placeholder="Kategori adı (Örn: Main, Smurf, TR Dereceli, Valorant...)"
              className="input !w-64 !h-9 text-xs"
              autoFocus
            />

            {/* Renk Seçici */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-ink-900/80 border border-white/[0.08]">
              {QUICK_CATEGORY_COLORS.map((clr) => (
                <button
                  key={clr}
                  type="button"
                  onClick={() => setQuickCatColor(clr)}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    quickCatColor === clr ? 'scale-125 ring-2 ring-white/80' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: clr }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-sm !h-9"
            >
              <span>✓ Ekle</span>
            </button>

            <button
              type="button"
              onClick={() => setIsQuickCatOpen(false)}
              className="btn btn-ghost btn-sm !h-9"
            >
              İptal
            </button>

            {quickCatError && (
              <span className="text-xs text-red-400 font-medium">{quickCatError}</span>
            )}
          </form>
        )}
      </div>

      {/* ── 4. AÇILIR / KAPANIR HESAP EKLEME FORMU ── */}
      {isAddOpen && (
        <div className="glass rounded-2xl p-5 md:p-6 animate-scale-in relative overflow-hidden">
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                {currentPlatform.name} İçin {t('modal_add_title') || 'Yeni Hesap Ekle'}
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
            platformsList={platforms}
            defaultGame={defaultGameSlug}
            onAccountAdded={() => {
              router.refresh();
            }}
          />
        </div>
      )}

      {/* ── 5. KOMPAKT HUD METRİK ŞERİDİ ── */}
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

      {/* ── 6. HESAP TABLOSU / LİSTESİ ── */}
      <AccountTable
        accounts={scopedAccounts}
        categories={categories}
        platformsList={platforms}
        hideCategoryBar
        onOpenCategoriesModal={() => setIsCatModalOpen(true)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        gameSlug={defaultGameSlug}
      />

      {/* ── 7. KATEGORİ YÖNETİM MODALI ── */}
      <CategoryManagerModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories}
        onCategoriesChange={refreshCategories}
      />

      {/* ── 8. PLATFORM YÖNETİM MODALI ── */}
      <PlatformManagerModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
        platforms={platforms}
        onPlatformsChange={refreshPlatforms}
      />
    </div>
  );
}
