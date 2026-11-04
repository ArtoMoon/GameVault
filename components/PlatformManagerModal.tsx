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
    <div className="modal-backdrop select-none" onClick={onClose}>
      <div
        className="modal-panel max-w-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-400/25 flex items-center justify-center text-lg shrink-0">
              🌐
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                Platform & Oyun Yönetimi
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Albion, Riot, Steam veya Manuel API şemalarıyla platform ve oyun ekleyin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-icon rounded-xl"
            aria-label="Kapat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-3 border-b border-white/[0.07] bg-ink-950/30">
          <div className="segmented w-full">
            <button
              type="button"
              data-active={tab === 'new_platform'}
              onClick={() => { setTab('new_platform'); setEditingPlatform(null); }}
              className="flex-1 justify-center"
            >
              <span>➕</span>
              <span>Platform Ekle (Şemalar)</span>
            </button>

            <button
              type="button"
              data-active={tab === 'add_game'}
              onClick={() => { setTab('add_game'); setEditingPlatform(null); }}
              className="flex-1 justify-center"
            >
              <span>🎮</span>
              <span>Platforma Oyun Ekle</span>
            </button>

            <button
              type="button"
              data-active={tab === 'reorder'}
              onClick={() => { setTab('reorder'); setEditingPlatform(null); }}
              className="flex-1 justify-center"
            >
              <span>⇄</span>
              <span>Sıralama & Düzenle</span>
            </button>
          </div>
        </div>

        {/* İçerik Alanı */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Bildirim / Hata Mesajı */}
          {feedback && (
            <div
              className={`p-3.5 text-xs rounded-xl flex items-center gap-2.5 border animate-fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              <span className="font-bold">{feedback.type === 'success' ? '✓' : '✕'}</span>
              <span>{feedback.message}</span>
            </div>
          )}

          {/* DÜZENLEME MODAL FORMU */}
          {editingPlatform ? (
            <form onSubmit={handleSaveEdit} className="card p-5 space-y-4 border-accent-400/30">
              <div className="flex items-center justify-between">
                <span className="eyebrow flex items-center gap-1.5">
                  <span>✏️</span> Platform Düzenle: {editingPlatform.name}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingPlatform(null)}
                  className="btn btn-ghost btn-sm"
                >
                  ✕ Vazgeç
                </button>
              </div>

              <div>
                <label className="label">
                  Platform Adı:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input"
                  required
                />
              </div>

              {/* API Şeması Seçici (Düzenleme) */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <span>🔌</span> Veri Çekme & API Şeması:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {API_SCHEMAS.map((sch) => (
                    <button
                      key={sch.type}
                      type="button"
                      onClick={() => setEditApiType(sch.type)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                        editApiType === sch.type
                          ? 'bg-accent-500/15 border-accent-400/50 text-white shadow-[0_0_20px_-8px_rgba(139,92,246,0.5)]'
                          : 'bg-white/[0.03] border-white/[0.08] text-text-secondary hover:text-white hover:border-white/15'
                      }`}
                    >
                      <span className="text-xl leading-none mt-0.5">{sch.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{sch.name}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">{sch.badge}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">
                  Platform İkonu:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditIcon(emoji)}
                      className={`w-8 h-8 rounded-lg text-base flex items-center justify-center cursor-pointer transition-all border ${
                        editIcon === emoji
                          ? 'bg-accent-500/20 border-accent-400 scale-105 shadow-[0_0_12px_-3px_rgba(139,92,246,0.5)]'
                          : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">
                  Tema Rengi:
                </label>
                <div className="flex flex-wrap gap-2 items-center pt-0.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform border ${
                        editColor === c
                          ? 'ring-2 ring-white/40 border-white scale-125'
                          : 'border-white/10 hover:scale-110 opacity-75 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="label">
                  Açıklama:
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Kısa açıklama..."
                  className="input"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary flex-1"
                >
                  {isPending ? 'Kaydediliyor...' : '✓ Değişiklikleri Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPlatform(null)}
                  className="btn btn-secondary"
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
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <label className="eyebrow flex items-center gap-1.5">
                    <span>⚡</span> Hazır Platform Şablonları (Albion, Riot, Steam...)
                  </label>
                  <span className="text-[11px] text-text-muted">
                    Otomatik API şeması ve oyunlarıyla yüklenir
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
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
                        className={`card p-3.5 transition-all flex flex-col justify-between ${
                          isAlreadyAdded
                            ? 'opacity-45 cursor-not-allowed'
                            : isSelected
                            ? 'border-accent-400/60 bg-accent-500/[0.08] shadow-[0_0_24px_-8px_rgba(139,92,246,0.45)]'
                            : 'card-interactive cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!isAlreadyAdded) {
                            handleSelectPreset(preset);
                          }
                        }}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5 mb-2.5">
                            <span
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                              style={{
                                backgroundColor: `${preset.color}1a`,
                                border: `1px solid ${preset.color}38`,
                              }}
                            >
                              {preset.icon}
                            </span>
                            <span
                              className="text-[9px] font-bold px-2 py-0.5 rounded-full border truncate max-w-[100px]"
                              style={{
                                backgroundColor: `${preset.color}1a`,
                                borderColor: `${preset.color}40`,
                                color: preset.color,
                              }}
                            >
                              {preset.badge}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-white truncate">
                            {preset.name}
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">
                            <span className="tabular-nums">{preset.games.length}</span> hazır oyun •{' '}
                            <span className="text-accent-300 font-semibold uppercase">{preset.apiType} API</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-white/[0.06]">
                          {isAlreadyAdded ? (
                            <span className="text-[10px] text-text-muted font-medium block text-center py-1">
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
                              className="btn btn-primary btn-sm w-full"
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
                <div className="card p-4 border-accent-400/35 bg-accent-500/[0.06] flex flex-col gap-2.5 animate-fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-accent-300 flex items-center gap-1.5">
                      <span>✓</span> Seçilen Şema: <b className="text-white">{selectedPreset.name}</b> ({selectedPreset.apiType.toUpperCase()} API)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreset(null);
                        setName('');
                        setDescription('');
                        setApiType('manual');
                      }}
                      className="text-[11px] text-text-secondary hover:text-white underline cursor-pointer"
                    >
                      Şemayı Kaldır / Özel Yaz
                    </button>
                  </div>

                  <div className="text-[11px] text-text-secondary">
                    Otomatik eklenecek hazır oyunlar:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPreset.games.map((g) => (
                      <span key={g.name} className="chip text-white">
                        <span>{g.icon}</span>
                        <span>{g.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 2. PLATFORM FORMU ── */}
              <form onSubmit={handleCreatePlatform} className="space-y-4 pt-4 border-t border-white/[0.07]">
                <div className="eyebrow">
                  {selectedPreset ? 'Platform Bilgilerini ve API Şemasını Onaylayın' : 'Veya Kendi Özel Platform Şemanızı Oluşturun'}
                </div>

                {/* API Şeması Seçimi */}
                <div>
                  <label className="label flex items-center gap-1.5">
                    <span>🔌</span> Veri Çekme & API Şeması:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {API_SCHEMAS.map((sch) => {
                      const isSelected = apiType === sch.type;
                      return (
                        <div
                          key={sch.type}
                          onClick={() => setApiType(sch.type)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isSelected
                              ? 'bg-accent-500/15 border-accent-400/50 shadow-[0_0_24px_-8px_rgba(139,92,246,0.45)]'
                              : 'bg-white/[0.025] border-white/[0.08] hover:border-white/15 hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className="text-2xl leading-none mt-0.5">{sch.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white">{sch.name}</span>
                              {isSelected && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent-500/25 text-accent-300 border border-accent-400/30">
                                  Seçildi
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-secondary mt-1 leading-snug">
                              {sch.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {apiType === 'albion' && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-accent-500/10 border border-accent-400/25 text-xs text-accent-300 flex items-center gap-2.5">
                      <span className="text-lg shrink-0">🛡️</span>
                      <span>
                        <b className="text-white">Albion Online API Şeması:</b> Bu platforma eklenen hesaplar, resmi Albion Online Killboard/Gameinfo API&apos;si üzerinden otomatik aranır; Seviye, Fame, PvP/PvE istatistikleri ve gerçek oyun içi portresi (avatar) çekilir.
                      </span>
                    </div>
                  )}

                  {apiType === 'riot' && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-200 flex items-center gap-2.5">
                      <span className="text-lg shrink-0">🔴</span>
                      <span>
                        <b className="text-white">Riot Games API Şeması:</b> Bu platforma eklenen hesaplar, Riot ID (GameName#TAG) üzerinden Summoner Seviyesi, Solo/Duo ligi, LP ve maç geçmişi ile senkronize edilir.
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">
                    Platform Adı:
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Albion Online, Battle.net, Steam, EA Play..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">
                    Platform İkonu:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all border ${
                          icon === emoji
                            ? 'bg-accent-500/20 border-accent-400 scale-105 shadow-[0_0_12px_-3px_rgba(139,92,246,0.5)]'
                            : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">
                    Tema Rengi:
                  </label>
                  <div className="flex flex-wrap gap-2.5 items-center pt-0.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full cursor-pointer transition-transform border ${
                          color === c
                            ? 'ring-2 ring-white/40 border-white scale-125'
                            : 'border-white/10 hover:scale-110 opacity-75 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {!selectedPreset && (
                  <div>
                    <label className="label">
                      İlk Oyun (İsteğe Bağlı):
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: Albion Online, Counter-Strike 2, World of Warcraft..."
                      value={initialGame}
                      onChange={(e) => setInitialGame(e.target.value)}
                      className="input"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary btn-lg w-full"
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
              <div>
                <label className="label">
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
                  className="input cursor-pointer"
                >
                  {localPlatforms.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.icon} {p.name} ({p.apiType ? p.apiType.toUpperCase() : 'MANUAL'} API)
                    </option>
                  ))}
                </select>
              </div>

              {/* Oyun için API Şeması */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <span>🔌</span> Bu Oyunun Veri Çekme & API Şeması:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {API_SCHEMAS.map((sch) => {
                    const isSelected = gameApiType === sch.type;
                    return (
                      <button
                        key={sch.type}
                        type="button"
                        onClick={() => setGameApiType(sch.type)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-accent-500/15 border-accent-400/50 text-white shadow-[0_0_20px_-8px_rgba(139,92,246,0.5)]'
                            : 'bg-white/[0.03] border-white/[0.08] text-text-secondary hover:text-white hover:border-white/15'
                        }`}
                      >
                        <span className="text-xl leading-none mt-0.5">{sch.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{sch.name}</div>
                          <div className="text-[10px] text-text-muted mt-0.5">{sch.badge}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seçilen platform için hazır oyun önerileri */}
              {currentPlatformPreset && currentPlatformPreset.games.length > 0 && (
                <div className="card p-3.5 space-y-2.5">
                  <div className="eyebrow flex items-center gap-1.5">
                    <span>💡</span> Popüler Oyun Önerileri ({currentPlatformPreset.name})
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
                        className="chip hover:border-accent-400/40 hover:text-white hover:bg-accent-500/15 transition-colors cursor-pointer"
                      >
                        <span>{g.icon}</span>
                        <span>{g.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="label">
                  Oyun Adı:
                </label>
                <input
                  type="text"
                  placeholder="Örn: Albion Online, CS2, Dota 2, GTA V..."
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">
                  Oyun Simgesi:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['⚔️', '🎯', '♟️', '🔫', '🛡️', '🏎️', '⛏️', '🎮', '🕹️', '👑', '🔥', '⚽', '🤖', '🪂'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewGameIcon(emoji)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all border ${
                        newGameIcon === emoji
                          ? 'bg-accent-500/20 border-accent-400 scale-105 shadow-[0_0_12px_-3px_rgba(139,92,246,0.5)]'
                          : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'
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
                className="btn btn-primary btn-lg w-full"
              >
                {isPending ? 'Ekleniyor...' : `➕ Oyunu (${gameApiType.toUpperCase()} API Şemasıyla) Ekle`}
              </button>
            </form>
          )}

          {/* TAB 3 VEYA HER TABIN ALTINDA: KAYITLI PLATFORMLAR & SIRALAMA LİSTESİ */}
          <div className="pt-4 border-t border-white/[0.07]">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div>
                <h3 className="label !mb-0.5 flex items-center gap-1.5">
                  <span>⇄</span> Kayıtlı Platformlar & Sıralama ({localPlatforms.length})
                </h3>
                <p className="text-[11px] text-text-muted">
                  Platformların API şemalarını görebilir, silebilir, <span className="text-accent-300 font-semibold">▲ ▼ oklarıyla</span> veya <span className="text-accent-300 font-semibold">sürükleyerek</span> sırasını değiştirebilirsiniz.
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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
                    className={`card px-3.5 py-3 flex items-center justify-between gap-3 transition-all ${
                      isDragging
                        ? 'opacity-40 border-accent-400/70 bg-accent-500/10 scale-[0.98]'
                        : isOver
                        ? 'border-accent-400 bg-accent-500/15 shadow-lg -translate-y-0.5'
                        : 'hover:border-white/15'
                    }`}
                  >
                    {/* Sol: Sürükleme tutamacı, Sıra numarası, İkon ve İsim */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="text-text-muted hover:text-accent-300 cursor-grab active:cursor-grabbing text-base px-1 select-none"
                        title="Sürükleyip bırakarak yerini değiştir"
                      >
                        ⠿
                      </span>

                      <span className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] tabular-nums font-bold text-text-muted flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>

                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 border"
                        style={{
                          backgroundColor: p.color ? `${p.color}1a` : '#3b82f61a',
                          borderColor: p.color ? `${p.color}38` : '#3b82f638',
                        }}
                      >
                        {p.icon}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{p.name}</span>
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                              pApi === 'albion'
                                ? 'bg-accent-500/15 text-accent-300 border-accent-400/30'
                                : pApi === 'riot'
                                ? 'bg-red-500/15 text-red-300 border-red-500/30'
                                : pApi === 'steam'
                                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                : 'bg-white/[0.06] text-text-secondary border-white/10'
                            }`}
                          >
                            {pApi.toUpperCase()} API
                          </span>
                          {p.isDefault && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] text-text-muted">
                              Sistem
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-muted tabular-nums">
                          {p.games.length} oyun portali
                        </div>
                      </div>
                    </div>

                    {/* Sağ: Yukarı / Aşağı Butonları, Düzenle ve Sil */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Yukarı Taşı */}
                      <button
                        type="button"
                        onClick={() => handleMovePlatform(index, 'up')}
                        disabled={index === 0 || isPending}
                        className="btn btn-secondary btn-sm btn-icon !w-7 !h-7 text-[11px]"
                        title="Yukarı Taşı"
                      >
                        ▲
                      </button>

                      {/* Aşağı Taşı */}
                      <button
                        type="button"
                        onClick={() => handleMovePlatform(index, 'down')}
                        disabled={index === localPlatforms.length - 1 || isPending}
                        className="btn btn-secondary btn-sm btn-icon !w-7 !h-7 text-[11px]"
                        title="Aşağı Taşı"
                      >
                        ▼
                      </button>

                      {/* Düzenle Butonu */}
                      <button
                        type="button"
                        onClick={() => startEditing(p)}
                        className="btn btn-secondary btn-sm btn-icon !w-7 !h-7"
                        title="Platform Bilgilerini ve API Şemasını Düzenle"
                      >
                        ✏️
                      </button>

                      {/* Sil Butonu (Tüm platformlar silinebilir) */}
                      <button
                        type="button"
                        onClick={() => handleDelete(p._id, p.name)}
                        disabled={isPending}
                        className="btn btn-danger btn-sm btn-icon !w-7 !h-7"
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
            <div className="mt-3.5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-3 flex-wrap text-xs">
              <span className="text-text-muted">
                İstemediğiniz platformları silebilirsiniz.
              </span>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                disabled={isPending}
                className="btn btn-ghost btn-sm text-accent-300 hover:text-white"
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
