"use client";

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_BADGE_CLASSES, ROLE_ROUTE_MAP, ROLE_META } from '@/types';
import { ClipboardList, Wrench, DollarSign, BarChart3, ShieldCheck, Package, ArrowRight, Settings, Users2, Crown } from 'lucide-react';
import { useRealtimeJobs } from '@/hooks/useRealtimeJobs';

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
    icon: <ClipboardList className="w-7 h-7 text-emerald-400" />,
    hoverBorder: 'hover:border-emerald-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.12)]',
    titleColor: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
  },
  {
    href: '/technician',
    titleKey: 'technician',
    descKey: 'technicianDesc',
    icon: <Wrench className="w-7 h-7 text-orange-400" />,
    hoverBorder: 'hover:border-orange-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.12)]',
    titleColor: 'text-orange-400',
    accentBg: 'bg-orange-500/10 group-hover:bg-orange-500/20',
  },
  {
    href: '/advisor',
    titleKey: 'advisor',
    descKey: 'advisorDesc',
    icon: <DollarSign className="w-7 h-7 text-blue-400" />,
    hoverBorder: 'hover:border-blue-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.12)]',
    titleColor: 'text-blue-400',
    accentBg: 'bg-blue-500/10 group-hover:bg-blue-500/20',
  },
  {
    href: '/advisor/payments',
    titleKey: 'payments',
    descKey: 'paymentsDesc',
    icon: <DollarSign className="w-7 h-7 text-green-400" />,
    hoverBorder: 'hover:border-green-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(34,197,94,0.12)]',
    titleColor: 'text-green-400',
    accentBg: 'bg-green-500/10 group-hover:bg-green-500/20',
  },
  {
    href: '/analytics',
    titleKey: 'analytics',
    descKey: 'analyticsDesc',
    icon: <BarChart3 className="w-7 h-7 text-purple-400" />,
    hoverBorder: 'hover:border-purple-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.12)]',
    titleColor: 'text-purple-400',
    accentBg: 'bg-purple-500/10 group-hover:bg-purple-500/20',
  },
  {
    href: '/inventory',
    titleKey: 'inventory',
    descKey: 'inventoryDesc',
    icon: <Package className="w-7 h-7 text-teal-400" />,
    hoverBorder: 'hover:border-teal-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(20,184,166,0.12)]',
    titleColor: 'text-teal-400',
    accentBg: 'bg-teal-500/10 group-hover:bg-teal-500/20',
  },
  {
    href: '/admin/settings',
    titleKey: 'settings',
    descKey: 'settingsDesc',
    icon: <Settings className="w-7 h-7 text-indigo-400" />,
    hoverBorder: 'hover:border-indigo-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.12)]',
    titleColor: 'text-indigo-400',
    accentBg: 'bg-indigo-500/10 group-hover:bg-indigo-500/20',
  },
  {
    href: '/clients',
    titleKey: 'clientDatabase',
    descKey: 'clientDatabaseDesc',
    icon: <Users2 className="w-7 h-7 text-cyan-400" />,
    hoverBorder: 'hover:border-cyan-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.12)]',
    titleColor: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10 group-hover:bg-cyan-500/20',
  },
  {
    href: '/qc',
    titleKey: 'qc',
    descKey: 'qcDesc',
    icon: <ShieldCheck className="w-7 h-7 text-pink-400" />,
    hoverBorder: 'hover:border-pink-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.12)]',
    titleColor: 'text-pink-400',
    accentBg: 'bg-pink-500/10 group-hover:bg-pink-500/20',
  },
  {
    href: '/super-admin',
    titleKey: 'superAdmin',
    descKey: 'superAdminDesc',
    icon: <Crown className="w-7 h-7 text-red-500" />,
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

  return (
    <div className="min-h-screen page-bg text-foreground flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 mb-3 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)] leading-tight">
          {t('appTitle')}
        </h1>
        <p className="text-muted-foreground text-lg">{t('appSubtitle')}</p>
      </div>

      {/* Role badges */}
      {userProfile && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {userProfile.roles.map((role) => {
            const meta = ROLE_META[role];
            return (
              <span key={role} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${ROLE_BADGE_CLASSES[role]}`}>
                {meta.emoji} {t(meta.labelKey)}
              </span>
            );
          })}
        </div>
      )}

      {/* Real-time KPI Dashboard for Admins */}
      {isAdmin && jobs.length > 0 && (
        <div className="w-full max-w-5xl mb-10 animate-fade-in space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Vista General del Taller (En Vivo)
            </h2>
            <span className="text-[11px] text-muted-foreground bg-zinc-900/60 dark:bg-black/30 border border-border/40 px-2.5 py-0.5 rounded font-mono">
              {jobs.filter(j => j.status !== 'Delivered').length} Vehículos Activos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Daily Revenue Card */}
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-emerald-500 flex flex-col justify-between hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-300 hover:-translate-y-0.5">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ingresos de Hoy</p>
                <h3 className="text-3xl font-black text-emerald-400 mt-2 font-mono">
                  {workshopSettings?.currencySymbol || "$"}{(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    return jobs.reduce((sum, job) => {
                      if (!job.payments) return sum;
                      const jobPaymentsToday = job.payments
                        .filter(p => p.date && p.date.startsWith(todayStr))
                        .reduce((s, p) => s + p.amount, 0);
                      return sum + jobPaymentsToday;
                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </h3>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/20">
                Suma total de cobros realizados hoy
              </p>
            </div>

            {/* Shop Occupancy Card */}
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-orange-500 flex flex-col justify-between hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-all duration-300 hover:-translate-y-0.5">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ocupación</p>
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className="text-3xl font-black text-orange-400 font-mono">
                    {jobs.filter(j => j.status !== 'Delivered' && j.status !== 'Ready').length}
                  </h3>
                  <span className="text-xs text-muted-foreground font-light">vehículos en taller</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/20">
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.min(100, (jobs.filter(j => j.status !== 'Delivered' && j.status !== 'Ready').length / 12) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Actions Required Card */}
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-blue-500 flex flex-col justify-between hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300 hover:-translate-y-0.5">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Atención Requerida</p>
                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-light">Sin Técnico:</span>
                    <span className="font-bold text-blue-400 font-mono bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-500/20">
                      {jobs.filter(j => !j.technicianId && j.status !== 'Delivered').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-light">Esperando Cotización:</span>
                    <span className="font-bold text-amber-400 font-mono bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/20">
                      {jobs.filter(j => j.status === 'Diagnosis').length}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/20">
                Órdenes que requieren acción inmediata
              </p>
            </div>
          </div>

          {/* Quick status breakdown bar */}
          <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between text-xs border border-border/40">
            <span className="font-bold text-muted-foreground uppercase tracking-widest text-[9px]">Pipeline Operativo:</span>
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-1.5 bg-zinc-900/60 dark:bg-black/30 px-2.5 py-1 rounded border border-border/40 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Recepción: <strong className="font-bold font-mono text-amber-400 ml-0.5">{jobs.filter(j => j.status === 'Reception').length}</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-zinc-900/60 dark:bg-black/30 px-2.5 py-1 rounded border border-border/40 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Diagnóstico: <strong className="font-bold font-mono text-blue-400 ml-0.5">{jobs.filter(j => j.status === 'Diagnosis').length}</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-zinc-900/60 dark:bg-black/30 px-2.5 py-1 rounded border border-border/40 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                Cotizando: <strong className="font-bold font-mono text-violet-400 ml-0.5">{jobs.filter(j => j.status === 'Approval' || j.status === 'Approved' || j.status === 'Ready').length}</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-zinc-900/60 dark:bg-black/30 px-2.5 py-1 rounded border border-border/40 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                Reparación: <strong className="font-bold font-mono text-orange-400 ml-0.5">{jobs.filter(j => j.status === 'Repair').length}</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-zinc-900/60 dark:bg-black/30 px-2.5 py-1 rounded border border-border/40 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                QC: <strong className="font-bold font-mono text-teal-400 ml-0.5">{jobs.filter(j => j.status === 'QC').length}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full max-w-5xl">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group relative flex flex-col p-5 sm:p-6 glass-panel rounded-2xl ${card.hoverBorder} ${card.hoverShadow} transition-all duration-300 hover:-translate-y-1`}
          >
            {/* Icon badge */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 sm:mb-5 transition-all duration-300 ${card.accentBg}`}>
              {card.icon}
            </div>
            <h2 className={`text-lg font-bold mb-2 ${card.titleColor}`}>{t(card.titleKey)}</h2>
            <p className="text-muted-foreground text-sm flex-1 leading-relaxed">{t(card.descKey)}</p>
            {/* Arrow */}
            <div className={`mt-4 flex items-center gap-1 text-xs font-medium opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 ${card.titleColor}`}>
              <span>Abrir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}

        {hasRole('ADMIN') && (
          <Link
            href="/admin/users"
            className="group relative flex flex-col p-5 sm:p-6 glass-panel rounded-2xl hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.12)] transition-all duration-300 hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-purple-500/10 group-hover:bg-purple-500/20 transition-all duration-300">
              <ShieldCheck className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-lg font-bold mb-2 text-purple-400">{t('userManagement')}</h2>
            <p className="text-muted-foreground text-sm flex-1 leading-relaxed">{t('userManagementDesc')}</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 text-purple-400">
              <span>Abrir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        )}
      </div>

      {!user && !loading && (
        <p className="mt-10 text-muted-foreground text-sm">
          <Link href="/login" className="text-emerald-400 hover:underline">{t('loginPrompt')}</Link> {t('loginPromptSuffix')}
        </p>
      )}
    </div>
  );
}
