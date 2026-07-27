'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string | number;
    isPositive?: boolean;
  };
  statusColor?: string; // Hex color opcional para acentos
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  statusColor,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border p-4 sm:p-5 transition-all duration-200 
      bg-[#151E2B] border-[#263344] text-[#E5E7EB] dark:bg-[#151E2B] dark:border-[#263344] dark:text-[#E5E7EB]
      light:bg-white light:border-[#D8E1E8] light:text-[#17202A] light:shadow-sm
      ${onClick ? 'cursor-pointer hover:border-emerald-500/50 hover:shadow-md hover:-translate-y-0.5' : ''} ${className}`}
    >
      {/* Barra superior con color de estado opcional */}
      {statusColor && (
        <div 
          className="absolute top-0 left-0 right-0 h-1" 
          style={{ backgroundColor: statusColor }}
        />
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-400 light:text-slate-500">
          {title}
        </span>
        {Icon && (
          <div 
            className="p-2 rounded-lg bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-100 text-emerald-400 dark:text-emerald-400 light:text-emerald-600"
            style={statusColor ? { color: statusColor, backgroundColor: `${statusColor}15` } : undefined}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono">
          {value}
        </div>
        {trend && (
          <span 
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.isPositive 
                ? 'bg-emerald-500/10 text-emerald-400 dark:text-emerald-400 light:bg-emerald-50 light:text-emerald-700' 
                : 'bg-rose-500/10 text-rose-400 dark:text-rose-400 light:bg-rose-50 light:text-rose-700'
            }`}
          >
            {trend.isPositive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
};
