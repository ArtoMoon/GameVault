'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  createPlatform,
  addGameToPlatform,
  deletePlatform,
  reorderPlatforms,
  updatePlatform,
  restoreDefaultPlatforms,
  PlatformData,
} from '@/app/actions/platforms';
import { PLATFORM_PRESETS, PlatformPreset, PlatformApiType } from '@/lib/platformPresets';

interface PlatformManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  platforms: PlatformData[];
  onPlatformsChange: () => void;
  initialTab?: 'new_platform' | 'add_game' | 'reorder';
}

const PRESET_ICONS = ['🔴', '💨', '⚡', '🎮', '🕹️', '🛡️', '👑', '⚔️', '🎯', '🚀', '💎', '🏆', '🔥', '⚙️', '🌟', '♟️', '🔫', '🏎️', '⛏️', '🎲'];
const PRESET_COLORS = [
  '#ef4444', // Red
  '#38bdf8', // Sky Blue
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Orange
];

const API_SCHEMAS: {
  type: PlatformApiType;
  name: string;
  icon: string;
  badge: string;
  desc: string;
}[] = [
  {
    type: 'albion',
    name: 'Albion Online API',
    icon: '⚔️',
    badge: 'Canlı Veri (Key Gerekmez)',
    desc: 'Resmi killboard API üzerinden karakter adı ile canlı Fame, PvP, PvE, Seviye, Lonca ve Gerçek Portre çeker.',
  },
  {
    type: 'riot',
    name: 'Riot Games API',
    icon: '🔴',
    badge: 'Riot Games',
    desc: 'League of Legends, Valorant ve TFT ligleri, canlı LP, maç geçmişi ve profil ikonu takibi.',
  },
  {
    type: 'steam',
    name: 'Steam Topluluk API',
    icon: '💨',
    badge: 'Valve',
    desc: 'SteamID ve topluluk profili entegrasyonu.',
  },
  {
    type: 'manual',
    name: 'Manuel / Özel API Yok',
    icon: '✍️',
    badge: 'Manuel Takip',
    desc: 'API olmadan hesap adı, seviye ve lig kullanıcı tarafından el ile girilip yönetilir.',
  },
];

