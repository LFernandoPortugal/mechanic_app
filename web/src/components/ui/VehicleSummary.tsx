'use client';

import React from 'react';
import { StatusBadge } from './StatusBadge';
import { CheckCircle2, XCircle, ShieldCheck, Car, User, Camera, FileSignature, Droplet, Package } from 'lucide-react';

interface VehicleSummaryProps {
  plate: string;
  make?: string;
  model?: string;
  clientName?: string;
  status?: string;
  hasPhotos?: boolean;
  hasSignature?: boolean;
  fluidsOk?: boolean;
  hasValuables?: boolean;
  className?: string;
}

export const VehicleSummary: React.FC<VehicleSummaryProps> = ({
  plate,
  make,
  model,
  clientName,
  status = 'Reception',
  hasPhotos = false,
  hasSignature = false,
  fluidsOk = false,
  hasValuables = false,
  className = '',
}) => {
  return (
    <div 
      className={`rounded-xl border p-4 sm:p-5 sticky top-6
      bg-[#151E2B] border-[#263344] text-[#E5E7EB] dark:bg-[#151E2B] dark:border-[#263344]
      light:bg-white light:border-[#D8E1E8] light:text-[#17202A] light:shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between border-b pb-3 border-slate-800 dark:border-slate-800 light:border-slate-100">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Blindaje Legal Taller
        </span>
        <StatusBadge status={status} size="sm" showIcon={false} />
      </div>

      <div className="mt-4 space-y-3">
        {/* Vehículo */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-100 text-slate-300">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 block">Vehículo</span>
            <h5 className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 font-mono">
              {plate || 'Placa pendiente'}
            </h5>
            {(make || model) && (
              <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-600">
                {make} {model}
              </p>
            )}
          </div>
        </div>

        {/* Cliente */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-100 text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 block">Cliente</span>
            <h5 className="text-sm font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">
              {clientName || 'Sin registrar'}
            </h5>
          </div>
        </div>
      </div>

      {/* Checklist de Blindaje */}
      <div className="mt-5 pt-4 border-t border-slate-800 dark:border-slate-800 light:border-slate-100 space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
          Checklist de Recepción:
        </span>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-300 dark:text-slate-300 light:text-slate-700">
            <Camera className="w-3.5 h-3.5 text-slate-400" />
            Evidencias (Fotos)
          </span>
          {hasPhotos ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Registrado</span>
          ) : (
            <span className="flex items-center gap-1 text-slate-500"><XCircle className="w-3.5 h-3.5" /> Pendiente</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-300 dark:text-slate-300 light:text-slate-700">
            <FileSignature className="w-3.5 h-3.5 text-slate-400" />
            Firma Digital
          </span>
          {hasSignature ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Firmado</span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-semibold"><XCircle className="w-3.5 h-3.5" /> Requerido</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-300 dark:text-slate-300 light:text-slate-700">
            <Droplet className="w-3.5 h-3.5 text-slate-400" />
            Auditoría de Fluidos
          </span>
          {fluidsOk ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
          ) : (
            <span className="flex items-center gap-1 text-slate-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Verificado</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-300 dark:text-slate-300 light:text-slate-700">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            Declaración Objetos
          </span>
          {hasValuables ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Declarados</span>
          ) : (
            <span className="flex items-center gap-1 text-slate-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Revisado</span>
          )}
        </div>
      </div>
    </div>
  );
};
