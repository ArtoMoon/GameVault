'use client';

import { useState, useTransition } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createCategory, deleteCategory, CategoryData } from '@/app/actions/categories';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryData[];
  onCategoriesChange: () => void;
}

const PRESET_COLORS = [
  '#eab308', // Gold
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#ec4899', // Pink
];

const PRESET_ICONS = ['⭐', '⚡', '🏆', '🎯', '📁', '🔥', '🛡️', '⚔️', '💼', '🚀', '💎', '👑'];

export default function CategoryManagerModal({
  isOpen,
  onClose,
  categories,
  onCategoriesChange,
}: CategoryManagerModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('⭐');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t('category_name_required') || 'Kategori adı gereklidir.');
      return;
    }

    startTransition(async () => {
      const res = await createCategory(name.trim(), color, icon, description.trim());
      if (res.success) {
        setName('');
        setDescription('');
        onCategoriesChange();
      } else {
        setError(res.error || 'Hata oluştu.');
      }
    });
  };

  const handleDelete = (id: string, catName: string) => {
    if (!confirm(`"${catName}" kategorisini silmek istediğinizden emin misiniz?`)) return;

    startTransition(async () => {
      const res = await deleteCategory(id);
      if (res.success) {
        onCategoriesChange();
      }
    });
  };

  return (
    <div className="modal-backdrop select-none" onClick={onClose}>
      <div
        className="modal-panel max-w-lg flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Başlığı */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-400/25 flex items-center justify-center text-lg shrink-0">
              🏷️
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                {t('manage_categories') || 'Kategorileri Yönet'}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {t('manage_categories_desc') || 'Hesaplarınızı gruplamak için özel kategoriler ve etiketler oluşturun.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-icon rounded-xl"
            aria-label={t('close') || 'Kapat'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal İçeriği */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Yeni Kategori Ekle Formu */}
          <form onSubmit={handleCreate} className="card p-4 space-y-4">
            <h3 className="eyebrow flex items-center gap-1.5">
              <span>➕</span> {t('new_category') || 'Yeni Kategori Ekle'}
            </h3>

            {error && (
              <div className="p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/25 text-red-300 flex items-center gap-2">
                <span>✕</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('category_name_placeholder') || 'Örn: Main, Smurf, Dereceli...'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input flex-1"
                maxLength={40}
              />
              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="btn btn-primary shrink-0 h-10"
              >
                {isPending ? '⏳' : `➕ ${t('add') || 'Ekle'}`}
              </button>
            </div>

            {/* İkon & Renk Seçici */}
            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              {/* İkonlar */}
              <div className="flex-1">
                <span className="label">
                  {t('select_icon') || 'İkon Seç:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer border ${
                        icon === ic
                          ? 'bg-accent-500/20 border-accent-400 scale-105 shadow-[0_0_12px_-3px_rgba(139,92,246,0.5)]'
                          : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/15'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Renkler */}
              <div className="sm:w-40">
                <span className="label">
                  {t('select_color') || 'Renk Seç:'}
                </span>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${
                        color === c
                          ? 'scale-125 border-white ring-2 ring-white/30'
                          : 'border-white/10 opacity-75 hover:opacity-100 hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </form>

          {/* Mevcut Kategoriler Listesi */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="label !mb-0">
                {t('existing_categories') || 'Mevcut Kategoriler'}
              </h3>
              <span className="chip tabular-nums">{categories.length}</span>
            </div>

            {categories.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-xs text-text-muted">
                  Henüz kategori eklenmemiş.
                </p>
              </div>
            ) : (
              <div className="space-y-2 stagger">
                {categories.map((cat) => (
                  <div
                    key={cat._id}
                    className="card px-3.5 py-3 flex items-center justify-between gap-3 hover:border-white/15 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          backgroundColor: `${cat.color}1f`,
                          border: `1px solid ${cat.color}4d`,
                          boxShadow: `0 0 16px -6px ${cat.color}`,
                        }}
                      >
                        {cat.icon}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white block truncate">
                          {cat.name}
                        </span>
                        {cat.description && (
                          <span className="text-[11px] text-text-muted block truncate">
                            {cat.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(cat._id, cat.name)}
                      disabled={isPending}
                      className="btn btn-danger btn-sm btn-icon shrink-0"
                      title="Sil"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Altı */}
        <div className="px-6 py-4 border-t border-white/[0.07] bg-ink-950/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            {t('close') || 'Kapat'}
          </button>
        </div>
      </div>
    </div>
  );
}