export default function PlatformManagerModal({
  isOpen,
  onClose,
  platforms,
  onPlatformsChange,
  initialTab = 'new_platform',
}: PlatformManagerModalProps) {
  const [tab, setTab] = useState<'new_platform' | 'add_game' | 'reorder'>(initialTab);
  
  // Yerel sıralanmış platform listesi (optimistic reorder için)
  const [localPlatforms, setLocalPlatforms] = useState<PlatformData[]>(platforms);
  useEffect(() => {
    setLocalPlatforms(platforms);
  }, [platforms]);

  // Yeni Platform State
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎮');
  const [color, setColor] = useState('#3b82f6');
  const [description, setDescription] = useState('');
  const [initialGame, setInitialGame] = useState('');
  const [apiType, setApiType] = useState<PlatformApiType>('manual');
  const [selectedPreset, setSelectedPreset] = useState<PlatformPreset | null>(null);

  // Oyun Ekleme State
  const [selectedPlatformSlug, setSelectedPlatformSlug] = useState(
    platforms[0]?.slug || 'riot'
  );
  const [newGameName, setNewGameName] = useState('');
  const [newGameIcon, setNewGameIcon] = useState('⚔️');
  const [newGameDesc, setNewGameDesc] = useState('');
  const [gameApiType, setGameApiType] = useState<PlatformApiType>('manual');

  // Platform Düzenleme State
  const [editingPlatform, setEditingPlatform] = useState<PlatformData | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('🎮');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [editDesc, setEditDesc] = useState('');
  const [editApiType, setEditApiType] = useState<PlatformApiType>('manual');

  // Sürükle & Bırak State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((cur) => (cur?.message === message ? null : cur));
    }, 4500);
  };

  // ── ŞABLON SEÇME & HIZLI EKLEME ──
  const handleSelectPreset = (preset: PlatformPreset) => {
    setSelectedPreset(preset);
    setName(preset.name);
    setIcon(preset.icon);
    setColor(preset.color);
    setDescription(preset.description);
    setApiType(preset.apiType);
    setInitialGame('');
  };

  const handleQuickAddPreset = (preset: PlatformPreset) => {
    startTransition(async () => {
      const res = await createPlatform(
        preset.name,
        preset.icon,
        preset.color,
        preset.description,
        '',
        '🎮',
        preset.games,
        preset.apiType
      );
      if (res.success) {
        showFeedback(
          'success',
          `"${preset.name}" platformu (${preset.games.length} oyun ve ${preset.apiType.toUpperCase()} API şeması ile) başarıyla eklendi!`
        );
        onPlatformsChange();
      } else {
        showFeedback('error', res.error || 'Platform eklenemedi.');
      }
    });
  };

  // ── PLATFORM YERİNİ DEĞİŞTİR (YUKARI / AŞAĞI) ──
  const handleMovePlatform = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localPlatforms.length) return;

    const updated = [...localPlatforms];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, movedItem);

    setLocalPlatforms(updated);

    startTransition(async () => {
      const ids = updated.map((p) => p._id);
      const res = await reorderPlatforms(ids);
      if (res.success) {
        showFeedback('success', `"${movedItem.name}" sırası güncellendi.`);
        onPlatformsChange();
      } else {
        showFeedback('error', res.error || 'Sıralama kaydedilemedi.');
        setLocalPlatforms(platforms);
      }
    });
  };

  // ── SÜRÜKLE VE BIRAK ──
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...localPlatforms];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    setDraggedIndex(null);
    setDragOverIndex(null);
    setLocalPlatforms(updated);

    startTransition(async () => {
      const ids = updated.map((p) => p._id);
      const res = await reorderPlatforms(ids);
      if (res.success) {
        showFeedback('success', `Platform sıralaması güncellendi.`);
        onPlatformsChange();
      } else {
        showFeedback('error', res.error || 'Sıralama kaydedilemedi.');
        setLocalPlatforms(platforms);
      }
    });
  };

  // ── PLATFORM DÜZENLEME ──
  const startEditing = (p: PlatformData) => {
    setEditingPlatform(p);
    setEditName(p.name);
    setEditIcon(p.icon);
    setEditColor(p.color);
    setEditDesc(p.description || '');
    setEditApiType(p.apiType || (p.slug.includes('albion') ? 'albion' : p.slug === 'riot' ? 'riot' : 'manual'));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlatform) return;

    if (!editName.trim()) {
      showFeedback('error', 'Platform adı boş olamaz.');
      return;
    }

    startTransition(async () => {
      const res = await updatePlatform(editingPlatform._id, {
        name: editName.trim(),
        icon: editIcon,
        color: editColor,
        description: editDesc.trim(),
        apiType: editApiType,
      });
      if (res.success) {
        showFeedback('success', `"${editName}" platformu güncellendi.`);
        setEditingPlatform(null);
        onPlatformsChange();
      } else {
        showFeedback('error', res.error || 'Platform güncellenemedi.');
      }
    });
  };

  // ── YENİ PLATFORM OLUŞTUR ──
  const handleCreatePlatform = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showFeedback('error', 'Platform adı zorunludur.');
      return;
    }

    startTransition(async () => {
      const res = await createPlatform(
        name.trim(),
        icon,
        color,
        description.trim(),
        initialGame.trim(),
        '🎮',
        selectedPreset ? selectedPreset.games : undefined,
        apiType
      );
      if (res.success) {
        setName('');
        setDescription('');
        setInitialGame('');
        setSelectedPreset(null);
        setApiType('manual');
        showFeedback('success', `"${name}" platformu başarıyla eklendi!`);
        onPlatformsChange();
      } else {
        showFeedback('error', res.error || 'Platform oluşturulamadı.');
      }
    });
  };

  // ── OYUN EKLE ──
  const handleAddGame = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newGameName.trim()) {
      showFeedback('error', 'Oyun adı zorunludur.');
      return;
    }

    startTransition(async () => {
      const res = await addGameToPlatform(
        selectedPlatformSlug,
        newGameName.trim(),
        newGameIcon,
        newGameDesc.trim(),
        gameApiType
      );
      if (res.success) {
        setNewGameName('');
        setNewGameDesc('');
        showFeedback('success', `"${newGameName}" oyunu platforma eklendi!`);
        onPlatformsChange();
      } else {
        showFeedback('error', res.error || 'Oyun eklenemedi.');
      }
    });
  };

  // ── PLATFORM SİL (VARSAYILANLAR DAHİL) ──
  const handleDelete = (id: string, pName: string) => {
    if (!confirm(`"${pName}" platformunu silmek istediğinizden emin misiniz? Altındaki oyun portalı kayıtları kaldırılacaktır.`)) {
      return;
    }

    startTransition(async () => {
      const res = await deletePlatform(id);
      if (res.success) {
        showFeedback('success', `"${pName}" platformu silindi.`);
        onPlatformsChange();
      } else {
        showFeedback('error', res.error || 'Platform silinemedi.');
      }
    });
  };

  // ── VARSAYILANLARI GERİ YÜKLE ──
  const handleRestoreDefaults = () => {
    if (!confirm('Varsayılan sistem platformlarını (Riot Games, Steam, Epic Games) geri yüklemek istiyor musunuz?')) {
      return;
    }

    startTransition(async () => {
      const res = await restoreDefaultPlatforms();
      if (res.success) {
        showFeedback('success', 'Varsayılan platformlar geri yüklendi.');
        onPlatformsChange();
      } else {
        showFeedback('error', res.error || 'Varsayılan platformlar geri yüklenemedi.');
      }
    });
  };

  // Aktif seçilen platform için hazır şablon önerileri
  const currentPlatformPreset = PLATFORM_PRESETS.find(
    (p) => p.slug === selectedPlatformSlug || p.name.toLowerCase() === selectedPlatformSlug.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-[#080e1a] border border-blue-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#050a14]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <h2 className="text-base font-black text-white tracking-wide">
                Platform & Oyun Yönetimi
              </h2>
              <p className="text-[11px] text-slate-400">
                Albion, Riot, Steam veya Manuel API şemalarıyla platform ve oyun ekleyin.
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
            onClick={() => { setTab('new_platform'); setEditingPlatform(null); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'new_platform'
                ? 'border-yellow-400 text-yellow-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>➕</span>
            <span>Platform Ekle (Şemalar)</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('add_game'); setEditingPlatform(null); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'add_game'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>🎮</span>
            <span>Platforma Oyun Ekle</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('reorder'); setEditingPlatform(null); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'reorder'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>⇄</span>
            <span>Sıralama & Düzenle</span>
          </button>
        </div>

        {/* İçerik Alanı */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Bildirim / Hata Mesajı */}
          {feedback && (
            <div
              className={`p-3 text-xs rounded-xl flex items-center gap-2 border animate-fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}
            >
              <span>{feedback.type === 'success' ? '✓' : '✕'}</span>
              <span>{feedback.message}</span>
            </div>
          )}

          {/* DÜZENLEME MODAL FORMU */}
          {editingPlatform ? (
            <form onSubmit={handleSaveEdit} className="p-4 rounded-2xl bg-[#0d182b] border border-yellow-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                  <span>✏️</span> Platform Düzenle: {editingPlatform.name}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingPlatform(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕ Vazgeç
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Platform Adı:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-[#080e1a] border border-white/10 focus:border-yellow-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  required
                />
              </div>

              {/* API Şeması Seçici (Düzenleme) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔌</span> Veri Çekme & API Şeması:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {API_SCHEMAS.map((sch) => (
                    <button
                      key={sch.type}
                      type="button"
                      onClick={() => setEditApiType(sch.type)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2 ${
                        editApiType === sch.type
                          ? 'bg-yellow-500/15 border-yellow-400 text-yellow-300'
                          : 'bg-[#080e1a] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-xl">{sch.icon}</span>
                      <div>
                        <div className="text-xs font-bold">{sch.name}</div>
                        <div className="text-[10px] text-slate-400">{sch.badge}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Platform İkonu:
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditIcon(emoji)}
                      className={`w-8 h-8 rounded-xl text-base flex items-center justify-center cursor-pointer transition-all ${
                        editIcon === emoji
                          ? 'bg-yellow-500/25 border border-yellow-400 scale-110 shadow-sm'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tema Rengi:
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-all ${
                        editColor === c ? 'ring-2 ring-white scale-125' : 'hover:scale-110 opacity-80'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Açıklama:
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Kısa açıklama..."
                  className="bg-[#080e1a] border border-white/10 focus:border-yellow-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-slate-950 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Kaydediliyor...' : '✓ Değişiklikleri Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPlatform(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                >
                  İptal
                </button>
              </div>
            </form>
          ) : null}

          {/* TAB 1: YENİ PLATFORM EKLE (ŞABLONLAR + ŞEMA + FORM) */}
          {tab === 'new_platform' && !editingPlatform && (
            <div className="space-y-6">
              {/* ── 1. HAZIR PLATFORM ŞABLONLARI SEÇİCİ ── */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡</span> Hazır Platform Şablonları (Albion, Riot, Steam...):
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Otomatik API şeması ve oyunlarıyla yüklenir
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {PLATFORM_PRESETS.map((preset) => {
                    const isAlreadyAdded = localPlatforms.some(
                      (p) =>
                        p.slug === preset.slug ||
                        p.name.toLowerCase() === preset.name.toLowerCase()
                    );
                    const isSelected = selectedPreset?.id === preset.id;

                    return (
                      <div
                        key={preset.id}
                        className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                          isAlreadyAdded
                            ? 'opacity-40 bg-[#070e1a]/60 border-white/5 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#132545] border-yellow-400 shadow-md ring-1 ring-yellow-400/50'
                            : 'bg-[#0e192d] border-white/10 hover:border-yellow-400/40 hover:bg-[#132238] cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!isAlreadyAdded) {
                            handleSelectPreset(preset);
                          }
                        }}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <span className="text-2xl">{preset.icon}</span>
                            <span
                              className="text-[9px] font-bold px-2 py-0.5 rounded-md border truncate max-w-[100px]"
                              style={{
                                backgroundColor: `${preset.color}20`,
                                borderColor: `${preset.color}40`,
                                color: preset.color,
                              }}
                            >
                              {preset.badge}
                            </span>
                          </div>

                          <div className="text-xs font-black text-white truncate">
                            {preset.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {preset.games.length} hazır oyun • <span className="text-blue-300 font-mono font-bold uppercase">{preset.apiType} API</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-white/5">
                          {isAlreadyAdded ? (
                            <span className="text-[10px] text-slate-500 font-mono block text-center">
                              ✓ Kütüphanede Ekli
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAddPreset(preset);
                              }}
                              disabled={isPending}
                              className="w-full py-1.5 rounded-xl text-[10px] font-black bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                              title={`${preset.name} platformunu hazır oyunları ve ${preset.apiType} API şemasıyla hemen ekle`}
                            >
                              <span>⚡</span>
                              <span>Hemen Ekle</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Seçilen Şablon Bilgi Kartı */}
              {selectedPreset && (
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-col gap-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <span>✓</span> Seçilen Şema: <b>{selectedPreset.name}</b> ({selectedPreset.apiType.toUpperCase()} API)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreset(null);
                        setName('');
                        setDescription('');
                        setApiType('manual');
                      }}
                      className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Şemayı Kaldır / Özel Yaz
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-300">
                    Otomatik eklenecek hazır oyunlar:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPreset.games.map((g) => (
                      <span
                        key={g.name}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white flex items-center gap-1.5"
                      >
                        <span>{g.icon}</span>
                        <span>{g.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 2. PLATFORM FORMU ── */}
              <form onSubmit={handleCreatePlatform} className="space-y-4 pt-2 border-t border-white/10">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {selectedPreset ? 'Platform Bilgilerini ve API Şemasını Onaylayın:' : 'Veya Kendi Özel Platform Şemanızı Oluşturun:'}
                </div>

                {/* API Şeması Seçimi */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔌</span> Veri Çekme & API Şeması:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {API_SCHEMAS.map((sch) => {
                      const isSelected = apiType === sch.type;
                      return (
                        <div
                          key={sch.type}
                          onClick={() => setApiType(sch.type)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-[#132545] border-yellow-400 shadow-md ring-1 ring-yellow-400/50'
                              : 'bg-[#0e192d] border-white/10 hover:border-white/20'
                          }`}
                        >
                          <span className="text-2xl mt-0.5">{sch.icon}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">{sch.name}</span>
                              {isSelected && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-300">
                                  Seçildi
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                              {sch.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {apiType === 'albion' && (
                    <div className="mt-1.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200 flex items-center gap-2">
                      <span className="text-lg">🛡️</span>
                      <span>
                        <b>Albion Online API Şeması:</b> Bu platforma eklenen hesaplar, resmi Albion Online Killboard/Gameinfo API&apos;si üzerinden otomatik aranır; Seviye, Fame, PvP/PvE istatistikleri ve gerçek oyun içi portresi (avatar) çekilir.
                      </span>
                    </div>
                  )}

                  {apiType === 'riot' && (
                    <div className="mt-1.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
                      <span className="text-lg">🔴</span>
                      <span>
                        <b>Riot Games API Şeması:</b> Bu platforma eklenen hesaplar, Riot ID (GameName#TAG) üzerinden Summoner Seviyesi, Solo/Duo ligi, LP ve maç geçmişi ile senkronize edilir.
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Platform Adı:
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Albion Online, Battle.net, Steam, EA Play..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#0e192d] border border-white/10 focus:border-yellow-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    required
                  />
                </div>

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

                {!selectedPreset && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      İlk Oyun (İsteğe Bağlı):
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: Albion Online, Counter-Strike 2, World of Warcraft..."
                      value={initialGame}
                      onChange={(e) => setInitialGame(e.target.value)}
                      className="bg-[#0e192d] border border-white/10 focus:border-yellow-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 hover:from-yellow-300 hover:to-amber-400 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isPending
                    ? 'Ekleniyor...'
                    : selectedPreset
                    ? `➕ "${name}" Platformunu (${selectedPreset.games.length} Oyun & ${apiType.toUpperCase()} API) ile Kaydet`
                    : `➕ "${name || 'Platform'}" Platformunu (${apiType.toUpperCase()} API) ile Kaydet`}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: OYUN EKLE */}
          {tab === 'add_game' && !editingPlatform && (
            <form onSubmit={handleAddGame} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Hangi Platforma Eklenecek:
                </label>
                <select
                  value={selectedPlatformSlug}
                  onChange={(e) => {
                    const slug = e.target.value;
                    setSelectedPlatformSlug(slug);
                    const targetP = localPlatforms.find((p) => p.slug === slug);
                    if (targetP?.apiType) {
                      setGameApiType(targetP.apiType);
                    } else if (slug.includes('albion')) {
                      setGameApiType('albion');
                    } else if (slug === 'riot') {
                      setGameApiType('riot');
                    }
                  }}
                  className="bg-[#0e192d] border border-white/10 focus:border-blue-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  {localPlatforms.map((p) => (
                    <option key={p.slug} value={p.slug} className="bg-[#080e1a]">
                      {p.icon} {p.name} ({p.apiType ? p.apiType.toUpperCase() : 'MANUAL'} API)
                    </option>
                  ))}
                </select>
              </div>

              {/* Oyun için API Şeması */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔌</span> Bu Oyunun Veri Çekme & API Şeması:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {API_SCHEMAS.map((sch) => {
                    const isSelected = gameApiType === sch.type;
                    return (
                      <button
                        key={sch.type}
                        type="button"
                        onClick={() => setGameApiType(sch.type)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2 ${
                          isSelected
                            ? 'bg-[#132545] border-blue-400 text-blue-200 shadow-sm'
                            : 'bg-[#0e192d] border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xl">{sch.icon}</span>
                        <div>
                          <div className="text-xs font-bold">{sch.name}</div>
                          <div className="text-[10px] text-slate-400">{sch.badge}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seçilen platform için hazır oyun önerileri */}
              {currentPlatformPreset && currentPlatformPreset.games.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#0e192d] border border-white/10 space-y-2">
                  <div className="text-[11px] font-bold text-yellow-400 flex items-center gap-1.5">
                    <span>💡</span> Popüler Oyun Önerileri ({currentPlatformPreset.name}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentPlatformPreset.games.map((g) => (
                      <button
                        key={g.name}
                        type="button"
                        onClick={() => {
                          setNewGameName(g.name);
                          setNewGameIcon(g.icon);
                          setNewGameDesc(g.description);
                          if (g.apiType) setGameApiType(g.apiType);
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-yellow-500/20 text-slate-300 hover:text-yellow-300 border border-white/10 hover:border-yellow-500/30 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>{g.icon}</span>
                        <span>{g.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Oyun Adı:
                </label>
                <input
                  type="text"
                  placeholder="Örn: Albion Online, CS2, Dota 2, GTA V..."
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  className="bg-[#0e192d] border border-white/10 focus:border-blue-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Oyun Simgesi:
                </label>
                <div className="flex flex-wrap gap-2">
                  {['⚔️', '🎯', '♟️', '🔫', '🛡️', '🏎️', '⛏️', '🎮', '🕹️', '👑', '🔥', '⚽', '🤖', '🪂'].map((emoji) => (
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
                {isPending ? 'Ekleniyor...' : `➕ Oyunu (${gameApiType.toUpperCase()} API Şemasıyla) Ekle`}
              </button>
            </form>
          )}

          {/* TAB 3 VEYA HER TABIN ALTINDA: KAYITLI PLATFORMLAR & SIRALAMA LİSTESİ */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⇄</span> Kayıtlı Platformlar & Sıralama ({localPlatforms.length})
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Platformların API şemalarını görebilir, silebilir, <span className="text-yellow-400 font-semibold">▲ ▼ oklarıyla</span> veya <span className="text-yellow-400 font-semibold">sürükleyerek</span> sırasını değiştirebilirsiniz.
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {localPlatforms.map((p, index) => {
                const isDragging = draggedIndex === index;
                const isOver = dragOverIndex === index;
                const pApi = p.apiType || (p.slug.includes('albion') ? 'albion' : p.slug === 'riot' ? 'riot' : 'manual');

                return (
                  <div
                    key={p._id || p.slug}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isDragging
                        ? 'opacity-40 border-yellow-400/80 bg-yellow-500/10 scale-98'
                        : isOver
                        ? 'border-yellow-400 bg-[#132545] shadow-lg -translate-y-0.5'
                        : 'bg-[#0e192d]/90 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Sol: Sürükleme tutamacı, Sıra numarası, İkon ve İsim */}
                    <div className="flex items-center gap-3">
                      <span
                        className="text-slate-500 hover:text-yellow-400 cursor-grab active:cursor-grabbing text-base px-1"
                        title="Sürükleyip bırakarak yerini değiştir"
                      >
                        ⠿
                      </span>

                      <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-slate-400 flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>

                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 border"
                        style={{
                          backgroundColor: p.color ? `${p.color}20` : '#3b82f620',
                          borderColor: p.color ? `${p.color}40` : '#3b82f640',
                        }}
                      >
                        {p.icon}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                          <span>{p.name}</span>
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                              pApi === 'albion'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : pApi === 'riot'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : pApi === 'steam'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                            }`}
                          >
                            {pApi.toUpperCase()} API
                          </span>
                          {p.isDefault && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-400">
                              Sistem
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.games.length} oyun portali
                        </div>
                      </div>
                    </div>

                    {/* Sağ: Yukarı / Aşağı Butonları, Düzenle ve Sil */}
                    <div className="flex items-center gap-1.5">
                      {/* Yukarı Taşı */}
                      <button
                        type="button"
                        onClick={() => handleMovePlatform(index, 'up')}
                        disabled={index === 0 || isPending}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-yellow-500/20 text-slate-300 hover:text-yellow-300 disabled:opacity-20 disabled:hover:bg-white/5 disabled:hover:text-slate-300 flex items-center justify-center text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed border border-white/5"
                        title="Yukarı Taşı"
                      >
                        ▲
                      </button>

                      {/* Aşağı Taşı */}
                      <button
                        type="button"
                        onClick={() => handleMovePlatform(index, 'down')}
                        disabled={index === localPlatforms.length - 1 || isPending}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-yellow-500/20 text-slate-300 hover:text-yellow-300 disabled:opacity-20 disabled:hover:bg-white/5 disabled:hover:text-slate-300 flex items-center justify-center text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed border border-white/5"
                        title="Aşağı Taşı"
                      >
                        ▼
                      </button>

                      {/* Düzenle Butonu */}
                      <button
                        type="button"
                        onClick={() => startEditing(p)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-300 flex items-center justify-center text-xs transition-all cursor-pointer border border-white/5"
                        title="Platform Bilgilerini ve API Şemasını Düzenle"
                      >
                        ✏️
                      </button>

                      {/* Sil Butonu (Tüm platformlar silinebilir) */}
                      <button
                        type="button"
                        onClick={() => handleDelete(p._id, p.name)}
                        disabled={isPending}
                        className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 flex items-center justify-center text-xs transition-all cursor-pointer border border-rose-500/20 disabled:opacity-50"
                        title={`${p.name} platformunu sil`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Alt Bilgi & Varsayılanları Geri Yükle */}
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                İstemediğiniz platformları silebilirsiniz.
              </span>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                disabled={isPending}
                className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                title="Riot Games, Steam ve Epic Games platformlarını geri getir"
              >
                <span>🔄</span>
                <span>Varsayılan Sistem Platformlarını Geri Getir</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
