'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { motion } from 'framer-motion';
import {
  Building2, Clock, FileCheck, AlertTriangle,
  TrendingUp, TrendingDown, Package, Activity,
} from 'lucide-react';

interface DashboardData {
  kpis: {
    companiesActive: number;
    companiesPending: number;
    invoicesPendingReview: number;
    overdueInvoices: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueGrowth: string | null;
  };
  recentOrders: Array<{
    number: string;
    total: number;
    status: string;
    createdAt: string;
    company: { name: string };
  }>;
  scrapingStatus: Array<{
    store: string;
    status: string;
    productsFound: number | null;
    completedAt: string | null;
  }>;
}

export function AdminDashboard({ token }: { token: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.dashboard(token)
      .then(d => setData(d as DashboardData))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const formatCRC = (n: number) =>
    `₡${(n ?? 0).toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="skeleton h-8 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const growth = parseFloat(kpis?.revenueGrowth ?? '0');

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Admin Navbar */}
      <header className="bg-[#1a1a1a]/95 border-b border-[#333] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-widest" style={{ color: '#5F6C4E' }}>
            AMT
          </span>
          <span className="text-xs text-gray-500 bg-[#242424] px-2 py-0.5 rounded-md">BACK-OFFICE</span>
        </div>
        <nav className="flex gap-4 text-sm">
          {[
            { href: '/admin/dashboard', label: 'Dashboard' },
            { href: '/admin/companies', label: 'Empresas' },
            { href: '/admin/invoices', label: 'Facturas' },
            { href: '/admin/finance', label: 'Finanzas' },
            { href: '/admin/scraping', label: 'Scraping' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="text-gray-400 hover:text-white transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Building2}
            label="Empresas Activas"
            value={kpis?.companiesActive ?? 0}
            sublabel={kpis?.companiesPending ? `${kpis.companiesPending} pendientes` : undefined}
            alert={Boolean(kpis?.companiesPending)}
          />
          <KpiCard
            icon={FileCheck}
            label="Facturas Pendientes"
            value={kpis?.invoicesPendingReview ?? 0}
            sublabel="Requieren revisión"
            alert={Boolean(kpis?.invoicesPendingReview)}
            href="/admin/invoices"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Facturas Vencidas"
            value={kpis?.overdueInvoices ?? 0}
            sublabel="Sin pago"
            alert={Boolean(kpis?.overdueInvoices)}
            href="/admin/finance"
          />
          <div className="bg-[#242424] border border-[#333] rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-1">Ingresos Este Mes</p>
            <p className="text-2xl font-bold text-white">{formatCRC(kpis?.revenueThisMonth ?? 0)}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {growth >= 0
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />}
              {Math.abs(growth)}% vs mes anterior
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Órdenes Recientes */}
          <div className="bg-[#242424] border border-[#333] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Órdenes Recientes
            </h2>
            <div className="space-y-3">
              {data?.recentOrders.map(order => (
                <div key={order.number} className="flex items-center justify-between py-2 border-b border-[#333] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{order.number}</p>
                    <p className="text-xs text-gray-500">{order.company.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium" style={{ color: '#5F6C4E' }}>
                      {formatCRC(order.total)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'CONFIRMED' ? 'bg-green-900/30 text-green-400' :
                      order.status === 'DELIVERED' ? 'bg-blue-900/30 text-blue-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!data?.recentOrders || data.recentOrders.length === 0) && (
                <p className="text-sm text-gray-600">Sin órdenes recientes</p>
              )}
            </div>
          </div>

          {/* Scraping Status */}
          <div className="bg-[#242424] border border-[#333] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Motor de Scraping
              </h2>
              <Link href="/admin/scraping" className="text-xs text-[#5F6C4E] hover:underline">
                Ver detalle →
              </Link>
            </div>
            <div className="space-y-3">
              {data?.scrapingStatus.map(s => (
                <div key={s.store} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      s.status === 'SUCCESS' ? 'bg-green-400' :
                      s.status === 'RUNNING' ? 'bg-yellow-400 animate-pulse' :
                      s.status === 'FAILED' ? 'bg-red-400' : 'bg-gray-600'
                    }`} />
                    <span className="text-sm text-white">{s.store}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {s.productsFound ? `${s.productsFound.toLocaleString()} productos` : s.status}
                    </p>
                    {s.completedAt && (
                      <p className="text-[10px] text-gray-700">
                        {new Date(s.completedAt).toLocaleDateString('es-CR')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sublabel,
  alert,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sublabel?: string;
  alert?: boolean;
  href?: string;
}) {
  const content = (
    <div className={`bg-[#242424] border rounded-xl p-5 transition-colors ${
      alert ? 'border-[#F97316]/40 hover:border-[#F97316]/60' : 'border-[#333] hover:border-[#5F6C4E]/40'
    } ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-5 h-5 ${alert ? 'text-[#F97316]' : 'text-[#5F6C4E]'}`} />
        {alert && value > 0 && (
          <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
  if (href) return <a href={href}>{content}</a>;
  return content;
}
