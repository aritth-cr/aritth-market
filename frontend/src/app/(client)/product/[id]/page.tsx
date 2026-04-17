import { auth } from '@clerk/nextjs/server';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { ProductDetailContent } from '@/components/product/ProductDetailContent';

export const metadata = { title: 'Detalle de Producto' };

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { getToken } = await auth();
  const token = (await getToken()) ?? '';
  const { id } = await params;

  return (
    <ClientLayout token={token}>
      <ProductDetailContent token={token} productId={id} />
    </ClientLayout>
  );
}
