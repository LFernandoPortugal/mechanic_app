"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getJobById, updateJob } from "@/lib/db";
import { toast } from "sonner";
import { Job } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Wand2, AlertTriangle, CheckCircle, Download } from "lucide-react";
import { generateQuotePDF } from "@/lib/pdf";

export default function ClientQuoteView() {
  const { t } = useLanguage();
  const params = useParams();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [errorNotFound, setErrorNotFound] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  const fetchJob = async () => {
    setLoading(true);
    const fetched = await getJobById(jobId);
    if (fetched) {
      setJob(fetched);
      const initialApprovals: Record<string, boolean> = {};
      fetched.inspectionItems?.forEach(item => {
        if (item.price) {
            initialApprovals[item.id] = true;
        }
      });
      setApprovals(initialApprovals);
    } else {
      setErrorNotFound(true);
    }
    setLoading(false);
  };

  const getLaborCost = (j: Job) => {
    const partsTotal = j.inspectionItems?.reduce((acc, item) => acc + (item.price || 0), 0) || 0;
    return Math.max(0, j.totalEstimate - partsTotal);
  };

  const calculateTotalToPay = () => {
    if (!job) return 0;
    const laborCost = getLaborCost(job);
    const approvedPartsTotal = job.inspectionItems?.reduce((acc, item) => {
        if (item.price && approvals[item.id] !== false) {
           return acc + item.price;
        }
        return acc;
    }, 0) || 0;
    
    return laborCost + approvedPartsTotal;
  };

  const toggleApproval = (id: string) => {
    setApprovals(prev => ({
      ...prev,
      [id]: prev[id] === false ? true : false
    }));
  };

  const handleAcceptQuote = async () => {
    if (!job) return;

    const finalAmount = calculateTotalToPay();
    const updatedInspectionItems = job.inspectionItems.map(item => ({
      ...item,
      approved: item.price ? (approvals[item.id] !== false) : true
    }));

    try {
      await updateJob(job.id, {
        inspectionItems: updatedInspectionItems,
        approvedAmount: finalAmount,
        status: "Approved"
      }, "client", "Quote Approved");
      toast.success(t('thankYouApproval'));
      setJob({ ...job, status: "Approved", approvedAmount: finalAmount, inspectionItems: updatedInspectionItems });
    } catch (e) {
      toast.error("Error saving: " + e);
    }
  };

  const handleAutoApprove = () => {
    if (!job) return;
    handleAcceptQuote();
  };

  if (loading) {
    return <div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">{t('loadingQuote')}</div>;
  }

  if (errorNotFound || !job) {
     return (
       <div className="min-h-screen page-bg flex items-center justify-center p-4">
         <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">{t('quoteNotFound')}</h1>
            <p className="text-muted-foreground">{t('quoteNotFoundDesc')}</p>
         </div>
       </div>
     );
  }

  if (job.status === 'Approved') {
     return (
       <div className="min-h-screen page-bg flex flex-col items-center justify-center p-4">
         <div className="text-center space-y-4 max-w-md w-full glass-panel p-8 rounded-xl border-emerald-500/50">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            <h1 className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">{t('quoteApproved')}</h1>
            <p className="text-muted-foreground">{t('quoteApprovedDesc')}</p>
            <div className="bg-secondary dark:bg-black/50 p-4 rounded-lg mt-6 border border-border">
               <span className="text-muted-foreground text-sm block mb-1">{t('totalAuthorized')}</span>
               <span className="text-2xl font-mono text-emerald-500 dark:text-emerald-400 font-bold">${job.approvedAmount?.toFixed(2)}</span>
            </div>
         </div>
       </div>
     );
  }

  return (
    <div className="min-h-screen page-bg text-foreground p-4 pb-20 md:p-8 flex justify-center">
      
      <div className="w-full max-w-3xl space-y-6">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-amber-500">{t('clientPortal')}</h1>
          <p className="text-muted-foreground text-sm mt-2">{t('clientSubtitle')}</p>
          <div className="mt-4 p-2 bg-secondary dark:bg-zinc-950 inline-block rounded-full px-4 border border-border">
            <span className="text-muted-foreground mr-2">{t('vehicleIdLabel')}</span>
            <span className="text-foreground font-mono font-medium">{job.vehicleId}</span>
          </div>
        </header>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle className="text-xl">{t('repairDetails')}</CardTitle>
              <CardDescription>{t('repairDetailsDesc')}</CardDescription>
            </div>
            <Button onClick={handleAutoApprove} variant="outline" className="text-amber-500 dark:text-amber-400 border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-950/30">
              <Wand2 className="w-4 h-4 mr-2" />
              {t('autoApproveDemo')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-4">
              {(!job.inspectionItems || job.inspectionItems.length === 0) ? (
                <p className="text-sm text-muted-foreground italic">{t('noComponentsDiagnosed')}</p>
              ) : (
                job.inspectionItems.map(item => {
                  const hasPrice = item.price && item.price > 0;
                  const isApproved = approvals[item.id] !== false;

                  return (
                    <div key={item.id} className={`p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${hasPrice ? (isApproved ? 'bg-secondary/60 dark:bg-black/60 border border-emerald-200 dark:border-emerald-900/50' : 'bg-secondary/20 dark:bg-black/20 border border-border opacity-60') : 'bg-secondary/40 dark:bg-black/40 border border-border'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`font-medium text-lg ${hasPrice && !isApproved ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.name}</span>
                          <Badge className={`
                            ${item.status === 'Pass' ? 'bg-emerald-600' : ''}
                            ${item.status === 'Fail' ? 'bg-red-600' : ''}
                            ${item.status === 'Critical' ? 'bg-orange-600' : ''}
                            ${item.status === 'Recommended' ? 'bg-blue-600' : ''}
                          `}>
                            {item.status}
                          </Badge>
                        </div>
                        {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                        {item.mediaUrls && item.mediaUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {item.mediaUrls.map((url, idx) => (
                              <a href={url} target="_blank" rel="noopener noreferrer" key={idx}>
                                <img src={url} alt="Evidencia de daño" className="w-16 h-16 object-cover rounded border border-border shadow-sm hover:scale-105 transition-transform" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {hasPrice ? (
                        <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0">
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xl w-24 text-right">${item.price?.toFixed(2)}</span>
                            <button 
                              onClick={() => toggleApproval(item.id)}
                              className={`px-4 py-2 rounded font-bold transition-all w-28 text-center ${isApproved ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : 'bg-secondary dark:bg-zinc-800 text-muted-foreground border border-border hover:bg-accent'}`}
                            >
                              {isApproved ? t('included') : t('remove')}
                            </button>
                        </div>
                      ) : (
                          <div className="text-muted-foreground text-sm italic pr-4">{t('noCostReviewed')}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <hr className="border-border" />
            
            <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-secondary/40 dark:bg-black/40 p-4 rounded-lg border border-border">
                <div className="w-full md:w-1/2 space-y-2">
                    <div className="flex justify-between text-muted-foreground">
                        <span>{t('shopCharges')}</span>
                        <span className="font-mono">${getLaborCost(job).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>{t('partsVariable')}</span>
                        <span className="font-mono">${(calculateTotalToPay() - getLaborCost(job)).toFixed(2)}</span>
                    </div>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-sm mb-1">{t('totalToPay')}</p>
                  <p className="text-4xl font-mono text-amber-500 font-bold drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                    ${calculateTotalToPay().toFixed(2)}
                  </p>
                </div>
            </div>

          </CardContent>
        </Card>

        <Button 
          size="lg" 
          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold h-14 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all mt-6"
          onClick={handleAcceptQuote}
        >
          {t('acceptQuoteBtn')}
        </Button>

        <Button
          variant="outline"
          className="w-full border-amber-500/40 text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 h-12 mt-3"
          onClick={() => generateQuotePDF(job, 'client')}
        >
          <Download className="w-4 h-4 mr-2" />
          {t('downloadPDF')}
        </Button>
      </div>
    </div>
  );
}
