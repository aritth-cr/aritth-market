import { auth } from '@clerk/nextjs/server';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { ProfileContent } from '@/components/profile/ProfileContent';

export const metadata = { title: 'Mi Empresa' };

export default async function ProfilePage() {
  const { getToken } = await auth();
  const token = (await getToken()) ?? '';

  return (
    <ClientLayout token={token}>
      <ProfileContent token={token} />
    </ClientLayout>
  );
}
