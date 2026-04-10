'use client';

import { useEffect, useState } from 'react';
import { quotesApi } from '@/lib/api';
import { FileText, Download, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';

interface Quote {
  id: string;
  number: string;
  status: string;
  totalCrc: number;
  totalUsd: number;
  createdAt: string;
  validUntil: string;
  pdfUrl?: string;
  items: Array<{
    quantity: number;
    unitPrice: number;
    unitTotal: number;
    product: { name: string; unit: string };
  }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT:     { label: 'Borrador',  color: 'text-gray-400',   icon: Clock },
  SENT:      { label: 'Enviada',   color: 'text-blue-400',   icon: Clock },
  CONFIRMED: { label: 'Confirmada',color: 'text-green-400',  icon: CheckCircle },
  EXPIRED:   { label: 'Vencida',   color: 'text-red-400',    icon: XCircle },
  CANCELLED: { label: 'Cancelada', color: 'text-gray-600',   icon: XCircle },
};

export function QuotesContent({ token }: { token: string }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [poNumber, setPoNumber] = useState('');
  const [confirming, setConfirming] = useState(false);

  const formatCRC = (n: number) =>
    `₡${n.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  useEffect(() => {
    quotesApi.list(token)
      .then((data: any) => setQuotes(data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const confirmQuote = async (quote: Quote) => {
    if (!poNumber.trim()) return;
    setConfirming(true);
    try {
      await quotesApi.confirm(quote.id, poNumber, token);
      const updated = await quotesApi.list(token) as any;
      setQuotes(updated ?? []);
      setSelected(null);
      setPoNumber('');
    } catch (err) {
      console.error('Error confirmando:', err);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="skeleton h-8 w-48" />
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Mis Cotizaciones</h1>

      {quotes.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-white font-semibold mb-1">Sin cotizaciones aún</p>
          <p className="text-gray-500 text-sm">Agrega productos al carrito y solicita una cotización</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map(quote => {
            const st = STATUS_LABELS[quote.status] ?? STATUS_LABELS['DRAFT'];
            const Icon = st.icon;
            const isExpanded = selected?.id === quote.id;

            return (
              <div key={quote.id} className="bg-[#242424] border border-[#333] rounded-xl overflow-hidden">
                {/* Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => setSelected(isExpanded ? null : quote)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#5F6C4E]" />
                    <div>
                      <p className="text-sm font-semibold text-white">{quote.number}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(quote.createdAt).toLocaleDateString('es-CR')}
                        {' · '}válida hasta {new Date(quote.validUntil).toLocaleDateString('es-CR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-sm font-bold" style={{ color: '#5F6C4E' }}>
                      {formatCRC(quote.totalCrc)}
                    </p>
                    <div className={`flex items-center gap-1 text-xs ${st.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {st.label}
                    </div>
                    <ArrowRight className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="border-t border-[#333] p-4 space-y-4">
                    {/* Items */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-[#333]">
                          <th className="text-left pb-2">Producto</th>
                          <th className="text-right pb-2">Cant.</th>
                          <th className="text-right pb-2">P. Unit.</th>
                          <th className="text-right pb-2">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#333]">
                        {quote.items.map((item, idx) => (
                          <tr key={idx} className="py-2">
                            <td className="py-2 text-white">{item.product.name}</td>
                            <td className="py-2 text-right text-gray-400">{item.quantity} {item.product.unit}</td>
                            <td className="py-2 text-right text-gray-400">{formatCRC(item.unitPrice)}</td>
                            <td className="py-2 text-right font-medium" style={{ color: '#5F6C4E' }}>
                              {formatCRC(item.unitTotal * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Acciones */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {quote.pdfUrl && (
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}${quote.pdfUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 border border-[#5F6C4E] text-[#5F6C4E] rounded-lg text-sm hover:bg-[#5F6C4E]/10 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Descargar PDF
                        </a>
                      )}

                      {quote.status === 'SENT' && (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={poNumber}
                            onChange={e => setPoNumber(e.target.value)}
                            placeholder="Número de orden de compra (OC)"
                            className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#5F6C4E]"
                          />
                          <button
                            onClick={() => confirmQuote(quote)}
                            disabled={confirming || !poNumber.trim()}
                            className="px-4 py-2 bg-[#5F6C4E] text-white rounded-lg text-sm font-semibold hover:bg-[#4a5540] disabled:bg-[#333] disabled:text-gray-600 transition-colors"
                          >
                            {confirming ? 'Confirmando...' : 'Confirmar OC'}
                          </button>
                        </div>
          