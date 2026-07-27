'use client';

import React, { useState } from 'react';
import { Camera, Plus, Trash2, MapPin } from 'lucide-react';

export interface DamagePoint {
  id: string;
  view: 'front' | 'left' | 'right' | 'back';
  xPercentage: number;
  yPercentage: number;
  note: string;
  photoUrl?: string;
  severity: 'minor' | 'medium' | 'severe';
}

interface VehicleDamageReport2DProps {
  damagePoints: DamagePoint[];
  onChangeDamagePoints: (points: DamagePoint[]) => void;
  className?: string;
}

const VIEWS: { key: DamagePoint['view']; label: string }[] = [
  { key: 'front', label: 'Frente' },
  { key: 'left', label: 'Lateral Izquierdo' },
  { key: 'right', label: 'Lateral Derecho' },
  { key: 'back', label: 'Posterior' },
];

export const VehicleDamageReport2D: React.FC<VehicleDamageReport2DProps> = ({
  damagePoints,
  onChangeDamagePoints,
  className = '',
}) => {
  const [activeView, setActiveView] = useState<DamagePoint['view']>('left');
  const [newNote, setNewNote] = useState('');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const handleSVGClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPoint: DamagePoint = {
      id: Date.now().toString(),
      view: activeView,
      xPercentage: Math.round(x),
      yPercentage: Math.round(y),
      note: newNote || 'Daño marcado en carrocería',
      severity: 'minor',
    };

    onChangeDamagePoints([...damagePoints, newPoint]);
    setNewNote('');
    setSelectedPointId(newPoint.id);
  };

  const handleRemovePoint = (id: string) => {
    onChangeDamagePoints(damagePoints.filter((p) => p.id !== id));
    if (selectedPointId === id) setSelectedPointId(null);
  };

  const currentViewPoints = damagePoints.filter((p) => p.view === activeView);

  return (
    <div className={`rounded-xl border p-4 sm:p-5 bg-[#151E2B] border-[#263344] text-[#E5E7EB] dark:bg-[#151E2B] dark:border-[#263344] light:bg-white light:border-[#D8E1E8] light:text-[#17202A] ${className}`}>
      <div className="flex items-center justify-between border-b pb-3 border-slate-800 dark:border-slate-800 light:border-slate-100">
        <div>
          <h4 className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Vehicle Damage Report (Mapa de Daños 2D)
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
            Haz clic en la vista del vehículo para registrar rayones, hendiduras o abolladuras.
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-slate-800 text-emerald-400">
          {damagePoints.length} Daños Registrados
        </span>
      </div>

      {/* Selectores de Vista 2D */}
      <div className="mt-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setActiveView(v.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeView === v.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 dark:bg-slate-800/60 dark:text-slate-300 light:bg-slate-100 light:text-slate-700'
            }`}
          >
            {v.label} ({damagePoints.filter((p) => p.view === v.key).length})
          </button>
        ))}
      </div>

      {/* Canvas 2D interactivo con silueta de vehículo */}
      <div className="mt-4 relative w-full h-48 sm:h-64 rounded-xl border border-slate-800 bg-[#080C12] overflow-hidden flex items-center justify-center select-none">
        {/* SVG Silueta 2D según vista activeView */}
        <svg
          onClick={handleSVGClick}
          className="w-full h-full cursor-crosshair text-slate-700 hover:text-slate-600 transition-colors p-4"
          viewBox="0 0 400 200"
        >
          {activeView === 'left' || activeView === 'right' ? (
            // Silueta Lateral
            <path
              d="M 20 120 L 50 120 L 70 70 L 140 50 L 260 50 L 320 80 L 380 100 L 380 130 L 350 130 C 340 130 330 110 300 110 C 270 110 260 130 250 130 L 150 130 C 140 130 130 110 100 110 C 70 110 60 130 50 130 Z"
              fill="currentColor"
              stroke="#263344"
              strokeWidth="3"
            />
          ) : activeView === 'front' ? (
            // Silueta Frente
            <path
              d="M 60 150 L 60 90 L 80 50 L 320 50 L 340 90 L 340 150 C 340 160 320 160 300 160 L 100 160 C 80 160 60 160 60 150 Z M 90 60 L 310 60 L 290 90 L 110 90 Z"
              fill="currentColor"
              stroke="#263344"
              strokeWidth="3"
            />
          ) : (
            // Silueta Posterior
            <path
              d="M 60 150 L 60 90 L 80 50 L 320 50 L 340 90 L 340 150 C 340 160 320 160 300 160 L 100 160 C 80 160 60 160 60 150 Z M 100 65 L 300 65 L 285 95 L 115 95 Z"
              fill="currentColor"
              stroke="#263344"
              strokeWidth="3"
            />
          )}

          {/* Ruedas en silueta lateral */}
          {(activeView === 'left' || activeView === 'right') && (
            <>
              <circle cx="100" cy="130" r="22" fill="#111827" stroke="#3B82F6" strokeWidth="4" />
              <circle cx="300" cy="130" r="22" fill="#111827" stroke="#3B82F6" strokeWidth="4" />
            </>
          )}
        </svg>

        {/* Marcadores de Daño overlay */}
        {currentViewPoints.map((point, i) => (
          <button
            key={point.id}
            type="button"
            onClick={() => setSelectedPointId(point.id)}
            style={{ left: `${point.xPercentage}%`, top: `${point.yPercentage}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full font-mono text-xs font-bold flex items-center justify-center shadow-lg transition-transform hover:scale-125 ${
              selectedPointId === point.id
                ? 'bg-rose-500 text-white ring-4 ring-rose-500/40 z-20'
                : 'bg-amber-500 text-slate-950 z-10'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Lista de Puntos Registrados */}
      {currentViewPoints.length > 0 && (
        <div className="mt-4 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
            Puntos en vista {VIEWS.find((v) => v.key === activeView)?.label}:
          </span>
          <div className="space-y-1.5">
            {currentViewPoints.map((point, index) => (
              <div
                key={point.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-mono font-bold flex items-center justify-center text-[10px]">
                    {index + 1}
                  </span>
                  <span className="text-slate-200 font-medium">{point.note}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePoint(point.id)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
