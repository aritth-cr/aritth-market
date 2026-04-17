'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Supplier } from '@/types';
import { adminApi } from '@/lib/api';
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  Shield,
  AlertCircle,
} from 'lucide-react';

export default function SuppliersPage() {
  const { getToken } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      // TODO: Add suppliers endpoint to backend
      // const data = await adminApi.suppliers({ search: searchTerm }, token);
      // setSuppliers(data.data || []);

      // Mock data for now
      setSuppliers([]);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  }

  const verified = suppliers.filter(s => s.status === 'VERIFIED' || s.status === 'APPROVED').length;
  const pending = suppliers.filter(s => s.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Proveedores</h1>
          <p className="text-gray-400 mt-1">Gestión y verificación de proveedores</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#5F6C4E] hover:bg-[#7a8a64] text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="text-gray-400 text-sm">Total Proveedores</div>
          <div className="text-2xl font-bold text-white mt-2">{suppliers.length}</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#8fa06e]" />
            Verificados
          </div>
          <div className="text-2xl font-bold text-[#8fa06e] mt-2">{verified}</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            Por Verificar
          </div>
          <div className="text-2xl font-bold text-yellow-500 mt-2">{pending}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
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

      {/* Suppliers Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando proveedores...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No hay proveedores registrados</p>
            <p className="text-sm mt-2">Crear el primer proveedor para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#111] border-b border-[#2a2a2a]">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-400">Nombre</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-400">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-400">País</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-400">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-400">Verificado</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-[#111] transition-colors">
                    <td className="px-6 py-3 text-white font-medium">{supplier.name}</td>
                    <td className="px-6 py-3 text-gray-400 text-sm">{supplier.email}</td>
                    <td className="px-6 py-3 text-gray-400 text-sm">{supplier.country}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        supplier.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                        supplier.status === 'VERIFIED' ? 'bg-blue-500/20 text-blue-400' :
                        supplier.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {supplier.verifiedBadge && (
                        <Shield className="w-4 h-4 text-[#8fa06e]" />
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button className="text-[#8fa06e] hover:text-white text-sm font-medium transition-colors">
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
