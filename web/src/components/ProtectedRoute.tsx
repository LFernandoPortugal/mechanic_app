"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserRole } from "@/types";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userProfile, loading, hasAnyRole, trialExpired } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (trialExpired && pathname !== '/expired') {
        router.push('/expired');
      }
    }
  }, [user, loading, trialExpired, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary/25 border-t-primary"></div>
      </div>
    );
  }

  if (!user || (trialExpired && pathname !== '/expired')) {
    return null;
  }

  if (!userProfile && allowedRoles) {
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary/25 border-t-primary"></div>
        </div>
      );
    }

    return (
      <div className="min-h-screen page-bg flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-warning/30 bg-warning/10">
            <ShieldX className="h-10 w-10 text-warning" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-warning">{t('accessDenied')}</h2>
          <p className="text-muted-foreground mb-8">
            User profile not found in database. Please contact the administrator to initialize your account.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full bg-secondary hover:bg-accent text-foreground">
             {t('goBack')}
          </Button>
        </div>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
            <ShieldX className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-destructive">{t('accessDenied')}</h2>
          <p className="text-muted-foreground mb-2">
            {t('noPermission')}
          </p>
          <p className="text-muted-foreground text-sm mb-8">
            {t('requiredRoles')} <span className="text-foreground font-mono">{allowedRoles.join(', ')}</span>
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 bg-secondary hover:bg-accent text-foreground rounded-lg transition-colors font-medium"
            >
              {t('goHome')}
            </button>
            <button
              onClick={() => router.back()}
              className="w-full px-6 py-3 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              {t('goBack')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
