"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getAllClients, ClientSummary } from "@/lib/clients";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
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
} from "lucide-react";

export default function ClientsPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading, workshopSettings } = useAuth();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (authLoading) return;

    const fetchClients = async () => {
      try {
        const wId = userProfile?.workshopId || null;
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

  const formatCurrency = (n: number) => {
    const symbol = workshopSettings?.currencySymbol || "$";
    return `${symbol}${n.toFixed(2)}`;
  };

  const formatDate = (d: Date | null) => {
    if (!d) return "—";
    return d.toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "ADVISOR", "RECEPTION"]}>
      <div className="flex justify-center text-foreground">
        <div className="w-full max-w-6xl space-y-6">
          {/* ── Header ─────────────────────────────────────── */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="page-title">
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
            <Card className="metric-card">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <UserCircle className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalClients}</p>
                  <p className="text-xs text-muted-foreground">Clientes registrados</p>
                </div>
              </CardContent>
            </Card>
            <Card className="metric-card">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Hash className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalVisitsAll}</p>
                  <p className="text-xs text-muted-foreground">Visitas totales</p>
                </div>
              </CardContent>
            </Card>
            <Card className="metric-card">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenueAll)}</p>
                  <p className="text-xs text-muted-foreground">Ingresos totales</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Search Bar ─────────────────────────────────── */}
          <Card className="app-card">
            <CardContent className="py-4">
              <div className="relative">
                <label htmlFor="client-search" className="sr-only">Buscar clientes</label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="client-search"
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
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Cargando clientes...</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="app-card">
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
                  className="app-card group cursor-pointer transition-colors hover:border-primary/40"
                  onClick={() => router.push(`/clients/detail?id=${encodeURIComponent(client.name)}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Avatar + Info */}
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                          <span className="text-lg font-bold text-primary">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>

                        {/* Name + Contact */}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
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
                        <ChevronRight className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                    </div>

                    {/* Mobile stats row */}
                    <div className="flex sm:hidden items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(client.lastVisitDate)}
                      </span>
                      <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
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
