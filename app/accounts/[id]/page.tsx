import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db/mongoose';
import Account from '@/models/Account';
import type { IAccount } from '@/models/Account';
import type { AccountData } from '@/app/actions/accounts';
import BackToDashboardLink from '@/components/BackToDashboardLink';
import AccountDetailClient from './AccountDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  await dbConnect();

  const account = await Account.findById(id).lean<IAccount & { _id: unknown }>();
  if (!account) return { title: 'Hesap Bulunamadı' };

  return {
    title: `${account.riotId} – MyLoL`,
    description: `${account.riotId} hesabının detayları. Seviye: ${account.level}, Rank: ${account.rank}`,
  };
}

import { getCategories } from '@/app/actions/categories';

export default async function AccountDetailPage({ params }: PageProps) {
  const { id } = await params;
  await dbConnect();

  const [raw, categories] = await Promise.all([
    Account.findById(id).lean<IAccount & { _id: unknown }>(),
    getCategories(),
  ]);

  if (!raw) {
    notFound();
  }

  const account: AccountData = {
    ...raw,
    _id: String(raw._id),
    game: raw.game || 'lol',
    category: raw.category || '',
    lastCheckedAt: raw.lastCheckedAt ? new Date(raw.lastCheckedAt) : new Date(0),
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(0),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(0),
    ranks: raw.ranks || { solo: null, flex: null },
    matches: raw.matches || [],
  } as AccountData;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      <BackToDashboardLink />

      <AccountDetailClient account={account} categories={categories} />
    </div>
  );
}
