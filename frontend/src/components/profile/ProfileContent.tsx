'use client';

import { useEffect, useState } from 'react';
import { getClientCompanyProfile } from '@/lib/client-portal-api';
import type { ClientCompanyProfile } from '@/types/client-portal';
import { Building2, CreditCard, AlertCircle } from 'lucide-react';

interface ProfileContentProps {
  token: string;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export function ProfileContent({ token }: ProfileContentProps) {
  const [profile, setProfile] = useState<ClientCompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getClientCompanyProfile(token)
      .then(p => { if (mounted) { setProfile(p); setLoading(false); } })
      .catch(err => {
        if (mounted) {
          setError(err.message ?? 'Error al cargar perfil');
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="skeleton h-8 w-48" />
        <div className="bg-[#242424] rounded-xl border border-[#333] p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-6 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-20 text-gray-500">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium text-white mb-1">No pudimos cargar tu perfil</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const creditPercent = profile.creditLimit > 0
    ? Math.min(100, Math.round((profile.creditUsed / profile.creditLimit) * 100))
    : 0;

  const statusColor: Record<string, string> = {
    ACTIVE: 'text-green-400 bg-green-400/10',
    PENDING: 'text-yellow-400 bg-yellow-400/10',
    SUSPENDED: 'text-red-400 bg-red-400/10',
    REJECTED: 'text-red-400 bg-red-400/10',
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#5F6C4E]/20 flex items-center justify-center">
          <Building2 className="w-6 h-6" style={{ color: '#5F6C4E' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{profile.name}</h1>
          <p className="text-sm text-gray-400">{profile.legalName}</p>
        </div>
        <span className={`ml-auto text-xs px-3 py-1 rounded-full font-medium ${statusColor[profile.status] ?? 'text-gray-400 bg-gray-400/10'}`}>
          {profile.status}
        </span>
      </div>

      {/* Info cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Datos generales */}
        <div className="bg-[#242424] border border-[#333] rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Información General
          </h2>
          <InfoRow label="Cédula Jurídica" value={profile.cedula} />
          <InfoRow label="Tipo" value={profile.type === 'FREE_ZONE' ? 'Zona Franca' : 'Regular'} />
          <InfoRow
            label="IVA"
            value={profile.isExempt ? 'Exento (ZF)' : 'Aplica IVA 13%'}
            valueClass={profile.isExempt ? 'text-[#5F6C4E]' : 'text-gray-300'}
          />
          <InfoRow label="Teléfono" value={profile.phone} />
          <InfoRow label="Email" value={profile.email} />
        </div>

        {/* Crédito */}
        <div className="bg-[#242424] border border-[#333] rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Línea de Crédito
          </h2>
          <div>
            <p className="text-2xl font-bold text-white">{formatMoney(profile.creditAvailable)}</p>
            <p className="text-xs text-gray-500">disponible de {formatMoney(profile.creditLimit)}</p>
          </div>
          {/* Barra de crédito */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Usado: {formatMoney(profile.creditUsed)}</span>
              <span>{creditPercent}%</span>
            </div>
            <div className="h-2 bg-[#333] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  creditPercent > 80 ? 'bg-red-500' :
                  creditPercent > 60 ? 'bg-yellow-500' :
                  'bg-[#5F6C4E]'
                }`}
                style={{ width: `${creditPercent}%` }}
              />
            </div>
          </div>
          {creditPercent > 80 && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Crédito casi agotado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueClass = 'text-gray-300',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
