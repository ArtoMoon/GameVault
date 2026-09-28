'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

/**
 * Masaüstü İstemci Dashboard Başlığı (Desktop Client Header).
 * Dil seçimine göre dinamik başlık ve açıklama sunar.
 */
export default function DashboardHeader() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 px-6 mb-6 bg-gradient-to-r from-[#0d1b2a]/80 via-[#0a1524]/60 to-transparent rounded-2xl border border-blue-500/15 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-bold tracking-wider uppercase">
            {t('riot_client_manager')}
          </span>
          <span className="text-xs text-slate-500">v0.2.1</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
          {t('dashboard_title_1')}{' '}
          <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
            {t('dashboard_title_2')}
          </span>
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          {t('dashboard_subtitle')}
        </p>
      </div>
    </div>
  );
}
