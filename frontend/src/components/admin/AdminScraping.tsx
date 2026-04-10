'use client';

import { useEffect, useState, useRef } from 'react';
import { adminApi } from '@/lib/api';
import { Play, RefreshCw, CheckCircle, XCircle, Clock, Package, AlertCircle } from 'lucide-react';

const adminNavLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/companies', label: 'Empresas' },
  { href: '/admin/invoices', label: 'Facturas' },
  { href: '/admin/finance', label: 'Finanzas' },
  { href: '/admin/scraping', label: 'Scraping' },
];

interface ScrapingJob {
  id: string;
  storeId: string;
  status: string;
  productsFound: number | null;
  productsUpdated: number | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

interface StoreStatus {
  store: string;
  storeId: string;
  status: string;
  productsFound: number | null;
  completedAt: string | null;
  lastJob: ScrapingJob | null;
  recentJobs: ScrapingJob[];
}

const STATUS_ICON: Record<string, React.ElementType> = {
  SUCCESS: CheckCircle,
  FAILED:  XCircle,
  RUNNING: RefreshCw,
  IDLE:    Clock,
};

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: 'text-green-400',
  FAILED:  'text-red-400',
  RUNNING: 'text-yellow-400',
  IDLE:    'text-gray-500',
};

export function AdminScraping({ token }: { token: string }) {
  const [stores, setStores] = useState<StoreStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const data = await adminApi.scrapingStatus(token) as any;
      setStores(data ?? []);
    } catch (err) {
      console.error('Error cargando status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Actualizar automáticamente cada 15 segundos si hay un job RUNNING
    intervalRef.current = setInterval(() => {
      setStores(prev => {
        const hasRunning = prev.some(s => s.status === 'RUNNING');
        if (hasRunning) load();
        return prev;
      });
    }, 15_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [token]);

  const trigger = async (storeId: string) => {
    setTriggering(storeId);
    try {
      await adminApi.triggerScraping(storeId, token);
      // Actualizar inmediatamente y mostrar RUNNING
      setTimeout(load, 1_500);
    } catch (err) {
      console.error('Error triggering:', err);
    } finally {
      setTriggering(null);
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
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
          <h1 className="text-2xl font-bold text-white">Motor de Scraping</h1>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 border border-[#333] text-gray-400 rounded-lg text-sm hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map(i => <div key={i} className="skeleton h-48 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {stores.map(store => {
              const Icon = STATUS_ICON[store.status] ?? Clock;
              const color = STATUS_COLOR[store.status] ?? 'text-gray-500';
              const isRunning = store.status === 'RUNNING';
              const isTriggering = triggering === store.storeId;

              return (
                <div key={store.storeId} className="bg-[#242424] border border-[#333] rounded-xl p-5 space-y-5">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        isRunning ? 'bg-yellow-400 animate-pulse' :
                        store.status === 'SUCCESS' ? 'bg-green-400' :
                        store.status === 'FAILED' ? 'bg-red-400' : 'bg-gray-600'
                      }`} />
                      <h2 className="font-semibold text-white text-lg">{store.store}</h2>
                    </div>
                    <button
                      onClick={() => trigger(store.storeId)}
                      disabled={isRunning || isTriggering}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#5F6C4E] text-white rounded-lg text-sm font-semibold hover:bg-[#4a5540] disabled:bg-[#333] disabled:text-gray-600 transition-colors"
                    >
                      {isRunning || isTriggering ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Corriendo...</>
                      ) : (
                        <><Play className="w-3.5 h-3.5" /> Iniciar</>
                      )}
                    </button>
                  </div>

                  {/* Estado actual */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Estado</p>
                      <div className={`flex items-center justify-center gap-1 ${color}`}>
                        <Icon className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                        <span className="text-xs font-medium">{store.status}</span>
                      </div>
                    </div>
                    <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Productos</p>
                      <p className="text-sm font-bold text-white">
                        {store.productsFound?.toLocaleString() ?? '—'}
                      </p>
                    </div>
                    <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Último run</p>
                      <p className="text-xs text-gray-400">
                        {store.completedAt
                          ? new Date(store.completedAt).toLocaleDateString('es-CR')
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Error */}
                  {store.lastJob?.error && (
                    <div className="bg-red-900/20 border border-red-900/40 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300">{store.lastJob.error}</p>
                    </div>
                  )}

                  {/* Historial de jobs */}
                  {store.recentJobs && store.recentJobs.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Historial reciente</p>
                      <div className="space-y-1.5">
                        {store.recentJobs.slice(0, 5).map(job => {
                          const JIcon = STATUS_ICON[job.status] ?? Clock;
                          const jColor = STATUS_COLOR[job.status] ?? 'text-gray-500';
                          return (
                            <div key={job.id} className="flex items-center justify-between text-xs">
                              <div className={`flex items-center gap-1.5 ${jColor}`}>
                                <JIcon className="w-3 h-3" />
                                <span>{new Date(job.startedAt).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                              </div>
                              <div className="flex items-center gap-3 text-gray-500">
                                {job.productsFound != null && (
                                  <span className="flex items-center gap-1">
                                    <Package className="w-3 h-3" />
                                    {job.productsFound.toLocaleString()}
                                  </span>
                                )}
                                <span>{formatDuration(job.durationMs)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
