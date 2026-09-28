'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import AccountSyncButton from '@/components/AccountSyncButton';

export interface DashboardHeaderProps {
  isAddOpen?: boolean;
  onToggleAdd?: () => void;
  onOpenCategories?: () => void;
  totalAccounts?: number;
}

/**
 * Masaüstü İstemci Dashboard Komut Başlığı (Executive Command Header).
 * Başlık, sistem durumu ve sağ tarafta hızlı işlem aksiyonları barındırır.
 */
export default function DashboardHeader({
  isAddOpen = false,
  onToggleAdd,
  onOpenCategories,
  totalAccounts = 0,
}: DashboardHeaderProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 md:p-6 mb-6 bg-gradient-to-r from-[#0a1424] via-[#070e1a] to-[#040810] rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Arka plan hafif neon parıltısı */}
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-blue-500/5 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-10 w-64 h-24 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* Sol Bölüm: Başlık ve Canlı Bilgi */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full text-[11px] font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            {t('riot_client_manager')}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">v0.2.1</span>
        </div>

        <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <span>{t('dashboard_title_1')}</span>
          <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
            {t('dashboard_title_2')}
          </span>
        </h1>

        <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-2">
          <span>{t('dashboard_subtitle')}</span>
          <span className="text-slate-600">•</span>
          <span className="text-blue-400 font-medium font-mono">{totalAccounts} hesap kayıtlı</span>
        </p>
      </div>

      {/* Sağ Bölüm: Hızlı Aksiyon Komut Grubu */}
      <div className="flex flex-wrap items-center gap-2.5 relative z-10">
        {/* Tümünü Eşitle Butonu */}
        <AccountSyncButton />

        {/* Kategorileri Yönet Butonu */}
        {onOpenCategories && (
          <button
            type="button"
            onClick={onOpenCategories}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0e192d] hover:bg-[#152542] text-slate-300 hover:text-white border border-white/10 hover:border-blue-400/40 transition-all cursor-pointer shadow-sm hover:-translate-y-0.5 active:translate-y-0"
            title="Kategorileri Yönet"
          >
            <span>⚙️</span>
            <span>{t('manage_categories') || 'Kategoriler'}</span>
          </button>
        )}

        {/* Yeni Hesap Ekle Aç/Kapat Butonu */}
        {onToggleAdd && (
          <button
            type="button"
            onClick={onToggleAdd}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
              isAddOpen
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-2 ring-yellow-400/50'
                : 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
            }`}
          >
            <span>{isAddOpen ? '✕' : '➕'}</span>
            <span>{isAddOpen ? 'Formu Kapat' : t('modal_add_title')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
