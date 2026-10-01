'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function BackToDashboardLink() {
  const { t } = useLanguage();
  const router = useRouter();

  // translations.ts already has '← Panele Dön'; remove leading arrow to prevent double arrow
  const rawText = t('back_to_dashboard') || 'Panele Dön';
  const cleanText = rawText.replace(/^[←\s]+/, '');

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
        } else {
          router.push('/');
        }
      }}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors mb-6 pb-2 border-b-2 border-transparent hover:border-yellow-500 cursor-pointer group"
    >
      <span className="transition-transform group-hover:-translate-x-1">←</span>
      <span>{cleanText}</span>
    </button>
  );
}
