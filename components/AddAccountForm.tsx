'use client';

import { useState, useTransition } from 'react';
import { addAccount } from '@/app/actions/accounts';
import { CategoryData } from '@/app/actions/categories';
import { PlatformData } from '@/app/actions/platforms';
import { sanitizeRiotId } from '@/lib/riot/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  CS2_POPULAR_CASES,
  formatTimeUntilNextCs2Reset,
} from '@/lib/cs2/dropTracker';
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

  const baseDynamicGames =
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
        ]
      : [
          { value: 'lol', label: '⚔️ League of Legends', platformSlug: 'riot', gameName: 'LoL', apiType: 'riot' },
          { value: 'valorant', label: '🎯 Valorant', platformSlug: 'riot', gameName: 'Valorant', apiType: 'riot' },
          { value: 'tft', label: '♟️ TFT', platformSlug: 'riot', gameName: 'TFT', apiType: 'riot' },
        ];

  const hasCs2InList = baseDynamicGames.some((g) => g.value.toLowerCase() === 'cs2');
  const dynamicGames = [
    ...baseDynamicGames,
    ...(!hasCs2InList
      ? [
          {
            value: 'cs2',
            label: '🔫 Counter-Strike 2 (CS2 Kasa Takip)',
            platformSlug: 'steam',
            gameName: 'Counter-Strike 2',
            apiType: 'steam',
          },
        ]
      : []),
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
    { value: 'Global', label: '🌐 Global / Steam' },
    { value: 'Europe', label: '🇪🇺 Europe (Avrupa)' },
    { value: 'North America', label: '🇺🇸 North America (Kuzey Amerika)' },
    { value: 'Turkey', label: '🇹🇷 Türkiye' },
    { value: 'Asia', label: '🌏 Asia' },
  ];

  const initialGame = defaultGame || dynamicGames[0]?.value || 'lol';
  const [game, setGame] = useState(initialGame);
  const [category, setCategory] = useState('');
  const [riotId, setRiotId] = useState('');
  const [username, setUsername] = useState('');
  const [customLevel, setCustomLevel] = useState('');
  const [customRank, setCustomRank] = useState('');

  // CS2 Haftalık Kasa Takibi Alanları
  const [csDropTracked, setCsDropTracked] = useState(
    initialGame.toLowerCase() === 'cs2'
  );
  const [csClaimedThisWeek, setCsClaimedThisWeek] = useState(false);
  const [csLastCaseName, setCsLastCaseName] = useState('');
  const [csTotalDrops, setCsTotalDrops] = useState('0');
  const [csPrime, setCsPrime] = useState(true);

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const selectedGameObj = dynamicGames.find((g) => g.value === game);
  const cleanGame = game.toLowerCase();
  const isCs2 = cleanGame === 'cs2' || cleanGame.includes('counter-strike');
  const isAlbion =
    selectedGameObj?.apiType === 'albion' ||
    cleanGame === 'albion' ||
    cleanGame.includes('albion');
  const isRiotGame =
    !isCs2 &&
    (selectedGameObj?.apiType === 'riot' ||
      ['lol', 'valorant', 'tft'].includes(cleanGame));

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
      const dLower = defaultGame.toLowerCase();
      const isAlb = dLower === 'albion' || dLower.includes('albion');
      if (dLower === 'cs2') {
        setCsDropTracked(true);
        setPlatform('Global');
      } else if (isAlb) {
        setPlatform('Europe');
      } else if (['lol', 'valorant', 'tft'].includes(dLower)) {
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
    if (gLower === 'cs2' || gLower.includes('counter-strike')) {
      setCsDropTracked(true);
      setPlatform('Global');
    } else if (gObj?.apiType === 'albion' || gLower === 'albion' || gLower.includes('albion')) {
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
    const parsedTotalDrops = csTotalDrops !== '' ? parseInt(csTotalDrops, 10) : undefined;

    startTransition(async () => {
      const result = await addAccount(
        cleaned,
        platform,
        cleanedUsername,
        game,
        category,
        parsedLevel,
        customRank.trim(),
        {
          csDropTracked: csDropTracked || isCs2,
          csClaimedThisWeek,
          csLastCaseName: csLastCaseName.trim(),
          csTotalDrops: parsedTotalDrops,
          csPrime,
        }
      );
      if (result.success) {
        const displayName = result.account?.riotId ?? cleaned;
        const extra = cleanedUsername ? ` (${t('label_username')}: ${cleanedUsername})` : '';
        const catInfo = category ? ` [${category}]` : '';
        const csInfo =
          csDropTracked || isCs2
            ? ` • 📦 Kasa Takibi: ${csClaimedThisWeek ? 'Bu Hafta Alındı' : 'Kasa Hazır'}`
            : '';
        setMessage({
          type: 'success',
          text: `✅ "${displayName}"${extra}${catInfo}${csInfo} başarıyla eklendi!`,
        });
        setRiotId('');
        setUsername('');
        setCustomLevel('');
        setCustomRank('');
        setCsClaimedThisWeek(false);
        setCsLastCaseName('');
        setCsTotalDrops('0');
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
          {/* Üst Seçiciler Satırı: Oyun, Kategori, Bölge, CS2 Kasa Takip Anahtarı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Oyun Seçici */}
            <div>
              <label htmlFor="add-game" className="label flex items-center gap-1.5">
                <span>🎮</span> {t('game') || 'Oyun'}
              </label>
              <select
                id="add-game"
                className="input font-medium cursor-pointer"
                value={game}
                onChange={(e) => handleGameSelect(e.target.value)}
                disabled={isPending}
              >
                {dynamicGames.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Kategori Seçici */}
            <div>
              <div className="flex items-center justify-between mb-[0.4rem]">
                <label htmlFor="add-category" className="label !mb-0 flex items-center gap-1.5">
                  <span>🏷️</span> {t('category') || 'Kategori'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(true)}
                  className="text-[11px] font-semibold text-accent-400 hover:text-accent-300 transition-colors cursor-pointer"
                >
                  + Yeni Kategori
                </button>
              </div>
              <select
                id="add-category"
                className="input font-medium cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isPending}
              >
                <option value="">
                  📁 {t('category_none') || 'Kategorisiz'}
                </option>
                {categories.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bölge / Sunucu Seçici */}
            <div>
              <label htmlFor="add-platform" className="label flex items-center gap-1.5">
                <span>🌐</span> {isAlbion ? 'Albion Sunucusu' : t('label_region') || 'Bölge / Sunucu'}
              </label>
              <select
                id="add-platform"
                className="input font-medium cursor-pointer"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={isPending}
                aria-label={t('label_region')}
              >
                {currentPlatformOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* CS2 Kasa Takibi Aç/Kapat Butonu */}
            <div>
              <label className="label flex items-center gap-1.5">
                <span>📦</span> CS2 Kasa Takibi
              </label>
              <button
                type="button"
                onClick={() => setCsDropTracked((prev) => !prev)}
                className={`w-full h-10 px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  csDropTracked || isCs2
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-300 shadow-[0_0_20px_-6px_rgba(245,158,11,0.45)]'
                    : 'bg-ink-900/75 border-white/[0.08] text-text-secondary hover:text-white hover:border-white/20'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span>📦</span>
                  <span>{csDropTracked || isCs2 ? 'Kasa Takibi Aktif' : 'Kasa Takibi Ekle'}</span>
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    csDropTracked || isCs2 ? 'bg-amber-400 animate-pulse' : 'bg-white/20'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 📦 CS2 HAFTALIK KASA TAKİP PANELİ (Aktifse veya CS2 seçiliyse) */}
          {(csDropTracked || isCs2) && (
            <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/[0.08] via-ink-900/80 to-emerald-500/[0.06] p-4 space-y-3 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/35 flex items-center justify-center text-sm">
                    📦
                  </span>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>CS2 Haftalık Kasa & Drop Takibi</span>
                      <span className="chip !text-[10px] !py-0 !px-2 !bg-amber-500/15 !border-amber-400/30 !text-amber-300">
                        ⏳ Sıfırlanmaya: {formatTimeUntilNextCs2Reset()} (Çarşamba 04:00)
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Her Çarşamba 04:00&apos;te tüm hesapların haftalık kasa durumu otomatik olarak &quot;Kasa Hazır&quot; durumuna döner.
                    </p>
                  </div>
                </div>

                {/* Prime Durumu Seçici */}
                <button
                  type="button"
                  onClick={() => setCsPrime((prev) => !prev)}
                  className={`h-7 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    csPrime
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-text-muted'
                  }`}
                >
                  <span>{csPrime ? '⭐ Prime Aktif' : '⚪ Prime Yok'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Bu Haftaki Kasa Durumu */}
                <div>
                  <label className="label">Bu Haftaki Drop Durumu</label>
                  <div className="segmented w-full">
                    <button
                      type="button"
                      data-active={!csClaimedThisWeek}
                      onClick={() => setCsClaimedThisWeek(false)}
                      className="flex-1 justify-center text-xs"
                    >
                      📦 Kasa Hazır
                    </button>
                    <button
                      type="button"
                      data-active={csClaimedThisWeek}
                      onClick={() => {
                        setCsClaimedThisWeek(true);
                        if (!csTotalDrops || csTotalDrops === '0') {
                          setCsTotalDrops('1');
                        }
                      }}
                      className="flex-1 justify-center text-xs"
                    >
                      ✅ Bu Hafta Alındı
                    </button>
                  </div>
                </div>

                {/* Son Düşen Kasa Seçici / Girişi */}
                <div>
                  <label className="label">Son Düşen Kasa / Eşya (İsteğe Bağlı)</label>
                  <input
                    type="text"
                    list="cs2-case-presets"
                    className="input text-xs"
                    placeholder="Örn: Kilowatt Case, Dreams & Nightmares..."
                    value={csLastCaseName}
                    onChange={(e) => setCsLastCaseName(e.target.value)}
                    disabled={isPending}
                  />
                  <datalist id="cs2-case-presets">
                    {CS2_POPULAR_CASES.map((cName) => (
                      <option key={cName} value={cName} />
                    ))}
                  </datalist>
                </div>

                {/* Toplam Düşürülen Kasa Sayısı */}
                <div>
                  <label className="label">Toplam Düşürülen Kasa Sayısı</label>
                  <input
                    type="number"
                    min="0"
                    className="input tabular-nums text-xs"
                    placeholder="0"
                    value={csTotalDrops}
                    onChange={(e) => setCsTotalDrops(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Alt Satır: Hesap Adı & Kullanıcı Adı & (opsiyonel Level/Rank) & Kaydet Butonu */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
            {/* Hesap Adı Girişi */}
            <div className={`${!isRiotGame ? 'sm:col-span-4' : 'sm:col-span-6'}`}>
              <label htmlFor="add-riot-id" className="label flex items-center gap-1.5">
                <span>⚡</span>{' '}
                {isCs2
                  ? 'Steam / CS2 Hesap Adı'
                  : isAlbion
                  ? 'Albion Karakter / Hesap Adı'
                  : !isRiotGame
                  ? 'Hesap / Oyuncu Adı'
                  : t('label_riot_id')}
                {isRiotGame && (
                  <span className="text-accent-400/90 font-normal normal-case tracking-normal text-[10px] ml-0.5">
                    (GameName#TAG)
                  </span>
                )}
              </label>
              <input
                id="add-riot-id"
                type="text"
                className="input"
                placeholder={
                  isCs2
                    ? 'Örn: CS2_Farm_1 veya Steam Nick'
                    : isAlbion
                    ? 'Örn: AlbionHero'
                    : !isRiotGame
                    ? 'Hesap Adı / Nickname'
                    : t('placeholder_riot_id')
                }
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            {/* Kullanıcı Adı (İstemci Girişi) */}
            <div className={`${!isRiotGame ? 'sm:col-span-3' : 'sm:col-span-4'}`}>
              <label htmlFor="add-username" className="label flex items-center gap-1.5 truncate">
                <span>🔑</span> {isCs2 ? 'Steam Giriş ID' : t('label_username')}{' '}
                <span className="text-text-muted/70 normal-case font-normal">(İsteğe Bağlı)</span>
              </label>
              <input
                id="add-username"
                type="text"
                className="input"
                placeholder={isCs2 ? 'Örn: steam_login_id' : t('placeholder_username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Riot harici oyunlar için Seviye ve Rank girişleri */}
            {!isRiotGame && (
              <>
                <div className="sm:col-span-1">
                  <label htmlFor="add-level" className="label flex items-center gap-1 truncate">
                    <span>⚡</span> {isCs2 ? 'XP Lv' : 'Level'}
                  </label>
                  <input
                    id="add-level"
                    type="number"
                    min="0"
                    className="input tabular-nums"
                    placeholder="1"
                    value={customLevel}
                    onChange={(e) => setCustomLevel(e.target.value)}
                    disabled={isPending}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="add-rank" className="label flex items-center gap-1.5 truncate">
                    <span>🏆</span> {isCs2 ? 'Premier / Rank' : isAlbion ? 'Tier / Rank' : 'Rank / Lig'}
                  </label>
                  <input
                    id="add-rank"
                    type="text"
                    className="input"
                    placeholder={isCs2 ? 'Örn: 15,400 CS Rating' : isAlbion ? 'Örn: Tier 8' : 'Örn: Gold'}
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
                className="btn btn-primary w-full !h-10"
                disabled={isPending || !riotId.trim()}
              >
                {isPending ? `⏳ ${t('adding')}` : `➕ ${t('save')}`}
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mt-3.5 text-xs px-4 py-3 rounded-xl border flex items-center justify-between animate-fade-in ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <span>{message.text}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-text-muted hover:text-white cursor-pointer ml-3 transition-colors"
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
