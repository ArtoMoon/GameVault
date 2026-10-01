'use client';

import { useState, useTransition } from 'react';
import { addAccount } from '@/app/actions/accounts';
import { CategoryData } from '@/app/actions/categories';
import { PlatformData } from '@/app/actions/platforms';
import { sanitizeRiotId } from '@/lib/riot/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import CategoryManagerModal from './CategoryManagerModal';

interface AddAccountFormProps {
  categories?: CategoryData[];
  onCategoriesChange?: () => void;
  platformsList?: PlatformData[];
  defaultGame?: string;
  onAccountAdded?: () => void;
}

export default function AddAccountForm({
  categories = [],
  onCategoriesChange,
  platformsList = [],
  defaultGame,
  onAccountAdded,
}: AddAccountFormProps) {
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

  const [game, setGame] = useState(defaultGame || dynamicGames[0]?.value || 'lol');
  const [category, setCategory] = useState('');
  const [riotId, setRiotId] = useState('');
  const [username, setUsername] = useState('');
  const [customLevel, setCustomLevel] = useState('');
  const [customRank, setCustomRank] = useState('');
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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

  const [platform, setPlatform] = useState(
    isRiotGame ? 'TR1' : isAlbion ? 'Europe' : 'Global'
  );

  // defaultGame değişirse senkronize et
  const [prevDefaultGame, setPrevDefaultGame] = useState(defaultGame);
  if (defaultGame !== prevDefaultGame) {
    setPrevDefaultGame(defaultGame);
    if (defaultGame) {
      setGame(defaultGame);
      const isAlb =
        defaultGame.toLowerCase() === 'albion' ||
        defaultGame.toLowerCase().includes('albion');
      if (isAlb) {
        setPlatform('Europe');
      } else if (['lol', 'valorant', 'tft'].includes(defaultGame.toLowerCase())) {
        setPlatform('TR1');
      } else {
        setPlatform('Global');
      }
    }
  }

  const handleGameSelect = (newGame: string) => {
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const cleaned = sanitizeRiotId(riotId);
    const cleanedUsername = sanitizeRiotId(username);

    if (isRiotGame && !cleaned.includes('#')) {
      setMessage({ type: 'error', text: 'Riot oyunları formatı: "GameName#TAG" (Örn: Faker#KR1)' });
      return;
    }

    if (!cleaned) {
      setMessage({ type: 'error', text: 'Hesap / Karakter adı boş bırakılamaz.' });
      return;
    }

    const parsedLevel = customLevel ? parseInt(customLevel, 10) : undefined;

    startTransition(async () => {
      const result = await addAccount(
        cleaned,
        platform,
        cleanedUsername,
        game,
        category,
        parsedLevel,
        customRank.trim()
      );
      if (result.success) {
        const displayName = result.account?.riotId ?? cleaned;
        const extra = cleanedUsername ? ` (${t('label_username')}: ${cleanedUsername})` : '';
        const catInfo = category ? ` [${category}]` : '';
        const serverInfo = platform ? ` - ${platform}` : '';
        setMessage({
          type: 'success',
          text: `✅ "${displayName}"${serverInfo}${extra}${catInfo} başarıyla eklendi!`,
        });
        setRiotId('');
        setUsername('');
        setCustomLevel('');
        setCustomRank('');
        onAccountAdded?.();
      } else {
        setMessage({ type: 'error', text: `❌ ${result.error}` });
      }
    });
  }

  return (
    <>
      <form className="w-full" onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Üst Seçiciler Satırı: Oyun, Kategori, Bölge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Oyun Seçici */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-game" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>🎮</span> {t('game') || 'Oyun'}
              </label>
              <div className="relative">
                <select
                  id="add-game"
                  className="w-full bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none cursor-pointer transition-all appearance-none"
                  value={game}
                  onChange={(e) => handleGameSelect(e.target.value)}
                  disabled={isPending}
                >
                  {dynamicGames.map((g) => (
                    <option key={g.value} value={g.value} className="bg-[#0a1424] text-white">
                      {g.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>
            </div>

            {/* Kategori Seçici */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="add-category" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <span>🏷️</span> {t('category') || 'Kategori'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(true)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  + Yeni Kategori
                </button>
              </div>
              <div className="relative">
                <select
                  id="add-category"
                  className="w-full bg-[#070e1a] border border-white/10 hover:border-yellow-400/40 focus:border-yellow-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none cursor-pointer transition-all appearance-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isPending}
                >
                  <option value="" className="bg-[#0a1424] text-slate-400">
                    📁 {t('category_none') || 'Kategorisiz'}
                  </option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name} className="bg-[#0a1424] text-white">
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>
            </div>

            {/* Bölge / Sunucu Seçici */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-platform" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>🌐</span> {isAlbion ? 'Albion Sunucusu' : t('label_region') || 'Bölge / Sunucu'}
              </label>
              <div className="relative">
                <select
                  id="add-platform"
                  className="w-full bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none cursor-pointer transition-all appearance-none"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={isPending}
                  aria-label={t('label_region')}
                >
                  {currentPlatformOptions.map((p) => (
                    <option key={p.value} value={p.value} className="bg-[#0a1424] text-white">
                      {p.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>
            </div>
          </div>

          {/* Alt Satır: Hesap Adı & Kullanıcı Adı & (opsiyonel Level/Rank) & Kaydet Butonu */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Hesap Adı Girişi */}
            <div className={`${!isRiotGame ? 'sm:col-span-4' : 'sm:col-span-6'} flex flex-col gap-1.5`}>
              <label htmlFor="add-riot-id" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>⚡</span> {isAlbion ? 'Albion Karakter / Hesap Adı' : !isRiotGame ? 'Hesap / Oyuncu Adı' : t('label_riot_id')}
                <span className="text-yellow-400/80 font-normal font-sans text-[10px] ml-1">
                  {isRiotGame && '(GameName#TAG)'}
                </span>
              </label>
              <input
                id="add-riot-id"
                type="text"
                className="w-full bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all placeholder:text-slate-500 font-sans"
                placeholder={isAlbion ? 'Örn: AlbionHero' : !isRiotGame ? 'Hesap Adı / Nickname' : t('placeholder_riot_id')}
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            {/* Kullanıcı Adı (İstemci Girişi) */}
            <div className={`${!isRiotGame ? 'sm:col-span-3' : 'sm:col-span-4'} flex flex-col gap-1.5`}>
              <label htmlFor="add-username" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
                <span>🔑</span> {t('label_username')} (İsteğe Bağlı)
              </label>
              <input
                id="add-username"
                type="text"
                className="w-full bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all placeholder:text-slate-500 font-sans"
                placeholder={t('placeholder_username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Riot harici oyunlar için Seviye ve Rank girişleri */}
            {!isRiotGame && (
              <>
                <div className="sm:col-span-1 flex flex-col gap-1.5">
                  <label htmlFor="add-level" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
                    <span>⚡</span> Level
                  </label>
                  <input
                    id="add-level"
                    type="number"
                    min="0"
                    className="w-full bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all placeholder:text-slate-500 font-sans"
                    placeholder="1"
                    value={customLevel}
                    onChange={(e) => setCustomLevel(e.target.value)}
                    disabled={isPending}
                  />
                </div>

                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label htmlFor="add-rank" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
                    <span>🏆</span> {isAlbion ? 'Tier / Rank' : 'Rank / Lig'}
                  </label>
                  <input
                    id="add-rank"
                    type="text"
                    className="w-full bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all placeholder:text-slate-500 font-sans"
                    placeholder={isAlbion ? 'Örn: Tier 8' : 'Örn: Gold'}
                    value={customRank}
                    onChange={(e) => setCustomRank(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </>
            )}

            {/* Kaydet Butonu */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                id="add-account-btn"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs font-bold cursor-pointer transition-all whitespace-nowrap bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.35)] hover:shadow-[0_0_20px_rgba(234,179,8,0.55)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isPending || !riotId.trim()}
              >
                {isPending ? `⏳ ${t('adding')}` : `➕ ${t('save')}`}
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mt-3 text-xs px-4 py-3 rounded-xl border flex items-center justify-between ${message.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'}`}>
            <span>{message.text}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-white cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </form>

      {/* Kategori Yönetim Modalı */}
      <CategoryManagerModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories}
        onCategoriesChange={() => {
          onCategoriesChange?.();
        }}
      />
    </>
  );
}
