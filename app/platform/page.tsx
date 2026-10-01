import { redirect } from 'next/navigation';
import { getPlatforms } from '@/app/actions/platforms';

export default async function PlatformRootPage() {
  const platforms = await getPlatforms();
  const firstSlug = platforms[0]?.slug || 'riot';
  redirect(`/platform/${firstSlug}`);
}
