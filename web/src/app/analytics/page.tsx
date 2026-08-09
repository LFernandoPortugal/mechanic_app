"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllJobs } from "@/lib/db";
import { Job } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { toDate } from "@/lib/dates";
import { Activity, CircleDollarSign, Wrench, Users, TrendingUp, Calendar, ArrowLeft } from "lucide-react";

export default function OwnerAnalytics() {
  const router = useRouter();
  const { t } = useLanguage();
  const { userProfile, loading: authLoading, workshopSettings } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const wId = userProfile?.workshopId || (userProfile ? "demo-workshop" : null);
    if (wId) {
      fetchJobs(wId);
    } else {
      setLoading(false);
    }
  }, [userProfile, authLoading]);

  const fetchJobs = async (workshopId: string) => {
    setLoading(true);
    try {
      const fetched = await getAllJobs(workshopId);
      setJobs(fetched);
    } catch (e) {
      console.error("Error loading analytics jobs:", e);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = jobs.reduce((acc, job) => acc + (job.approvedAmount || 0), 0);
  const activeJobs = jobs.filter(j => j.status !== 'Delivered').length;
  const approvedJobs = jobs.filter(j => j.status === 'Approved' || j.status === 'Repair' || j.status === 'QC' || j.status === 'Ready' || j.status === 'Delivered').length;
  
  const approvalRate = jobs.length > 0 
    ? Math.round((approvedJobs / jobs.length) * 100) || 0
    : 0;

  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Past 7 days labels & payment calculations
  const getPast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const past7Days = getPast7Days();
  const dailyPayments = past7Days.map(day => {
    let total = 0;
    jobs.forEach(job => {
      if (job.payments) {
        job.payments.forEach(p => {
          if (p.date && p.date.startsWith(day)) {
            total += p.amount;
          }
        });
      }
    });
    return { day, total };
  });

  // Calculate SVG points
  const maxPayment = Math.max(...dailyPayments.map(d => d.total), 100);
  const chartWidth = 500;
  const chartHeight = 150;
  const paddingX = 40;
  const paddingY = 20;

  const getPoints = () => {
    return dailyPayments.map((d, i) => {
      const x = paddingX + (i / 6) * (chartWidth - 2 * paddingX);
      const y = chartHeight - paddingY - (d.total / maxPayment) * (chartHeight - 2 * paddingY);
      return { x, y, value: d.total, day: d.day };
    });
  };

  const points = getPoints();
  
  // Create line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  // Create area path filled to the bottom
  const areaPath = `${linePath} L ${points[6].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="min-h-screen page-bg text-foreground p-6 flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <span className="animate-spin text-emerald-400 text-3xl">⏳</span>
            <p className="text-muted-foreground text-sm">Cargando analíticas del taller...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen page-bg px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8 pb-20 font-sans">
        <header className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="group gap-1.5 rounded-full border border-border bg-card/45 px-3.5 py-1.5 text-xs text-muted-foreground transition-all duration-300 hover:border-emerald-500/50 hover:bg-emerald-950/20 hover:text-emerald-400"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Inicio
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold text-foreground mb-1 tracking-tight">
                📊 Rendimiento del Taller
              </h1>
              <p className="text-muted-foreground text-xs">Estadísticas en vivo e indicadores de facturación del taller.</p>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs px-3 py-1 bg-emerald-950/20 font-mono gap-1.5 flex items-center ml-12 sm:ml-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE DATA
          </Badge>
        </header>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="glass-panel border-l-4 border-l-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Facturación Total</span>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CircleDollarSign className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div className="text-3xl font-black tracking-tight text-foreground font-mono">
                {workshopSettings?.currencySymbol || "$"}{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Ingresos acumulados históricos</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Vehículos Activos</span>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Wrench className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="text-3xl font-black tracking-tight text-foreground font-mono">
                {activeJobs}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Carros actualmente en reparación/proceso</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Tasa de Aprobación</span>
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Activity className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div className="text-3xl font-black tracking-tight text-foreground font-mono">
                {approvalRate}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Porcentaje de presupuestos autorizados</p>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-l-4 border-l-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Total Histórico</span>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div className="text-3xl font-black tracking-tight text-foreground font-mono">
                {jobs.length}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Cantidad total de trabajos creados</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Status */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Neon Gradient Revenue Chart (7/12 width = 58%) */}
          <Card className="glass-panel xl:col-span-7 flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Ingresos de los Últimos 7 Días
              </CardTitle>
              <CardDescription>Cobros y abonos realizados esta semana</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="relative w-full h-[180px] mt-2">
                {/* Custom glowing responsive SVG chart */}
                <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
                  <line x1={paddingX} y1={(chartHeight) / 2} x2={chartWidth - paddingX} y2={(chartHeight) / 2} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
                  <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="currentColor" strokeOpacity="0.2" />

                  {/* Area fill */}
                  <path d={areaPath} fill="url(#chartGradient)" />

                  {/* Glowing Line */}
                  <path d={linePath} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" className="drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />

                  {/* Interactive Nodes */}
                  {points.map((p, i) => (
                    <g key={i} className="group/node cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="5.5" 
                        fill="#10b981" 
                        stroke="#ffffff" 
                        strokeWidth="2" 
                        className="transition-all duration-200 group-hover/node:r-7 group-hover/node:fill-emerald-400 drop-shadow-[0_0_4px_rgba(0,0,0,0.3)]"
                      />
                      {/* Floating tooltip on hover */}
                      <g className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <rect x={p.x - 35} y={p.y - 30} width="70" height="20" rx="4" fill="#000000" fillOpacity="0.85" />
                        <text x={p.x} y={p.y - 16} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          {workshopSettings?.currencySymbol || "$"}{p.value.toFixed(0)}
                        </text>
                      </g>
                    </g>
                  ))}
                </svg>
              </div>
              
              {/* Day Labels */}
              <div className="flex justify-between px-6 mt-4 text-[10px] text-muted-foreground font-semibold">
                {dailyPayments.map((d, i) => {
                  const dateParts = d.day.split('-');
                  return (
                    <span key={i} className="font-mono text-center">
                      {dateParts[2]}/{dateParts[1]}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Job Pipeline Breakdown (5/12 width = 42%) */}
          <Card className="glass-panel xl:col-span-5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Pipeline por Estados
              </CardTitle>
              <CardDescription>Distribución de autos por etapa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { status: 'Reception', color: 'bg-zinc-500', label: 'Recepción' },
                  { status: 'Diagnosis', color: 'bg-orange-500', label: 'Diagnóstico' },
                  { status: 'Approval', color: 'bg-blue-500', label: 'En Cotización' },
                  { status: 'Repair', color: 'bg-violet-500', label: 'En Reparación' },
                  { status: 'QC', color: 'bg-cyan-500', label: 'Control de Calidad' },
                  { status: 'Ready', color: 'bg-amber-500', label: 'Listo p/ Entrega' },
                  { status: 'Approved', color: 'bg-emerald-500', label: 'Cotización Aprobada' },
                  { status: 'Delivered', color: 'bg-green-500', label: 'Entregados' }
                ].map(tier => {
                  const count = statusCounts[tier.status] || 0;
                  const percent = jobs.length > 0 ? (count / jobs.length) * 100 : 0;
                  return (
                    <div key={tier.status} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-foreground">{tier.label}</span>
                        <span className="text-muted-foreground font-mono font-bold bg-secondary/70 dark:bg-black/30 px-1.5 py-0.5 rounded border border-border/40 text-[10px]">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${tier.color} transition-all duration-1000 ease-out rounded-full`} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-lg">Últimas Órdenes y Movimientos</CardTitle>
            <CardDescription>Actividad operativa reciente registrada en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobs.slice(0, 5).map(job => (
                <div key={job.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-secondary/30 dark:bg-black/20 border border-border/50 hover:border-border transition-colors gap-3">
                  <div>
                    <p className="font-bold text-foreground text-sm flex items-center gap-2">
                      {job.vehicleId}
                      <span className="text-xs text-muted-foreground font-normal">({job.clientId})</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-light">
                      Presupuesto: <strong className="font-mono text-foreground">{workshopSettings?.currencySymbol || "$"}{job.totalEstimate?.toFixed(2) || '0.00'}</strong> 
                      {" · "} 
                      Aprobado: <strong className="font-mono text-emerald-400">{workshopSettings?.currencySymbol || "$"}{job.approvedAmount?.toFixed(2) || '0.00'}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {toDate(job.createdAt)?.toLocaleDateString() || "N/A"}
                    </span>
                    <Badge className={`
                      text-[10px] font-bold px-2.5 py-0.5 rounded-full border
                      ${job.status === 'Approved' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' : ''}
                      ${job.status === 'Ready' ? 'bg-amber-950/40 text-amber-400 border-amber-500/20 animate-pulse' : ''}
                      ${job.status === 'Approval' ? 'bg-blue-950/40 text-blue-400 border-blue-500/20' : ''}
                      ${job.status === 'Repair' ? 'bg-purple-950/40 text-purple-400 border-purple-500/20' : ''}
                      ${job.status === 'Diagnosis' ? 'bg-orange-950/40 text-orange-400 border-orange-500/20' : ''}
                      ${job.status === 'Reception' ? 'bg-zinc-900/60 dark:bg-black/40 text-muted-foreground border-border/40' : ''}
                      ${job.status === 'Delivered' ? 'bg-green-950/40 text-green-400 border-green-500/20' : ''}
                    `}>
                      {job.status === 'Reception' ? 'Recepción' :
                       job.status === 'Diagnosis' ? 'Diagnóstico' :
                       job.status === 'Approval' ? 'Cotizando' :
                       job.status === 'Approved' ? 'Aprobado' :
                       job.status === 'Repair' ? 'Reparación' :
                       job.status === 'QC' ? 'Control de Calidad' :
                       job.status === 'Ready' ? 'Listo p/ Entrega' :
                       job.status === 'Delivered' ? 'Entregado' : job.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && <p className="text-muted-foreground text-sm italic py-4 text-center">No hay actividad registrada en la base de datos.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
