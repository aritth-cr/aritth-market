'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Building2, CheckCircle, Clock, Search, ChevronDown } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  cedula: string;
  type: string;
  status: string;
  creditLimit: number;
  creditUsed: number;
  createdAt: string;
  users: Array<{ email: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-900/30 text-yellow-400',
  ACTIVE:    'bg-green-900/30 text-green-400',
  SUSPENDED: 'bg-red-900/30 text-red-400',
  REJECTED:  'bg-gray-700 text-gray-400',
};

const adminNavLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/companies', label: 'Empresas' },
  { href: '/admin/invoices', label: 'Facturas' },
  { href: '/admin/finance', label: 'Finanzas' },
  { href: '/admin/scraping', label: 'Scraping' },
];

export function AdminCompanies({ token }: { token: string }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);

  const formatCRC = (n: number) =>
    `₡${n.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const load = () => {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (statusFilter) params['status'] = statusFilter;
    adminApi.companies(params, token)
      .then((data: any) => setCompanies(data?.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminApi.updateCompany(editing.id, {
        status: editing.status,
        creditLimit: editing.creditLimit,
      }, token);
      setEditing(null);
      load();
    } catch (err) {
      console.error('Error guardando:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <header className="bg-[#1a1a1a]/95 border-b border-[#333] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-widest" style={{ color: '#5F6C4E' }}>AMT</span>
          <span className="text-xs text-gray-500 bg-[#242424] px-2 py-0.5 rounded-md">BACK-OFFICE</span>
        </div>
        <nav className="flex gap-4 text-sm">
          {adminNavLinks.map(item => (
            <a key={item.href} href={item.href} className="text-gray-400 hover:text-white transition-colors">
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Empresas</h1>
          <div className="flex gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar empresa..."
                className="bg-[#242424] border border-[#333] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5F6C4E] w-56"
              />
            </div>
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#242424] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#5F6C4E]"
            >
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="ACTIVE">Activas</option>
              <option value="SUSPENDED">Suspendidas</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#242424] border border-[#333] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#333]">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Empresa</th>
                <th className="text-left px-4 py-3">Cédula</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Crédito</th>
                <th className="text-right px-4 py-3">Usado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-600">Cargando...</td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-600">Sin resultados</td>
                </tr>
              ) : companies.map(company => (
                <tr key={company.id} className="hover:bg-[#2a2a2a] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{company.name}</p>
                    <p className="text-xs text-gray-500">{company.users[0]?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{company.cedula}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      company.type === 'FREE_ZONE' ? 'bg-[#5F6C4E]/20 text-[#7a8f66]' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {company.type === 'FREE_ZONE' ? 'Zona Franca' : 'Regular'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[company.status] ?? 'bg-gray-700 text-gray-400'}`}>
                      {company.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{formatCRC(company.creditLimit)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={company.creditUsed > company.creditLimit * 0.8 ? 'text-red-400' : 'text-gray-400'}>
                      {formatCRC(company.creditUsed)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditing(company)}
                      className="text-xs text-[#5F6C4E] hover:text-white transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal de edición */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#242424] border border-[#333] rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-white">{editing.name}</h2>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Estado</label>
              <select
                value={editing.status}
                onChange={e => setEditing({ ...editing, status: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5F6C4E]"
              >
                <option value="PENDING">PENDING</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Límite de crédito (CRC)</label>
              <input
                type="number"
                value={editing.creditLimit}
                onChange={e => setEditing({ ...editing, creditLimit: Number(e.target.value) })}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5F6C4E]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-2 border border-[#333] text-gray-400 rounded-lg text-sm hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2 bg-[#5F6C4E] text-white rounded-lg text-sm font-semibold hover:bg