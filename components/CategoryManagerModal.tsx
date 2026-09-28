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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#080e1a] border border-blue-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Modal Başlığı */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#050a14]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏷️</span>
            <div>
              <h2 className="text-base font-bold text-white">
                {t('manage_categories') || 'Kategorileri Yönet'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {t('manage_categories_desc') || 'Hesaplarınızı gruplamak için özel kategoriler ve etiketler oluşturun.'}
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

        {/* Modal İçeriği */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Yeni Kategori Ekle Formu */}
          <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-[#0c1524] border border-blue-500/20 space-y-3.5">
            <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>➕</span> {t('new_category') || 'Yeni Kategori Ekle'}
            </h3>

            {error && (
              <div className="p-2.5 rounded-xl text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('category_name_placeholder') || 'Örn: Main, Smurf, Dereceli...'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#050a14] border border-white/15 text-white text-xs outline-none focus:border-blue-400 placeholder:text-slate-600"
                maxLength={40}
              />
              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isPending ? '⏳' : `➕ ${t('add') || 'Ekle'}`}
              </button>
            </div>

            {/* İkon & Renk Seçici */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              {/* İkonlar */}
              <div className="flex-1">
                <span className="block text-[10px] text-slate-400 mb-1.5 font-semibold">
                  {t('select_icon') || 'İkon Seç:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                        icon === ic
                          ? 'bg-blue-600/40 border-2 border-blue-400 scale-110 shadow-sm'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Renkler */}
              <div className="sm:w-36">
                <span className="block text-[10px] text-slate-400 mb-1.5 font-semibold">
                  {t('select_color') || 'Renk Seç:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${
                        color === c ? 'scale-125 border-white ring-2 ring-white/30' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </form>

          {/* Mevcut Kategoriler Listesi */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              {t('existing_categories') || 'Mevcut Kategoriler'} ({categories.length})
            </h3>

            {categories.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Henüz kategori eklenmemiş.
              </p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat._id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#050a14] border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm"
                        style={{ backgroundColor: `${cat.color}25`, border: `1px solid ${cat.color}60` }}
                      >
                        {cat.icon}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {cat.name}
                        </span>
                        {cat.description && (
                          <span className="text-[10px] text-slate-400 block">
                            {cat.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(cat._id, cat.name)}
                      disabled={isPending}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                      title="Sil"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Altı */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#050a14] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            {t('close') || 'Kapat'}
          </button>
        </div>

      </div>
    </div>
  );
}
