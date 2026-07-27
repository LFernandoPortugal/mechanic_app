'use client';

import React from 'react';
import { StatusBadge } from './StatusBadge';
import { JobStatusKey } from '@/constants/statuses';

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  status?: JobStatusKey | string;
  author?: string;
  badgeText?: string;
}

interface VehicleTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export const VehicleTimeline: React.FC<VehicleTimelineProps> = ({
  events,
  className = '',
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-xs text-slate-500 py-4 text-center">
        No hay eventos registrados en el expediente.
      </div>
    );
  }

  return (
    <div className={`relative pl-4 border-l-2 border-slate-800 dark:border-slate-800 light:border-slate-200 space-y-6 ${className}`}>
      {events.map((event) => (
        <div key={event.id} className="relative group">
          {/* Dot en el eje vertical */}
          <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500 group-hover:scale-125 transition-transform" />
          
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
              {event.date}
            </span>
            {event.status && (
              <StatusBadge status={event.status} size="sm" showIcon={false} />
            )}
            {event.badgeText && !event.status && (
              <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-300 dark:bg-slate-800 light:bg-slate-100 light:text-slate-700">
                {event.badgeText}
              </span>
            )}
          </div>

          <h5 className="mt-1 text-sm font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">
            {event.title}
          </h5>

          {event.description && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed">
              {event.description}
            </p>
          )}

          {event.author && (
            <p className="mt-1 text-[11px] text-slate-500 italic">
              Por: {event.author}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
