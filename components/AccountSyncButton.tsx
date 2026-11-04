'use client';

import { useState, useTransition } from 'react';
import { syncAllAccounts, CheckResult } from '@/app/actions/accountSync';
import { useLanguage } from '@/lib/i18n/LanguageContext';

/**
 * "Tüm Hesapları Senkronize Et" butonu.
 *
 * Hesap senkronizasyonunu başlatır, ilerleme ve sonuç özetini gösterir.
 * Rate-limit nedeniyle uzun sürebilir (~1.5s/hesap).
 */
export default function AccountSyncButton() {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<{
    summary: { total: number; success: number; failed: number };
    results: CheckResult[];
  } | null>(null);

  function handleSync() {
    setResults(null);
    startTransition(async () => {
      const data = await syncAllAccounts();
      setResults(data);
    });
  }

  return (
    <div className="relative inline-block">
      <button
        id="sync-all-btn"
        type="button"
        className="btn btn-secondary"
        onClick={handleSync}
        disabled={isPending}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-accent-400 ${isPending ? 'animate-spin-slow' : ''}`}
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
        <span>{isPending ? t('syncing_progress') : t('sync_btn')}</span>
      </button>

      {results && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 glass-strong rounded-2xl p-4 text-xs animate-scale-in">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.07]">
            <span className="font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Senkronizasyon Tamamlandı
            </span>
            <button
              type="button"
              onClick={() => setResults(null)}
              className="btn btn-ghost btn-sm btn-icon !w-6 !h-6 text-text-muted hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center justify-between text-text-secondary mb-2 tabular-nums">
            <span>
              Toplam: <strong className="text-white">{results.summary.total}</strong>
            </span>
            <span className="text-emerald-400 font-semibold">✓ {results.summary.success} başarılı</span>
            {results.summary.failed > 0 && (
              <span className="text-red-400 font-semibold">✕ {results.summary.failed} hata</span>
            )}
          </div>

          {/* Durum değişen hesaplar */}
          {results.results.some((r) => r.statusChanged) && (
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.07] space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
              <p className="text-amber-400 font-semibold text-[11px]">Değişen Hesaplar</p>
              {results.results
                .filter((r) => r.statusChanged)
                .map((r) => (
                  <p key={r.riotId} className="text-text-secondary text-[11px] truncate">
                    {r.riotId} → <strong className="text-white">{r.newStatus}</strong>
                  </p>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
