'use client';

import React from 'react';
import { getJobStatusConfig, JobStatusKey } from '@/constants/statuses';
import { 
  LogIn, 
  Search, 
  FileText, 
  Wrench, 
  CheckCircle2, 
  Flag, 
  CheckCheck, 
  AlertTriangle,
  LucideIcon 
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LogIn,
  Search,
  FileText,
  Wrench,
  CheckCircle2,
  Flag,
  CheckCheck,
  AlertTriangle,
};

interface StatusBadgeProps {
  status: JobStatusKey | string;
  showIcon?: boolean;
  showPulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  customLabel?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  showPulse = false,
  size = 'md',
  customLabel,
  className = '',
}) => {
  const config = getJobStatusConfig(status);
  const IconComponent = ICON_MAP[config.iconName] || Wrench;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs sm:text-sm gap-1.5 font-medium',
    lg: 'px-3.5 py-1.5 text-sm gap-2 font-semibold',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
    lg: 'w-4 h-4 sm:w-5 sm:h-5',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-all duration-200 ${sizeClasses} ${config.dark.badgeBg} dark:${config.dark.badgeBg} light:${config.light.badgeBg} ${className}`}
      style={{
        borderColor: 'currentColor',
      }}
    >
      {showPulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {showIcon && <IconComponent className={iconSizes} />}
      <span>{customLabel || config.label}</span>
    </span>
  );
};
