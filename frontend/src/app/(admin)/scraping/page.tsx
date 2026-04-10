import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AdminScraping } from '@/components/admin/AdminScraping';

export const metadata = { title: 'Scraping | Admin Aritth' };

export default async function AdminScrapingPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) redirect('/sign-in');
  return <AdminScraping token={token} />;
}
