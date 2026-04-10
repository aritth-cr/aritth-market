'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { FileCheck, Download, Check } from 'lucide-react';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Invoice {
  id: string;
  number: string;
  status: string;
  totalCrc: number;
  createdAt: string;
  order: {
    number: string;
    company: { name: string };
  };
  pdfUrl?: string;
}

const adminNavLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/companies', label: 'Empresas' },
  { href: '/admin/invoices', label: 'Facturas' },
  { href: '/admin/finance', label: 'Finanzas' },
  { href: '/admin/scraping', label: 'Scraping' },
];

export function AdminInvoices({ token }: { token: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const formatCRC = (n: number) =>
    `₡${n.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const load = () => {
    adminApi.pendingInvoices(token)
      .then((data: any) => setInvoices(data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const approve = async (invoiceId: string) => {
    setApprovingId(invoiceId);
    try {
      await adminApi.approveInvoice(invoiceId, notes[invoiceId] ?? '', token);
      load();
    } catch (err) {
      console.error('Error aprobando:', err);
    } finally {
      setApprovingId(null);
    }
  };

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

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Facturas Pendientes de Revisión</h1>
          <span className="text-sm text-gray-500">{invoices.length} pendiente{invoices.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-20">
            <FileCheck className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-white font-semibold">Sin facturas pendientes</p>
            <p className="text-gray-500 text-sm mt-1">Todas las facturas están al día</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map(invoice => (
              <div key={invoice.id} className="bg-[#242424] border border-[#333] rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">{invoice.number}</p>
                    <p className="text-sm text-gray-400">{invoice.order.company.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Orden: {invoice.order.number} · {new Date(invoice.createdAt).toLocaleDateString('es-CR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold" style={{ color: '#5F6C4E' }}>
                      {formatCRC(invoice.totalCrc)}
                    </p>
                    <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded-full">
                      {invoice.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {invoice.pdfUrl && (
                    <a
                      href={`${API_BASE}${invoice.pdfUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-[#5F6C4E] text-[#5F6C4E] rounded-lg text-sm hover:bg-[#5F6C4E]/10 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Ver PDF
                    </a>
                  )}
                  <input
                    type="text"
                    value={notes[invoice.id] ?? ''}
                    onChange={e => setNotes(prev => ({ ...prev, [invoice.id]: e.target.value }))}
                    placeholder="Notas de revisión (opcional)"
                    className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#5F6C4E]"
                  />
                  <button
                    onClick={() => approve(invoice.id)}
                    disabled={approvingId === invoice.id}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#5F6C4E] text-white rounded-lg text-sm font-semibold hover:bg-[#4a5540] disabled:bg-[#333] disabled:text-gray-600 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {approvingId === invoice.id ? 'Aprobando...' : 'Aprobar'}
         