'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { AccountData } from '@/app/actions/accounts';
import { getPlatforms, PlatformData } from '@/app/actions/platforms';
import PlatformManagerModal from '@/components/PlatformManagerModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface PlatformOverviewProps {
  accounts: AccountData[];
  initialPlatforms: PlatformData[];
  activePlatformSlug: string;
}

export default function PlatformOverview({
  accounts,
  initialPlatforms = [],
  activePlatformSlug = 'riot',
}: PlatformOverviewProps) {
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

  const currentPlatform =
    platforms.find((p) => p.slug === activePlatformSlug) ||
    platforms[0] || {
      slug: 'riot',
      name: 'Riot Games',
      icon: '🔴',
      color: '#ef4444',
      description: 'Riot Games istemcisi ve oyunları.',
      games: [],
    };

  const getGameCount = (slug: string) =>
    accounts.filter((a) => (a.game || 'lol').toLowerCase() === slug.toLowerCase()).length;

  const platformTotalCount = currentPlatform.games.reduce(
    (acc, g) => acc + getGameCount(g.slug),
    0
  );

  return (
    <div className="space-y-8">
      {/* ── 1. BREADCRUMB ── */}
      <nav aria-label="breadcrumb" className="bg-[#070e1a]/80 px-4 py-2.5 rounded-2xl border border-white/5 backdrop-blur-md flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
        <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
          <span>🏠</span>
          <span>{t('nav_home')}</span>
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-300 flex items-center gap-1">
          <span>🎮</span>
          <span>{t('nav_platform')}</span>
        </span>
        <span className="text-slate-600">/</span>
        <span className="text-yellow-400 font-bold flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-0.5 rounded-lg border border-yellow-500/25">
          <span>{currentPlatform.icon}</span>
          <span>{currentPlatform.name}</span>
        </span>
      </nav>

      {/* ── 2. PLATFORM SEÇİM SEKMELERİ ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>🌐</span> Platform Değiştir
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              ({platforms.length} platform)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsPlatformModalOpen(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#122036] hover:bg-[#1a2f4e] text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>⚙️</span>
            <span>Platform Ekle / Yönet</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {platforms.map((p) => {
            const isSelected = p.slug === currentPlatform.slug;
            const pCount = p.games.reduce((acc, g) => acc + getGameCount(g.slug), 0);

            return (
              <Link
                key={p.slug}
                href={`/platform/${p.slug}`}
                className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-200 border cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#132545] to-[#0a1526] border-blue-400/80 shadow-[0_0_25px_rgba(59,130,246,0.3)] ring-1 ring-blue-400/50 -translate-y-0.5'
                    : 'bg-[#070e1a]/80 border-white/5 hover:border-blue-400/30 hover:bg-[#0c192d] hover:-translate-y-0.5'
                }`}
                style={{
                  borderColor: isSelected && p.color ? p.color : undefined,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {p.icon}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? 'bg-blue-500/25 text-blue-200 border-blue-400/40'
                        : 'bg-white/5 text-slate-400 border-white/5'
                    }`}
                  >
                    {pCount} Hesap
                  </span>
                </div>

                <div>
                  <div className="text-xs font-black text-white group-hover:text-blue-300 transition-colors truncate">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {p.games.length} Oyun Portalı
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-2 text-[10px] font-bold text-yellow-400 flex items-center gap-1">
                    <span>●</span>
                    <span>Aktif Platform</span>
                  </div>
                )}
              </Link>
            );
          })}

          {/* Yeni Platform Ekle Kartı */}
          <button
            type="button"
            onClick={() => setIsPlatformModalOpen(true)}
            className="group rounded-2xl border-2 border-dashed border-white/10 hover:border-yellow-400/60 bg-[#070e1a]/40 hover:bg-[#0c192d]/60 p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[95px]"
          >
            <span className="text-xl group-hover:scale-125 transition-transform mb-1">➕</span>
            <span className="text-[11px] font-bold text-slate-300 group-hover:text-yellow-400 transition-colors">
              Platform Ekle
            </span>
          </button>
        </div>
      </div>

      {/* ── 3. SEÇİLİ PLATFORM DETAY BAŞLIĞI ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c1a30] via-[#081220] to-[#050b14] border border-blue-500/20 p-6 md:p-8 shadow-xl">
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: currentPlatform.color || '#3b82f6' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner border shrink-0"
              style={{
                backgroundColor: currentPlatform.color ? `${currentPlatform.color}25` : '#3b82f625',
                borderColor: currentPlatform.color ? `${currentPlatform.color}50` : '#3b82f650',
              }}
            >
              {currentPlatform.icon}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {currentPlatform.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {currentPlatform.games.length} Oyun
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  {platformTotalCount} Toplam Hesap
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {currentPlatform.description || `${currentPlatform.name} platformundaki oyun hesaplarınızı seçerek listeleyin.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsPlatformModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span>
              <span>Bu Platforma Oyun Ekle</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. SEÇİLİ PLATFORMUN OYUN KARTLARI (STORE VİTRİNİ) ── */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>🎮</span>
              <span>{currentPlatform.name} Oyunları</span>
            </h2>
            <p className="text-xs text-slate-400">
              Yönetmek istediğiniz oyuna tıklayarak o oyunun hesap listesine ve istatistiklerine gidin.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentPlatform.games.map((g) => {
            const count = getGameCount(g.slug);
            const targetUrl = `/platform/${currentPlatform.slug}/${g.slug}`;

            return (
              <Link
                key={g.slug}
                href={targetUrl}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#111e33] via-[#0a1220] to-[#060c16] border border-white/10 hover:border-yellow-400/60 p-6 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_35px_rgba(234,179,8,0.2)] flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/25 transition-all pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 group-hover:border-yellow-400/40 group-hover:bg-yellow-500/15 flex items-center justify-center text-3xl shadow-inner transition-colors">
                      {g.icon}
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                      {count} Hesap
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white group-hover:text-yellow-400 transition-colors">
                    {g.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed min-h-[36px]">
                    {g.description || `${g.name} hesap ve envanter yönetimi`}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-yellow-400 group-hover:translate-x-1 transition-transform">
                  <span>Hesapları Yönet</span>
                  <span>→</span>
                </div>
              </Link>
            );
          })}

          {/* Yeni Oyun Ekle Kartı */}
          <button
            type="button"
            onClick={() => setIsPlatformModalOpen(true)}
            className="group rounded-3xl border-2 border-dashed border-white/15 hover:border-yellow-400/60 bg-[#070e1a]/40 hover:bg-[#0c192d]/60 p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[220px] hover:shadow-[0_10px_30px_rgba(234,179,8,0.15)]"
          >
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 group-hover:bg-yellow-500/20 border border-yellow-500/30 group-hover:scale-110 flex items-center justify-center text-3xl transition-transform mb-3">
              ➕
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">
              Bu Platforma Yeni Oyun Ekle
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              {currentPlatform.name} altına dilediğin oyunu ekle.
            </p>
          </button>
        </div>
      </div>

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
