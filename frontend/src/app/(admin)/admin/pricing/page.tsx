'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PricingModel, LandedCost } from '@/types';
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  Globe,
} from 'lucide-react';

export default function PricingPage() {
  const { getToken } = useAuth();
  const [pricingModels, setPricingModels] = useState<PricingModel[]>([]);
  const [landedCosts, setLandedCosts] = useState<LandedCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'models' | 'landed'>('models');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      // TODO: Add pricing endpoints to backend
      // const modelsData = await adminApi.getPricingModels(..., token);
      // const costData = await adminApi.getLandedCosts(..., token);
      // setPricingModels(modelsData.data || []);
      // setLandedCosts(costData.data || []);

      // Mock data for now
      setPricingModels([]);
      setLandedCosts([]);
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  }

  const activeCount = pricingModels.filter(p => p.isActive).length;
  const allCost = landedCosts.reduce((sum, lc) => sum + lc.landedCost, 0);
  const avgMargin = landedCosts.length > 0
    ? (landedCosts.reduce((sum, lc) => sum + lc.margin, 0) / landedCosts.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Precios & Costos</h1>
          <p className="text-gray-400 mt-1">Gestión de modelos de precios y análisis de costos logísticos</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#5F6C4E] hover:bg-[#7a8a64] text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'models' ? 'Nuevo Modelo' : 'Calcular Costo'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#2a2a2a]">
        <button
          onClick={() => setActiveTab('models')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'models'
              ? 'border-[#8fa06e] text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Modelos ({pricingModels.length})
        </button>
        <button
          onClick={() => setActiveTab('landed')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'landed'
              ? 'border-[#8fa06e] text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          Costo Logístico ({landedCosts.length})
        </button>
      </div>

      {/* Pricing Models Tab */}
      {activeTab === 'models' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Modelos</div>
              <div className="text-2xl font-bold text-white mt-2">{pricingModels.length}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Activos</div>
              <div className="text-2xl font-bold text-[#8fa06e] mt-2">{activeCount}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Margen Mínimo</div>
              <div className="text-2xl font-bold text-blue-400 mt-2">
                {pricingModels.length > 0
                  ? `${Math.min(...pricingModels.map(p => p.minMargin))}%`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
              <input
                type="text"
                placeholder="Buscar por producto o proveedor..."
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

          {/* Pricing Models Table */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Cargando modelos...</div>
            ) : pricingModels.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>No hay modelos de precio registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#111] border-b border-[#2a2a2a]">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Producto</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Proveedor</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Costo Base</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Margen</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Precio Venta</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">MOQ</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Estado</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a2a]">
                    {pricingModels.map((model) => (
                      <tr key={model.id} className="hover:bg-[#111] transition-colors">
                        <td className="px-6 py-3 text-white font-medium">{model.productId}</td>
                        <td className="px-6 py-3 text-gray-400">{model.supplierId}</td>
                        <td className="px-6 py-3 text-gray-400 font-mono">${model.baseCost.toFixed(2)}</td>
                        <td className="px-6 py-3">
                          <span className="text-white font-medium">
                            {model.marginStrategy === 'PERCENTAGE' ? `${model.marginValue}%` : `$${model.marginValue.toFixed(2)}`}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-[#8fa06e] font-bold">${model.sellingPrice.toFixed(2)}</td>
                        <td className="px-6 py-3 text-gray-400">{model.moq} units</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            model.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {model.isActive ? 'Activo' : 'Inactivo'}
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

      {/* Landed Costs Tab */}
      {activeTab === 'landed' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Análisis</div>
              <div className="text-2xl font-bold text-white mt-2">{landedCosts.length}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Costo Total Logístico</div>
              <div className="text-2xl font-bold text-[#8fa06e] mt-2">${(allCost).toFixed(2)}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Margen Promedio</div>
              <div className="text-2xl font-bold text-blue-400 mt-2">{avgMargin}%</div>
            </div>
          </div>

          {/* Landed Costs Table */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Cargando costos...</div>
            ) : landedCosts.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>No hay análisis de costo logístico</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#111] border-b border-[#2a2a2a]">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Producto</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Origen → Destino</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Costo Base</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Flete</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Arancel</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Costo Logístico</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Precio Final</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-400">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a2a]">
                    {landedCosts.map((cost) => (
                      <tr key={cost.id} className="hover:bg-[#111] transition-colors">
                        <td className="px-6 py-3 text-white font-medium">{cost.productId}</td>
                        <td className="px-6 py-3 text-gray-400 text-xs">
                          {cost.sourceCountry} → {cost.destinationCountry}
                        </td>
                        <td className="px-6 py-3 text-gray-400 font-mono">${cost.baseCost.toFixed(2)}</td>
                        <td className="px-6 py-3 text-gray-400 font-mono">${cost.freightCost.toFixed(2)}</td>
                        <td className="px-6 py-3 text-gray-400 font-mono">${(cost.customsDuty + cost.importTax).toFixed(2)}</td>
                        <td className="px-6 py-3 text-white font-bold">${cost.landedCost.toFixed(2)}</td>
                        <td className="px-6 py-3 text-[#8fa06e] font-bold">${cost.sellingPrice.toFixed(2)}</td>
                        <td className="px-6 py-3">
                          <span className="text-white font-medium">{cost.margin}%</span>
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
