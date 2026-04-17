import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const metadata = { title: 'Dashboard | Admin Aritth' };

export default async function AdminDashboardPage() {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) redirect('/sign-in');

  return <AdminDashboard token={token} />;
}
