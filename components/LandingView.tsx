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
    <div className="space-y-12">
      {/* ── 1. HERO BÖLÜMÜ (COMMAND CENTER HERO) ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1a30] via-[#071120] to-[#040913] border border-blue-500/20 p-8 md:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        {/* Arka plan atmosfer parıltıları */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          {/* Rozet */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold tracking-wider uppercase mb-5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
            <span>{t('landing_hero_badge')}</span>
          </div>

          {/* Başlık */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {t('landing_hero_title_1')},{' '}
            <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {t('landing_hero_title_2')}
            </span>
          </h1>

          {/* Açıklama */}
          <p className="text-slate-300 text-sm md:text-base mt-4 leading-relaxed max-w-2xl">
            {t('landing_hero_desc')}
          </p>

          {/* Hızlı Aksiyon Butonları */}
          <div className="flex flex-wrap items-center gap-3.5 mt-8">
            <Link
              href="/platform/lol"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-sans text-sm font-black bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-[0_0_25px_rgba(234,179,8,0.4)] hover:shadow-[0_0_35px_rgba(234,179,8,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <span>🎮</span>
              <span>{t('go_to_accounts')}</span>
            </Link>

            <Link
              href="/platform/lol?add=true"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-sans text-sm font-bold bg-[#0e192d] hover:bg-[#152542] text-slate-200 hover:text-white border border-white/10 hover:border-blue-400/40 shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <span>➕</span>
              <span>{t('modal_add_title')}</span>
            </Link>

            <AccountSyncButton />
          </div>

          {/* İstatistik Özet Kapsülleri */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 pt-8 border-t border-white/10">
            <div className="bg-[#050c18]/60 p-3 rounded-xl border border-white/5">
              <div className="text-2xl font-extrabold text-white font-mono">{accounts.length}</div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{t('stat_total')}</div>
            </div>
            <div className="bg-[#050c18]/60 p-3 rounded-xl border border-white/5">
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">{readyCount}</div>
              <div className="text-[11px] text-emerald-400/80 font-semibold uppercase tracking-wider mt-0.5">{t('stat_available')}</div>
            </div>
            <div className="bg-[#050c18]/60 p-3 rounded-xl border border-white/5">
              <div className="text-2xl font-extrabold text-blue-400 font-mono">{activeCount}</div>
              <div className="text-[11px] text-blue-400/80 font-semibold uppercase tracking-wider mt-0.5">{t('stat_active')}</div>
            </div>
            <div className="bg-[#050c18]/60 p-3 rounded-xl border border-white/5">
              <div className="text-2xl font-extrabold text-purple-400 font-mono">{levelCount}</div>
              <div className="text-[11px] text-purple-400/80 font-semibold uppercase tracking-wider mt-0.5">{t('stat_level')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. OYUN PLATFORMLARI (PLATFORMS & GAMES HUB) ── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎮</span>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Platformlar & Oyun Portalları</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {platforms.length} Platform
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kendi oyun platformlarınızı ekleyin, kategorize edin ve hesaplarınızı doğrudan yönetin.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsPlatformModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#132238] hover:bg-[#1c3252] text-yellow-400 border border-yellow-500/30 hover:border-yellow-400/60 shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚙️</span>
              <span>Platform Ekle / Yönet</span>
            </button>
            <Link
              href="/platform/riot/lol"
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <span>Tüm Hesaplar ({accounts.length}) →</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {platforms.map((p) => {
            const platformTargetUrl = `/platform/${p.slug}`;
            const totalAccountsInPlatform = accounts.filter(
              (a) =>
                (a.platform || '').toLowerCase() === p.slug.toLowerCase() ||
                p.games.some((g) => g.slug.toLowerCase() === (a.game || '').toLowerCase())
            ).length;

            return (
              <div
                key={p.slug}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#111c2e] via-[#09111e] to-[#050b14] border border-white/10 hover:border-blue-400/50 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_15px_35px_rgba(59,130,246,0.15)] flex flex-col justify-between"
                style={{
                  borderColor: p.color ? `${p.color}40` : undefined,
                }}
              >
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl transition-all pointer-events-none opacity-20 group-hover:opacity-40"
                  style={{ backgroundColor: p.color || '#3b82f6' }}
                />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner border"
                      style={{
                        backgroundColor: p.color ? `${p.color}20` : '#3b82f620',
                        borderColor: p.color ? `${p.color}40` : '#3b82f640',
                      }}
                    >
                      {p.icon || '🎮'}
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-mono font-bold border"
                      style={{
                        backgroundColor: p.color ? `${p.color}20` : '#3b82f620',
                        color: p.color || '#93c5fd',
                        borderColor: p.color ? `${p.color}50` : '#3b82f650',
                      }}
                    >
                      {totalAccountsInPlatform} Hesap
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white group-hover:text-blue-300 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed min-h-[36px]">
                    {p.description || `${p.name} platformundaki oyunlar ve hesaplar`}
                  </p>

                  {/* Oyun Kısayolları */}
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Kayıtlı Oyunlar ({p.games.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.games.map((g) => {
                        const count = getGameCount(g.slug);
                        return (
                          <Link
                            key={g.slug}
                            href={`/platform/${p.slug}/${g.slug}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 hover:border-blue-400/40 transition-colors"
                          >
                            <span>{g.icon || '🕹️'}</span>
                            <span>{g.name}</span>
                            {count > 0 && (
                              <span className="ml-0.5 text-[9px] font-mono px-1 rounded bg-white/10 text-yellow-300">
                                {count}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
                  <Link href={platformTargetUrl} className="flex items-center gap-1.5 hover:underline">
                    <span>Platformu Aç</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            );
          })}

          {/* ➕ Yeni Platform Ekle Kartı */}
          <button
            type="button"
            onClick={() => setIsPlatformModalOpen(true)}
            className="group rounded-3xl border-2 border-dashed border-white/15 hover:border-yellow-400/60 bg-[#070e1a]/40 hover:bg-[#0c192d]/60 p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[260px] hover:shadow-[0_10px_30px_rgba(234,179,8,0.15)]"
          >
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 group-hover:bg-yellow-500/20 border border-yellow-500/30 group-hover:scale-110 flex items-center justify-center text-3xl transition-transform mb-4">
              ➕
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-yellow-400 transition-colors">
              Yeni Platform Ekle
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-[220px]">
              Steam, Epic Games, Riot, Battle.net veya dilediğin platformu ve oyunlarını kendin oluştur.
            </p>
            <span className="mt-4 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
              Platform Oluştur →
            </span>
          </button>
        </div>
      </section>

      {/* ── 3. SON GÜNCELLENEN HESAPLAR VİTRİNİ (RECENT SPOTLIGHT) ── */}
      {recentAccounts.length > 0 && (
        <section className="bg-[#070e1a]/80 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                {t('recent_accounts_title')}
              </h2>
            </div>
            <Link
              href="/platform/lol"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {t('view_all_accounts')} ({accounts.length}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {recentAccounts.map((acc) => (
              <Link
                key={acc._id}
                href={`/accounts/${acc._id}`}
                className="group p-4 rounded-2xl bg-[#091222]/90 border border-white/5 hover:border-blue-400/40 hover:bg-[#0e1d35] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      Lv. {acc.level || 1}
                    </span>
                    <PlatformBadge platform={acc.platform} />
                  </div>
                  <div className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors truncate">
                    {acc.riotId}
                  </div>
                  {acc.category && (
                    <span className="inline-block mt-1.5 text-[10px] font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                      🏷️ {acc.category}
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                  <RankBadge rank={acc.rank} />
                  <span className="text-blue-400 group-hover:translate-x-1 transition-transform text-xs font-bold">
                    Detay →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. ÖNE ÇIKAN ÖZELLİKLER (FEATURES) ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-[#070e1a]/60 border border-white/5 flex flex-col gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl text-blue-400">
            🔒
          </div>
          <h3 className="text-base font-bold text-white">{t('feature_1_title')}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('feature_1_desc')}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-[#070e1a]/60 border border-white/5 flex flex-col gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-2xl text-yellow-400">
            ⚡
          </div>
          <h3 className="text-base font-bold text-white">{t('feature_2_title')}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('feature_2_desc')}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-[#070e1a]/60 border border-white/5 flex flex-col gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl text-purple-400">
            🏷️
          </div>
          <h3 className="text-base font-bold text-white">{t('feature_3_title')}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('feature_3_desc')}
          </p>
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
