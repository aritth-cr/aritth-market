import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) redirect('/sign-in');

  return <AdminLayout>{children}</AdminLayout>;
}
