"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getJobsForQuote, updateJob } from "@/lib/db";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Job } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Wand2, Copy, ExternalLink, CheckCircle } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function AdvisorQuoteBuilder() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [baseLaborCost, setBaseLaborCost] = useState(0);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    const fetched = await getJobsForQuote();
    setJobs(fetched);
    setLoading(false);
  };

  const calculateTotal = () => {
    const partsTotal = Object.values(prices).reduce((acc, curr) => acc + (curr || 0), 0);
    return partsTotal + baseLaborCost;
  };

  const handleAutoQuote = () => {
    if (!selectedJob) return;
    const mockPrices: Record<string, number> = {};
    selectedJob.inspectionItems?.forEach(item => {
        if (item.status !== 'Pass') {
            mockPrices[item.id] = Math.floor(Math.random() * 200) + 50; 
        }
    });
    setPrices(mockPrices);
    setBaseLaborCost(150); 
  };

  const handleSaveQuote = async () => {
    if (!selectedJob) return;

    const updatedInspectionItems = selectedJob.inspectionItems.map(item => ({
      ...item,
      price: prices[item.id] || 0
    }));

    try {
      await updateJob(selectedJob.id, {
        inspectionItems: updatedInspectionItems,
        totalEstimate: calculateTotal(),
        status: "Ready"
      }, user?.uid || "unknown", "Quote Generated");
      setSubmittedJobId(selectedJob.id);
      setSelectedJob(null);
      setPrices({});
      setBaseLaborCost(0);
      fetchJobs();
    } catch (e) {
      toast.error("Error saving quote: " + e);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">{t('loadingQuotes')}</div>;
  }

  if (submittedJobId) {
    const quoteUrl = typeof window !== 'undefined' ? `${window.location.origin}/quote/${submittedJobId}` : `/quote/${submittedJobId}`;
    
    return (
      <div className="min-h-screen page-bg flex items-center justify-center p-4">
        <Card className="glass-panel text-center max-w-md w-full p-8 border-blue-500/50">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-blue-500 dark:text-blue-400 mb-2">{t('quoteGenerated')}</h2>
          <p className="text-muted-foreground mb-6">{t('quoteGeneratedDesc')}</p>
          
          <div className="bg-secondary dark:bg-black border border-border p-3 flex rounded items-center justify-between mb-8 overflow-hidden">
             <span className="text-muted-foreground text-sm truncate mr-2">{quoteUrl}</span>
             <Button 
               size="sm" 
               variant="outline" 
               className="border-border shrink-0"
               onClick={() => {
                 navigator.clipboard.writeText(quoteUrl);
                 setCopied(true);
                 setTimeout(() => setCopied(false), 2000);
               }}
             >
               {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
             </Button>
          </div>

          <div className="space-y-3 flex flex-col items-center">
             <Button onClick={() => router.push(`/quote/${submittedJobId}`)} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg text-white">
                <ExternalLink className="w-4 h-4 mr-2" /> {t('openClientView')}
             </Button>
             <Button onClick={() => setSubmittedJobId(null)} variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t('backToDashboard')}
             </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'ADVISOR']}>
      <div className="min-h-screen page-bg text-foreground px-4 md:px-8 py-6 flex justify-center">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="w-full max-w-5xl space-y-6">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-blue-500 dark:text-blue-400">{t('advisorArea')}</h1>
              <p className="text-muted-foreground text-sm">{t('advisorSubtitle')}</p>
            </header>

            {jobs.length === 0 ? (
              <p className="text-muted-foreground italic">{t('noPendingQuotes')}</p>
        ) : (
          jobs.map(job => (
            <Card 
              key={job.id} 
              className={`glass-panel cursor-pointer transition-colors ${selectedJob?.id === job.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'hover:border-accent'}`}
              onClick={() => {
                setSelectedJob(job);
                const existingPrices: Record<string, number> = {};
                job.inspectionItems?.forEach(item => {
                  if (item.price) existingPrices[item.id] = item.price;
                });
                setPrices(existingPrices);
                setBaseLaborCost(0);
              }}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-lg flex justify-between items-center">
                  {t('jobLabel')} {job.vehicleId}
                  <Badge variant="outline" className="text-blue-400 border-blue-400">{t('waiting')}</Badge>
                </CardTitle>
                <CardDescription>{t('odometer')}: {job.odometer} km</CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <div className="w-full md:w-2/3">
        {selectedJob ? (
          <div className="space-y-6">
            <Card className="glass-panel">
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle>{t('quoteBuilder')}</CardTitle>
                  <CardDescription>{t('quoteBuilderDesc')}</CardDescription>
                </div>
                <Button onClick={handleAutoQuote} variant="outline" className="text-blue-500 dark:text-blue-400 border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                  <Wand2 className="w-4 h-4 mr-2" />
                  {t('autoQuote')}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">{t('inspectedItems')} ({selectedJob.inspectionItems?.length || 0})</h3>
                  {(!selectedJob.inspectionItems || selectedJob.inspectionItems.length === 0) ? (
                    <p className="text-sm text-muted-foreground italic">{t('noComponentsLogged')}</p>
                  ) : (
                    selectedJob.inspectionItems.map(item => (
                      <div key={item.id} className="p-4 bg-secondary/50 dark:bg-black/40 border border-border rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-medium text-lg text-foreground">{item.name}</span>
                            <Badge className={`
                              ${item.status === 'Pass' ? 'bg-emerald-600' : ''}
                              ${item.status === 'Fail' ? 'bg-red-600' : ''}
                              ${item.status === 'Critical' ? 'bg-orange-600' : ''}
                              ${item.status === 'Recommended' ? 'bg-blue-600' : ''}
                            `}>
                              {item.status}
                            </Badge>
                          </div>
                          {item.notes && <p className="text-sm text-muted-foreground bg-secondary dark:bg-black/50 p-2 rounded border-l-2 border-border">{item.notes}</p>}
                        </div>
                        
                        {(item.status !== 'Pass') && (
                          <div className="w-full md:w-48">
                            <Label className="text-xs text-muted-foreground mb-1 block">{t('partPrice')}</Label>
                            <Input 
                              type="number"
                              min="0"
                              placeholder="0.00"
                              className="bg-background border-border text-right text-emerald-600 dark:text-emerald-400 font-mono"
                              value={prices[item.id] === undefined ? '' : prices[item.id]}
                              onChange={(e) => setPrices({...prices, [item.id]: parseFloat(e.target.value) || 0})}
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <hr className="border-border" />
                
                <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-secondary/50 dark:bg-black/40 p-4 rounded-lg border border-border">
                   <div className="w-full md:w-1/3">
                      <Label className="text-muted-foreground mb-1 block">{t('globalLabor')}</Label>
                      <Input 
                        type="number" 
                        min="0"
                        className="bg-background border-border text-blue-600 dark:text-blue-400 font-mono"
                        value={baseLaborCost || ''}
                        onChange={(e) => setBaseLaborCost(parseFloat(e.target.value) || 0)}
                      />
                   </div>
                   <div className="text-right">
                     <p className="text-muted-foreground text-sm mb-1">{t('estimatedTotal')}</p>
                     <p className="text-4xl font-mono text-emerald-600 dark:text-emerald-400 font-bold drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                       ${calculateTotal().toFixed(2)}
                     </p>
                   </div>
                </div>

              </CardContent>
            </Card>

            <Button 
              size="lg" 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-14 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all"
              onClick={handleSaveQuote}
            >
              {t('generateQuoteBtn')}
            </Button>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-secondary/50 dark:bg-zinc-900/10 border border-border rounded-xl border-dashed p-8 text-center text-muted-foreground">
            {t('selectVehicleQuote')}
          </div>
        )}
      </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
