import { auth } from '@clerk/nextjs/server';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { InvoicesContent } from '@/components/invoices/InvoicesContent';

export const metadata = { title: 'Mis Facturas' };

export default async function InvoicesPage() {
  const { getToken } = await auth();
  const token = (await getToken()) ?? '';

  return (
    <ClientLayout token={token}>
      <InvoicesContent token={token} />
    </ClientLayout>
  );
}
