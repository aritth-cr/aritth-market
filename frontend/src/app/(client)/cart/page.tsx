import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { CartContent } from '@/components/cart/CartContent';

export const metadata = { title: 'Mi Carrito | Aritth Market' };

export default async function CartPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) redirect('/sign-in');
  return (
    <ClientLayout token={token}>
      <CartContent token={token} />
    </ClientLayout>
  );
}
