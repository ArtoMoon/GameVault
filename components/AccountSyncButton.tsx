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
        className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-sans text-xs font-bold cursor-pointer transition-all whitespace-nowrap bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.35)] hover:shadow-[0_0_20px_rgba(59,130,246,0.55)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed ${
          isPending ? 'animate-pulse' : ''
        }`}
        onClick={handleSync}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
            <span>{t('syncing_progress')}</span>
          </>
        ) : (
          <>
            <span>🔄</span>
            <span>{t('sync_btn')}</span>
          </>
        )}
      </button>

      {results && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 bg-[#0a1424] border border-blue-500/30 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl text-xs animate-fade-in">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span>⚡</span> Senkronizasyon Tamamlandı
            </span>
            <button
              onClick={() => setResults(null)}
              className="text-slate-400 hover:text-white cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span>Toplam: <strong className="text-white font-mono">{results.summary.total}</strong></span>
            <span className="text-emerald-400">✓ {results.summary.success} başarılı</span>
            {results.summary.failed > 0 && (
              <span className="text-rose-400">✕ {results.summary.failed} hata</span>
            )}
          </div>

          {/* Durum değişen hesaplar */}
          {results.results.some((r) => r.statusChanged) && (
            <div className="mt-2 pt-2 border-t border-white/10 space-y-1 max-h-32 overflow-y-auto no-scrollbar">
              <p className="text-amber-400 font-semibold text-[11px]">⚠️ Değişen Hesaplar:</p>
              {results.results
                .filter((r) => r.statusChanged)
                .map((r) => (
                  <p key={r.riotId} className="text-slate-300 text-[11px] truncate">
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
