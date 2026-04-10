import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AdminCompanies } from '@/components/admin/AdminCompanies';

export const metadata = { title: 'Empresas | Admin Aritth' };

export default async function AdminCompaniesPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) redirect('/sign-in');
  return <AdminCompanies token={token} />;
}
