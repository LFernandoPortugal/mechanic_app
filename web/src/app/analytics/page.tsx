"use client";

import { useEffect, useState } from "react";
import { getAllJobs } from "@/lib/db";
import { Job } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useLanguage } from "@/contexts/LanguageContext";
import { Activity, CircleDollarSign, Wrench, Users } from "lucide-react";

export default function OwnerAnalytics() {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    const fetched = await getAllJobs();
    setJobs(fetched);
    setLoading(false);
  };

  const totalRevenue = jobs.reduce((acc, job) => acc + (job.approvedAmount || 0), 0);
  const activeJobs = jobs.filter(j => j.status !== 'Approved' && j.status !== 'Ready').length;
  const approvedJobs = jobs.filter(j => j.status === 'Approved').length;
  
  const approvalRate = jobs.length > 0 
    ? Math.round((approvedJobs / jobs.filter(j => j.status === 'Ready' || j.status === 'Approved').length) * 100) || 0
    : 0;

  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">{t('loadingAnalytics')}</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen page-bg px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8 pb-20">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 font-mono">{t('operationsAnalytics')}</h1>
          <p className="text-muted-foreground text-sm">{t('analyticsDesc')}</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="glass-panel border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium">{t('totalRevenue')}</span>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CircleDollarSign className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                ${totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-emerald-400 mt-1">{t('fromApprovedJobs')}</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium">{t('activeJobs')}</span>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Wrench className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {activeJobs}
              </div>
              <p className="text-xs text-blue-400 mt-1">{t('vehiclesInShop')}</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium">{t('approvalRate')}</span>
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Activity className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {approvalRate}%
              </div>
              <p className="text-xs text-emerald-400 mt-1">{t('estimatesConverted')}</p>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium">{t('totalClients')}</span>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {jobs.length}
              </div>
              <p className="text-xs text-purple-400 mt-1">{t('lifetimeTotal')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>{t('jobStatusDistribution')}</CardTitle>
              <CardDescription>{t('pipelineBreakdown')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { status: 'Reception', color: 'bg-zinc-500', labelKey: 'pipelineReception' },
                  { status: 'Diagnosis', color: 'bg-orange-500', labelKey: 'pipelineDiagnosis' },
                  { status: 'Approval', color: 'bg-blue-500', labelKey: 'pipelineApproval' },
                  { status: 'Repair', color: 'bg-violet-500', labelKey: 'pipelineRepair' },
                  { status: 'QC', color: 'bg-cyan-500', labelKey: 'pipelineQC' },
                  { status: 'Ready', color: 'bg-amber-500', labelKey: 'pipelineReady' },
                  { status: 'Approved', color: 'bg-emerald-500', labelKey: 'pipelineApproved' },
                  { status: 'Delivered', color: 'bg-green-500', labelKey: 'pipelineDelivered' }
                ].map(tier => {
                  const count = statusCounts[tier.status] || 0;
                  const percent = jobs.length > 0 ? (count / jobs.length) * 100 : 0;
                  return (
                    <div key={tier.status} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-foreground">{t(tier.labelKey)}</span>
                        <span className="text-muted-foreground font-mono">{count}</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${tier.color} transition-all duration-1000 ease-out`} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>{t('recentActivity')}</CardTitle>
              <CardDescription>{t('latestUpdates')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.slice(0, 5).map(job => (
                  <div key={job.id} className="flex justify-between items-center p-3 rounded-lg bg-secondary/50 border border-border">
                    <div>
                      <p className="font-medium text-foreground">{job.vehicleId}</p>
                      <p className="text-xs text-muted-foreground">{t('estimate')}: ${job.totalEstimate?.toFixed(2) || '0.00'} • {t('approved')}: ${job.approvedAmount?.toFixed(2) || '0.00'}</p>
                    </div>
                    <Badge className={`
                        ${job.status === 'Approved' ? 'bg-emerald-600' : ''}
                        ${job.status === 'Ready' ? 'bg-amber-600' : ''}
                        ${job.status === 'Approval' ? 'bg-blue-600' : ''}
                        ${job.status === 'Diagnosis' ? 'bg-orange-600' : ''}
                        ${job.status === 'Reception' ? 'bg-zinc-600' : ''}
                      `}>
                        {t(`status${job.status}` as any) || t('approved')}
                      </Badge>
                  </div>
                ))}
                {jobs.length === 0 && <p className="text-muted-foreground text-sm">{t('noActivityYet')}</p>}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </ProtectedRoute>
  );
}
