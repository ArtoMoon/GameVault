import type { Metadata } from 'next';
import { getAccounts } from '@/app/actions/accounts';
import { getCategories } from '@/app/actions/categories';
import { getPlatforms } from '@/app/actions/platforms';
import LandingView from '@/components/LandingView';

export const metadata: Metadata = {
  title: 'MyLoL – Masaüstü Oyun & Riot İstemci Yöneticisi',
  description: 'Tüm League of Legends, Valorant ve diğer oyun hesaplarınız tek komut merkezinde.',
};

export default async function HomePage() {
  const [accounts, categories, platforms] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPlatforms(),
  ]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
      <LandingView
        accounts={accounts}
        categories={categories}
        platforms={platforms}
      />
    </div>
  );
}
