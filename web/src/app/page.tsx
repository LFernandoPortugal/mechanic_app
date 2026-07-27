'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_ROUTE_MAP, ROLE_META } from '@/types';
import { 
  ClipboardList, 
  Wrench, 
  DollarSign, 
  BarChart3, 
  ShieldCheck, 
  Package, 
  ArrowRight, 
  Settings, 
  Users2, 
  Crown,
  Car,
  AlertCircle,
  Activity,
  CheckCircle
} from 'lucide-react';
import { useRealtimeJobs } from '@/hooks/useRealtimeJobs';
import { MetricCard } from '@/components/ui/MetricCard';
import { WorkshopLiveBoard, LiveBay } from '@/components/ui/WorkshopLiveBoard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { JOB_STATUS_CONFIG } from '@/constants/statuses';

interface NavCard {
  href: string;
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  hoverBorder: string;
  hoverShadow: string;
  titleColor: string;
  accentBg: string;
}

const allCards: NavCard[] = [
  {
    href: '/reception',
    titleKey: 'reception',
    descKey: 'receptionDesc',
    icon: <ClipboardList className="w-6 h-6 text-emerald-400" />,
    hoverBorder: 'hover:border-emerald-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(0,208,132,0.12)]',
    titleColor: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
  },
  {
    href: '/technician',
    titleKey: 'technician',
    descKey: 'technicianDesc',
    icon: <Wrench className="w-6 h-6 text-blue-400" />,
    hoverBorder: 'hover:border-blue-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.12)]',
    titleColor: 'text-blue-400',
    accentBg: 'bg-blue-500/10 group-hover:bg-blue-500/20',
  },
  {
    href: '/advisor',
    titleKey: 'advisor',
    descKey: 'advisorDesc',
    icon: <DollarSign className="w-6 h-6 text-amber-400" />,
    hoverBorder: 'hover:border-amber-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]',
    titleColor: 'text-amber-400',
    accentBg: 'bg-amber-500/10 group-hover:bg-amber-500/20',
  },
  {
    href: '/advisor/payments',
    titleKey: 'payments',
    descKey: 'paymentsDesc',
    icon: <DollarSign className="w-6 h-6 text-green-400" />,
    hoverBorder: 'hover:border-green-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(34,197,94,0.12)]',
    titleColor: 'text-green-400',
    accentBg: 'bg-green-500/10 group-hover:bg-green-500/20',
  },
  {
    href: '/analytics',
    titleKey: 'analytics',
    descKey: 'analyticsDesc',
    icon: <BarChart3 className="w-6 h-6 text-purple-400" />,
    hoverBorder: 'hover:border-purple-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.12)]',
    titleColor: 'text-purple-400',
    accentBg: 'bg-purple-500/10 group-hover:bg-purple-500/20',
  },
  {
    href: '/inventory',
    titleKey: 'inventory',
    descKey: 'inventoryDesc',
    icon: <Package className="w-6 h-6 text-teal-400" />,
    hoverBorder: 'hover:border-teal-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(20,184,166,0.12)]',
    titleColor: 'text-teal-400',
    accentBg: 'bg-teal-500/10 group-hover:bg-teal-500/20',
  },
  {
    href: '/admin/settings',
    titleKey: 'settings',
    descKey: 'settingsDesc',
    icon: <Settings className="w-6 h-6 text-indigo-400" />,
    hoverBorder: 'hover:border-indigo-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.12)]',
    titleColor: 'text-indigo-400',
    accentBg: 'bg-indigo-500/10 group-hover:bg-indigo-500/20',
  },
  {
    href: '/clients',
    titleKey: 'clientDatabase',
    descKey: 'clientDatabaseDesc',
    icon: <Users2 className="w-6 h-6 text-cyan-400" />,
    hoverBorder: 'hover:border-cyan-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.12)]',
    titleColor: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10 group-hover:bg-cyan-500/20',
  },
  {
    href: '/qc',
    titleKey: 'qc',
    descKey: 'qcDesc',
    icon: <ShieldCheck className="w-6 h-6 text-pink-400" />,
    hoverBorder: 'hover:border-pink-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.12)]',
    titleColor: 'text-pink-400',
    accentBg: 'bg-pink-500/10 group-hover:bg-pink-500/20',
  },
  {
    href: '/super-admin',
    titleKey: 'superAdmin',
    descKey: 'superAdminDesc',
    icon: <Crown className="w-6 h-6 text-red-500" />,
    hoverBorder: 'hover:border-red-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.12)]',
    titleColor: 'text-red-500',
    accentBg: 'bg-red-500/10 group-hover:bg-red-500/20',
  },
];

