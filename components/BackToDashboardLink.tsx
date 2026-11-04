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
      className="btn btn-ghost btn-sm -ml-2 mb-6 text-text-secondary hover:text-white group"
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
        className="transition-transform group-hover:-translate-x-0.5"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      <span>{cleanText}</span>
    </button>
  );
}
