'use client';

import { useState, useTransition } from 'react';
import {
  createPlatform,
  addGameToPlatform,
  deletePlatform,
  PlatformData,
} from '@/app/actions/platforms';

interface PlatformManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  platforms: PlatformData[];
  onPlatformsChange: () => void;
}

const PRESET_ICONS = ['🔴', '💨', '⚡', '🎮', '🕹️', '🛡️', '👑', '⚔️', '🎯', '🚀', '💎', '🏆', '🔥', '⚙️', '🌟'];
const PRESET_COLORS = [
  '#ef4444', // Red (Riot style)
  '#38bdf8', // Sky Blue (Steam style)
  '#f59e0b', // Amber (Epic style)
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6366f1', // Indigo
];

export default function PlatformManagerModal({
  isOpen,
  onClose,
  platforms,
  onPlatformsChange,
}: PlatformManagerModalProps) {
  const [tab, setTab] = useState<'new_platform' | 'add_game'>('new_platform');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎮');
  const [color, setColor] = useState('#3b82f6');
  const [description, setDescription] = useState('');
  const [initialGame, setInitialGame] = useState('');

  // Oyun Ekleme Sekmesi State'i
  const [selectedPlatformSlug, setSelectedPlatformSlug] = useState(
    platforms[0]?.slug || 'riot'
  );
  const [newGameName, setNewGameName] = useState('');
  const [newGameIcon, setNewGameIcon] = useState('⚔️');
  const [newGameDesc, setNewGameDesc] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleCreatePlatform = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Platform adı zorunludur.');
      return;
    }

    startTransition(async () => {
      const res = await createPlatform(
        name.trim(),
        icon,
        color,
        description.trim(),
        initialGame.trim(),
        '🎮'
      );
      if (res.success) {
        setName('');
        setDescription('');
        setInitialGame('');
        onPlatformsChange();
        onClose();
      } else {
        setError(res.error || 'Platform oluşturulamadı.');
      }
    });
  };

  const handleAddGame = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newGameName.trim()) {
      setError('Oyun adı zorunludur.');
      return;
    }

    startTransition(async () => {
      const res = await addGameToPlatform(
        selectedPlatformSlug,
        newGameName.trim(),
        newGameIcon,
        newGameDesc.trim()
      );
      if (res.success) {
        setNewGameName('');
        setNewGameDesc('');
        onPlatformsChange();
        onClose();
      } else {
        setError(res.error || 'Oyun eklenemedi.');
      }
    });
  };

  const handleDelete = (id: string, pName: string) => {
    if (!confirm(`"${pName}" platformunu silmek istediğinizden emin misiniz?`)) return;

    startTransition(async () => {
      const res = await deletePlatform(id);
      if (res.success) {
        onPlatformsChange();
      } else {
        setError(res.error || 'Platform silinemedi.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-xl bg-[#080e1a] border border-blue-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#050a14]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌐</span>
            <div>
              <h2 className="text-base font-bold text-white">
                Platform & Oyun Yönetimi
              </h2>
              <p className="text-[11px] text-slate-400">
                Kendi oyun platformlarınızı ve altındaki oyunları özelleştirin.
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

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 bg-[#070e1a] px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => { setTab('new_platform'); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'new_platform'
                ? 'border-yellow-400 text-yellow-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            ➕ Yeni Platform Ekle
          </button>

          <button
            type="button"
            onClick={() => { setTab('add_game'); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'add_game'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🎮 Platforma Oyun Ekle
          </button>
        </div>

        {/* İçerik */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
              ✕ {error}
            </div>
          )}

          {tab === 'new_platform' ? (
            <form onSubmit={handleCreatePlatform} className="space-y-4">
              {/* Platform Adı */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Platform Adı:
                </label>
                <input
                  type="text"
                  placeholder="Örn: Steam, Ubisoft, Battle.net, EA Play..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[#0e192d] border border-white/10 focus:border-yellow-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  required
                />
              </div>

              {/* İkon Seçimi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Platform İkonu:
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${
                        icon === emoji
                          ? 'bg-yellow-500/20 border border-yellow-400 scale-110 shadow-sm'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Renk Seçimi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tema Rengi:
                </label>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full cursor-pointer transition-all ${
                        color === c ? 'ring-2 ring-white scale-125' : 'hover:scale-110 opacity-80'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* İlk Oyun (İsteğe Bağlı) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  İlk Oyun (İsteğe Bağlı):
                </label>
                <input
                  type="text"
                  placeholder="Örn: Counter-Strike 2, Overwatch, FIFA..."
                  value={initialGame}
                  onChange={(e) => setInitialGame(e.target.value)}
                  className="bg-[#0e192d] border border-white/10 focus:border-yellow-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 hover:from-yellow-300 hover:to-amber-400 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isPending ? 'Ekleniyor...' : '➕ Platformu Kaydet'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddGame} className="space-y-4">
              {/* Platform Seçimi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Hangi Platforma Eklenecek:
                </label>
                <select
                  value={selectedPlatformSlug}
                  onChange={(e) => setSelectedPlatformSlug(e.target.value)}
                  className="bg-[#0e192d] border border-white/10 focus:border-blue-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  {platforms.map((p) => (
                    <option key={p.slug} value={p.slug} className="bg-[#080e1a]">
                      {p.icon} {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Yeni Oyun Adı */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Oyun Adı:
                </label>
                <input
                  type="text"
                  placeholder="Örn: CS2, Dota 2, GTA V, R6 Siege..."
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  className="bg-[#0e192d] border border-white/10 focus:border-blue-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  required
                />
              </div>

              {/* Oyun İkonu */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Oyun Simgesi:
                </label>
                <div className="flex flex-wrap gap-2">
                  {['⚔️', '🎯', '♟️', '🔫', '🛡️', '🏎️', '⛏️', '🎮', '🕹️', '👑', '🔥'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewGameIcon(emoji)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${
                        newGameIcon === emoji
                          ? 'bg-blue-500/20 border border-blue-400 scale-110 shadow-sm'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-400 hover:to-indigo-500 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isPending ? 'Ekleniyor...' : '➕ Oyunu Platforma Ekle'}
              </button>
            </form>
          )}

          {/* Mevcut Platformlar Listesi */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Kayıtlı Platformlar ({platforms.length}):
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
              {platforms.map((p) => (
                <div
                  key={p._id || p.slug}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#0e192d] border border-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{p.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400 ml-2">
                        ({p.games.length} oyun)
                      </span>
                    </div>
                  </div>

                  {!p.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDelete(p._id, p.name)}
                      className="text-slate-500 hover:text-rose-400 text-xs px-2 py-1 rounded cursor-pointer transition-colors"
                      title="Platformu Sil"
                    >
                      Sil
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
