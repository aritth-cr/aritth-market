import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { QuotesContent } from '@/components/quotes/QuotesContent';

export const metadata = { title: 'Mis Cotizaciones | Aritth Market' };

export default async function QuotesPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) redirect('/sign-in');
  return (
    <ClientLayout>
      <QuotesContent token={token} />
    </ClientLayout>
  );
}
