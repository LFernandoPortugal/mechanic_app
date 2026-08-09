"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut, MessageSquare } from "lucide-react";

export default function ExpiredPage() {
  const { t } = useLanguage();
  const { signOut, userProfile } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const contactNumber = "+51900123456"; // Or fetch from config/env
  const whatsappMessage = `Hola, mi taller es "${userProfile?.workshopId || "sin taller asociado"}" y mi email es "${userProfile?.email}". Mi período de prueba en SGA ha expirado y me gustaría solicitar una extensión.`;
  const whatsappLink = `https://wa.me/${contactNumber.replace(/[+\s]/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen page-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center animate-fade-in">
        <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center border border-red-500/30 mb-2 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400 animate-pulse" />
        </div>

        <Card className="glass-panel overflow-hidden border-red-500/25">
          <CardContent className="pt-8 pb-6 px-6 space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                {t("trialExpiredTitle")}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("trialExpiredDesc")}
              </p>
            </div>

            {userProfile && (
              <div className="bg-secondary/40 border border-border/40 p-3 rounded-lg text-left text-xs font-mono text-muted-foreground space-y-1">
                <div>Taller ID: <span className="text-foreground font-semibold">{userProfile.workshopId}</span></div>
                <div>Admin Email: <span className="text-foreground">{userProfile.email}</span></div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-11 shadow-[0_4px_12px_rgba(16,185,129,0.15)] transition-all duration-300"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t("contactAdmin")}
                </Button>
              </a>

              <Button 
                onClick={handleSignOut} 
                variant="ghost" 
                className="w-full border border-border text-muted-foreground hover:text-foreground h-11"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t("signOut")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
