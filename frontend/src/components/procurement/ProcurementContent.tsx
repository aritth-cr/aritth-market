'use client';

import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { getClientProcurementRequests } from '@/lib/client-portal-api';
import type { ClientProcurementRequest } from '@/types/client-portal';
import { ClipboardList, AlertCircle, CheckCircle, Clock, XCircle, Globe, Zap } from 'lucide-react';

interface ProcurementContentProps {
  token: string;
}

function formatMoney(value?: number | null): string {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_CONFIG: Record<
  ClientProcurementRequest['status'],
  { label: string; color: string; icon: ElementType }
> = {
  DRAFT:     { label: 'Borrador',   color: 'text-gray-400 bg-gray-400/10',    icon: ClipboardList },
  SUBMITTED: { label: 'Enviada',    color: 'text-blue-400 bg-blue-400/10',    icon: Clock },
  APPROVED:  { label: 'Aprobada',   color: 'text-green-400 bg-green-400/10',  icon: CheckCircle },
  REJECTED:  { label: 'Rechazada',  color: 'text-red-400 bg-red-400/10',      icon: XCircle },
  CANCELLED: { label: 'Cancelada',  color: 'text-gray-500 bg-gray-500/10',    icon: XCircle },
};

export function ProcurementContent({ token }: ProcurementContentProps) {
  const [items, setItems] = useState<ClientProcurementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getClientProcurementRequests(token)
      .then(data => { if (mounted) { setItems(data); setLoading(false); } })
      .catch(err => {
        if (mounted) {
          // Silenciamos 404 — endpoint puede no estar implementado aún
          if (err.message?.includes('404') || err.message?.includes('not found')) {
            setItems([]);
            setLoading(false);
          } else {
            setError(err.message ?? 'Error al cargar solicitudes');
            setLoading(false);
          }
        }
      });
    return () => { mounted = false; };
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#242424] rounded-xl border border-[#333] p-5 skeleton h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-gray-500">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium text-white mb-1">Error al cargar solicitudes</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Solicitudes de Compra</h1>
        <span className="text-sm text-gray-500">{items.length} solicitudes</span>
      </div>

      {/* Lista vacía */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-white mb-1">Sin solicitudes de compra</p>
          <p className="text-sm">Aquí aparecerán las solicitudes que generes desde el catálogo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const cfg = STATUS_CONFIG[item.status];
            const Icon = cfg?.icon ?? ClipboardList;
            const offer = item.selectedOffer;

            return (
              <div
                key={item.id}
                className="bg-[#242424] border border-[#333] rounded-xl p-5 hover:border-[#444] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Info */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">
                        {item.product?.canonicalName ?? `Solicitud ${item.id.slice(0, 8)}`}
                      </p>
                      {item.product?.manufacturerPartNumber && (
                        <p className="text-xs text-gray-500">
                          {item.product.brand && `${item.product.brand} · `}
                          P/N: {item.product.manufacturerPartNumber}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.notes}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg?.color ?? ''}`}>
                          {cfg?.label ?? item.status}
                        </span>
                        <span className="text-xs text-gray-600">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Oferta seleccionada */}
                  {offer && (
                    <div className="text-right space-y-1 flex-shrink-0">
                      <p className="text-base font-bold" style={{ color: '#5F6C4E' }}>
                        {formatMoney(offer.unitPrice)}
                        {offer.currencyCode && (
                          <span className="text-xs text-gray-500 ml-1">{offer.currencyCode}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                        {offer.isNational ? (
                          <><Zap className="w-3 h-3 text-[#F97316]" /> Nacional</>
                        ) : (
                          <><Globe className="w-3 h-3" /> Internacional</>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-600">{offer.supplierInternalCode}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
