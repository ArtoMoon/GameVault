'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db/mongoose';
import Category, { ICategory } from '@/models/Category';
import Account from '@/models/Account';

export type CategoryData = ICategory & { _id: string };

const DEFAULT_CATEGORIES = [
  { name: 'Main', color: '#eab308', icon: '⭐', description: 'Birincil ana hesap' },
  { name: 'Smurf', color: '#3b82f6', icon: '⚡', description: 'İkincil / Pratik hesabı' },
  { name: 'Dereceli', color: '#a855f7', icon: '🏆', description: 'Aktif Solo/Duo ve Flex kasılan hesap' },
  { name: 'ARAM / Eğlence', color: '#10b981', icon: '🎯', description: 'Eğlence ve arkadaşlarla oyun hesabı' },
];

/**
 * Tüm kategorileri veritabanından çeker.
 * Eğer veritabanında hiç kategori yoksa varsayılan kategorileri oluşturur.
 */
export async function getCategories(): Promise<CategoryData[]> {
  await dbConnect();

  let categories = await Category.find().sort({ createdAt: 1 }).lean<ICategory[]>();

  if (categories.length === 0) {
    try {
      for (const def of DEFAULT_CATEGORIES) {
        await Category.updateOne({ name: def.name }, { $setOnInsert: def }, { upsert: true });
      }
      categories = await Category.find().sort({ createdAt: 1 }).lean<ICategory[]>();
    } catch {
      // Ignore concurrent insertion race
    }
  }

  // De-duplicate in memory by name
  const seen = new Set<string>();
  const uniqueCats = categories.filter((c) => {
    const key = c.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueCats.map((c) => ({
    ...c,
    _id: String((c as ICategory & { _id: unknown })._id),
    createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
    updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
  })) as CategoryData[];
}

/**
 * Yeni bir kategori oluşturur.
 */
export async function createCategory(
  name: string,
  color = '#3b82f6',
  icon = '📁',
  description = ''
): Promise<{ success: boolean; error?: string; category?: CategoryData }> {
  try {
    await dbConnect();
    const cleanName = name.trim();

    if (!cleanName) {
      return { success: false, error: 'Kategori adı boş olamaz.' };
    }

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    }).lean();

    if (existing) {
      return { success: false, error: `"${cleanName}" adında bir kategori zaten mevcut.` };
    }

    const category = await Category.create({
      name: cleanName,
      color: color.trim() || '#3b82f6',
      icon: icon.trim() || '📁',
      description: description.trim(),
    });

    revalidatePath('/');
    return {
      success: true,
      category: {
        ...(category.toObject() as ICategory),
        _id: String(category._id),
      } as CategoryData,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Kategori eklenemedi.';
    return { success: false, error: msg };
  }
}

/**
 * Bir kategoriyi siler ve o kategoriye atanmış hesapların kategorisini temizler.
 */
export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return { success: false, error: 'Kategori bulunamadı.' };
    }

    // Bu kategoriye ait hesaplardaki category alanını sıfırla
    await Account.updateMany({ category: category.name }, { category: '' });

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Kategori silinemedi.';
    return { success: false, error: msg };
  }
}
