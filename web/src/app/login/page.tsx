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
import { AlertCircle, ClipboardCheck, Lock, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";

function LoginLoading() {
  return (
    <div className="min-h-screen page-bg flex items-center justify-center" role="status" aria-label="Cargando sesión">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
    </div>
  );
}

function LoginForm() {
  const { t, lang } = useLanguage();
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

  const copy = lang === "es" ? {
    eyebrow: "Sistema de Gestión Automotriz",
    title: "Del ingreso a la entrega, cada orden bajo control.",
    description: "Coordina al equipo, documenta decisiones y mantén visible el estado real del taller.",
    workflow: "Flujo operativo",
    stages: ["Recepción", "Diagnóstico", "Aprobación", "Reparación", "Control QC", "Entrega"],
    benefits: [
      ["Trazabilidad completa", "Cada responsable registra su etapa."],
      ["Aprobaciones verificables", "Cotizaciones y decisiones quedan documentadas."],
      ["Cierre confiable", "QC, pagos y entrega comparten el mismo estado."],
    ],
    access: "Acceso al taller",
    accessHint: "Usa las credenciales asignadas a tu rol.",
    noAccount: "¿No tienes cuenta? Contacta al administrador del taller.",
    reset: "Olvidé mi contraseña",
    resetting: "Enviando...",
  } : {
    eyebrow: "Automotive Management System",
    title: "From check-in to delivery, every order under control.",
    description: "Coordinate the team, document decisions and keep the workshop's real status visible.",
    workflow: "Operational workflow",
    stages: ["Reception", "Diagnosis", "Approval", "Repair", "Quality check", "Delivery"],
    benefits: [
      ["Complete traceability", "Each owner records their stage."],
      ["Verifiable approvals", "Quotes and decisions remain documented."],
      ["Reliable closeout", "QC, payments and delivery share one status."],
    ],
    access: "Workshop access",
    accessHint: "Use the credentials assigned to your role.",
    noAccount: "No account? Contact your workshop administrator.",
    reset: "Forgot my password",
    resetting: "Sending...",
  };

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-background px-4 py-6 sm:px-6 lg:flex lg:items-center lg:py-10">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10">
        <section className="app-card relative overflow-hidden p-5 sm:p-8 lg:min-h-[38rem] lg:p-12" aria-labelledby="product-intro-title">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" aria-hidden="true" />
          <div className="flex h-full flex-col justify-between gap-5 sm:gap-8">
            <div>
              <p className="eyebrow">{copy.eyebrow}</p>
              <h1 id="product-intro-title" className="mt-3 max-w-2xl text-2xl font-bold leading-[1.08] tracking-[-0.04em] text-foreground sm:text-4xl lg:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-5 hidden max-w-xl text-sm leading-6 text-muted-foreground sm:block sm:text-base">
                {copy.description}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-muted/55 p-3 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{copy.workflow}</p>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">SGA</span>
              </div>
              <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label={copy.workflow}>
                {copy.stages.map((stage, index) => (
                  <li key={stage} className="relative flex min-w-0 flex-col items-center gap-2 text-center">
                    <span className="flex size-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 font-mono text-xs font-bold text-primary">{index + 1}</span>
                    <span className="text-[10px] font-medium leading-4 text-muted-foreground">{stage}</span>
                    {index < copy.stages.length - 1 && <span className="absolute left-[calc(50%+1.1rem)] top-4 hidden h-px w-[calc(100%-2.2rem)] bg-border sm:block" aria-hidden="true" />}
                  </li>
                ))}
              </ol>
            </div>

            <div className="hidden grid-cols-3 gap-4 sm:grid">
              {copy.benefits.map(([title, description], index) => {
                const Icon = [ClipboardCheck, ShieldCheck, Wrench][index];
                return (
                  <div key={title} className="border-t border-border pt-4">
                    <Icon className="mb-3 text-primary" size={20} aria-hidden="true" />
                    <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="flex items-center justify-center">
          <Card className="app-card w-full max-w-lg">
          <CardContent className="p-6 sm:p-8 lg:p-10">
            <div className="mb-7">
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <p className="eyebrow">{copy.access}</p>
              <h2 className="page-title mt-1">{t('loginTitle')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{copy.accessHint}</p>
            </div>
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
                  className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary"
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
                  className="h-11 border-border bg-input text-foreground focus:border-primary"
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
                {sendingReset ? copy.resetting : copy.reset}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-[11px] text-muted-foreground">
                {copy.noAccount}
              </p>
            </div>
          </CardContent>
          </Card>
        </div>
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
