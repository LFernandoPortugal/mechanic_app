export type JobStatusKey = 
  | 'reception'
  | 'diagnosis'
  | 'approval'
  | 'repair'
  | 'qc'
  | 'ready'
  | 'delivered'
  | 'critical';

export interface JobStatusConfig {
  key: JobStatusKey;
  label: string;
  description: string;
  iconName: string;
  dark: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
  };
  light: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
  };
}

export const JOB_STATUS_CONFIG: Record<JobStatusKey, JobStatusConfig> = {
  reception: {
    key: 'reception',
    label: 'Recepción',
    description: 'Vehículo ingresado al taller, checklist inicial y entrega de custodia.',
    iconName: 'LogIn',
    dark: {
      bg: '#00D08415',
      text: '#00D084',
      border: '#00D08440',
      badgeBg: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50',
    },
    light: {
      bg: '#00D08410',
      text: '#059669',
      border: '#00D08430',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  },
  diagnosis: {
    key: 'diagnosis',
    label: 'Diagnóstico',
    description: 'Técnico asignado evaluando sistemas e identificando fallas.',
    iconName: 'Search',
    dark: {
      bg: '#3B82F615',
      text: '#60A5FA',
      border: '#3B82F640',
      badgeBg: 'bg-blue-950/60 text-blue-400 border-blue-800/50',
    },
    light: {
      bg: '#3B82F610',
      text: '#2563EB',
      border: '#3B82F630',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  },
  approval: {
    key: 'approval',
    label: 'Cotización / Aprobación',
    description: 'Presupuesto enviado al cliente esperando confirmación de trabajo.',
    iconName: 'FileText',
    dark: {
      bg: '#F59E0B15',
      text: '#FBBF24',
      border: '#F59E0B40',
      badgeBg: 'bg-amber-950/60 text-amber-400 border-amber-800/50',
    },
    light: {
      bg: '#F59E0B10',
      text: '#D97706',
      border: '#F59E0B30',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  },
  repair: {
    key: 'repair',
    label: 'Reparación en Proceso',
    description: 'En bahía de trabajo con refacciones y mano de obra ejecutándose.',
    iconName: 'Wrench',
    dark: {
      bg: '#F9731615',
      text: '#FB923C',
      border: '#F9731640',
      badgeBg: 'bg-orange-950/60 text-orange-400 border-orange-800/50',
    },
    light: {
      bg: '#F9731610',
      text: '#EA580C',
      border: '#F9731630',
      badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    },
  },
  qc: {
    key: 'qc',
    label: 'Control de Calidad',
    description: 'Pruebas de ruta, verificación de torques y checklist de salida.',
    iconName: 'CheckCircle2',
    dark: {
      bg: '#8B5CF615',
      text: '#A78BFA',
      border: '#8B5CF640',
      badgeBg: 'bg-purple-950/60 text-purple-400 border-purple-800/50',
    },
    light: {
      bg: '#8B5CF610',
      text: '#7C3AED',
      border: '#8B5CF630',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  },
  ready: {
    key: 'ready',
    label: 'Listo para Entrega',
    description: 'Vehículo lavado, orden cerrada y preparado para recibir pago.',
    iconName: 'Flag',
    dark: {
      bg: '#22C55E15',
      text: '#4ADE80',
      border: '#22C55E40',
      badgeBg: 'bg-green-950/60 text-green-400 border-green-800/50',
    },
    light: {
      bg: '#22C55E10',
      text: '#16A34A',
      border: '#22C55E30',
      badgeBg: 'bg-green-50 text-green-700 border-green-200',
    },
  },
  delivered: {
    key: 'delivered',
    label: 'Entregado',
    description: 'Pago asentado, conformidad de cliente firmada y servicio finalizado.',
    iconName: 'CheckCheck',
    dark: {
      bg: '#64748B15',
      text: '#94A3B8',
      border: '#64748B40',
      badgeBg: 'bg-slate-900/60 text-slate-400 border-slate-700/50',
    },
    light: {
      bg: '#64748B10',
      text: '#475569',
      border: '#64748B30',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  },
  critical: {
    key: 'critical',
    label: 'Urgente / Crítico',
    description: 'Falla de seguridad grave o detalle imprevisto que requiere atención.',
    iconName: 'AlertTriangle',
    dark: {
      bg: '#EF444415',
      text: '#F87171',
      border: '#EF444440',
      badgeBg: 'bg-red-950/60 text-red-400 border-red-800/50',
    },
    light: {
      bg: '#EF444410',
      text: '#DC2626',
      border: '#EF444430',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
    },
  },
};

/**
 * Función auxiliar para obtener la configuración de un estado incluso si viene en minúsculas o mayúsculas
 */
export function getJobStatusConfig(status: string): JobStatusConfig {
  const normalized = (status || '').toLowerCase().trim();
  
  if (normalized.includes('recep')) return JOB_STATUS_CONFIG.reception;
  if (normalized.includes('diag')) return JOB_STATUS_CONFIG.diagnosis;
  if (normalized.includes('aprob') || normalized.includes('quote') || normalized.includes('coti')) return JOB_STATUS_CONFIG.approval;
  if (normalized.includes('repar') || normalized.includes('repair') || normalized.includes('proceso')) return JOB_STATUS_CONFIG.repair;
  if (normalized.includes('qc') || normalized.includes('calidad')) return JOB_STATUS_CONFIG.qc;
  if (normalized.includes('listo') || normalized.includes('ready')) return JOB_STATUS_CONFIG.ready;
  if (normalized.includes('entreg') || normalized.includes('delivered')) return JOB_STATUS_CONFIG.delivered;
  if (normalized.includes('critic') || normalized.includes('urgente')) return JOB_STATUS_CONFIG.critical;

  return JOB_STATUS_CONFIG.reception;
}
