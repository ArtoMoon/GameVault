import type { Metadata } from 'next';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { getPlatforms } from '@/app/actions/platforms';
import Sidebar from '@/components/Sidebar';
import OnboardingModal from '@/components/OnboardingModal';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: 'GameVault – Universal Gaming Dashboard',
    template: '%s | GameVault',
  },
  description:
    'Tüm oyun hesaplarınızı tek bir komut merkezinde yönetin. Riot, Albion, Steam ve daha fazlası için canlı senkronizasyon.',
  keywords: ['GameVault', 'League of Legends', 'Albion Online', 'hesap yöneticisi', 'Riot API', 'rank takip'],
  icons: {
    icon: '/icon.png',
  },
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const platforms = await getPlatforms();

  return (
    <html lang="tr">
      <body>
        <LanguageProvider>
          <div className="flex min-h-screen">
            <Sidebar platforms={platforms} />
            <main className="flex-1 min-w-0 h-screen overflow-y-auto">{children}</main>
          </div>
          <OnboardingModal />
        </LanguageProvider>
      </body>
    </html>
  );
}
