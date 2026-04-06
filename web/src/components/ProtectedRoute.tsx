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
  const { user, userProfile, loading, hasAnyRole } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!userProfile && allowedRoles) {
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      );
    }

    return (
      <div className="min-h-screen page-bg flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-amber-950/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
            <ShieldX className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-amber-500 dark:text-amber-400 mb-3">{t('accessDenied')}</h2>
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
          <div className="w-20 h-20 bg-red-950/30 dark:bg-red-950/30 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
            <ShieldX className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-red-500 dark:text-red-400 mb-3">{t('accessDenied')}</h2>
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
