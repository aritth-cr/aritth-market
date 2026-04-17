import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { OrdersContent } from '@/components/orders/OrdersContent';

export const metadata = { title: 'Mis Órdenes | Aritth Market' };

export default async function OrdersPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) redirect('/sign-in');
  return (
    <ClientLayout token={token}>
      <OrdersContent token={token} />
    </ClientLayout>
  );
}
