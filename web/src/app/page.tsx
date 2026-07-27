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
  Activity,
  CheckCircle,
  Building2,
  SlidersHorizontal,
  Clock,
  Layers
} from 'lucide-react';
import { useRealtimeJobs } from '@/hooks/useRealtimeJobs';
import { MetricCard } from '@/components/ui/MetricCard';
import { WorkshopLiveBoard, LiveBay } from '@/components/ui/WorkshopLiveBoard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { JOB_STATUS_CONFIG } from '@/constants/statuses';

interface ModuleCard {
  href: string;
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  borderStyle: string;
  titleColor: string;
  accentBg: string;
}

// 1. Operación Diaria del Taller
const operationalModules: ModuleCard[] = [
  {
    href: '/reception',
    titleKey: 'reception',
    descKey: 'receptionDesc',
    icon: <ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    borderStyle: 'hover:border-emerald-500/60',
    titleColor: 'text-emerald-700 dark:text-emerald-400',
    accentBg: 'bg-emerald-100 dark:bg-emerald-500/10',
  },
  {
    href: '/technician',
    titleKey: 'technician',
    descKey: 'technicianDesc',
    icon: <Wrench className="w-5 h-5 text-sky-600 dark:text-blue-400" />,
    borderStyle: 'hover:border-sky-500/60',
    titleColor: 'text-sky-700 dark:text-blue-400',
    accentBg: 'bg-sky-100 dark:bg-blue-500/10',
  },
  {
    href: '/advisor',
    titleKey: 'advisor',
    descKey: 'advisorDesc',
    icon: <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    borderStyle: 'hover:border-amber-500/60',
    titleColor: 'text-amber-700 dark:text-amber-400',
    accentBg: 'bg-amber-100 dark:bg-amber-500/10',
  },
  {
    href: '/qc',
    titleKey: 'qc',
    descKey: 'qcDesc',
    icon: <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
    borderStyle: 'hover:border-purple-500/60',
    titleColor: 'text-purple-700 dark:text-purple-400',
    accentBg: 'bg-purple-100 dark:bg-purple-500/10',
  },
  {
    href: '/advisor/payments',
    titleKey: 'payments',
    descKey: 'paymentsDesc',
    icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-green-400" />,
    borderStyle: 'hover:border-emerald-500/60',
    titleColor: 'text-emerald-700 dark:text-green-400',
    accentBg: 'bg-emerald-100 dark:bg-green-500/10',
  },
];

// 2. Gestión Empresarial & Administración
const managementModules: ModuleCard[] = [
  {
    href: '/clients',
    titleKey: 'clientDatabase',
    descKey: 'clientDatabaseDesc',
    icon: <Users2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
    borderStyle: 'hover:border-cyan-500/60',
    titleColor: 'text-cyan-700 dark:text-cyan-400',
    accentBg: 'bg-cyan-100 dark:bg-cyan-500/10',
  },
  {
    href: '/inventory',
    titleKey: 'inventory',
    descKey: 'inventoryDesc',
    icon: <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
    borderStyle: 'hover:border-teal-500/60',
    titleColor: 'text-teal-700 dark:text-teal-400',
    accentBg: 'bg-teal-100 dark:bg-teal-500/10',
  },
  {
    href: '/analytics',
    titleKey: 'analytics',
    descKey: 'analyticsDesc',
    icon: <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
    borderStyle: 'hover:border-indigo-500/60',
    titleColor: 'text-indigo-700 dark:text-indigo-400',
    accentBg: 'bg-indigo-100 dark:bg-indigo-500/10',
  },
  {
    href: '/admin/settings',
    titleKey: 'settings',
    descKey: 'settingsDesc',
    icon: <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
    borderStyle: 'hover:border-slate-500/60',
    titleColor: 'text-slate-800 dark:text-slate-300',
    accentBg: 'bg-slate-200 dark:bg-slate-800',
  },
];

