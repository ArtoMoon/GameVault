'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { AccountData } from '@/app/actions/accounts';
import type { CategoryData } from '@/app/actions/categories';
import { getPlatforms, PlatformData } from '@/app/actions/platforms';
import AccountSyncButton from '@/components/AccountSyncButton';
import RankBadge from '@/components/RankBadge';
import PlatformBadge from '@/components/PlatformBadge';
import PlatformManagerModal from '@/components/PlatformManagerModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface LandingViewProps {
  accounts: AccountData[];
  categories?: CategoryData[];
  platforms?: PlatformData[];
}

export default function LandingView({
  accounts,
  categories = [],
  platforms: initialPlatforms = [],
}: LandingViewProps) {
  const { t } = useLanguage();
  const [platforms, setPlatforms] = useState<PlatformData[]>(initialPlatforms);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  const refreshPlatforms = () => {
    startTransition(async () => {
      const fresh = await getPlatforms();
      setPlatforms(fresh);
    });
  };

  const getGameCount = (slug: string) =>
    accounts.filter((a) => (a.game || 'lol').toLowerCase() === slug.toLowerCase()).length;

  const readyCount = accounts.filter((a) => a.status === 'available').length;
  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const levelCount = accounts.filter((a) => a.status === 'level').length;

  // En son güncellenen 4 hesap
  const recentAccounts = [...accounts]
    .sort((a, b) => {
      const timeA = a.lastCheckedAt ? new Date(a.lastCheckedAt).getTime() : 0;
      const timeB = b.lastCheckedAt ? new Date(b.lastCheckedAt).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 4);

  return (
    <div className="space-y-10 animate-fade-up">
      {/* ── 1. HERO & STAT TILES (MODERN DASHBOARD HOME HEADER) ── */}
      <section className="space-y-5">
        <div className="glass relative overflow-hidden rounded-2xl p-6 sm:p-8 lg:p-10">
          {/* Arka plan atmosfer parıltıları */}
          <div className="absolute -top-28 -right-20 w-96 h-96 bg-accent-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-28 -left-20 w-80 h-80 bg-glow-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              {/* Rozet */}
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="eyebrow flex items-center gap-2">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-accent-400" />
                  </span>
                  <span>{t('landing_hero_badge')}</span>
                </span>
              </div>

              {/* Başlık */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {t('landing_hero_title_1')},{' '}
                <span className="gradient-text">
                  {t('landing_hero_title_2')}
                </span>
              </h1>

              {/* Açıklama */}
              <p className="text-text-secondary text-sm sm:text-base mt-3 leading-relaxed">
                {t('landing_hero_desc')}
              </p>
            </div>

            {/* Hızlı Aksiyon Butonları */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link href="/platform/lol" className="btn btn-primary btn-lg">
                <span>🎮</span>
                <span>{t('go_to_accounts')}</span>
              </Link>

              <Link href="/platform/lol?add=true" className="btn btn-secondary btn-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{t('modal_add_title')}</span>
              </Link>

              <AccountSyncButton />
            </div>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          <div className="card p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-text-muted font-medium">{t('stat_total')}</div>
              <div className="text-2xl font-bold tabular-nums text-white mt-1">{accounts.length}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent-500/15 text-accent-300 flex items-center justify-center text-lg shrink-0">
              🗂️
            </div>
          </div>

          <div className="card p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-text-muted font-medium">{t('stat_available')}</div>
              <div className="text-2xl font-bold tabular-nums text-white mt-1">{readyCount}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-lg shrink-0">
              ✅
            </div>
          </div>

          <div className="card p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-text-muted font-medium">{t('stat_active')}</div>
              <div className="text-2xl font-bold tabular-nums text-white mt-1">{activeCount}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center text-lg shrink-0">
              🎮
            </div>
          </div>

          <div className="card p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-text-muted font-medium">{t('stat_level')}</div>
              <div className="text-2xl font-bold tabular-nums text-white mt-1">{levelCount}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-lg shrink-0">
              ⚡
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. OYUN PLATFORMLARI (PLATFORMS & GAMES HUB) ── */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="eyebrow mb-1">PLATFORMLAR</div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Platformlar & Oyun Portalları
              </h2>
              <span className="chip tabular-nums">
                {platforms.length} Platform
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              Kendi oyun platformlarınızı ekleyin, kategorize edin ve hesaplarınızı doğrudan yönetin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPlatformModalOpen(true)}
              className="btn btn-secondary"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Platform Ekle / Yönet</span>
            </button>
            <Link
              href="/platform/riot/lol"
              className="btn btn-ghost btn-sm text-accent-300 hover:text-white"
            >
              <span>Tüm Hesaplar ({accounts.length}) →</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger">
          {platforms.map((p) => {
            const platformTargetUrl = `/platform/${p.slug}`;
            const totalAccountsInPlatform = accounts.filter(
              (a) =>
                (a.platform || '').toLowerCase() === p.slug.toLowerCase() ||
                p.games.some((g) => g.slug.toLowerCase() === (a.game || '').toLowerCase())
            ).length;
            const accentColor = p.color || '#8b5cf6';

            return (
              <div
                key={p.slug}
                className="group card card-interactive p-6 flex flex-col justify-between overflow-hidden"
              >
                {/* Yumuşak platform rengi parıltısı */}
                <div
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl transition-opacity pointer-events-none opacity-15 group-hover:opacity-30"
                  style={{ backgroundColor: accentColor }}
                />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-white/[0.08]"
                      style={{ background: `${accentColor}1a` }}
                    >
                      {p.icon || '🎮'}
                    </div>
                    <span className="chip tabular-nums">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                      {totalAccountsInPlatform} Hesap
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-accent-300 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed min-h-[36px]">
                    {p.description || `${p.name} platformundaki oyunlar ve hesaplar`}
                  </p>

                  {/* Oyun Kısayolları */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
                    <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 tabular-nums">
                      Kayıtlı Oyunlar ({p.games.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.games.map((g) => {
                        const count = getGameCount(g.slug);
                        return (
                          <Link
                            key={g.slug}
                            href={`/platform/${p.slug}/${g.slug}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.06] transition-colors"
                          >
                            <span>{g.icon || '🕹️'}</span>
                            <span>{g.name}</span>
                            {count > 0 && (
                              <span className="text-[10px] font-semibold tabular-nums px-1.5 rounded bg-accent-500/20 text-accent-300">
                                {count}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-accent-300">
                  <Link
                    href={platformTargetUrl}
                    className="inline-flex items-center gap-1.5 group-hover:text-white transition-colors"
                  >
                    <span>Platformu Aç</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </div>
            );
          })}

          {/* ➕ Yeni Platform Ekle Kartı */}
          <button
            type="button"
            onClick={() => setIsPlatformModalOpen(true)}
            className="group card card-interactive !border-dashed !border-white/15 hover:!border-accent-400/50 p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px]"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-500/15 text-accent-300 group-hover:scale-105 flex items-center justify-center text-xl transition-transform mb-3.5">
              ➕
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-accent-300 transition-colors">
              Yeni Platform Ekle
            </h3>
            <p className="text-xs text-text-muted mt-1.5 max-w-[220px] leading-relaxed">
              Steam, Epic Games, Riot, Battle.net veya dilediğin platformu ve oyunlarını kendin oluştur.
            </p>
            <span className="mt-4 chip !text-accent-300 !border-accent-400/30 !bg-accent-500/10">
              Platform Oluştur →
            </span>
          </button>
        </div>
      </section>

      {/* ── 3. SON GÜNCELLENEN HESAPLAR VİTRİNİ (RECENT SPOTLIGHT) ── */}
      {recentAccounts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow mb-1">AKTİVİTE</div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t('recent_accounts_title')}
              </h2>
            </div>
            <Link
              href="/platform/lol"
              className="btn btn-ghost btn-sm text-accent-300 hover:text-white tabular-nums"
            >
              {t('view_all_accounts')} ({accounts.length}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
            {recentAccounts.map((acc) => (
              <Link
                key={acc._id}
                href={`/accounts/${acc._id}`}
                className="group card card-interactive p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="chip tabular-nums !text-amber-300 !bg-amber-500/10 !border-amber-500/20">
                      Lv. {acc.level || 1}
                    </span>
                    <PlatformBadge platform={acc.platform} />
                  </div>
                  <div className="font-bold text-sm text-white group-hover:text-accent-300 transition-colors truncate">
                    {acc.riotId}
                  </div>
                  {acc.category && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-text-secondary bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md">
                      🏷️ {acc.category}
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <RankBadge rank={acc.rank} />
                  <span className="text-accent-300 group-hover:translate-x-0.5 transition-transform font-semibold">
                    Detay →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. ÖNE ÇIKAN ÖZELLİKLER (FEATURES) ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger">
        <div className="card p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent-500/15 text-accent-300 flex items-center justify-center text-lg shrink-0">
            🔒
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{t('feature_1_title')}</h3>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {t('feature_1_desc')}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-glow-500/15 text-glow-400 flex items-center justify-center text-lg shrink-0">
            ⚡
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{t('feature_2_title')}</h3>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {t('feature_2_desc')}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-lg shrink-0">
            🏷️
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{t('feature_3_title')}</h3>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {t('feature_3_desc')}
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. PLATFORM MANAGER MODAL ── */}
      <PlatformManagerModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
        platforms={platforms}
        onPlatformsChange={refreshPlatforms}
      />
    </div>
  );
}
