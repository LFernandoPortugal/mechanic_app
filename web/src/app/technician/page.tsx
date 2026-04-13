"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAssignedJobs, updateJob, assignTechnician } from "@/lib/db";
import { uploadJobImage } from "@/lib/storage";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Job, InspectionItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Wand2, MessageCircle } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { openWhatsAppStatusUpdate } from "@/lib/whatsapp";

const STATUS_MAP: Record<string, string> = {
  Pass: 'statusPass',
  Fail: 'statusFail',
  Critical: 'statusCritical',
  Recommended: 'statusRecommended',
};

export default function TechnicianDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const [newItemName, setNewItemName] = useState("");
  const [newItemStatus, setNewItemStatus] = useState<'Pass' | 'Fail' | 'Critical' | 'Recommended'>('Pass');
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemPhotos, setNewItemPhotos] = useState<File[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [submittedJob, setSubmittedJob] = useState<Job | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    const fetched = await getAssignedJobs();
    setJobs(fetched);
    setLoading(false);
  };

  const handleAddInspection = async () => {
    if (!selectedJob || !newItemName) return;
    setIsLogging(true);
    
    try {
      const urls: string[] = [];
      if (newItemPhotos.length > 0) {
        toast.info(t('uploadingPhotos') || "Subiendo evidencia...");
        for (const file of newItemPhotos) {
          const url = await uploadJobImage(file, selectedJob.id, "evidence");
          urls.push(url);
        }
      }

      const newItem: InspectionItem = {
        id: Math.random().toString(36).substring(7),
        name: newItemName,
        status: newItemStatus,
        notes: newItemNotes,
        mediaUrls: urls
      };

      const updatedJob = {
        ...selectedJob,
        inspectionItems: [...(selectedJob.inspectionItems || []), newItem]
      };
      setSelectedJob(updatedJob);
      setNewItemName("");
      setNewItemNotes("");
      setNewItemStatus("Pass");
      setNewItemPhotos([]);
    } catch (e) {
      toast.error("Error uploading evidence");
    } finally {
      setIsLogging(false);
    }
  };

  const handleAutoDiagnose = () => {
    if (!selectedJob) return;
    const mockItems: InspectionItem[] = [
      { id: Math.random().toString(), name: "Filtro de Aire", status: "Pass", notes: "Limpio" },
      { id: Math.random().toString(), name: "Batería", status: "Recommended", notes: "Voltaje bajo, considerar cambio en 3 meses" },
      { id: Math.random().toString(), name: "Balatas Delanteras", status: "Critical", notes: "Vida útil < 10%, rechinan al frenar" }
    ];
    setSelectedJob({ ...selectedJob, inspectionItems: [...(selectedJob.inspectionItems || []), ...mockItems] });
  };

  const handleSelectJob = async (job: Job) => {
    setSelectedJob(job);
    // Assign this technician to the job if not already assigned
    if (!job.technicianId && user) {
      try {
        await assignTechnician(job.id, user.uid);
      } catch (e) {
        console.error("Error assigning technician:", e);
      }
    }
  };

  const handleSubmitDiagnosis = async () => {
    if (!selectedJob) return;
    try {
      await updateJob(selectedJob.id, {
        inspectionItems: selectedJob.inspectionItems || [],
        status: "Approval"
      }, user?.uid || "unknown", "Diagnosis Submitted");
      setSubmittedJob(selectedJob);  // save for WhatsApp
      setSubmittedJobId(selectedJob.vehicleId);
      setSelectedJob(null);
      fetchJobs();
    } catch (e) {
      toast.error("Error saving: " + e);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">{t('loadingJobs')}</div>;
  }

  if (submittedJobId) {
    const hasPhone = Boolean(submittedJob?.clientPhone);
    return (
    <ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN']}>
        <div className="min-h-screen page-bg flex items-center justify-center p-4">
          <Card className="glass-panel text-center max-w-md w-full p-8 border-orange-500/50">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wand2 className="w-8 h-8 text-orange-500 dark:text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-orange-500 dark:text-orange-400 mb-2">{t('diagnosisSubmitted')}</h2>
            <p className="text-muted-foreground mb-8">{t('vehicleReadyForQuoting').replace('{id}', submittedJobId)}</p>
            <div className="space-y-3">
               {/* WhatsApp notify — only if phone is stored */}
               {hasPhone && submittedJob && (
                 <Button
                   className="w-full bg-[#25d366] hover:bg-[#1ebe5d] text-white font-bold h-12"
                   onClick={() => openWhatsAppStatusUpdate(
                     submittedJob.clientPhone!,
                     submittedJob.clientId,
                     submittedJob.vehicleId,
                     'diagnosis'
                   )}
                 >
                   <MessageCircle className="w-4 h-4 mr-2" />
                   {t('notifyClientWhatsApp')}
                 </Button>
               )}
               <Button onClick={() => router.push('/advisor')} className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg text-white">
                  {t('goToAdvisor')}
               </Button>
               <Button onClick={() => { setSubmittedJobId(null); setSubmittedJob(null); }} variant="outline" className="w-full border-border text-muted-foreground h-10">
                  {t('inspectAnother')}
               </Button>
            </div>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN']}>
      <div className="min-h-screen page-bg text-foreground px-4 md:px-8 py-6 flex justify-center">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Sidebar: Job List (3/12 = 25%) */}
      <div className="lg:col-span-3 space-y-4">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-orange-500 dark:text-orange-400">{t('technicianBay')}</h1>
          <p className="text-muted-foreground text-sm">{t('assignedVehicles')}</p>
        </header>

        {jobs.length === 0 ? (
          <p className="text-muted-foreground italic">{t('noAssignedVehicles')}</p>
        ) : (
          jobs.map(job => (
            <Card 
              key={job.id} 
              className={`glass-panel cursor-pointer transition-colors ${selectedJob?.id === job.id ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'hover:border-accent'}`}
              onClick={() => handleSelectJob(job)}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-lg flex justify-between items-center">
                  {job.vehicleId}
                  <Badge variant="outline" className={job.status === 'Reception' ? 'text-amber-500 border-amber-500' : 'text-blue-400 border-blue-400'}>
                    {t(`status${job.status}` as any) || job.status}
                  </Badge>
                </CardTitle>
                <CardDescription>{t('odometer')}: {job.odometer} km</CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Right Content: Diagnosis Panel (9/12 = 75%) */}
      <div className="lg:col-span-9">
        {selectedJob ? (
          <div className="space-y-6">
            <Card className="glass-panel">
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle>{t('diagnosisAndInspections')}</CardTitle>
                  <CardDescription>{t('addItemsToReview')}</CardDescription>
                </div>
                <Button onClick={handleAutoDiagnose} variant="outline" className="text-orange-500 dark:text-orange-400 border-orange-500/50 hover:bg-orange-50 dark:hover:bg-orange-950/30 flex-shrink-0">
                  <Wand2 className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('autoDiagnose')}</span>
                  <span className="sm:hidden text-xs">Auto</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">{t('loggedItems')}</h3>
                  {(!selectedJob.inspectionItems || selectedJob.inspectionItems.length === 0) ? (
                    <p className="text-sm text-muted-foreground italic">{t('noItemsLogged')}</p>
                  ) : (
                    selectedJob.inspectionItems.map(item => (
                      <div key={item.id} className="p-3 bg-secondary/50 dark:bg-black/40 border border-border rounded flex justify-between items-start">
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                          {item.mediaUrls && item.mediaUrls.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {item.mediaUrls.map((url, idx) => (
                                <img key={idx} src={url} alt="Evidencia" className="w-12 h-12 object-cover rounded border border-border" />
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge className={`
                          ${item.status === 'Pass' ? 'bg-emerald-600' : ''}
                          ${item.status === 'Fail' ? 'bg-red-600' : ''}
                          ${item.status === 'Critical' ? 'bg-orange-600' : ''}
                          ${item.status === 'Recommended' ? 'bg-blue-600' : ''}
                        `}>
                          {t(STATUS_MAP[item.status] || item.status)}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>

                <hr className="border-border" />

                <div className="bg-secondary/50 dark:bg-black/40 p-4 rounded-lg border border-border space-y-4">
                  <h3 className="font-semibold text-foreground">{t('addInspectionItem')}</h3>
                  
                  <div className="space-y-2">
                    <Label>{t('componentDetail')}</Label>
                    <Input 
                      value={newItemName} 
                      onChange={e => setNewItemName(e.target.value)} 
                      className="bg-background border-border" 
                      placeholder={t('enterComponentName')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('statusTitle')}</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(['Pass', 'Recommended', 'Fail', 'Critical'] as const).map(status => (
                        <Button
                          key={status}
                          variant={newItemStatus === status ? "default" : "outline"}
                          className={`
                            ${newItemStatus === status && status === 'Pass' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                            ${newItemStatus === status && status === 'Fail' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                            ${newItemStatus === status && status === 'Critical' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                            ${newItemStatus === status && status === 'Recommended' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                            ${newItemStatus !== status ? 'border-border text-muted-foreground' : ''}
                          `}
                          onClick={() => setNewItemStatus(status)}
                        >
                          {t(STATUS_MAP[status])}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('technicianNotes')}</Label>
                    <Textarea 
                      value={newItemNotes} 
                      onChange={e => setNewItemNotes(e.target.value)} 
                      className="bg-background border-border"
                      placeholder={t('addDetails')}
                    />
                  </div>

                  {newItemStatus !== 'Pass' && (
                    <div className="space-y-2">
                      <Label>Evidencia Fotográfica (Opcional)</Label>
                      <Input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        multiple 
                        onChange={(e) => {
                          if (e.target.files) {
                            setNewItemPhotos((prev) => [...prev, ...Array.from(e.target.files!)]);
                          }
                        }}
                        className="bg-background border-border"
                      />
                      {newItemPhotos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {newItemPhotos.map((p, i) => (
                            <div key={i} className="relative w-12 h-12 rounded overflow-hidden border border-border">
                              <img src={URL.createObjectURL(p)} alt="preview" className="object-cover w-full h-full" />
                              <button 
                                type="button" 
                                onClick={() => setNewItemPhotos(newItemPhotos.filter((_, index) => index !== i))}
                                className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center text-[10px]"
                              >
                                X
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Button onClick={handleAddInspection} variant="secondary" className="w-full" disabled={isLogging}>
                    {isLogging ? t('uploadingPhotos') || "Subiendo..." : t('logItem')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Button 
              size="lg" 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-14"
              onClick={handleSubmitDiagnosis}
            >
              {t('submitDiagnosis')}
            </Button>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-secondary/50 dark:bg-zinc-900/50 border border-border border-dashed rounded-xl p-8 text-center text-muted-foreground">
            {t('selectVehicle')}
          </div>
        )}
      </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
