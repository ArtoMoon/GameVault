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
}

export default function AddAccountForm({
  categories = [],
  onCategoriesChange,
  platformsList = [],
  defaultGame,
}: AddAccountFormProps) {
  const { t } = useLanguage();

  const dynamicGames =
    platformsList && platformsList.length > 0
      ? [
          ...platformsList.flatMap((p) =>
            p.games.map((g) => ({
              value: g.slug,
              label: `${g.icon || '🎮'} ${g.name} (${p.name})`,
            }))
          ),
          { value: 'other', label: '🎮 Diğer Oyunlar' },
        ]
      : [
          { value: 'lol', label: '⚔️ League of Legends' },
          { value: 'valorant', label: '🎯 Valorant' },
          { value: 'tft', label: '♟️ TFT' },
          { value: 'other', label: '🎮 Diğer Oyunlar' },
        ];

  const platforms = [
    { value: 'TR1',  label: t('platform_tr') || 'TR (Türkiye)' },
    { value: 'EUW1', label: t('platform_euw') || 'EUW (Batı Avrupa)' },
    { value: 'EUN1', label: t('platform_eun') || 'EUNE (Kuzey-Doğu)' },
    { value: 'NA1',  label: t('platform_na') || 'NA (Kuzey Amerika)' },
    { value: 'KR',   label: t('platform_kr') || 'KR (Kore)' },
    { value: 'BR1',  label: t('platform_br') || 'BR (Brezilya)' },
    { value: 'RU',   label: t('platform_ru') || 'RU (Rusya)' },
  ];

  const [game, setGame] = useState(defaultGame || dynamicGames[0]?.value || 'lol');
  const [category, setCategory] = useState('');
  const [riotId, setRiotId] = useState('');
  const [username, setUsername] = useState('');
  const [platform, setPlatform] = useState('TR1');
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isRiotGame = ['lol', 'valorant', 'tft'].includes(game.toLowerCase());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const cleaned = sanitizeRiotId(riotId);
    const cleanedUsername = sanitizeRiotId(username);

    if (isRiotGame && !cleaned.includes('#')) {
      setMessage({ type: 'error', text: 'Format: "GameName#TAG" (Örn: Faker#KR1)' });
      return;
    }

    startTransition(async () => {
      const result = await addAccount(cleaned, platform, cleanedUsername, game, category);
      if (result.success) {
        const displayName = result.account?.riotId ?? cleaned;
        const extra = cleanedUsername ? ` (${t('label_username')}: ${cleanedUsername})` : '';
        const catInfo = category ? ` [${category}]` : '';
        setMessage({
          type: 'success',
          text: `✅ "${displayName}"${extra}${catInfo} eklendi!`,
        });
        setRiotId('');
        setUsername('');
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
                  onChange={(e) => setGame(e.target.value)}
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

            {/* Bölge Seçici */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-platform" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>🌐</span> {t('label_region') || 'Bölge / Sunucu'}
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
                  {platforms.map((p) => (
                    <option key={p.value} value={p.value} className="bg-[#0a1424] text-white">
                      {p.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>
            </div>
          </div>

          {/* Alt Satır: Riot ID & Kullanıcı Adı & Kaydet Butonu */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Riot ID Girişi */}
            <div className="sm:col-span-6 flex flex-col gap-1.5">
              <label htmlFor="add-riot-id" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>⚡</span> {!isRiotGame ? 'Hesap / Oyuncu Adı' : t('label_riot_id')}
                <span className="text-yellow-400/80 font-normal font-sans text-[10px] ml-1">
                  {isRiotGame && '(GameName#TAG)'}
                </span>
              </label>
              <input
                id="add-riot-id"
                type="text"
                className="w-full bg-[#070e1a] border border-white/10 hover:border-blue-400/40 focus:border-blue-400 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all placeholder:text-slate-500 font-sans"
                placeholder={!isRiotGame ? 'Hesap Adı / Nickname' : t('placeholder_riot_id')}
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            {/* Kullanıcı Adı (İstemci Girişi) */}
            <div className="sm:col-span-4 flex flex-col gap-1.5">
              <label htmlFor="add-username" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
                <span>🔑</span> {t('label_username')}
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
