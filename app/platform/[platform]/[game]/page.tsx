import type { Metadata } from 'next';
import { getAccounts } from '@/app/actions/accounts';
import { getCategories } from '@/app/actions/categories';
import { getPlatforms } from '@/app/actions/platforms';
import GameAccountsView from '@/components/GameAccountsView';

export const metadata: Metadata = {
  title: 'Oyun Hesapları – MyLoL Client',
  description: 'Oyununuza ait hesapları yönetin ve lig durumlarını takip edin.',
};

interface GameAccountsPageProps {
  params: Promise<{
    platform: string;
    game: string;
  }>;
  searchParams?: Promise<{
    add?: string;
  }>;
}

export default async function GameAccountsPage({
  params,
  searchParams,
}: GameAccountsPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const platformSlug = (resolvedParams.platform || 'riot').toLowerCase();
  const gameSlug = (resolvedParams.game || 'lol').toLowerCase();

  const [accounts, categories, platforms] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPlatforms(),
  ]);

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6 pb-20">
      <GameAccountsView
        accounts={accounts}
        initialCategories={categories}
        initialPlatforms={platforms}
        platformSlug={platformSlug}
        gameSlug={gameSlug}
        initialAddOpen={resolvedSearchParams.add === 'true'}
      />
    </div>
  );
}
