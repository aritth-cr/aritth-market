'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { productsApi, cartApi } from '@/lib/api';
import {
  Search, Filter, ShoppingCart, Package, Zap,
  Star, TrendingDown, AlertCircle, Check,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  sku?: string;
  category: string;
  unit: string;
  inStock: boolean;
  imageUrl?: string;
  pricing: {
    unitPrice: number;
    unitTotal: number;
    ivaRate: number;
    isExempt: boolean;
  };
  deliveryEstimate: string;
}

interface CatalogContentProps {
  token: string;
  initialParams: Record<string, string>;
}

export function CatalogContent({ token, initialParams }: CatalogContentProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialParams['search'] ?? '');
  const [category, setCategory] = useState(initialParams['category'] ?? '');
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [sortBy, setSortBy] = useState('name');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [availableToday, setAvailableToday] = useState(false);
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { sortBy };
      if (search) params['search'] = search;
      if (category) params['category'] = category;
      if (inStockOnly) params['inStock'] = 'true';
      if (availableToday) params['availableToday'] = 'true';

      const result = await productsApi.list(params, token) as any;
      setProducts(result.data ?? []);
      setTotal(result.meta?.total ?? 0);
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoading(false);
    }
  }, [token, search, category, sortBy, inStockOnly, availableToday]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    productsApi.categories(token)
      .then((cats: any) => setCategories(cats))
      .catch(console.error);
  }, [token]);

  // Autocompletado
  useEffect(() => {
    if (search.length < 2) { setSearchSuggestions([]); return; }
    const timeout = setTimeout(async () => {
      const result = await productsApi.suggestions(search, token) as any;
      setSearchSuggestions(result.suggestions ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, token]);

  const addToCart = async (productId: string) => {
    try {
      await cartApi.addItem(productId, 1, token);
      setAddedProducts(prev => new Set([...prev, productId]));
      setTimeout(() => {
        setAddedProducts(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error('Error agregando al carrito:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ---- Búsqueda + Filtros ---- */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Ej: sargentos mecánicos, cable 12AWG, llave de paso...'
            className="w-full bg-[#242424] border border-[#333] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5F6C4E] transition-colors"
          />
          {/* Sugerencias */}
          <AnimatePresence>
            {searchSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 right-0 bg-[#242424] border border-[#333] rounded-xl mt-1 py-1 z-10 shadow-2xl"
              >
                {searchSuggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => { setSearch(s); setSearchSuggestions([]); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setAvailableToday(!availableToday)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              availableToday
                ? 'bg-[#5F6C4E] border-[#5F6C4E] text-white'
                : 'border-[#333] text-gray-400 hover:border-[#5F6C4E] hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Hoy
          </button>

          <button
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              inStockOnly
                ? 'bg-[#5F6C4E] border-[#5F6C4E] text-white'
                : 'border-[#333] text-gray-400 hover:border-[#5F6C4E] hover:text-white'
            }`}
          >
            En Stock
          </button>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#5F6C4E]"
          >
            <option value="name">Nombre A-Z</option>
            <option value="price_asc">Precio ↑</option>
            <option value="price_desc">Precio ↓</option>
            <option value="newest">Más nuevo</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ---- Sidebar Categorías ---- */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="bg-[#242424] rounded-xl border border-[#333] p-4 sticky top-24">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Categorías
            </h3>
            <button
              onClick={() => setCategory('')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                !category ? 'bg-[#5F6C4E]/20 text-[#5F6C4E]' : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos ({total})
            </button>
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => setCategory(cat.name === category ? '' : cat.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors flex justify-between ${
                  category === cat.name ? 'bg-[#5F6C4E]/20 text-[#5F6C4E]' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <span className="text-xs text-gray-600 ml-1">{cat.count}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* ---- Grid de Productos ---- */}
        <div className="flex-1">
          {/* Stats */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {loading ? 'Buscando...' : `${total} productos encontrados`}
            </p>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-[#242424] rounded-xl p-4 space-y-3 animate-pulse">
                  <div className="skeleton h-36 w-full rounded-lg" />
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-8 w-full" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-white mb-1">Sin resultados</p>
              <p className="text-sm">Intente con otros términos de búsqueda</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                  added={addedProducts.has(product.id)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Tarjeta de Producto ----
function ProductCard({
  product,
  onAddToCart,
  added,
}: {
  product: Product;
  onAddToCart: (id: string) => void;
  added: boolean;
}) {
  const formatCRC = (n: number) =>
    `₡${n.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#242424] border border-[#333] rounded-xl overflow-hidden hover:border-[#5F6C4E]/50 transition-all group flex flex-col"
    >
      {/* Imagen */}
      <div className="relative h-40 bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform"
          />
        ) : (
          <Package className="w-12 h-12 text-gray-700" />
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {product.deliveryEstimate === 'Hoy' && (
            <span className="bg-[#F97316] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" /> HOY
            </span>
          )}
          {!product.inStock && (
            <span className="bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded-md">
              Sin stock
            </span>
          )}
          {product.pricing.isExempt && (
            <span className="bg-[#5F6C4E]/30 text-[#7a8f66] text-[10px] px-1.5 py-0.5 rounded-md">
              ZF
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <div className="flex-1">
          {product.brand && (
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
              {product.brand}
            </p>
          )}
          <h3 className="text-sm font-medium text-white leading-tight line-clamp-2">
            {product.name}
          </h3>
          {product.sku && (
            <p className="text-[10px] text-gray-600 mt-0.5">SKU: {product.sku}</p>
          )}
        </div>

        {/* Precio */}
        <div>
          <p className="text-lg font-bold" style={{ color: '#5F6C4E' }}>
            {formatCRC(product.pricing.unitTotal)}
          </p>
          <p className="text-[10px] text-gray-600">
            {product.pricing.isExempt
              ? 'Precio exento IVA'
              : `Sin IVA: ${formatCRC(product.pricing.unitPrice)}`}
            {' · '}{product.unit}
          </p>
        </div>

        {/* Entrega */}
        <p className={`text-[10px] font-medium flex items-center gap-1 ${
          product.deliveryEstimate === 'Hoy' ? 'text-[#F97316]' :
          product.deliveryEstimate === 'Mañana' ? 'text-yellow-500' : 'text-gray-500'
        }`}>
          <Zap className="w-3 h-3" />
          Entrega: {product.deliveryEstimate}
        </p>

        {/* Botón */}
        <button
          onClick={() => onAddToCart(product.id)}
          disabled={!product.inStock || added}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            added
              ? 'bg-green-600/20 text-green-400 border border-green-600/30'
              : product.inStock
                ? 'bg-[#5F6C4E] hover:bg-[#4a5540] text-white'
                : 'bg-[#333] text-gray-600 cursor-not-allowed'
          }`}
        >
          {added ? (
            <><Check className="w-4 h-4" /> Agregado</>
          ) : (
            <><ShoppingCart className="w-4 h-4" /> Agregar</>
          )}
        </button>
      </div>
    </motion.div>
  );
}
