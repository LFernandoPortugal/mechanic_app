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
      <div className="p-6 text-center rounded-xl border border-dashed border-slate-800 bg-[#111827]/40 text-slate-400 text-xs">
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
          bg-[#151E2B] border-[#263344] text-[#E5E7EB] dark:bg-[#151E2B] dark:border-[#263344]
          light:bg-white light:border-[#D8E1E8] light:text-[#17202A] light:shadow-sm
          ${onSelectBay ? 'cursor-pointer hover:border-emerald-500/50 hover:shadow-md' : ''}`}
        >
          {/* Header de Bahía */}
          <div className="flex items-center justify-between border-b pb-2 border-slate-800/80 dark:border-slate-800/80 light:border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 dark:text-emerald-400 light:bg-emerald-50 light:text-emerald-700">
                <Wrench className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700">
                {bay.bayName}
              </span>
            </div>
            <StatusBadge status={bay.status} size="sm" />
          </div>

          {/* Info del Vehículo */}
          <div className="mt-3 flex items-start justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-slate-400" />
                {bay.vehicleModel || 'Vehículo sin modelo'}
              </h4>
              {bay.licensePlate && (
                <span className="mt-0.5 inline-block text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 dark:bg-slate-800 light:bg-slate-100 light:text-slate-800 border border-slate-700/50">
                  {bay.licensePlate}
                </span>
              )}
            </div>

            {bay.elapsedTime && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {bay.elapsedTime}
              </div>
            )}
          </div>

          {/* Técnico y Progreso */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 dark:border-slate-800/60 light:border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">
                Técnico: <strong className="text-slate-200 dark:text-slate-200 light:text-slate-800">{bay.technicianName || 'Por asignar'}</strong>
              </span>
              {bay.progressPercentage !== undefined && (
                <span className="font-mono font-bold text-emerald-400 dark:text-emerald-400 light:text-emerald-600">
                  {bay.progressPercentage}%
                </span>
              )}
            </div>

            {bay.progressPercentage !== undefined && (
              <div className="w-full bg-slate-800 dark:bg-slate-800 light:bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
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
