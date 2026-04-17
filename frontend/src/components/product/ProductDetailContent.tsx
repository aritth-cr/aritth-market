'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getClientProductDetail } from '@/lib/client-portal-api';
import type { ClientProductDetail } from '@/types/client-portal';
import { cartApi } from '@/lib/api';
import {
  Package,
  ArrowLeft,
  ShoppingCart,
  Check,
  FileText,
  Globe,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ProductDetailContentProps {
  token: string;
  productId: string;
}

function formatMoney(value?: number | null, currency = 'CRC'): string {
  if (typeof value !== 'number') return '—';
  if (currency === 'USD') {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }
  return `₡${value.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function ProductDetailContent({ token, productId }: ProductDetailContentProps) {
  const [product, setProduct] = useState<ClientProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getClientProductDetail(token, productId)
      .then(p => { if (mounted) { setProduct(p); setLoading(false); } })
      .catch(err => {
        if (mounted) {
          setError(err.message ?? 'Error al cargar producto');
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [token, productId]);

  const addToCart = async () => {
    try {
      await cartApi.addItem(productId, 1, token);
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (err) {
      console.error('Error al agregar al carrito:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="skeleton h-80 rounded-xl" />
          <div className="space-y-4">
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-20 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium text-white mb-1">Producto no encontrado</p>
        <p className="text-sm mb-4">{error ?? 'No pudimos cargar este producto'}</p>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5F6C4E] text-white rounded-lg text-sm hover:bg-[#4a5540] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Catálogo
        </Link>
      </div>
    );
  }

  const images = product.imageUrls.length > 0 ? product.imageUrls : [];
  const bestOffer = product.bestOffer;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/catalog" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Catálogo
        </Link>
        <span>/</span>
        {product.category && <><span className="text-gray-600">{product.category}</span><span>/</span></>}
        <span className="text-gray-300 truncate max-w-xs">{product.canonicalName}</span>
      </nav>

      {/* Main grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* ---- Galería ---- */}
        <div className="space-y-3">
          <div className="relative bg-[#242424] rounded-xl border border-[#333] overflow-hidden h-80 flex items-center justify-center">
            {images.length > 0 ? (
              <Image
                src={images[imageIndex] ?? ''}
                alt={product.canonicalName}
                fill
                className="object-contain p-6"
              />
            ) : (
              <Package className="w-20 h-20 text-gray-700" />
            )}

            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIndex(i => Math.max(0, i - 1))}
                  disabled={imageIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setImageIndex(i => Math.min(images.length - 1, i + 1))}
                  disabled={imageIndex === images.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setImageIndex(idx)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-lg border overflow-hidden ${
                    idx === imageIndex ? 'border-[#5F6C4E]' : 'border-[#333]'
                  }`}
                >
                  <Image src={img} alt="" fill className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---- Info ---- */}
        <div className="space-y-4">
          {/* Header */}
          <div>
            {product.brand && (
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{product.brand}</p>
            )}
            <h1 className="text-2xl font-bold text-white">{product.canonicalName}</h1>
            {product.manufacturerName && (
              <p className="text-sm text-gray-400 mt-1">
                {product.manufacturerName}
                {product.manufacturerPartNumber && (
                  <span className="ml-2 text-gray-600">· {product.manufacturerPartNumber}</span>
                )}
              </p>
            )}
          </div>

          {/* Descripción */}
          {product.description && (
            <p className="text-sm text-gray-400 leading-relaxed">{product.description}</p>
          )}

          {/* Oferta destacada */}
          {bestOffer && (
            <div className="bg-[#242424] border border-[#333] rounded-xl p-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Mejor oferta disponible</p>
              <p className="text-2xl font-bold" style={{ color: '#5F6C4E' }}>
                {formatMoney(bestOffer.unitPrice, bestOffer.currencyCode)}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  {bestOffer.isNational ? (
                    <><Zap className="w-3 h-3 text-[#F97316]" /> Nacional</>
                  ) : (
                    <><Globe className="w-3 h-3" /> Internacional</>
                  )}
                </span>
                <span>Código: {bestOffer.supplierInternalCode}</span>
              </div>
            </div>
          )}

          {/* Conteo de ofertas */}
          <div className="flex gap-3 text-sm text-gray-400">
            <span>{product.manufacturerOfferCount} fabricantes</span>
            <span>·</span>
            <span>{product.nationalOfferCount} nacionales</span>
            <span>·</span>
            <span>{product.internationalOfferCount} internacionales</span>
          </div>

          {/* CTA */}
          <button
            onClick={addToCart}
            disabled={added || !bestOffer}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              added
                ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                : bestOffer
                  ? 'bg-[#5F6C4E] hover:bg-[#4a5540] text-white'
                  : 'bg-[#333] text-gray-600 cursor-not-allowed'
            }`}
          >
            {added ? (
              <><Check className="w-4 h-4" /> Agregado al carrito</>
            ) : (
              <><ShoppingCart className="w-4 h-4" /> Agregar al carrito</>
            )}
          </button>
        </div>
      </div>

      {/* ---- Todas las ofertas ---- */}
      {product.offers.length > 1 && (
        <div className="bg-[#242424] border border-[#333] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">
            Todas las ofertas ({product.offers.length})
          </h2>
          <div className="space-y-2">
            {product.offers.map(offer => (
              <div
                key={offer.id}
                className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg border border-[#333]"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    offer.isNational
                      ? 'bg-[#F97316]/20 text-[#F97316]'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {offer.isNational ? 'Nacional' : 'Internacional'}
                  </span>
                  <span className="text-xs text-gray-500">{offer.supplierInternalCode}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#5F6C4E' }}>
                  {formatMoney(offer.unitPrice, offer.currencyCode)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Documentos técnicos ---- */}
      {product.technicalDocuments && product.technicalDocuments.length > 0 && (
        <div className="bg-[#242424] border border-[#333] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Documentos Técnicos</h2>
          <div className="space-y-2">
            {product.technicalDocuments.map(doc => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors group"
              >
                <FileText className="w-4 h-4 text-gray-500 group-hover:text-[#5F6C4E]" />
                <span className="text-sm text-gray-300 group-hover:text-white">{doc.title}</span>
                {doc.typeCode && (
                  <span className="text-xs text-gray-600 ml-auto">{doc.typeCode}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
