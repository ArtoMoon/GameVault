import { redirect } from 'next/navigation';

interface AccountsPageProps {
  searchParams?: Promise<{
    game?: string;
    add?: string;
  }>;
}

export default async function AccountsRedirectPage({ searchParams }: AccountsPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const game = (resolvedParams.game || 'lol').toLowerCase();
  const addQuery = resolvedParams.add === 'true' ? '?add=true' : '';

  if (game === 'cs2' || game === 'dota2' || game === 'steam_other') {
    redirect(`/platform/steam/${game}${addQuery}`);
  } else if (game === 'fortnite' || game === 'epic_other') {
    redirect(`/platform/epic/${game}${addQuery}`);
  } else if (game === 'other') {
    redirect(`/platform/other/other${addQuery}`);
  } else {
    redirect(`/platform/riot/${game}${addQuery}`);
  }
}
