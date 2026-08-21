"use client";

import { useEffect, useState, Suspense } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/db";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSafeAuthRedirect } from "@/lib/auth-redirect";
import { AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";

function LoginLoading() {
  return (
    <div className="min-h-screen page-bg flex items-center justify-center" role="status" aria-label="Cargando sesión">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
    </div>
  );
}

function LoginForm() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeAuthRedirect(searchParams.get('redirect'));
  const sessionExpired = searchParams.get("reason") === "session-expired";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace(redirectTo);
  }, [authLoading, redirectTo, router, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await getUserProfile(cred.user.uid);
      if (!profile) {
        throw new Error("Tu cuenta no tiene un perfil activo. Contacta al administrador.");
      }
      router.push(redirectTo);
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null && "code" in err
        ? String(err.code)
        : "";
      const message = err instanceof Error ? err.message : t('authError');
      console.error("Authentication failed:", code || message);
      // Clean up Firebase Auth state if profile validation fails
      await signOut(auth).catch(() => {});
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError(t('wrongPassword'));
      } else if (code === 'auth/user-not-found') {
        setError("Usuario no registrado. Contacta al administrador para obtener acceso.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Ingresa primero el correo de la cuenta.");
      return;
    }

    setSendingReset(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch {
      // Keep the same user-facing result to avoid disclosing registered emails.
    } finally {
      toast.success("Si la cuenta existe, recibirás un correo para cambiar la contraseña.");
      setSendingReset(false);
    }
  };

  if (authLoading || user) return <LoginLoading />;

  return (
    <div className="min-h-screen page-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">
            {t('loginTitle')}
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">
            {t('loginSubtitle')}
          </p>
        </div>

        <Card className="app-card">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {sessionExpired && !error && (
                <div role="status" className="bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 p-3 rounded flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Tu sesión expiró. Inicia sesión nuevamente para continuar donde estabas.
                </div>
              )}
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
                  autoComplete="username"
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background border-border text-foreground focus:border-emerald-500/50"
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="mt-6 h-12 w-full font-semibold"
                disabled={loading}
              >
                {loading ? t('processing') : t('loginButton')}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={handlePasswordReset}
                disabled={sendingReset}
              >
                {sendingReset ? "Enviando…" : "Olvidé mi contraseña"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-[11px] text-muted-foreground">
                ¿No tienes cuenta? Contacta al administrador del taller.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
