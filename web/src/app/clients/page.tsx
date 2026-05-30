"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getAllClients, ClientSummary } from "@/lib/clients";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  Phone,
  Mail,
  Car,
  Calendar,
  DollarSign,
  ChevronRight,
  UserCircle,
  Hash,
  Loader2,
  DatabaseZap,
  ArrowLeft,
} from "lucide-react";

export default function ClientsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (authLoading) return;

    const fetchClients = async () => {
      try {
        const wId = userProfile?.workshopId || (userProfile ? "demo-workshop" : null);
        if (!wId) {
          setLoading(false);
          return;
        }
        const data = await getAllClients(wId);
        setClients(data);
      } catch (err) {
        console.error("Error loading clients:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [userProfile, authLoading]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.vehicles.some((v) => v.toLowerCase().includes(q))
    );
  }, [clients, searchQuery]);

  const totalClients = clients.length;
  const totalVisitsAll = clients.reduce((s, c) => s + c.totalVisits, 0);
  const totalRevenueAll = clients.reduce((s, c) => s + c.totalSpent, 0);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(n);

  const formatDate = (d: Date | null) => {
    if (!d) return "—";
    return d.toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "ADVISOR", "RECEPTION"]}>
      <div className="min-h-screen page-bg text-foreground px-4 md:px-8 py-6 flex justify-center">
        <div className="w-full max-w-6xl space-y-6">
          {/* ── Header ─────────────────────────────────────── */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="group gap-1.5 rounded-full border border-border bg-card/45 px-3.5 py-1.5 text-xs text-muted-foreground transition-all duration-300 hover:border-cyan-500/50 hover:bg-cyan-950/20 hover:text-cyan-400"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                Inicio
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-cyan-400">
                  Base de Datos de Clientes
                </h1>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Directorio completo de clientes del taller
                </p>
              </div>
            </div>
          </header>

          {/* ── Summary Stats ──────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="glass-panel border-cyan-500/20">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalClients}</p>
                  <p className="text-xs text-muted-foreground">Clientes registrados</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-cyan-500/20">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-lg bg-teal-500/15 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalVisitsAll}</p>
                  <p className="text-xs text-muted-foreground">Visitas totales</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-cyan-500/20">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenueAll)}</p>
                  <p className="text-xs text-muted-foreground">Ingresos totales</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Search Bar ─────────────────────────────────── */}
          <Card className="glass-panel">
            <CardContent className="py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, teléfono o placa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background border-border h-11"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Client List ────────────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-muted-foreground text-sm">Cargando clientes...</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="glass-panel">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <DatabaseZap className="w-12 h-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No se encontraron clientes con esa búsqueda." : "No hay clientes registrados aún."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((client) => (
                <Card
                  key={client.name}
                  className="glass-panel group cursor-pointer transition-all duration-200 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.08)]"
                  onClick={() => router.push(`/clients/${encodeURIComponent(client.name)}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Avatar + Info */}
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 border border-cyan-500/30 flex items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-cyan-300">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>

                        {/* Name + Contact */}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground truncate group-hover:text-cyan-400 transition-colors">
                            {client.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {client.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {client.phone}
                              </span>
                            )}
                            {client.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {client.email}
                              </span>
                            )}
                            {client.vehicles.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Car className="w-3 h-3" />
                                {client.vehicles.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Stats + Arrow */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-sm font-semibold text-foreground">{client.totalVisits}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Visitas</p>
                          </div>
                          <div className="w-px h-8 bg-border" />
                          <div className="text-center">
                            <p className="text-sm font-semibold text-emerald-400">{formatCurrency(client.totalSpent)}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                          </div>
                          <div className="w-px h-8 bg-border" />
                          <div className="text-center">
                            <p className="text-sm font-medium text-foreground">{formatDate(client.lastVisitDate)}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Última visita</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                      </div>
                    </div>

                    {/* Mobile stats row */}
                    <div className="flex sm:hidden items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(client.lastVisitDate)}
                      </span>
                      <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-950/20">
                        {client.totalVisits} visita{client.totalVisits !== 1 ? "s" : ""}
                      </Badge>
                      <span className="font-semibold text-emerald-400">
                        {formatCurrency(client.totalSpent)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ── Footer count ───────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <p className="text-center text-xs text-muted-foreground pb-4">
              Mostrando {filtered.length} de {totalClients} cliente{totalClients !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
