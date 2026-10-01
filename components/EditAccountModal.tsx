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
            }))
          ),
          { value: 'other', label: '🎮 Diğer Oyunlar', platformSlug: 'other', gameName: 'Diğer' },
        ]
      : [
          { value: 'lol', label: '⚔️ League of Legends', platformSlug: 'riot', gameName: 'LoL' },
          { value: 'valorant', label: '🎯 Valorant', platformSlug: 'riot', gameName: 'Valorant' },
          { value: 'tft', label: '♟️ TFT', platformSlug: 'riot', gameName: 'TFT' },
          { value: 'other', label: '🎮 Diğer Oyunlar', platformSlug: 'other', gameName: 'Diğer' },
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

  const cleanGame = game.toLowerCase();
  const isRiotGame = ['lol', 'valorant', 'tft'].includes(cleanGame);
  const isAlbion = cleanGame === 'albion';

  const currentPlatformOptions = isRiotGame
    ? riotPlatforms
    : isAlbion
    ? albionPlatforms
    : genericPlatforms;

  const handleGameChange = (newGame: string) => {
    setGame(newGame);
    const gLower = newGame.toLowerCase();
    if (gLower === 'albion') {
      setPlatform('Europe');
    } else if (['lol', 'valorant', 'tft'].includes(gLower)) {
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
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0d1829] to-[#070e1a] border border-blue-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#050a14]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">✏️</span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Hesabı Düzenle</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                  {account.riotId}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {isAlbion ? 'Albion Online' : isRiotGame ? 'Riot Games' : 'Oyun'} platformuna özel hesap ayarları
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 p-3 rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Oyun Platformu Seçici */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>🎮</span> Oyun / Platform
              </label>
              <select
                className="bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3.5 py-2.5 text-white font-semibold outline-none cursor-pointer transition-all"
                value={game}
                onChange={(e) => handleGameChange(e.target.value)}
                disabled={isPending}
              >
                {dynamicGames.map((g) => (
                  <option key={g.value} value={g.value} className="bg-[#0a1424] text-white">
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sunucu / Bölge */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>🌐</span> {isAlbion ? 'Albion Sunucusu' : 'Sunucu / Bölge'}
              </label>
              <select
                className="bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3.5 py-2.5 text-white font-semibold outline-none cursor-pointer transition-all"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={isPending}
              >
                {currentPlatformOptions.map((p) => (
                  <option key={p.value} value={p.value} className="bg-[#0a1424] text-white">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hesap / Karakter Adı */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>⚡</span> {isAlbion ? 'Albion Karakter Adı' : isRiotGame ? 'Riot ID (GameName#TAG)' : 'Hesap / Karakter Adı'}
              </label>
              <input
                type="text"
                className="bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3.5 py-2.5 text-white outline-none transition-all placeholder:text-slate-500 font-sans"
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            {/* Giriş Kullanıcı Adı */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>🔑</span> Giriş Kullanıcı Adı (İstemci)
              </label>
              <input
                type="text"
                className="bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3.5 py-2.5 text-white outline-none transition-all placeholder:text-slate-500 font-sans"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Örn: gizli_kullanici"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Durum */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>📌</span> Hesap Durumu
              </label>
              <select
                className="bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3 py-2.5 text-white font-semibold outline-none cursor-pointer transition-all"
                value={status}
                onChange={(e) => setStatus(e.target.value as AccountStatus)}
                disabled={isPending}
              >
                <option value="available" className="bg-[#0a1424]">✅ Hazır / Mevcut</option>
                <option value="active" className="bg-[#0a1424]">🎮 Aktif Kullanımda</option>
                <option value="level" className="bg-[#0a1424]">⚡ Kasılıyor (Level)</option>
                <option value="archived" className="bg-[#0a1424]">📁 Arşivlendi</option>
                <option value="error_checking" className="bg-[#0a1424]">🚫 Ban / Hata</option>
              </select>
            </div>

            {/* Seviye / Level */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>⚡</span> {isAlbion ? 'Level / Fame' : 'Seviye (Level)'}
              </label>
              <input
                type="number"
                min="0"
                className="bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3 py-2.5 text-white outline-none transition-all"
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value, 10) || 0)}
                disabled={isPending}
              />
            </div>

            {/* Kategori */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>🏷️</span> Kategori
              </label>
              <select
                className="bg-[#070e1a] border border-white/10 hover:border-yellow-400/40 focus:border-yellow-400 rounded-xl px-3 py-2.5 text-white font-semibold outline-none cursor-pointer transition-all"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isPending}
              >
                <option value="" className="bg-[#0a1424] text-slate-400">📁 Kategorisiz</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.name} className="bg-[#0a1424] text-white">
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rank / Lig / Derece */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>🏆</span> {isAlbion ? 'Albion Tier / Rank' : 'Rank / Lig / Derece'}
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Hızlı şablonlara tıklayabilir veya serbest metin yazabilirsiniz</span>
            </label>
            <input
              type="text"
              className="bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3.5 py-2.5 text-white outline-none transition-all placeholder:text-slate-500 font-sans"
              placeholder={isAlbion ? 'Örn: Tier 8 Elder' : 'Örn: GOLD II 45 LP'}
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              disabled={isPending}
            />
            {/* Hızlı Şablon Butonları */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {(isAlbion ? albionPresetRanks : isRiotGame ? lolPresetRanks : albionPresetRanks).map((pr) => (
                <button
                  key={pr}
                  type="button"
                  onClick={() => setRank(pr)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                    rank.toUpperCase().includes(pr.toUpperCase())
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {pr}
                </button>
              ))}
            </div>
          </div>

          {/* Notlar */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span>📝</span> Hesap Notları
            </label>
            <textarea
              rows={2}
              className="w-full bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3.5 py-2 text-white outline-none transition-all placeholder:text-slate-500 font-sans resize-none"
              placeholder="Hesaba dair kişisel notlar, eşyalar, satılık bilgisi vb."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              disabled={isPending}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 rounded-xl font-sans text-xs font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? '⏳ Kaydediliyor...' : '💾 Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
