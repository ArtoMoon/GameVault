'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PlatformData } from '@/app/actions/platforms';
import type { UpdateCheckResponse } from '@/app/api/update-check/route';
import { openExternalUrl } from '@/lib/desktop';

const COLLAPSE_KEY = 'gamevault_sidebar_collapsed';

interface SidebarProps {
  /** Sunucu tarafında (layout) çekilen platform listesi */
  platforms: PlatformData[];
}

/**
 * Uygulama Yan Menüsü (App Sidebar).
 *
 * Eski üst navigasyon çubuğunun yerini alır. Marka alanı, ana navigasyon,
 * dinamik platform/oyun listesi, ayarlar kısayolu ve dil seçicisini içerir.
 * Daraltılmış/genişletilmiş durumu localStorage üzerinde saklanır.
 */
export default function Sidebar({ platforms }: SidebarProps) {
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResponse | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/update-check', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UpdateCheckResponse | null) => {
        if (active && data) setUpdateInfo(data);
      })
      .catch(() => {
        // Ignore
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const isHome = pathname === '/';

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 flex flex-col border-r border-white/[0.06] bg-ink-900/70 backdrop-blur-xl transition-[width] duration-300 ease-out ${
        collapsed ? 'w-[72px]' : 'w-[248px]'
      }`}
    >
      {/* Marka */}
      <div className={`flex items-center h-16 px-4 gap-3 ${collapsed ? 'justify-center px-0' : ''}`}>
        <Link href="/" className="relative shrink-0 group" title="GameVault">
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-accent-500/50 to-glow-500/40 blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
          <img
            src="/logo.png"
            alt="GameVault"
            className="relative w-9 h-9 rounded-xl object-cover border border-white/15"
          />
        </Link>
        {!collapsed && (
          <div className="min-w-0 animate-fade-in">
            <div className="text-[15px] font-extrabold tracking-tight text-white leading-none">
              Game<span className="gradient-text">Vault</span>
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              {t('client_badge')}
            </div>
          </div>
        )}
      </div>

      <div className="divider mx-4" />

      {/* Navigasyon */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-6">
        <div>
          {!collapsed && <SectionLabel>{t('nav_section_main')}</SectionLabel>}
          <NavItem
            href="/"
            active={isHome}
            collapsed={collapsed}
            icon={<HomeIcon />}
            label={t('nav_home')}
          />
        </div>

        <div>
          {!collapsed && <SectionLabel>{t('nav_section_platforms')}</SectionLabel>}
          <div className="space-y-0.5">
            {platforms.map((p) => {
              const base = `/platform/${p.slug}`;
              const active = pathname === base || pathname.startsWith(`${base}/`);
              return (
                <div key={p._id}>
                  <NavItem
                    href={base}
                    active={active}
                    collapsed={collapsed}
                    accent={p.color}
                    icon={<span className="text-base leading-none">{p.icon}</span>}
                    label={p.name}
                    badge={p.games.length > 0 ? String(p.games.length) : undefined}
                  />
                  {active && !collapsed && p.games.length > 0 && (
                    <div className="ml-[22px] mt-0.5 mb-1.5 pl-3 border-l border-white/[0.07] space-y-0.5 animate-fade-in">
                      {p.games.map((g) => {
                        const href = `${base}/${g.slug}`;
                        const gameActive = pathname === href;
                        return (
                          <Link
                            key={g.slug}
                            href={href}
                            className={`flex items-center gap-2 h-8 px-2.5 rounded-lg text-[12.5px] transition-colors ${
                              gameActive
                                ? 'text-white bg-white/[0.06]'
                                : 'text-text-muted hover:text-text-primary hover:bg-white/[0.03]'
                            }`}
                          >
                            <span className="text-sm leading-none">{g.icon}</span>
                            <span className="truncate">{g.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Alt alan: güncelleme, ayarlar, dil, durum */}
      <div className="p-3 space-y-2 border-t border-white/[0.06]">
        {updateInfo?.hasUpdate && (
          <button
            type="button"
            onClick={() => openExternalUrl(updateInfo.downloadUrl || updateInfo.releaseUrl)}
            title={`${t('update_available')}: v${updateInfo.latestVersion}`}
            className={`w-full flex items-center gap-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-accent-500/25 via-accent-500/15 to-glow-500/20 border border-accent-400/40 hover:border-accent-300/70 shadow-[0_0_24px_-6px_rgba(139,92,246,0.6)] transition-all cursor-pointer animate-fade-in ${
              collapsed ? 'justify-center h-10' : 'px-3 py-2.5 justify-between'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-accent-500/30 text-accent-200 shrink-0">
                <DownloadIcon />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-glow-400 animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-glow-400" />
              </span>
              {!collapsed && (
                <span className="min-w-0 text-left">
                  <span className="block text-[11px] font-bold leading-tight text-white truncate">
                    {t('update_available')}
                  </span>
                  <span className="block text-[10px] font-mono text-accent-300 leading-tight">
                    v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
                  </span>
                </span>
              )}
            </span>
            {!collapsed && (
              <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-accent-500 text-white shrink-0">
                {t('update_btn')}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-settings-modal'))}
          title={t('settings_btn')}
          className={`w-full flex items-center gap-3 h-10 rounded-xl text-[13px] font-medium text-text-secondary hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : 'px-3'
          }`}
        >
          <GearIcon />
          {!collapsed && <span className="truncate flex-1 text-left">{t('settings_btn')}</span>}
          {!collapsed && updateInfo?.currentVersion && (
            <span className="text-[10px] font-mono text-text-muted">v{updateInfo.currentVersion}</span>
          )}
        </button>

        {collapsed ? (
          <button
            type="button"
            onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
            title={t('nav_language')}
            className="w-full h-9 rounded-xl text-[11px] font-bold text-text-secondary hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            {language.toUpperCase()}
          </button>
        ) : (
          <div className="segmented w-full">
            {(['tr', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                data-active={language === lang}
                onClick={() => setLanguage(lang)}
                className="flex-1 justify-center"
              >
                {lang === 'tr' ? 'Türkçe' : 'English'}
              </button>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-2 pt-1 ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
          {!collapsed && (
            <span className="flex items-center gap-2 text-[11px] text-text-muted truncate">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              {t('db_active')}
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? t('nav_expand') : t('nav_collapse')}
            className="btn btn-ghost btn-sm btn-icon !w-7 !h-7"
          >
            <ChevronIcon flipped={collapsed} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted/80">
      {children}
    </div>
  );
}

interface NavItemProps {
  href: string;
  active: boolean;
  collapsed: boolean;
  icon: React.ReactNode;
  label: string;
  accent?: string;
  badge?: string;
}

function NavItem({ href, active, collapsed, icon, label, accent, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-3 h-10 rounded-xl text-[13px] font-medium transition-all ${
        collapsed ? 'justify-center' : 'px-3'
      } ${
        active
          ? 'text-white bg-gradient-to-r from-white/[0.09] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
      }`}
    >
      {active && (
        <span
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
          style={{ background: accent || 'linear-gradient(180deg,#a78bfa,#22d3ee)' }}
        />
      )}
      <span
        className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors"
        style={
          accent
            ? { background: `${accent}${active ? '26' : '14'}`, boxShadow: active ? `0 0 16px -4px ${accent}` : undefined }
            : undefined
        }
      >
        {icon}
      </span>
      {!collapsed && <span className="truncate flex-1">{label}</span>}
      {!collapsed && badge && (
        <span className="text-[10px] font-semibold text-text-muted bg-white/[0.05] rounded-md px-1.5 py-0.5">
          {badge}
        </span>
      )}
    </Link>
  );
}

function HomeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ChevronIcon({ flipped }: { flipped: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-300 ${flipped ? 'rotate-180' : ''}`}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}


