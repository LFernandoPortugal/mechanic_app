'use client';

import React from 'react';
import { StatusBadge } from './StatusBadge';
import { Clock, Wrench, AlertCircle, Car } from 'lucide-react';

export interface LiveBay {
  id: string;
  bayName: string;
  vehicleModel?: string;
  licensePlate?: string;
  status: string;
  elapsedTime?: string;
  startTime?: string;
  reportedIssue?: string;
  technicianName?: string;
  progressPercentage?: number;
}

interface WorkshopLiveBoardProps {
  bays: LiveBay[];
  onSelectBay?: (bay: LiveBay) => void;
  className?: string;
}

export const WorkshopLiveBoard: React.FC<WorkshopLiveBoardProps> = ({
  bays,
  onSelectBay,
  className = '',
}) => {
  if (!bays || bays.length === 0) {
    return (
      <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-[#111827]/40 text-slate-500 dark:text-slate-400 text-xs">
        Sin bahías activas o vehículos en trabajo directo.
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {bays.map((bay) => (
        <div
          key={bay.id}
          onClick={() => onSelectBay && onSelectBay(bay)}
          className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-200
          bg-white border-slate-250 text-slate-900 shadow-sm
          dark:bg-[#151E2B] dark:border-[#263344] dark:text-[#E5E7EB]
          ${onSelectBay ? 'cursor-pointer hover:border-sky-500 dark:hover:border-emerald-500/50 hover:shadow-md' : ''}`}
        >
          {/* Header de Bahía */}
          <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Wrench className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {bay.bayName}
              </span>
            </div>
            <StatusBadge status={bay.status} size="sm" />
          </div>

          {/* Info del Vehículo & Placa */}
          <div className="mt-3 flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-sky-600 dark:text-slate-400 shrink-0" />
                {bay.vehicleModel || 'Vehículo sin modelo'}
              </h4>
              {bay.licensePlate && (
                <span className="mt-1 inline-block text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50">
                  {bay.licensePlate}
                </span>
              )}
            </div>

            {/* Tiempo e Ingreso */}
            <div className="text-right">
              {bay.elapsedTime && (
                <div className="flex items-center justify-end gap-1 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  {bay.elapsedTime}
                </div>
              )}
              {bay.startTime && (
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Ingreso: {bay.startTime}
                </div>
              )}
            </div>
          </div>

          {/* Problema Reportado */}
          {bay.reportedIssue && (
            <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800/60 text-xs">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Problema:</span>
              <p className="text-slate-800 dark:text-slate-300 truncate">{bay.reportedIssue}</p>
            </div>
          )}

          {/* Técnico y Progreso */}
          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                Técnico: <strong className="text-slate-900 dark:text-slate-200">{bay.technicianName || 'Por asignar'}</strong>
              </span>
              {bay.progressPercentage !== undefined && (
                <span className="font-mono font-bold text-sky-700 dark:text-emerald-400">
                  {bay.progressPercentage}%
                </span>
              )}
            </div>

            {bay.progressPercentage !== undefined && (
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-sky-600 dark:bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, bay.progressPercentage))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
