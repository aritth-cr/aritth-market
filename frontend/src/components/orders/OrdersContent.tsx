'use client';

import { useEffect, useState } from 'react';
import { Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { ordersApi } from '@/lib/api';

interface Order {
  id: string;
  number: string;
  status: string;
  total: number;
  createdAt: string;
  estimatedDelivery?: string;
  items: Array<{
    quantity: number;
    unitTotal: number;
    product: { name: string; unit: string };
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING:    { label: 'Pendiente',   color: 'text-yellow-400', icon: Clock },
  CONFIRMED:  { label: 'Confirmada',  color: 'text-blue-400',   icon: Clock },
  PROCESSING: { label: 'En proceso',  color: 'text-purple-400', icon: Clock },
  DISPATCHED: { label: 'Despachada',  color: 'text-orange-400', icon: Truck },
  DELIVERED:  { label: 'Entregada',   color: 'text-green-400',  icon: CheckCircle },
  CANCELLED:  { label: 'Cancelada',   color: 'text-red-400',    icon: AlertCircle },
};

export function OrdersContent({ token }: { token: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const formatCRC = (n: number) =>
    `₡${n.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  useEffect(() => {
    ordersApi.list({}, token)
      .then((data: any) => setOrders(data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="skeleton h-8 w-48" />
        {[1, 2].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Mis Órdenes</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-white font-semibold mb-1">Sin órdenes aún</p>
          <p className="text-gray-500 text-sm">Cuando confirmes una cotización, aparecerá aquí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['PENDING'];
            const Icon = cfg.icon;
            const expanded = selected === order.id;

            return (
              <div key={order.id} className="bg-[#242424] border border-[#333] rounded-xl overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => setSelected(expanded ? null : order.id)}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-[#5F6C4E]" />
                    <div>
                      <p className="text-sm font-semibold text-white">{order.number}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('es-CR')}
                        {order.estimatedDelivery && ` · Entrega: ${new Date(order.estimatedDelivery).toLocaleDateString('es-CR')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-bold" style={{ color: '#5F6C4E' }}>
                      {formatCRC(order.total)}
                    </p>
                    <div className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-[#333] p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-[#333]">
                          <th className="text-left pb-2">Producto</th>
                          <th className="text-right pb-2">Cant.</th>
                          <th className="text-right pb-2">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#333]">
                        {order.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 text-white">{item.product.name}</td>
                            <td className="py-2 text-right text-gray-400">{item.quantity} {item.product.unit}</td>
                            <td className="py-2 text-right font-medium" style={{ color: '#5F6C4E' }}>
                              {formatCRC(item.unitTotal * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                                  
                      <tfoot>
                        <tr className="border-t border-[#444]">
                          <td colSpan={2} className="py-2 text-right text-gray-400 font-medium">Total</td>
                          <td className="py-2 text-right font-bold" style={{ color: '#5F6C4E' }}>
                            {formatCRC(order.totalCRC)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
