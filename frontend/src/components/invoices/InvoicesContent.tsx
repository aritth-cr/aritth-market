'use client';

import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { getClientInvoices, getInvoiceDownloadUrl } from '@/lib/client-portal-api';
import type { ClientInvoice } from '@/types/client-portal';
import { FileText, Download, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface InvoicesContentProps {
  token: string;
}

function formatMoney(value: number): string {
  return `₡${value.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_CONFIG: Record<
  ClientInvoice['status'],
  { label: string; color: string; icon: ElementType }
> = {
  PENDING_REVIEW: { label: 'En revisión', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  APPROVED:       { label: 'Aprobada',    color: 'text-blue-400 bg-blue-400/10',   icon: CheckCircle },
  SENT:           { label: 'Enviada',     color: 'text-indigo-400 bg-indigo-400/10', icon: FileText },
  PAID:           { label: 'Pagada',      color: 'text-green-400 bg-green-400/10', icon: CheckCircle },
  OVERDUE:        { label: 'Vencida',     color: 'text-red-400 bg-red-400/10',     icon: AlertCircle },
  CANCELLED:      { label: 'Cancelada',   color: 'text-gray-500 bg-gray-500/10',   icon: XCircle },
};

export function InvoicesContent({ token }: InvoicesContentProps) {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ClientInvoice['status'] | 'ALL'>('ALL');

  useEffect(() => {
    let mounted = true;
    getClientInvoices(token)
      .then(data => { if (mounted) { setInvoices(data); setLoading(false); } })
      .catch(err => {
        if (mounted) {
          setError(err.message ?? 'Error al cargar facturas');
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [token]);

  const filtered = filter === 'ALL'
    ? invoices
    : invoices.filter(inv => inv.status === filter);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#242424] rounded-xl border border-[#333] p-5 skeleton h-20" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-gray-500">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium text-white mb-1">Error al cargar facturas</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Mis Facturas</h1>
        <span className="text-sm text-gray-500">{invoices.length} facturas</span>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'PENDING_REVIEW', 'SENT', 'PAID', 'OVERDUE'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === s
                ? 'bg-[#5F6C4E] border-[#5F6C4E] text-white'
                : 'border-[#333] text-gray-400 hover:border-[#5F6C4E] hover:text-white'
            }`}
          >
            {s === 'ALL' ? 'Todas' : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-white mb-1">Sin facturas</p>
          <p className="text-sm">No hay facturas con el filtro seleccionado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(invoice => {
            const cfg = STATUS_CONFIG[invoice.status];
            const Icon = cfg?.icon ?? FileText;
            const isOverdue = invoice.status === 'OVERDUE';
            const downloadUrl = getInvoiceDownloadUrl(invoice.id);

            return (
              <div
                key={invoice.id}
                className={`bg-[#242424] border rounded-xl p-5 transition-colors ${
                  isOverdue ? 'border-red-500/30 hover:border-red-500/50' : 'border-[#333] hover:border-[#444]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Info */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">
                        Factura #{invoice.number}
                      </p>
                      {invoice.order && (
                        <p className="text-xs text-gray-500">
                          Orden #{invoice.order.number}
                          {invoice.order.poNumber && ` · PO: ${invoice.order.poNumber}`}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg?.color ?? ''}`}>
                          {cfg?.label ?? invoice.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          Vence: {formatDate(invoice.dueDate)}
                        </span>
                        {invoice.paidAt && (
                          <span className="text-xs text-green-500">
                            Pagada: {formatDate(invoice.paidAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Monto + acciones */}
                  <div className="text-right space-y-2 flex-shrink-0">
                    <p className="text-lg font-bold" style={{ color: '#5F6C4E' }}>
                      {formatMoney(invoice.total)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Sub: {formatMoney(invoice.subtotal)} · IVA: {formatMoney(invoice.ivaAmount)}
                    </p>
                    {invoice.pdfUrl && (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#5F6C4E] hover:text-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                    )}
                    {!invoice.pdfUrl && (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Descargar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
