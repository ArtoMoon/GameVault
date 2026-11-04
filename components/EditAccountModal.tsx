'use client';

import { useState, useTransition, useEffect } from 'react';
import { updateAccount, AccountData } from '@/app/actions/accounts';
import { CategoryData } from '@/app/actions/categories';
import { PlatformData } from '@/app/actions/platforms';
import { AccountStatus } from '@/models/Account';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountData | null;
  categories?: CategoryData[];
  platformsList?: PlatformData[];
  onAccountUpdated?: (updated: AccountData) => void;
}

export default function EditAccountModal({
  isOpen,
  onClose,
  account,
  categories = [],
  platformsList = [],
  onAccountUpdated,
}: EditAccountModalProps) {
  const { t } = useLanguage();

  const dynamicGames =
    platformsList && platformsList.length > 0
      ? [
          ...platformsList.flatMap((p) =>
            p.games.map((g) => ({
              value: g.slug,
              label: `${g.icon || '🎮'} ${g.name} (${p.name})`,
              platformSlug: p.slug,
              gameName: g.name,
              apiType:
                g.apiType ||
                p.apiType ||
                (g.slug.includes('albion') || p.slug.includes('albion')
                  ? 'albion'
                  : ['lol', 'valorant', 'tft'].includes(g.slug.toLowerCase())
                  ? 'riot'
                  : 'manual'),
            }))
          ),
          { value: 'other', label: '🎮 Diğer Oyunlar', platformSlug: 'other', gameName: 'Diğer', apiType: 'manual' },
        ]
      : [
          { value: 'lol', label: '⚔️ League of Legends', platformSlug: 'riot', gameName: 'LoL', apiType: 'riot' },
          { value: 'valorant', label: '🎯 Valorant', platformSlug: 'riot', gameName: 'Valorant', apiType: 'riot' },
          { value: 'tft', label: '♟️ TFT', platformSlug: 'riot', gameName: 'TFT', apiType: 'riot' },
          { value: 'other', label: '🎮 Diğer Oyunlar', platformSlug: 'other', gameName: 'Diğer', apiType: 'manual' },
        ];

  const riotPlatforms = [
    { value: 'TR1', label: t('platform_tr') || 'TR (Türkiye)' },
    { value: 'EUW1', label: t('platform_euw') || 'EUW (Batı Avrupa)' },
    { value: 'EUN1', label: t('platform_eun') || 'EUNE (Kuzey-Doğu)' },
    { value: 'NA1', label: t('platform_na') || 'NA (Kuzey Amerika)' },
    { value: 'KR', label: t('platform_kr') || 'KR (Kore)' },
    { value: 'BR1', label: t('platform_br') || 'BR (Brezilya)' },
    { value: 'RU', label: t('platform_ru') || 'RU (Rusya)' },
  ];

  const albionPlatforms = [
    { value: 'Europe', label: '🇪🇺 Albion Europe (Avrupa)' },
    { value: 'Americas', label: '🇺🇸 Albion Americas (Batı / Washington)' },
    { value: 'Asia', label: '🌏 Albion Asia (Doğu / Singapur)' },
    { value: 'Global', label: '🌐 Global' },
  ];

  const genericPlatforms = [
    { value: 'Global', label: '🌐 Global' },
    { value: 'Europe', label: '🇪🇺 Europe (Avrupa)' },
    { value: 'North America', label: '🇺🇸 North America (Kuzey Amerika)' },
    { value: 'Turkey', label: '🇹🇷 Türkiye' },
    { value: 'Asia', label: '🌏 Asia' },
  ];

  const albionPresetRanks = ['Tier 3', 'Tier 4', 'Tier 5', 'Tier 6', 'Tier 7', 'Tier 8', 'Elder', 'Master', 'PvP Leader'];
  const lolPresetRanks = ['UNRANKED', 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];

  const [riotId, setRiotId] = useState('');
  const [username, setUsername] = useState('');
  const [game, setGame] = useState('lol');
  const [platform, setPlatform] = useState('TR1');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<AccountStatus>('available');
  const [level, setLevel] = useState<number>(1);
  const [rank, setRank] = useState('UNRANKED');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (account) {
      setRiotId(account.riotId || '');
      setUsername(account.username || '');
      setGame((account.game || 'lol').toLowerCase());
      setPlatform(account.platform || 'TR1');
      setCategory(account.category || '');
      setStatus(account.status || 'available');
      setLevel(account.level || 0);
      setRank(account.rank || 'UNRANKED');
      setNotes(account.notes || '');
      setError(null);
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const selectedGameObj = dynamicGames.find((g) => g.value === game);
  const cleanGame = game.toLowerCase();
  const isAlbion =
    selectedGameObj?.apiType === 'albion' ||
    cleanGame === 'albion' ||
    cleanGame.includes('albion');
  const isRiotGame =
    selectedGameObj?.apiType === 'riot' ||
    ['lol', 'valorant', 'tft'].includes(cleanGame);

  const currentPlatformOptions = isRiotGame
    ? riotPlatforms
    : isAlbion
    ? albionPlatforms
    : genericPlatforms;

  const handleGameChange = (newGame: string) => {
    setGame(newGame);
    const gLower = newGame.toLowerCase();
    const gObj = dynamicGames.find((d) => d.value === newGame);
    if (gObj?.apiType === 'albion' || gLower === 'albion' || gLower.includes('albion')) {
      setPlatform('Europe');
    } else if (gObj?.apiType === 'riot' || ['lol', 'valorant', 'tft'].includes(gLower)) {
      setPlatform('TR1');
    } else {
      setPlatform('Global');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!riotId.trim()) {
      setError('Hesap / Karakter adı boş olamaz.');
      return;
    }

    startTransition(async () => {
      const res = await updateAccount(account._id, {
        riotId: riotId.trim(),
        username: username.trim(),
        game: game.trim(),
        platform: platform.trim(),
        category: category.trim(),
        status,
        level: Number(level) || 0,
        rank: rank.trim() || 'UNRANKED',
        notes: notes.trim(),
      });

      if (res.success && res.account) {
        onAccountUpdated?.(res.account);
        onClose();
      } else {
        setError(res.error || 'Hesap güncellenirken hata oluştu.');
      }
    });
  };

  return (
    <div className="modal-backdrop !z-[130] select-none" onClick={onClose}>
      <div
        className="modal-panel max-w-2xl flex flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-400/25 text-accent-300 flex items-center justify-center shrink-0">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="eyebrow">HESAP YÖNETİMİ</div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2 flex-wrap">
                <span>Hesabı Düzenle</span>
                <span className="chip font-mono text-accent-300 !bg-accent-500/15 !border-accent-400/25">
                  {account.riotId}
                </span>
              </h2>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {isAlbion ? 'Albion Online' : isRiotGame ? 'Riot Games' : 'Oyun'} platformuna özel hesap ayarları
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-icon shrink-0"
            aria-label="Kapat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl flex items-center gap-2.5 animate-fade-in">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Oyun Platformu Seçici */}
            <div>
              <label className="label flex items-center gap-1.5">
                <span>🎮</span> Oyun / Platform
              </label>
              <select
                className="input font-medium cursor-pointer"
                value={game}
                onChange={(e) => handleGameChange(e.target.value)}
                disabled={isPending}
              >
                {dynamicGames.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sunucu / Bölge */}
            <div>
              <label className="label flex items-center gap-1.5">
                <span>🌐</span> {isAlbion ? 'Albion Sunucusu' : 'Sunucu / Bölge'}
              </label>
              <select
                className="input font-medium cursor-pointer"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={isPending}
              >
                {currentPlatformOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hesap / Karakter Adı */}
            <div>
              <label className="label flex items-center gap-1.5">
                <span>⚡</span> {isAlbion ? 'Albion Karakter Adı' : isRiotGame ? 'Riot ID (GameName#TAG)' : 'Hesap / Karakter Adı'}
              </label>
              <input
                type="text"
                className="input"
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            {/* Giriş Kullanıcı Adı */}
            <div>
              <label className="label flex items-center gap-1.5">
                <span>🔑</span> Giriş Kullanıcı Adı (İstemci)
              </label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Örn: gizli_kullanici"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Durum */}
            <div>
              <label className="label flex items-center gap-1.5">
                <span>📌</span> Hesap Durumu
              </label>
              <select
                className="input font-medium cursor-pointer"
                value={status}
                onChange={(e) => setStatus(e.target.value as AccountStatus)}
                disabled={isPending}
              >
                <option value="available">✅ Hazır / Mevcut</option>
                <option value="active">🎮 Aktif Kullanımda</option>
                <option value="level">⚡ Kasılıyor (Level)</option>
                <option value="archived">📁 Arşivlendi</option>
                <option value="error_checking">🚫 Ban / Hata</option>
              </select>
            </div>

            {/* Seviye / Level */}
            <div>
              <label className="label flex items-center gap-1.5">
                <span>⚡</span> {isAlbion ? 'Level / Fame' : 'Seviye (Level)'}
              </label>
              <input
                type="number"
                min="0"
                className="input tabular-nums"
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value, 10) || 0)}
                disabled={isPending}
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="label flex items-center gap-1.5">
                <span>🏷️</span> Kategori
              </label>
              <select
                className="input font-medium cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isPending}
              >
                <option value="">📁 Kategorisiz</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rank / Lig / Derece */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="label !mb-0 flex items-center gap-1.5">
                <span>🏆</span> {isAlbion ? 'Albion Tier / Rank' : 'Rank / Lig / Derece'}
              </label>
              <span className="text-[11px] text-text-muted">
                Hızlı şablonlara tıklayabilir veya serbest metin yazabilirsiniz
              </span>
            </div>
            <input
              type="text"
              className="input"
              placeholder={isAlbion ? 'Örn: Tier 8 Elder' : 'Örn: GOLD II 45 LP'}
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              disabled={isPending}
            />
            {/* Hızlı Şablon Butonları */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              {(isAlbion ? albionPresetRanks : isRiotGame ? lolPresetRanks : albionPresetRanks).map((pr) => {
                const isSelected = rank.toUpperCase().includes(pr.toUpperCase());
                return (
                  <button
                    key={pr}
                    type="button"
                    onClick={() => setRank(pr)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent-500/20 text-accent-300 border-accent-400/40 shadow-[0_0_12px_-4px_rgba(139,92,246,0.5)]'
                        : 'bg-white/[0.04] text-text-secondary border-white/[0.07] hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {pr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notlar */}
          <div>
            <label className="label flex items-center gap-1.5">
              <span>📝</span> Hesap Notları
            </label>
            <textarea
              rows={2}
              className="input resize-none"
              placeholder="Hesaba dair kişisel notlar, eşyalar, satılık bilgisi vb."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isPending}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary px-5"
            >
              {isPending ? '⏳ Kaydediliyor...' : '💾 Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
