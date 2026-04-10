'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cartApi, quotesApi, companyApi } from '@/lib/api';
import { Trash2, ShoppingCart, Package, ArrowRight, Minus, Plus, FileText } from 'lucide-react';

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    storePrice: number;
    imageUrl?: string;
    inStock: boolean;
    unit: string;
  };
}

interface Cart {
  id: string;
  items: CartItem[];
}

export function CartContent({ token }: { token: string }) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  const formatCRC = (n: number) =>
    `₡${n.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const [cartData, companyData] = await Promise.all([
        cartApi.get(token) as Promise<Cart>,
        companyApi.me(token),
      ]);
      setCart(cartData);
      setCompany(companyData);
    } catch {
      // cart may be empty
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadCart(); }, [loadCart]);

  const removeItem = async (productId: string) => {
    await cartApi.removeItem(productId, token);
    loadCart();
  };

  const createQuote = async () => {
    if (!cart || cart.items.length === 0) return;
    setCreating(true);
    try {
      // Pass cartId + deliveryAddress in notes
      const notesText = deliveryAddress
        ? `Dirección: ${deliveryAddress}${notes ? `\n${notes}` : ''}`
        : notes;
      await quotesApi.create({ cartId: cart.id, notes: notesText }, token);
      router.push('/quotes');
    } catch (err) {
      console.error('Error creando cotización:', err);
    } finally {
      setCreating(false);
    }
  };

  const isZonaFranca = company?.type === 'FREE_ZONE';

  const subtotal = cart?.items.reduce((acc, item) => {
    const base = item.product.storePrice * 1.13 * 1.10;
    return acc + base * item.quantity;
  }, 0) ?? 0;

  const iva = isZonaFranca ? 0 : subtotal * 0.13;
  const total = subtotal + iva;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="skeleton h-8 w-48" />
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-24">
        <ShoppingCart className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Tu carrito está vacío</h2>
        <p className="text-gray-500 mb-6">Agrega productos desde el catálogo</p>
        <button
          onClick={() => router.push('/catalog')}
          className="px-6 py-3 bg-[#5F6C4E] text-white rounded-xl font-semibold hover:bg-[#4a5540] transition-colors"
        >
          Ver Catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Mi Carrito</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.items.map(item => (
            <div key={item.id} className="bg-[#242424] border border-[#333] rounded-xl p-4 flex items-center gap-4">
              {/* Imagen */}
              <div className="w-16 h-16 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                {item.product.imageUrl
                  ? <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-contain p-1" />
                  : <Package className="w-8 h-8 text-gray-700" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white truncate">{item.product.name}</h3>
                <p className="text-xs text-gray-500">{item.product.unit}</p>
                <p className="text-sm font-bold mt-1" style={{ color: '#5F6C4E' }}>
                  {formatCRC(item.product.storePrice * 1.13 * 1.10 * item.quantity)}
                </p>
              </div>

              {/* Cantidad */}
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium w-8 text-center">×{item.quantity}</span>
                <button
                  onClick={() => removeItem(item.product.id)}
                  className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="space-y-4">
          <div className="bg-[#242424] border border-[#333] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Resumen</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatCRC(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>IVA 13%</span>
                <span>{isZonaFranca ? <span className="text-[#5F6C4E]">Exento ZF</span> : formatCRC(iva)}</span>
              </div>
              <div className="border-t border-[#333] pt-2 flex justify-between font-bold text-white">
                <span>Total</span>
                <span>{formatCRC(total)}</span>
              </div>
            </div>

            {/* Dirección de entrega */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Dirección de entrega</label>
              <textarea
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Ej: Zona Franca Metropolitana, bodega 12..."
                rows={2}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#5F6C4E] resize-none"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Notas opcionales</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Instrucciones especiales, urgencia, etc."
                rows={2}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#5F6C4E] resize-none"
              />
            </div>

            <button
              onClick={createQuote}
              disabled={creating || !deliveryAddress.trim()}
              className="w-full py-3 bg-[#5F6C4E] hover:bg-[#4a5540] disabled:bg-[#333] disabled:text-gray-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {creating ? (
                <span>Creando cotización...</span>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Solicitar Cotización
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {!deliveryAddress.trim() && (
              <p className="text-xs text-red-400 mt-2">Ingresa una dirección de entrega para continuar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
