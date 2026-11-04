import Image from 'next/image';

interface RankBadgeProps {
  /** Formatlanmış rank string'i, ör: "PLATINUM III 55 LP" veya "UNRANKED" */
  rank: string;
  /** Resim boyutu (px), varsayılan: 48 */
  size?: number;
  onClick?: (rank: string) => void;
  className?: string;
}

/** Tier string'ini resim dosyası adına dönüştürür */
function getTierFromRank(rank: string): string | null {
  if (!rank || rank === 'UNRANKED') return null;
  const tier = rank.split(' ')[0].toLowerCase();
  const validTiers = [
    'challenger', 'grandmaster', 'master',
    'diamond', 'emerald', 'platinum',
    'gold', 'silver', 'bronze', 'iron',
  ];
  return validTiers.includes(tier) ? tier : null;
}

/**
 * Rank rozeti bileşeni.
 * Rank yoksa veya UNRANKED ise sade yer tutucu simge gösterir.
 * Rank varsa tier ikonunu render eder.
 */
export default function RankBadge({ rank, size = 48, onClick, className = '' }: RankBadgeProps) {
  const tier = getTierFromRank(rank);

  if (!tier) {
    return (
      <div
        style={{ width: size, height: size }}
        onClick={
          onClick
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick('UNRANKED');
              }
            : undefined
        }
        className={`rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center relative shrink-0 transition-all ${
          onClick ? 'cursor-pointer hover:scale-105 active:scale-95 hover:border-white/20 hover:bg-white/[0.07]' : ''
        } ${className}`}
        title={onClick ? 'Unranked hesaplara göre filtrele' : undefined}
      >
        <svg
          width={Math.max(14, Math.round(size * 0.42))}
          height={Math.max(14, Math.round(size * 0.42))}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text-muted/70"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
    );
  }

  return (
    <span
      onClick={
        onClick
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick(tier.toUpperCase());
            }
          : undefined
      }
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        onClick ? 'cursor-pointer hover:scale-110 active:scale-95 transition-transform' : 'cursor-default'
      } ${className}`}
      title={onClick ? `"${tier.toUpperCase()}" rankına göre filtrele` : undefined}
    >
      <Image
        src={`/ranks/${tier}.png`}
        alt={rank}
        width={size}
        height={size}
        className="block object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)] transition-transform duration-200"
        unoptimized
      />
    </span>
  );
}
