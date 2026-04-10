import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AdminInvoices } from '@/components/admin/AdminInvoices';

export const metadata = { title: 'Facturas | Admin Aritth' };

export default async function AdminInvoicesPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) redirect('/sign-in');
  return <AdminInvoices token={token} />;
}
