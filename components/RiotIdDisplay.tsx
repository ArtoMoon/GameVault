'use client';

import { useState } from 'react';

interface RiotIdDisplayProps {
  riotId: string;
  className?: string;
  textClassName?: string;
  tagClassName?: string;
}

/**
 * Riot ID görüntüleme ve kopyalama bileşeni.
 *
 * - Varsayılan olarak sadece GameName (oyuncu adı) görünür, #TAG gizlidir.
 * - Üzerine gelindiğinde (hover) #TAG ve kopyalama simgesi belirir.
 * - Tıklandığında tüm Riot ID'yi ("GameName#TAG") panoya kopyalar ve bildirim gösterir.
 */
export default function RiotIdDisplay({
  riotId,
  className = '',
  textClassName = 'text-sm font-bold text-white',
  tagClassName = 'text-[11px] font-mono text-accent-300',
}: RiotIdDisplayProps) {
  const [copied, setCopied] = useState(false);
  const parts = riotId.split('#');
  const gameName = parts[0] || riotId;
  const tagLine = parts[1] ? `#${parts[1]}` : '';

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(riotId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      onClick={handleCopy}
      className={`group/riot relative inline-flex items-center cursor-pointer select-none py-0.5 rounded-lg transition-all min-w-0 ${className}`}
      title={`${riotId} — Kopyalamak için tıkla`}
    >
      {/* Oyuncu Adı */}
      <span className={`group-hover/riot:text-accent-300 transition-colors truncate ${textClassName}`}>
        {gameName}
      </span>

      {/* Tag: Sadece üzerine gelindiğinde (hover) göster */}
      {tagLine && (
        <span
          className={`opacity-0 max-w-0 overflow-hidden group-hover/riot:opacity-100 group-hover/riot:max-w-[140px] group-hover/riot:ml-1.5 transition-all duration-200 whitespace-nowrap bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded-md ${tagClassName}`}
        >
          {tagLine}
        </span>
      )}

      {/* Kopyalandı / Kopyalama Simgesi */}
      {copied ? (
        <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 px-1.5 py-0.5 rounded-md whitespace-nowrap animate-fade-in">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Kopyalandı
        </span>
      ) : (
        <span className="opacity-0 group-hover/riot:opacity-100 ml-1 text-text-muted group-hover/riot:text-text-secondary transition-opacity shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </span>
      )}
    </div>
  );
}
