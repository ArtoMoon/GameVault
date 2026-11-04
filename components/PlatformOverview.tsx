'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { AccountData } from '@/app/actions/accounts';
import { getPlatforms, reorderPlatforms, PlatformData } from '@/app/actions/platforms';
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
  const [modalTab, setModalTab] = useState<'new_platform' | 'add_game' | 'reorder'>('new_platform');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderStatus, setReorderStatus] = useState<string | null>(null);

  // Sürükle & Bırak State
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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
      _id: 'default-riot',
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

  // ── PLATFORM YERİNİ DEĞİŞTİR (SOL / SAĞ) ──
  const handleShiftPlatform = (index: number, direction: 'left' | 'right', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= platforms.length) return;

    const updated = [...platforms];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    setPlatforms(updated);

    startTransition(async () => {
      const ids = updated.map((p) => p._id);
      const res = await reorderPlatforms(ids);
      if (res.success) {
        setReorderStatus(`"${moved.name}" sırası güncellendi ✓`);
        setTimeout(() => setReorderStatus(null), 3000);
      }
    });
  };

  // ── SÜRÜKLE VE BIRAK ──
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    setDragOverIdx(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const updated = [...platforms];
    const [moved] = updated.splice(draggedIdx, 1);
    updated.splice(targetIndex, 0, moved);

    setDraggedIdx(null);
    setDragOverIdx(null);
    setPlatforms(updated);

    startTransition(async () => {
      const ids = updated.map((p) => p._id);
      const res = await reorderPlatforms(ids);
      if (res.success) {
        setReorderStatus('Platform sıralaması güncellendi ✓');
        setTimeout(() => setReorderStatus(null), 3000);
      }
    });
  };

  const openModal = (tab: 'new_platform' | 'add_game' | 'reorder') => {
    setModalTab(tab);
    setIsPlatformModalOpen(true);
  };

  const accentColor = currentPlatform.color || '#8b5cf6';

  return (
    <div className="space-y-7 select-none animate-fade-up">
      {/* ── 1. BREADCRUMB ── */}
      <nav
        aria-label="breadcrumb"
        className="flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-text-muted"
      >
        <div className="flex items-center gap-2">
          <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
            </svg>
            <span>{t('nav_home')}</span>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-text-secondary">{t('nav_platform')}</span>
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
          </span>
        </div>

        {reorderStatus && (
          <div className="chip !bg-emerald-500/15 !border-emerald-500/30 !text-emerald-300 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{reorderStatus}</span>
          </div>
        )}
      </nav>

      {/* ── 2. SEÇİLİ PLATFORM HERO BAŞLIĞI ── */}
      <div className="card relative overflow-hidden rounded-2xl p-6 md:p-8">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(45rem 24rem at 92% -15%, ${accentColor}2e, transparent 65%), radial-gradient(28rem 18rem at -5% 110%, ${accentColor}18, transparent 60%)`,
          }}
        />
        <div
          className="absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full"
          style={{ background: accentColor }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border shrink-0 shadow-lg"
              style={{
                backgroundColor: `${accentColor}22`,
                borderColor: `${accentColor}45`,
                boxShadow: `0 12px 32px -12px ${accentColor}66`,
              }}
            >
              {currentPlatform.icon}
            </div>

            <div>
              <div className="eyebrow mb-1">{t('nav_platform')}</div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="page-title">{currentPlatform.name}</h1>
                <span className="chip tabular-nums">
                  {currentPlatform.games.length} Oyun
                </span>
                <span
                  className="chip tabular-nums !text-white"
                  style={{
                    backgroundColor: `${accentColor}24`,
                    borderColor: `${accentColor}4d`,
                  }}
                >
                  {platformTotalCount} Toplam Hesap
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-1.5 max-w-2xl">
                {currentPlatform.description || `${currentPlatform.name} platformundaki oyun hesaplarınızı seçerek listeleyin.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => openModal('add_game')}
              className="btn btn-primary"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Bu Platforma Oyun Ekle</span>
            </button>
            <button
              type="button"
              onClick={() => openModal('reorder')}
              className="btn btn-secondary"
              title="Platformları sırala ve düzenle"
            >
              <span>⇄</span>
              <span>Sırala / Düzenle</span>
            </button>
            <button
              type="button"
              onClick={() => openModal('new_platform')}
              className="btn btn-secondary"
            >
              <span>⚙️</span>
              <span>Platform Ekle / Yönet</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. KOMPAKT PLATFORM SEÇİM VE SIRALAMA ŞERİDİ ── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <span>🌐</span> Platform Değiştir
            </h2>
            <span className="text-xs text-text-muted tabular-nums">
              ({platforms.length} platform)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sıralama Modu Toggle Butonu */}
            <button
              type="button"
              onClick={() => setIsReorderMode(!isReorderMode)}
              className={`btn btn-sm ${
                isReorderMode
                  ? 'btn-primary'
                  : 'btn-ghost border border-white/[0.08]'
              }`}
              title="Platformların sırasını değiştirmek için sıralama modunu açın"
            >
              <span>{isReorderMode ? '✓' : '⇄'}</span>
              <span>{isReorderMode ? 'Sıralamayı Bitir' : 'Sıralamayı Düzenle'}</span>
            </button>
          </div>
        </div>

        {/* Sıralama Modu Rehber Notu */}
        {isReorderMode && (
          <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-accent-500/10 border border-accent-400/25 text-xs text-accent-300 flex flex-wrap items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <span>💡</span>
              <span>
                Kartların üzerindeki <b>◀ (Sola)</b> ve <b>▶ (Sağa)</b> oklarına tıklayarak veya kartları <b>sürükleyip bırakarak</b> platformların yerini değiştirebilirsiniz.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openModal('reorder')}
              className="text-xs underline text-white hover:text-accent-300 font-semibold shrink-0 cursor-pointer"
            >
              Detaylı Liste Sıralaması →
            </button>
          </div>
        )}

        {/* Kompakt Platform Kartları Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {platforms.map((p, index) => {
            const isSelected = p.slug === currentPlatform.slug;
            const pCount = p.games.reduce((acc, g) => acc + getGameCount(g.slug), 0);
            const isDragging = draggedIdx === index;
            const isOver = dragOverIdx === index;
            const pColor = p.color || '#8b5cf6';

            return (
              <div
                key={p._id || p.slug}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`group relative overflow-hidden rounded-xl p-2.5 transition-all duration-200 border flex flex-col justify-between ${
                  isDragging
                    ? 'opacity-40 border-accent-400 scale-95'
                    : isOver
                    ? 'border-accent-400 bg-accent-500/15 -translate-y-0.5'
                    : isSelected
                    ? 'bg-white/[0.07] border-white/20 shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.045]'
                }`}
                style={{
                  borderColor: isSelected ? `${pColor}66` : undefined,
                }}
              >
                {isSelected && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                    style={{ background: pColor }}
                  />
                )}

                {/* Sol & Sağ Kaydırma Butonları (Sıralama kontrolleri) */}
                <div
                  className={`absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5 transition-opacity ${
                    isReorderMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => handleShiftPlatform(index, 'left', e)}
                    disabled={index === 0}
                    className="w-5 h-5 rounded-md bg-ink-900/90 hover:bg-accent-500 text-text-secondary hover:text-white disabled:opacity-20 border border-white/10 flex items-center justify-center text-[9px] font-bold cursor-pointer transition-colors"
                    title="Platformu sola kaydır (öne al)"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleShiftPlatform(index, 'right', e)}
                    disabled={index === platforms.length - 1}
                    className="w-5 h-5 rounded-md bg-ink-900/90 hover:bg-accent-500 text-text-secondary hover:text-white disabled:opacity-20 border border-white/10 flex items-center justify-center text-[9px] font-bold cursor-pointer transition-colors"
                    title="Platformu sağa kaydır (arkaya al)"
                  >
                    ▶
                  </button>
                </div>

                {/* Kart İçeriği Linki */}
                <Link
                  href={isReorderMode ? '#' : `/platform/${p.slug}`}
                  onClick={(e) => {
                    if (isReorderMode) {
                      e.preventDefault();
                    }
                  }}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 border border-white/[0.08]"
                    style={{ backgroundColor: `${pColor}1f` }}
                  >
                    {p.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-text-muted tabular-nums truncate">
                      {isReorderMode
                        ? `#${index + 1} · ${p.games.length} Oyun`
                        : `${p.games.length} Oyun · ${pCount} Hesap`}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}

          {/* Yeni Platform Ekle Kartı */}
          <button
            type="button"
            onClick={() => openModal('new_platform')}
            className="group rounded-xl border border-dashed border-white/10 hover:border-accent-400/50 bg-white/[0.015] hover:bg-white/[0.04] p-2.5 flex items-center justify-center gap-2 text-center transition-all cursor-pointer min-h-[54px]"
          >
            <span className="text-sm text-accent-400 group-hover:scale-110 transition-transform">➕</span>
            <span className="text-xs font-semibold text-text-secondary group-hover:text-white transition-colors">
              Platform Ekle
            </span>
          </button>
        </div>
      </div>

      {/* ── 4. SEÇİLİ PLATFORMUN OYUN KARTLARI (STORE VİTRİNİ) ── */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="eyebrow mb-1">{currentPlatform.name}</div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>{currentPlatform.name} Oyunları</span>
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Yönetmek istediğiniz oyuna tıklayarak o oyunun hesap listesine ve istatistiklerine gidin.
            </p>
          </div>
        </div>

        {currentPlatform.games.length === 0 ? (
          <div className="card p-12 text-center flex flex-col items-center justify-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 border"
              style={{
                backgroundColor: `${accentColor}1a`,
                borderColor: `${accentColor}38`,
              }}
            >
              🎮
            </div>
            <h3 className="text-base font-bold text-white">Bu platformda henüz oyun bulunmuyor</h3>
            <p className="text-sm text-text-secondary mt-1 max-w-sm">
              İlk oyun portalını ekleyerek hesaplarınızı bu platform altında yönetmeye başlayın.
            </p>
            <button
              type="button"
              onClick={() => openModal('add_game')}
              className="btn btn-primary mt-5"
            >
              <span>➕</span>
              <span>İlk Oyunu Ekle</span>
            </button>
          </div>
        ) : (
          <>
            <div className="stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentPlatform.games.map((g) => {
                const count = getGameCount(g.slug);
                const targetUrl = `/platform/${currentPlatform.slug}/${g.slug}`;

                return (
                  <Link
                    key={g.slug}
                    href={targetUrl}
                    className="card card-interactive group overflow-hidden p-6 flex flex-col justify-between"
                  >
                    <div
                      className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
                      style={{ backgroundColor: accentColor }}
                    />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-xl border flex items-center justify-center text-2xl transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: `${accentColor}1a`,
                            borderColor: `${accentColor}38`,
                          }}
                        >
                          {g.icon}
                        </div>
                        <span className="chip tabular-nums">
                          {count} Hesap
                        </span>
                      </div>

                      <h3 className="text-base font-bold tracking-tight text-white group-hover:text-accent-300 transition-colors">
                        {g.name}
                      </h3>
                      <p className="text-sm text-text-secondary mt-1.5 leading-relaxed min-h-[40px]">
                        {g.description || `${g.name} hesap ve envanter yönetimi`}
                      </p>
                    </div>

                    <div className="relative z-10 mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-accent-300 group-hover:text-white transition-colors">
                      <span>Hesapları Yönet</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </Link>
                );
              })}

              {/* Grid içinde boşluk varsa (örneğin 1 veya 2 oyun varken) Yeni Oyun Ekle Kartı */}
              {currentPlatform.games.length % 3 !== 0 && (
                <button
                  type="button"
                  onClick={() => openModal('add_game')}
                  className="group rounded-2xl border border-dashed border-white/10 hover:border-accent-400/50 bg-white/[0.015] hover:bg-white/[0.035] p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[210px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent-500/10 border border-accent-400/25 group-hover:scale-105 flex items-center justify-center text-2xl transition-transform mb-3">
                    ➕
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-accent-300 transition-colors">
                    Bu Platforma Yeni Oyun Ekle
                  </h3>
                  <p className="text-xs text-text-muted mt-1 max-w-[200px]">
                    {currentPlatform.name} altına dilediğin oyunu ekle.
                  </p>
                </button>
              )}
            </div>

            {/* Grid tam 3, 6, vb. doluyken ekranın altında tek başına yarım kalmaması için zarif alt ekleme bandı */}
            {currentPlatform.games.length % 3 === 0 && (
              <div
                onClick={() => openModal('add_game')}
                className="mt-4 p-4 rounded-2xl border border-dashed border-white/10 hover:border-accent-400/50 bg-white/[0.015] hover:bg-white/[0.035] flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-400/25 group-hover:scale-105 flex items-center justify-center text-lg transition-transform">
                    ➕
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-accent-300 transition-colors">
                      {currentPlatform.name} için Yeni Bir Oyun Portalı Ekle
                    </h4>
                    <p className="text-xs text-text-muted">
                      Bu platform altındaki oyun kütüphanenizi dilediğiniz gibi genişletin.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-accent-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform pr-2">
                  <span>Oyun Ekle</span>
                  <span>→</span>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 5. PLATFORM MANAGER MODAL ── */}
      <PlatformManagerModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
        platforms={platforms}
        onPlatformsChange={refreshPlatforms}
        initialTab={modalTab}
      />
    </div>
  );
}
