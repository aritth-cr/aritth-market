'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ProductMaster, ProductDeduplication } from '@/types';
import {
  Plus,
  Search,
  Filter,
  GitMerge,
  AlertCircle,
} from 'lucide-react';

export default function ProductsPage() {
  const { getToken } = useAuth();
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [deduplications, setDeduplications] = useState<ProductDeduplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'master' | 'dedup'>('master');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      // TODO: Add products endpoints to backend
      // const productsData = await adminApi.getProductsMaster(..., token);
      // const dedupData = await adminApi.getDeduplication(..., token);
      // setProducts(productsData.data || []);
      // setDeduplications(dedupData.data || []);

      // Mock data for now
      setProducts([]);
      setDeduplications([]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const pending = deduplications.filter(d => d.status === 'PENDING' || d.status === 'PROCESSING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Productos Master</h1>
          <p className="text-gray-400 mt-1">Gestión de catálogo centralizado y deduplicación</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#5F6C4E] hover:bg-[#7a8a64] text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'master' ? 'Nuevo Producto' : 'Nueva Tarea'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#2a2a2a]">
        <button
          onClick={() => setActiveTab('master')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'master'
              ? 'border-[#8fa06e] text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Master Productos ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('dedup')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'dedup'
              ? 'border-[#8fa06e] text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          Deduplicación
          {pending > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
              {pending}
            </span>
          )}
        </button>
      </div>

      {/* Master Products Tab */}
      {activeTab === 'master' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Productos</div>
              <div className="text-2xl font-bold text-white mt-2">{products.length}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Publicados</div>
              <div className="text-2xl font-bold text-[#8fa06e] mt-2">
                {products.filter(p => p.isPublished).length}
              </div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Con imagen</div>
              <div className="text-2xl font-bold text-blue-400 mt-2">
                {products.filter(p => p.imageUrls.length > 0).length}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#5F6C4E]"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition-colors">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>

          {/* Products Table */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Cargando productos...</div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>No hay productos master registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#111] border-b border-[#2a2a2a]">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Nombre</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">SKU</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Fabricante</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Categoría</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Estado</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a2a]">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-[#111] transition-colors">
                        <td className="px-6 py-3 text-white font-medium">{product.canonicalName}</td>
                        <td className="px-6 py-3 text-gray-400">{product.sku}</td>
                        <td className="px-6 py-3 text-gray-400">{product.manufacturerName || '—'}</td>
                        <td className="px-6 py-3 text-gray-400">{product.category || '—'}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            product.isPublished
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {product.isPublished ? 'Publicado' : 'Borrador'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button className="text-[#8fa06e] hover:text-white text-sm font-medium transition-colors">
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Deduplication Tab */}
      {activeTab === 'dedup' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Tareas</div>
              <div className="text-2xl font-bold text-white mt-2">{deduplications.length}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                Por Revisar
              </div>
              <div className="text-2xl font-bold text-yellow-500 mt-2">{pending}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Resueltas</div>
              <div className="text-2xl font-bold text-[#8fa06e] mt-2">
                {deduplications.filter(d => d.status === 'RESOLVED').length}
              </div>
            </div>
          </div>

          {/* Dedup Table */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Cargando tareas...</div>
            ) : deduplications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>No hay tareas de deduplicación</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#111] border-b border-[#2a2a2a]">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Producto 1</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Producto 2</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Similaridad</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Estado</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a2a]">
                    {deduplications.map((dedup) => (
                      <tr key={dedup.id} className="hover:bg-[#111] transition-colors">
                        <td className="px-6 py-3 text-gray-400 font-mono text-xs">{dedup.productId1}</td>
                        <td className="px-6 py-3 text-gray-400 font-mono text-xs">{dedup.productId2}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-[#2a2a2a] rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-[#8fa06e]"
                                style={{ width: `${dedup.similarity}%` }}
                              />
                            </div>
                            <span className="text-white font-medium text-sm">{dedup.similarity}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            dedup.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                            dedup.status === 'PROCESSING' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {dedup.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button className="text-[#8fa06e] hover:text-white text-sm font-medium transition-colors">
                            Revisar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
