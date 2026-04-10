'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { TrendingUp, AlertTriangle, Clock } from 'lucide-react';

const adminNavLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/companies', label: 'Empresas' },
  { href: '/admin/invoices', label: 'Facturas' },
  { href: '/admin/finance', label: 'Finanzas' },
  { href: '/admin/scraping', label: 'Scraping' },
];

interface Receivable {
  invoiceId: string;
  invoiceNumber: string;
  companyName: string;
  totalCrc: number;
  dueDate: string;
  daysOverdue: number;
  bucket: string;
}

interface ReceivablesData {
  summary: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90plus: number;
    total: number;
  };
  items: Receivable[];
}

const BUCKET_COLORS: Record<string, string> = {
  CURRENT:  'text-green-400',
  DAYS_30:  'text-yellow-400',
  DAYS_60:  'text-orange-400',
  DAYS_90:  'text-red-400',
  OVERDUE:  'text-red-600',
};

const BUCKET_LABELS: Record<string, string> = {
  CURRENT: 'Al día',
  DAYS_30: '1-30 días',
  DAYS_60: '31-60 días',
  DAYS_90: '61-90 días',
  OVERDUE: '+90 días',
};

export function AdminFinance({ token }: { token: string }) {
  const [data, setData] = useState<ReceivablesData | null>(null);
  const [loading, setLoading] = useState(true);

  const formatCRC = (n: number) =>
    `₡${n.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  useEffect(() => {
    adminApi.receivables(token)
      .then((d: any) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <header className="bg-[#1a1a1a]/95 border-b border-[#333] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-widest" style={{ color: '#5F6C4E' }}>AMT</span>
          <span className="text-xs text-gray-500 bg-[#242424] px-2 py-0.5 rounded-md">BACK-OFFICE</span>
        </div>
        <nav className="flex gap-4 text-sm">
          {adminNavLinks.map(item => (
            <a key={item.href} href={item.href} className="text-gray-400 hover:text-white transition-colors">
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-white">Finanzas — Cuentas por Cobrar</h1>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
            <div className="skeleton h-64 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Aging buckets */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { key: 'CURRENT',  value: summary?.current  ?? 0 },
                { key: 'DAYS_30',  value: summary?.days1_30 ?? 0 },
                { key: 'DAYS_60',  value: summary?.days31_60 ?? 0 },
                { key: 'DAYS_90',  value: summary?.days61_90 ?? 0 },
                { key: 'OVERDUE',  value: summary?.days90plus ?? 0 },
              ].map(bucket => (
                <div key={bucket.key} className="bg-[#242424] border border-[#333] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{BUCKET_LABELS[bucket.key]}</p>
                  <p className={`text-lg font-bold ${BUCKET_COLORS[bucket.key]}`}>
                    {formatCRC(bucket.value)}
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-[#242424] border border-[#5F6C4E]/30 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-[#5F6C4E]" />
                <div>
                  <p className="text-sm text-gray-400">Total por cobrar</p>
                  <p className="text-2xl font-bold text-white">{formatCRC(summary?.total ?? 0)}</p>
                </div>
              </div>
              {(summary?.days90plus ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">{formatCRC(summary?.days90plus ?? 0)} vencido +90 días</span>
                </div>
              )}
            </div>

            {/* Tabla detallada */}
            {data && data.items.length > 0 && (
              <div className="bg-[#242424] border border-[#333] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#333]">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Detalle de Facturas Vencidas
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="border-b border-[#333]">
                    <tr className="text-xs text-gray-500 uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Factura</th>
                      <th className="text-left px-4 py-3">Empresa</th>
                      <th className="text-right px-4 py-3">Monto</th>
                      <th className="text-right px-4 py-3">Vencimiento</th>
                      <th className="text-right px-4 py-3">Días vencido</th>
                      <th className="text-center px-4 py-3">Categoría</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333]">
                    {data.items.map(item => (
                      <tr key={item.invoiceId} className="hover:bg-[#2a2a2a] transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{item.invoiceNumber}</td>
                        <td className="px-4 py-3 text-gray-400">{item.companyName}</td>
                        <td className="px-4 py-3 text-right font-medium" style={{ color: '#5F6C4E' }}>
                          {formatCRC(item.totalCrc)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          {new Date(item.dueDate).toLocaleDateString('es-CR')}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          item.daysOverdue > 90 ? 'text-red-400' :
                          item.daysOverdue > 60 ? 'text-orange-400' :
                          item.daysOverdue > 30 ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                          {item.daysOverdue > 0 ? `${item.daysOverdue} días` : 'Al día'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs ${BUCKET_COLORS[item.bucket] ?? 'text-gray-400'}`}>
                            {BUCKET_LABELS[item.bucket] ?? item.bucket}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
