import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AdminFinance } from '@/components/admin/AdminFinance';

export const metadata = { title: 'Finanzas | Admin Aritth' };

export default async function AdminFinancePage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) redirect('/sign-in');
  return <AdminFinance token={token} />;
}
