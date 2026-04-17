import { auth } from '@clerk/nextjs/server';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { ProcurementContent } from '@/components/procurement/ProcurementContent';

export const metadata = { title: 'Solicitudes de Compra' };

export default async function ProcurementPage() {
  const { getToken } = await auth();
  const token = (await getToken()) ?? '';

  return (
    <ClientLayout token={token}>
      <ProcurementContent token={token} />
    </ClientLayout>
  );
}
