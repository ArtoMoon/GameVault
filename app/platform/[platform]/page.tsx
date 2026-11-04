import type { Metadata } from 'next';
import { getAccounts } from '@/app/actions/accounts';
import { getCategories } from '@/app/actions/categories';
import { getPlatforms } from '@/app/actions/platforms';
import GameAccountsView from '@/components/GameAccountsView';

export const metadata: Metadata = {
  title: 'Hesaplar & Kategoriler – GameVault',
  description: 'Platform hesaplarınızı ve kategorilerinizi tek ekrandan yönetin.',
};

interface PlatformOverviewPageProps {
  params: Promise<{
    platform: string;
  }>;
  searchParams?: Promise<{
    add?: string;
  }>;
}

export default async function PlatformOverviewPage({
  params,
  searchParams,
}: PlatformOverviewPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const platformSlug = (resolvedParams.platform || 'riot').toLowerCase();

  const [accounts, categories, platforms] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPlatforms(),
  ]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8 pb-20">
      <GameAccountsView
        accounts={accounts}
        initialCategories={categories}
        initialPlatforms={platforms}
        platformSlug={platformSlug}
        initialAddOpen={resolvedSearchParams.add === 'true'}
      />
    </div>
  );
}
