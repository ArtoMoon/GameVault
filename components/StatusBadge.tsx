'use client';

import type { AccountStatus } from '@/models/Account';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { TranslationKey } from '@/lib/i18n/translations';

interface StatusBadgeProps {
  status: AccountStatus;
  onClick?: (status: AccountStatus) => void;
  className?: string;
}

interface StatusStyle {
  key: TranslationKey;
  bgClass: string;
  textClass: string;
  dotClass: string;
  borderClass: string;
}

/** Status stil eşleşmesi */
const STATUS_STYLES: Record<AccountStatus, StatusStyle> = {
  available: {
    key: 'status_available',
    bgClass: 'bg-emerald-500/10 hover:bg-emerald-500/15',
    textClass: 'text-emerald-300',
    dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]',
    borderClass: 'border-emerald-500/20',
  },
  archived: {
    key: 'status_archived',
    bgClass: 'bg-zinc-500/10 hover:bg-zinc-500/15',
    textClass: 'text-zinc-400',
    dotClass: 'bg-zinc-400',
    borderClass: 'border-zinc-500/20',
  },
  active: {
    key: 'status_active',
    bgClass: 'bg-sky-500/10 hover:bg-sky-500/15',
    textClass: 'text-sky-300',
    dotClass: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.65)]',
    borderClass: 'border-sky-500/25',
  },
  level: {
    key: 'status_level',
    bgClass: 'bg-amber-500/10 hover:bg-amber-500/15',
    textClass: 'text-amber-300',
    dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.65)]',
    borderClass: 'border-amber-500/25',
  },
  error_checking: {
    key: 'status_error_checking',
    bgClass: 'bg-red-500/10 hover:bg-red-500/15',
    textClass: 'text-red-300',
    dotClass: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.65)]',
    borderClass: 'border-red-500/25',
  },
};

/**
 * Hesap durumunu renkli badge olarak gösterir (i18n destekli).
 */
export default function StatusBadge({ status, onClick, className = '' }: StatusBadgeProps) {
  const { t } = useLanguage();
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.error_checking;
  const label = t(config.key);

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-semibold tracking-tight border transition-colors select-none ${config.bgClass} ${config.textClass} ${config.borderClass} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={() => onClick?.(status)}
      title={label}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
      <span className="truncate">{label}</span>
    </span>
  );
}
