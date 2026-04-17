import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { CatalogContent } from '@/components/catalog/CatalogContent';

export const metadata = { title: 'Catálogo de Productos' };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { getToken } = await auth();
  const token = (await getToken()) ?? '';
  const params = await searchParams;

  return (
    <ClientLayout token={token}>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogContent
          token={token}
          initialParams={params}
        />
      </Suspense>
    </ClientLayout>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-10 w-full max-w-xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-[#242424] rounded-xl p-4 space-y-3">
            <div className="skeleton h-40 w-full rounded-lg" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
