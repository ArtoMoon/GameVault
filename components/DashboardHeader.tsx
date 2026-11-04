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
    <div className="flex items-end justify-between gap-4 flex-wrap pb-2">
      {/* Sol Bölüm: Başlık ve Canlı Bilgi */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className="eyebrow flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
            {t('riot_client_manager')}
          </span>
          <span className="chip tabular-nums text-[10px] !h-5 !px-2">v0.2.1</span>
        </div>

        <h1 className="page-title flex items-center gap-2 flex-wrap">
          <span>{t('dashboard_title_1')}</span>
          <span className="gradient-text">{t('dashboard_title_2')}</span>
        </h1>

        <p className="text-sm text-text-secondary flex items-center gap-2 flex-wrap">
          <span>{t('dashboard_subtitle')}</span>
          <span className="text-text-muted">•</span>
          <span className="text-accent-300 font-medium tabular-nums">{totalAccounts} hesap kayıtlı</span>
        </p>
      </div>

      {/* Sağ Bölüm: Hızlı Aksiyon Komut Grubu */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Tümünü Eşitle Butonu */}
        <AccountSyncButton />

        {/* Kategorileri Yönet Butonu */}
        {onOpenCategories && (
          <button
            type="button"
            onClick={onOpenCategories}
            className="btn btn-secondary"
            title="Kategorileri Yönet"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span>{t('manage_categories') || 'Kategoriler'}</span>
          </button>
        )}

        {/* Yeni Hesap Ekle Aç/Kapat Butonu */}
        {onToggleAdd && (
          <button
            type="button"
            onClick={onToggleAdd}
            className={`btn ${isAddOpen ? 'btn-secondary' : 'btn-primary'}`}
          >
            {isAddOpen ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
            <span>{isAddOpen ? 'Formu Kapat' : t('modal_add_title')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