export default function Home() {
  const { t } = useLanguage();
  const { user, userProfile, workshopSettings, hasAnyRole, hasRole, loading } = useAuth();
  
  const isAdmin = hasRole('ADMIN');
  const { jobs } = useRealtimeJobs({ all: isAdmin });

  const visibleCards = user && userProfile
    ? allCards.filter((card) => {
        const requiredRoles = ROLE_ROUTE_MAP[card.href];
        if (!requiredRoles) return true;
        return hasAnyRole(requiredRoles);
      })
    : allCards.filter((card) => card.href !== '/super-admin');

  // Cálculos para KPIs en vivo
  const activeJobs = jobs.filter(j => j.status !== 'Delivered');
  const receptionCount = jobs.filter(j => j.status === 'Reception').length;
  const diagnosisCount = jobs.filter(j => j.status === 'Diagnosis').length;
  const approvalCount = jobs.filter(j => j.status === 'Approval' || j.status === 'Approved').length;
  const repairCount = jobs.filter(j => j.status === 'Repair').length;
  const qcCount = jobs.filter(j => j.status === 'QC').length;
  const readyCount = jobs.filter(j => j.status === 'Ready').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRevenue = jobs.reduce((sum, job) => {
    if (!job.payments) return sum;
    const jobPaymentsToday = job.payments
      .filter(p => p.date && p.date.startsWith(todayStr))
      .reduce((s, p) => s + p.amount, 0);
    return sum + jobPaymentsToday;
  }, 0);

  // Mapear bahías en vivo
  const liveBays: LiveBay[] = jobs
    .filter(j => j.status === 'Repair' || j.status === 'Diagnosis')
    .slice(0, 6)
    .map((j, idx) => ({
      id: j.id,
      bayName: `Bahía ${String(idx + 1).padStart(2, '0')}`,
      vehicleModel: (j.make || j.model) ? `${j.make || ''} ${j.model || ''}`.trim() : 'Vehículo',
      licensePlate: j.vehicleId || j.vin || 'N/A',
      status: j.status,
      technicianName: j.technicianId || 'Técnico asignado',
      elapsedTime: 'En bahía',
      progressPercentage: j.status === 'Repair' ? 75 : 30,
    }));

  return (
    <div className="min-h-screen page-bg text-foreground flex flex-col items-center justify-start px-4 py-8 sm:py-12">
      {/* Hero / Brand Header */}
      <div className="text-center mb-8 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          SGA Garage Command Center
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 tracking-tight leading-tight">
          {workshopSettings?.workshopName || t('appTitle')}
        </h1>
        <p className="text-slate-400 dark:text-slate-400 light:text-slate-600 text-sm sm:text-base mt-2 max-w-xl mx-auto">
          {t('appSubtitle')}
        </p>
      </div>

      {/* Role badges */}
      {userProfile && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {userProfile.roles.map((role) => {
            const meta = ROLE_META[role];
            return (
              <span key={role} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${meta.color}`}>
                {meta.emoji} {t(meta.labelKey)}
              </span>
            );
          })}
        </div>
      )}

      {/* GARAGE COMMAND CENTER: KPIs & Live Board */}
      {user && (
        <div className="w-full max-w-6xl mb-10 space-y-6">
          {/* Header de la consola de control */}
          <div className="flex items-center justify-between border-b pb-3 border-slate-800 dark:border-slate-800 light:border-slate-200">
            <h2 className="text-lg font-bold text-slate-100 dark:text-slate-100 light:text-slate-800 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Estado del Taller en Vivo
            </h2>
            <div className="flex items-center gap-2">
              <StatusBadge status="reception" customLabel={`${activeJobs.length} Activos`} showPulse size="sm" />
            </div>
          </div>

          {/* Grid de Métricas Principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Vehículos Activos"
              value={activeJobs.length}
              subtitle="En flujo de trabajo"
              icon={Car}
              statusColor={JOB_STATUS_CONFIG.reception.dark.text}
            />
            <MetricCard
              title="Diagnósticos Pendientes"
              value={diagnosisCount}
              subtitle="Evaluación en taller"
              icon={Wrench}
              statusColor={JOB_STATUS_CONFIG.diagnosis.dark.text}
            />
            <MetricCard
              title="Cotizaciones Esperando"
              value={approvalCount}
              subtitle="Aprobación de cliente"
              icon={DollarSign}
              statusColor={JOB_STATUS_CONFIG.approval.dark.text}
            />
            <MetricCard
              title="Ingresos del Día"
              value={`${workshopSettings?.currencySymbol || '$'}${todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              subtitle="Cobros procesados hoy"
              icon={CheckCircle}
              statusColor={JOB_STATUS_CONFIG.ready.dark.text}
            />
          </div>

          {/* Pipeline Visual Interactivo */}
          <div className="rounded-xl border p-4 sm:p-5 bg-[#151E2B] border-[#263344] dark:bg-[#151E2B] dark:border-[#263344] light:bg-white light:border-[#D8E1E8]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">
              Pipeline de Vehículos por Etapa:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <Link href="/reception" className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-center">
                <span className="text-[11px] text-emerald-400 font-semibold block">Recepción</span>
                <span className="text-xl font-bold font-mono text-slate-100">{receptionCount}</span>
              </Link>
              <Link href="/technician" className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors text-center">
                <span className="text-[11px] text-blue-400 font-semibold block">Diagnóstico</span>
                <span className="text-xl font-bold font-mono text-slate-100">{diagnosisCount}</span>
              </Link>
              <Link href="/advisor" className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors text-center">
                <span className="text-[11px] text-amber-400 font-semibold block">Cotización</span>
                <span className="text-xl font-bold font-mono text-slate-100">{approvalCount}</span>
              </Link>
              <Link href="/technician" className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-colors text-center">
                <span className="text-[11px] text-orange-400 font-semibold block">Reparación</span>
                <span className="text-xl font-bold font-mono text-slate-100">{repairCount}</span>
              </Link>
              <Link href="/qc" className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors text-center">
                <span className="text-[11px] text-purple-400 font-semibold block">QC</span>
                <span className="text-xl font-bold font-mono text-slate-100">{qcCount}</span>
              </Link>
              <Link href="/advisor/payments" className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-colors text-center">
                <span className="text-[11px] text-green-400 font-semibold block">Entrega</span>
                <span className="text-xl font-bold font-mono text-slate-100">{readyCount}</span>
              </Link>
            </div>
          </div>

          {/* Taller en Vivo: Bahías activas */}
          {liveBays.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300 dark:text-slate-300 light:text-slate-700 uppercase tracking-wider">
                Bahías Operativas en Tiempo Real
              </h3>
              <WorkshopLiveBoard bays={liveBays} />
            </div>
          )}
        </div>
      )}

      {/* Grid de Accesos Directos Módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full max-w-6xl">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group relative flex flex-col p-5 rounded-xl border transition-all duration-300 hover:-translate-y-1
            bg-[#151E2B] border-[#263344] text-[#E5E7EB] dark:bg-[#151E2B] dark:border-[#263344]
            light:bg-white light:border-[#D8E1E8] light:text-[#17202A] light:shadow-sm ${card.hoverBorder} ${card.hoverShadow}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 ${card.accentBg}`}>
              {card.icon}
            </div>
            <h2 className={`text-base font-bold mb-1 ${card.titleColor}`}>{t(card.titleKey)}</h2>
            <p className="text-slate-400 dark:text-slate-400 light:text-slate-600 text-xs flex-1 leading-relaxed">{t(card.descKey)}</p>
            <div className={`mt-4 flex items-center gap-1 text-xs font-semibold opacity-80 group-hover:opacity-100 transition-opacity ${card.titleColor}`}>
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}

        {hasRole('ADMIN') && (
          <Link
            href="/admin/users"
            className="group relative flex flex-col p-5 rounded-xl border border-[#263344] bg-[#151E2B] hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.12)] transition-all duration-300 hover:-translate-y-1 light:bg-white light:border-[#D8E1E8]"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-purple-500/10 group-hover:bg-purple-500/20 transition-all duration-300">
              <ShieldCheck className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-base font-bold mb-1 text-purple-400">{t('userManagement')}</h2>
            <p className="text-slate-400 dark:text-slate-400 light:text-slate-600 text-xs flex-1 leading-relaxed">{t('userManagementDesc')}</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold opacity-80 group-hover:opacity-100 transition-opacity text-purple-400">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        )}
      </div>

      {!user && !loading && (
        <p className="mt-10 text-slate-400 text-sm">
          <Link href="/login" className="text-emerald-400 hover:underline font-semibold">{t('loginPrompt')}</Link> {t('loginPromptSuffix')}
        </p>
      )}
    </div>
  );
}
