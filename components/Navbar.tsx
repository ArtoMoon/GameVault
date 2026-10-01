'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';

/**
 * Masaüstü İstemci Başlık ve Navigasyon Çubuğu (Desktop Titlebar & Navbar).
 *
 * Windows pencere kontrolleri ile entegre, sürüklenebilir (drag-region),
 * dil seçimi (TR / EN) ve masaüstü istemci standartlarına uygun başlık alanı sağlar.
 */
export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isPlatform = pathname.startsWith('/platform') || pathname.startsWith('/accounts');

  return (
    <nav className="sticky top-0 z-50 bg-[#050e18]/95 backdrop-blur-md border-b border-yellow-600/20 shadow-[0_4px_24px_rgba(0,0,0,0.6)] drag-region select-none">
      {/* Windows pencere kontrol butonları için sağda (pr-36) boşluk bırakılmıştır */}
      <div className="w-full px-5 h-12 flex items-center justify-between">
        
        {/* Sol Alan: Uygulama Logosu, Başlığı ve Masaüstü Rozeti */}
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85 no-drag-region"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.3)] shrink-0 bg-[#050e18]">
              <img src="/icon.png" alt="MyLoL Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-black tracking-wider text-white">
                MY<span className="text-yellow-500">LOL</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                {t('client_badge')}
              </span>
            </div>
          </Link>
        </div>

        {/* Orta & Sağ Alan: Navigasyon, Dil Seçici ve Sistem Bilgisi */}
        <div className="flex items-center gap-3 md:gap-4 no-drag-region pr-36">
          {/* Anasayfa Linki */}
          <Link
            href="/"
            className={`text-xs font-bold transition-all py-1 px-2.5 rounded-lg flex items-center gap-1.5 ${
              isHome
                ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🏠</span>
            <span>{t('nav_home')}</span>
          </Link>

          {/* Platform Linki (Platform & Oyun Seçim Sayfası) */}
          <Link
            href="/platform"
            className={`text-xs font-bold transition-all py-1 px-2.5 rounded-lg flex items-center gap-1.5 ${
              isPlatform
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.25)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🎮</span>
            <span>{t('nav_platform')}</span>
          </Link>

          {/* Ayarlar & API Key Butonu */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-settings-modal'))}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-yellow-500/10 text-slate-300 hover:text-yellow-400 border border-white/10 hover:border-yellow-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            title={t('settings_btn')}
          >
            <span>⚙️</span>
            <span className="hidden lg:inline">{t('settings_btn')}</span>
          </button>

          {/* TR / EN Dil Seçici Buton */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setLanguage('tr')}
              className={`px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                language === 'tr'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-[0_0_8px_rgba(234,179,8,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
              title="Türkçe"
            >
              <span>🇹🇷</span>
              <span>TR</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                language === 'en'
                  ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
              title="English"
            >
              <span>🇬🇧</span>
              <span>EN</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 font-mono border-l border-white/10 pl-4">
            <span>Riot v14.x</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400/80">{t('db_active')}</span>
          </div>
        </div>

      </div>
    </nav>
  );
}
