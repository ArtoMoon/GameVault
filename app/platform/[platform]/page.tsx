import type { Metadata } from 'next';
import { getAccounts } from '@/app/actions/accounts';
import { getPlatforms } from '@/app/actions/platforms';
import PlatformOverview from '@/components/PlatformOverview';

export const metadata: Metadata = {
  title: 'Platform Portalları – MyLoL Client',
  description: 'Oyun platformlarınızı ve oyunlarınızı keşfedin.',
};

interface PlatformOverviewPageProps {
  params: Promise<{
    platform: string;
  }>;
}

export default async function PlatformOverviewPage({
  params,
}: PlatformOverviewPageProps) {
  const resolvedParams = await params;
  const platformSlug = (resolvedParams.platform || 'riot').toLowerCase();

  const [accounts, platforms] = await Promise.all([
    getAccounts(),
    getPlatforms(),
  ]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8 pb-20">
      <PlatformOverview
        accounts={accounts}
        initialPlatforms={platforms}
        activePlatformSlug={platformSlug}
      />
    </div>
  );
}
