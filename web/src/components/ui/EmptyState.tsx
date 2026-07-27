'use client';

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div 
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed 
      border-slate-800 bg-[#111827]/50 text-slate-300 dark:border-slate-800 dark:bg-[#111827]/50 dark:text-slate-300
      light:border-slate-300 light:bg-slate-50/50 light:text-slate-700 ${className}`}
    >
      <div className="p-3 rounded-full bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-200 text-slate-400 light:text-slate-600 mb-3">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-semibold tracking-wide">{title}</h4>
      {description && (
        <p className="mt-1 text-sm text-slate-400 dark:text-slate-400 light:text-slate-500 max-w-sm">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