export default function Home() {
  const { t } = useLanguage();
  const { user, userProfile, workshopSettings, hasAnyRole, hasRole, loading } = useAuth();
  
  const isAdmin = hasRole('ADMIN');
  const { jobs } = useRealtimeJobs({ all: isAdmin });

  const filterModules = (modules: ModuleCard[]) => {
    if (!user || !userProfile) return modules;
    return modules.filter((mod) => {
      const requiredRoles = ROLE_ROUTE_MAP[mod.href];
      if (!requiredRoles) return true;
      return hasAnyRole(requiredRoles);
    });
  };

  const visibleOps = filterModules(operationalModules);
  const visibleMgmt = filterModules(managementModules);

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

  // Mapear bahías en vivo con contexto completo del vehículo
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
      elapsedTime: '45 min',
      startTime: '09:30 AM',
      reportedIssue: j.symptoms || 'Mantenimiento / Falla mecánica',
      progressPercentage: j.status === 'Repair' ? 75 : 30,
    }));

  return (
    <div className="min-h-screen page-bg text-slate-900 dark:text-slate-100 flex flex-col items-center justify-start px-4 sm:px-6 py-6 sm:py-8">
      {/* 1. Multi-Tenant Header: Taller como protagonista, SGA como plataforma */}
      <div className="w-full max-w-6xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-300 dark:bg-[#151E2B] dark:border-[#263344] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-600 dark:bg-emerald-500 text-white dark:text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
            {workshopSettings?.workshopName ? workshopSettings.workshopName.charAt(0).toUpperCase() : <Building2 className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {workshopSettings?.workshopName || 'Taller Automotriz'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-100 text-sky-800 dark:bg-emerald-950 dark:text-emerald-400 border border-sky-300 dark:border-emerald-800">
                Centro Operativo
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs font-medium mt-0.5">
              Panel de control y gestión en tiempo real
            </p>
          </div>
        </div>

        {/* SGA Platform Badge */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {userProfile && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600 dark:text-emerald-400" />
              {userProfile.roles.map(r => ROLE_META[r]?.emoji).join(' ')} {userProfile.roles.join(', ')}
            </div>
          )}
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 tracking-wider">
            Powered by <strong className="text-sky-700 dark:text-emerald-400 font-extrabold">SGA OS</strong>
          </span>
        </div>
      </div>

      {/* 2. GARAGE COMMAND CENTER: Live Dashboard & Operational Bays */}
      {user && (
        <div className="w-full max-w-6xl mb-8 space-y-6">
          {/* Grid de Métricas Principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <MetricCard
              title="Vehículos Activos"
              value={activeJobs.length}
              subtitle="En flujo de trabajo"
              icon={Car}
              statusColor={JOB_STATUS_CONFIG.reception.light.text}
            />
            <MetricCard
              title="Diagnósticos Pendientes"
              value={diagnosisCount}
              subtitle="Evaluación en taller"
              icon={Wrench}
              statusColor={JOB_STATUS_CONFIG.diagnosis.light.text}
            />
            <MetricCard
              title="Cotizaciones Esperando"
              value={approvalCount}
              subtitle="Aprobación de cliente"
              icon={DollarSign}
              statusColor={JOB_STATUS_CONFIG.approval.light.text}
            />
            <MetricCard
              title="Ingresos del Día"
              value={`${workshopSettings?.currencySymbol || '$'}${todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              subtitle="Cobros procesados hoy"
              icon={CheckCircle}
              statusColor={JOB_STATUS_CONFIG.ready.light.text}
            />
          </div>

          {/* Pipeline Visual Interactivo de Alta Densidad */}
          <div className="rounded-xl border p-4 bg-white border-slate-300 dark:bg-[#151E2B] dark:border-[#263344] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600 dark:text-emerald-400" />
                Pipeline de Vehículos por Etapa
              </span>
              <StatusBadge status="reception" customLabel={`${activeJobs.length} En Proceso`} showPulse size="sm" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <Link href="/reception" className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 text-center transition-colors">
                <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-bold block">Recepción</span>
                <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">{receptionCount}</span>
              </Link>
              <Link href="/technician" className="p-2.5 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 dark:border-blue-500/30 dark:bg-blue-500/10 text-center transition-colors">
                <span className="text-[11px] text-sky-800 dark:text-blue-400 font-bold block">Diagnóstico</span>
                <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">{diagnosisCount}</span>
              </Link>
              <Link href="/advisor" className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 text-center transition-colors">
                <span className="text-[11px] text-amber-800 dark:text-amber-400 font-bold block">Cotización</span>
                <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">{approvalCount}</span>
              </Link>
              <Link href="/technician" className="p-2.5 rounded-lg border border-orange-300 bg-orange-50 hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 text-center transition-colors">
                <span className="text-[11px] text-orange-800 dark:text-orange-400 font-bold block">Reparación</span>
                <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">{repairCount}</span>
              </Link>
              <Link href="/qc" className="p-2.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 dark:border-purple-500/30 dark:bg-purple-500/10 text-center transition-colors">
                <span className="text-[11px] text-purple-800 dark:text-purple-400 font-bold block">QC</span>
                <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">{qcCount}</span>
              </Link>
              <Link href="/advisor/payments" className="p-2.5 rounded-lg border border-green-300 bg-green-50 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 text-center transition-colors">
                <span className="text-[11px] text-green-800 dark:text-green-400 font-bold block">Entrega</span>
                <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">{readyCount}</span>
              </Link>
            </div>
          </div>

          {/* Taller en Vivo: Bahías activas */}
          {liveBays.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-600 dark:text-emerald-400 animate-pulse" />
                  Bahías Operativas en Tiempo Real
                </h3>
              </div>
              <WorkshopLiveBoard bays={liveBays} />
            </div>
          )}
        </div>
      )}

      {/* 3. Módulos Separados: Operación Diaria vs Gestión Empresarial */}
      <div className="w-full max-w-6xl space-y-8">
        {/* BLOQUE 1: Operación Diaria */}
        {visibleOps.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2 border-slate-300 dark:border-slate-800">
              <Wrench className="w-4 h-4 text-sky-600 dark:text-emerald-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Operación Diaria del Taller
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {visibleOps.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`group relative flex flex-col p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5
                  bg-white border-slate-300 text-slate-900 shadow-sm
                  dark:bg-[#151E2B] dark:border-[#263344] dark:text-[#E5E7EB] ${card.borderStyle}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-colors ${card.accentBg}`}>
                    {card.icon}
                  </div>
                  <h3 className={`text-sm font-bold mb-1 ${card.titleColor}`}>{t(card.titleKey)}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs flex-1 leading-snug">{t(card.descKey)}</p>
                  <div className={`mt-3 flex items-center gap-1 text-[11px] font-bold ${card.titleColor}`}>
                    <span>Acceder</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* BLOQUE 2: Gestión & Administración */}
        {visibleMgmt.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2 border-slate-300 dark:border-slate-800">
              <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Gestión Empresarial & Administración
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {visibleMgmt.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`group relative flex flex-col p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5
                  bg-white border-slate-300 text-slate-900 shadow-sm
                  dark:bg-[#151E2B] dark:border-[#263344] dark:text-[#E5E7EB] ${card.borderStyle}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-colors ${card.accentBg}`}>
                    {card.icon}
                  </div>
                  <h3 className={`text-sm font-bold mb-1 ${card.titleColor}`}>{t(card.titleKey)}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs flex-1 leading-snug">{t(card.descKey)}</p>
                  <div className={`mt-3 flex items-center gap-1 text-[11px] font-bold ${card.titleColor}`}>
                    <span>Acceder</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}

              {hasRole('ADMIN') && (
                <Link
                  href="/admin/users"
                  className="group relative flex flex-col p-4 rounded-xl border border-slate-300 bg-white hover:border-purple-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 dark:bg-[#151E2B] dark:border-[#263344]"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-purple-100 dark:bg-purple-500/10">
                    <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-sm font-bold mb-1 text-purple-700 dark:text-purple-400">{t('userManagement')}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs flex-1 leading-snug">{t('userManagementDesc')}</p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-400">
                    <span>Acceder</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}
      </div>

      {!user && !loading && (
        <p className="mt-10 text-slate-600 dark:text-slate-400 text-sm">
          <Link href="/login" className="text-sky-700 dark:text-emerald-400 hover:underline font-bold">{t('loginPrompt')}</Link> {t('loginPromptSuffix')}
        </p>
      )}
    </div>
  );
}
