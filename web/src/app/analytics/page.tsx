"use client";

import { useEffect, useState } from "react";
import { getAllJobs } from "@/lib/db";
import { Job } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { toDate } from "@/lib/dates";
import { Activity, CircleDollarSign, Wrench, Users, TrendingUp, Calendar } from "lucide-react";

export default function OwnerAnalytics() {
  const { userProfile, loading: authLoading, workshopSettings } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const wId = userProfile?.workshopId || null;
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
        <div className="flex min-h-[50vh] items-center justify-center text-foreground">
          <div className="flex flex-col items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
            <p className="text-muted-foreground text-sm">Cargando analíticas del taller...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="mx-auto max-w-7xl space-y-8 pb-20">
        <header className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="page-title">Rendimiento del taller</h1>
              <p className="text-muted-foreground text-xs">Estadísticas en vivo e indicadores de facturación del taller.</p>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            Datos en tiempo real
          </Badge>
        </header>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="metric-card border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Facturación Total</span>
                <div className="rounded-lg bg-primary/10 p-2">
                  <CircleDollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-black tracking-tight text-foreground font-mono">
                {workshopSettings?.currencySymbol || "$"}{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Ingresos acumulados históricos</p>
            </CardContent>
          </Card>

          <Card className="metric-card border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Vehículos Activos</span>
                <div className="rounded-lg bg-primary/10 p-2">
                  <Wrench className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-black tracking-tight text-foreground font-mono">
                {activeJobs}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Carros actualmente en reparación/proceso</p>
            </CardContent>
          </Card>

          <Card className="metric-card border-l-4 border-l-warning">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Tasa de Aprobación</span>
                <div className="rounded-lg bg-warning/10 p-2">
                  <Activity className="w-5 h-5 text-warning" />
                </div>
              </div>
              <div className="text-3xl font-black tracking-tight text-foreground font-mono">
                {approvalRate}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Porcentaje de presupuestos autorizados</p>
            </CardContent>
          </Card>
          
          <Card className="metric-card border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Total Histórico</span>
                <div className="rounded-lg bg-primary/10 p-2">
                  <Users className="w-5 h-5 text-primary" />
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
          <Card className="app-card xl:col-span-7 flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
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
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
                  <line x1={paddingX} y1={(chartHeight) / 2} x2={chartWidth - paddingX} y2={(chartHeight) / 2} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
                  <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="currentColor" strokeOpacity="0.2" />

                  {/* Area fill */}
                  <path d={areaPath} fill="url(#chartGradient)" />

                  {/* Glowing Line */}
                  <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" />

                  {/* Interactive Nodes */}
                  {points.map((p, i) => (
                    <g key={i} className="group/node cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="5.5" 
                        fill="var(--primary)"
                        stroke="#ffffff" 
                        strokeWidth="2" 
                        className="transition-all duration-200 group-hover/node:r-7"
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
          <Card className="app-card xl:col-span-5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Pipeline por Estados
              </CardTitle>
              <CardDescription>Distribución de autos por etapa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { status: 'Reception', color: 'bg-primary/35', label: 'Recepción' },
                  { status: 'Diagnosis', color: 'bg-primary/50', label: 'Diagnóstico' },
                  { status: 'Approval', color: 'bg-warning', label: 'En Cotización' },
                  { status: 'Repair', color: 'bg-primary/70', label: 'En Reparación' },
                  { status: 'QC', color: 'bg-primary/85', label: 'Control de Calidad' },
                  { status: 'Ready', color: 'bg-warning', label: 'Listo para entrega' },
                  { status: 'Approved', color: 'bg-success', label: 'Cotización aprobada' },
                  { status: 'Delivered', color: 'bg-success', label: 'Entregados' }
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
        <Card className="app-card">
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
                      Aprobado: <strong className="font-mono text-success">{workshopSettings?.currencySymbol || "$"}{job.approvedAmount?.toFixed(2) || '0.00'}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {toDate(job.createdAt)?.toLocaleDateString() || "N/A"}
                    </span>
                    <Badge className={`
                      text-[10px] font-bold px-2.5 py-0.5 rounded-full border
                      ${job.status === 'Approved' ? 'bg-success/10 text-success border-success/25' : ''}
                      ${job.status === 'Ready' ? 'bg-warning/10 text-warning border-warning/25' : ''}
                      ${job.status === 'Approval' ? 'bg-warning/10 text-warning border-warning/25' : ''}
                      ${job.status === 'Repair' || job.status === 'Diagnosis' || job.status === 'QC' ? 'bg-primary/10 text-primary border-primary/25' : ''}
                      ${job.status === 'Reception' ? 'bg-secondary text-muted-foreground border-border' : ''}
                      ${job.status === 'Delivered' ? 'bg-success/10 text-success border-success/25' : ''}
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
