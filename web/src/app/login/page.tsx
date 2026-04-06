"use client";

import { useState, Suspense } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile } from "@/lib/db";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertCircle, Lock, Shield, Wrench, ClipboardList, DollarSign } from "lucide-react";
import { UserRole } from "@/types";

function LoginForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoRoles, setDemoRoles] = useState<UserRole[] | null>(null);

  const DEMO_ROLE_MAP: Record<string, UserRole[]> = {
    'admin@demo.com': ['ADMIN', 'RECEPTION', 'TECHNICIAN', 'ADVISOR'],
    'tech@demo.com': ['TECHNICIAN'],
    'reception@demo.com': ['RECEPTION'],
    'advisor@demo.com': ['ADVISOR', 'RECEPTION'],
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Ensure profile exists for existing accounts (e.g. demo accounts after a reset)
      const roles = demoRoles || DEMO_ROLE_MAP[email] || ['RECEPTION'];
      await createUserProfile(cred.user.uid, cred.user.email || email, undefined, roles);
      router.push(redirectTo);
    } catch (err: any) {
      console.log("Login failed. Attempting automatic registration for prototype...", err.code);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const roles = demoRoles || DEMO_ROLE_MAP[email] || ['RECEPTION'];
        await createUserProfile(cred.user.uid, cred.user.email || email, undefined, roles);
        router.push(redirectTo);
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          setError(t('wrongPassword'));
        } else {
          setError(createErr.message || t('authError'));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setDemoRoles(DEMO_ROLE_MAP[demoEmail] || ['RECEPTION']);
  };

  const demoAccounts: { email: string; labelKey: string; rolesKey: string; icon: React.ReactNode; color: string }[] = [
    {
      email: "admin@demo.com",
      labelKey: "demoAdmin",
      rolesKey: "demoFullAccess",
      icon: <Shield className="w-4 h-4" />,
      color: "text-purple-400 hover:border-purple-500/50 hover:bg-purple-950/20 dark:hover:bg-purple-950/20 hover:bg-purple-50",
    },
    {
      email: "tech@demo.com",
      labelKey: "demoTech",
      rolesKey: "demoDiagnosisOnly",
      icon: <Wrench className="w-4 h-4" />,
      color: "text-orange-400 hover:border-orange-500/50 hover:bg-orange-950/20 dark:hover:bg-orange-950/20 hover:bg-orange-50",
    },
    {
      email: "reception@demo.com",
      labelKey: "demoReception",
      rolesKey: "demoCheckinOnly",
      icon: <ClipboardList className="w-4 h-4" />,
      color: "text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-950/20 dark:hover:bg-emerald-950/20 hover:bg-emerald-50",
    },
    {
      email: "advisor@demo.com",
      labelKey: "demoAdvisor",
      rolesKey: "demoQuoteReception",
      icon: <DollarSign className="w-4 h-4" />,
      color: "text-blue-400 hover:border-blue-500/50 hover:bg-blue-950/20 dark:hover:bg-blue-950/20 hover:bg-blue-50",
    },
  ];

  return (
    <div className="min-h-screen page-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center border border-emerald-500/30 mb-4 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
            <Lock className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">{t('loginTitle')}</h2>
          <p className="mt-2 text-muted-foreground text-sm">{t('loginSubtitle')}</p>
        </div>

        <Card className="glass-panel">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-900/50 text-red-600 dark:text-red-500 p-3 rounded flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">{t('emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  required
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-emerald-500/50"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">{t('passwordLabel')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background border-border text-foreground focus:border-emerald-500/50"
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-12 mt-6"
                disabled={loading}
              >
                {loading ? t('processing') : t('loginButton')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <p className="text-center text-muted-foreground text-sm">{t('demoAccountsLabel')}</p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => fillDemo(acc.email)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card/50 transition-all text-left ${acc.color}`}
              >
                {acc.icon}
                <div>
                  <p className="text-sm font-medium">{t(acc.labelKey)}</p>
                  <p className="text-[11px] text-muted-foreground">{t(acc.rolesKey)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
