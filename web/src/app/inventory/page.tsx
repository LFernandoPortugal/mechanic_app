"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AccessibleModal } from "@/components/AccessibleModal";
import { ContextHelpLink } from "@/components/ContextHelpLink";
import {
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  recordStockMovement,
  getStockMovements,
} from "@/lib/db";
import { InventoryItem, InventoryCategory, InventoryTransaction, StockMovementType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { toDate } from "@/lib/dates";
import {
  Package, Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle,
  AlertTriangle, Search, X, History
} from "lucide-react";

const CATEGORIES: InventoryCategory[] = [
  'Frenos', 'Motor', 'Transmisión', 'Suspensión', 'Eléctrico',
  'Filtros', 'Aceites', 'Llantas', 'Carrocería', 'Mano de Obra', 'Otro'
];

const UNITS = ['pcs', 'litros', 'metros', 'pares', 'kits', 'unidad', 'galones'];

const CATEGORY_STYLE = 'border-primary/25 bg-primary/10 text-primary';

const emptyForm = (): Partial<InventoryItem> => ({
  sku: '', name: '', category: 'Frenos', unitPrice: 0, costPrice: 0,
  stock: 0, minStock: 2, unit: 'pcs', description: '', supplier: ''
});

export default function InventoryPage() {
  const { user, userProfile, workshopSettings, hasRole, loading: authLoading } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const canDeleteInventory = isAdmin && workshopSettings?.allowResetData === true;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<Partial<InventoryItem>>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Stock movement modal
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [movType, setMovType] = useState<StockMovementType>('IN');
  const [movQty, setMovQty] = useState(1);
  const [movNotes, setMovNotes] = useState('');
  const [movSaving, setMovSaving] = useState(false);

  // History drawer
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    const wId = userProfile?.workshopId || null;
    if (!wId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await getInventoryItems(wId);
    setItems(data);
    setLoading(false);
  }, [userProfile]);

  useEffect(() => { 
    if (!authLoading) {
      fetchItems(); 
    }
  }, [fetchItems, authLoading]);

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || i.category === filterCategory;
    return matchSearch && matchCat;
  });

  const lowStock = items.filter(i => i.stock >= 0 && i.stock <= i.minStock).length;

  // ── Form helpers ────────────────────────────────────────
  const openAdd = () => {
    setEditingItem(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({ ...item });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sku) { toast.warning('Nombre y SKU son requeridos.'); return; }
    const wId = userProfile?.workshopId;
    if (!wId || !user?.uid) {
      toast.error('La sesión no tiene un taller operativo asociado.');
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, {
          sku: String(form.sku || "").trim(),
          name: String(form.name || "").trim(),
          category: form.category || "Otro",
          unitPrice: Number(form.unitPrice) || 0,
          costPrice: Number(form.costPrice) || 0,
          minStock: Number(form.minStock) || 0,
          unit: String(form.unit || "unidad"),
          description: String(form.description || ""),
          supplier: String(form.supplier || ""),
        });
        toast.success('Repuesto actualizado.');
      } else {
        const itemWithWorkshop = {
          ...form,
          workshopId: wId,
        } as Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>;
        await addInventoryItem(itemWithWorkshop, user.uid);
        toast.success('Repuesto agregado al inventario.');
      }
      setShowForm(false);
      fetchItems();
    } catch {
      toast.error('Error guardando. Intente de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!canDeleteInventory) {
      toast.error("La eliminación requiere que SUPER_ADMIN habilite temporalmente Danger Mode.");
      return;
    }
    if (!confirm(`¿Eliminar "${item.name}" del inventario?`)) return;
    try {
      await deleteInventoryItem(item.id);
      toast.success('Repuesto eliminado.');
      fetchItems();
    } catch {
      toast.error('Error eliminando.');
    }
  };

  // ── Stock movement ───────────────────────────────────────
  const handleMovement = async () => {
    const wId = userProfile?.workshopId;
    if (!wId || !user?.uid) {
      toast.error('La sesión no tiene un taller operativo asociado.');
      return;
    }
    const invalidQuantity = !Number.isInteger(movQty)
      || (movType === 'ADJUSTMENT' ? movQty < -1 : movQty <= 0);
    if (!isAdmin || !movementItem || invalidQuantity) {
      toast.warning('Cantidad inválida.');
      return;
    }
    setMovSaving(true);
    try {
      await recordStockMovement({
        itemId: movementItem.id,
        itemName: movementItem.name,
        type: movType,
        quantity: movQty,
        unitPrice: movType === 'IN' ? (movementItem.costPrice ?? movementItem.unitPrice) : movementItem.unitPrice,
        notes: movNotes || undefined,
        actorId: user.uid,
        workshopId: wId,
      });
      toast.success(`Movimiento ${movType === 'IN' ? 'de entrada' : movType === 'OUT' ? 'de salida' : 'de ajuste'} registrado.`);
      setMovementItem(null);
      setMovQty(1);
      setMovNotes('');
      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error registrando movimiento.');
    } finally {
      setMovSaving(false);
    }
  };

  // ── History ──────────────────────────────────────────────
  const openHistory = async (item: InventoryItem) => {
    setHistoryItem(item);
    setHistoryLoading(true);
    const txs = await getStockMovements(item.workshopId, item.id);
    setHistory(txs);
    setHistoryLoading(false);
  };

  const movColor = (type: StockMovementType) =>
    type === 'IN' ? 'text-emerald-400' : type === 'OUT' ? 'text-red-400' : 'text-amber-400';
  const movSign = (type: StockMovementType) =>
    type === 'IN' ? '+' : type === 'OUT' ? '-' : '=';
  const currencySymbol = workshopSettings?.currencySymbol || '$';
  const formatMoney = (amount: number) => `${currencySymbol}${amount.toFixed(2)}`;
  const formatMovementDate = (value: unknown) => toDate(value)?.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }) || '-';

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'ADVISOR']}>
      <div className="text-foreground">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="page-title">
                  Inventario
                </h1>
                <p className="text-muted-foreground text-xs mt-0.5">Control de stock de repuestos y servicios del taller.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              <ContextHelpLink section="inventory" compact />
              {isAdmin && (
                <Button onClick={openAdd} className="gap-2 bg-primary font-bold text-primary-foreground hover:brightness-95">
                  <Plus className="w-4 h-4" /> Agregar Repuesto
                </Button>
              )}
            </div>
          </div>

          {/* KPI bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Items', value: items.length, color: 'text-primary' },
              { label: 'Stock Bajo', value: lowStock, color: lowStock > 0 ? 'text-destructive' : 'text-success', icon: lowStock > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : null },
              { label: 'Categorías', value: new Set(items.map(i => i.category)).size, color: 'text-primary' },
              { label: 'Valor Inventario', value: formatMoney(items.reduce((acc, i) => acc + (i.stock > 0 ? i.stock * (i.costPrice ?? i.unitPrice) : 0), 0)), color: 'text-amber-400' },
            ].map(k => (
              <Card key={k.label} className="metric-card">
                <CardContent className="p-4">
                  <p className="text-muted-foreground text-xs mb-1">{k.label}</p>
                  <div className={`text-2xl font-bold flex items-center gap-1.5 ${k.color}`}>
                    {k.icon}{k.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Label htmlFor="inventory-search" className="sr-only">Buscar inventario</Label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="inventory-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="pl-9 bg-secondary border-border"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Label htmlFor="inventory-category-filter" className="sr-only">Filtrar por categoría</Label>
            <select
              id="inventory-category-filter"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="h-10 rounded-md border border-border bg-secondary text-foreground px-3 text-sm"
            >
              <option value="">Todas las categorías</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center text-muted-foreground py-16">Cargando inventario...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay repuestos registrados aún.</p>
              {isAdmin && <Button onClick={openAdd} variant="outline" className="mt-4">+ Agregar el primero</Button>}
            </div>
          ) : (
            <>
            <div className="grid gap-3 md:hidden">
              {filtered.map((item) => {
                const isLow = item.stock >= 0 && item.stock <= item.minStock;
                const isUnlimited = item.stock === -1;
                return (
                  <Card key={item.id} className="app-card overflow-hidden py-0">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] text-muted-foreground break-all">{item.sku}</p>
                          <h3 className="mt-1 font-semibold text-foreground break-words">{item.name}</h3>
                        </div>
                        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE}`}>
                          {item.category}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/40 bg-secondary/30 p-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Precio de venta</p>
                          <p className="mt-0.5 font-mono font-semibold text-primary">{formatMoney(item.unitPrice)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Costo</p>
                          <p className="mt-0.5 font-mono font-semibold">{item.costPrice ? formatMoney(item.costPrice) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Stock</p>
                          <p className={`mt-0.5 flex items-center gap-1 font-semibold ${isLow ? 'text-red-400' : 'text-foreground'}`}>
                            {isUnlimited ? '∞' : `${item.stock} ${item.unit}`}
                            {isLow && <AlertTriangle className="h-3.5 w-3.5" />}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-muted-foreground">Proveedor</p>
                          <p className="mt-0.5 truncate font-semibold" title={item.supplier || undefined}>{item.supplier || '-'}</p>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-primary/30 text-primary"
                            onClick={() => { setMovementItem(item); setMovType('IN'); }}
                            disabled={isUnlimited}
                          >
                            <ArrowDownCircle className="h-4 w-4" /> Entrada
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400"
                            onClick={() => { setMovementItem(item); setMovType('OUT'); }}
                            disabled={item.stock <= 0}
                          >
                            <ArrowUpCircle className="h-4 w-4" /> Salida
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="border-primary/30 text-primary" onClick={() => openHistory(item)}>
                            <History className="h-4 w-4" /> Historial
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" /> Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="col-span-2 border-red-500/30 text-red-400"
                            onClick={() => handleDelete(item)}
                            disabled={!canDeleteInventory}
                          >
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/60 text-muted-foreground text-left">
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Repuesto / Servicio</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 font-medium text-right">Precio Venta</th>
                    <th className="px-4 py-3 font-medium text-right">Costo</th>
                    <th className="px-4 py-3 font-medium text-center">Stock</th>
                    <th className="px-4 py-3 font-medium text-center">Proveedor</th>
                    <th className="px-4 py-3 font-medium text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const isLow = item.stock >= 0 && item.stock <= item.minStock;
                    const isUnlimited = item.stock === -1;
                    return (
                      <tr key={item.id} className={`border-t border-border transition-colors hover:bg-secondary/40 ${idx % 2 === 0 ? '' : 'bg-secondary/20'}`}>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.sku}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.name}</div>
                          {item.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_STYLE}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium">{formatMoney(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground text-xs">{item.costPrice ? formatMoney(item.costPrice) : '-'}</td>
                        <td className="px-4 py-3 text-center">
                          {isUnlimited ? (
                            <span className="text-emerald-400 text-xs font-medium">∞</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`font-bold text-base ${isLow ? 'text-red-400' : 'text-foreground'}`}>
                                {item.stock}
                              </span>
                              <span className="text-muted-foreground text-xs">{item.unit}</span>
                              {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">{item.supplier || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  title="Entrada de stock"
                                  aria-label={`Entrada de stock para ${item.name}`}
                                  onClick={() => { setMovementItem(item); setMovType('IN'); }}
                                  className="rounded p-1.5 text-primary transition-colors hover:bg-primary/10"
                                  disabled={item.stock === -1}
                                >
                                  <ArrowDownCircle className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Salida de stock"
                                  aria-label={`Salida de stock para ${item.name}`}
                                  onClick={() => { setMovementItem(item); setMovType('OUT'); }}
                                  className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                                  disabled={item.stock <= 0}
                                >
                                  <ArrowUpCircle className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Historial"
                                  aria-label={`Historial de ${item.name}`}
                                  onClick={() => openHistory(item)}
                                  className="rounded p-1.5 text-primary transition-colors hover:bg-primary/10"
                                >
                                  <History className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Editar"
                                  aria-label={`Editar ${item.name}`}
                                  onClick={() => openEdit(item)}
                                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Eliminar"
                                  aria-label={`Eliminar ${item.name}`}
                                  onClick={() => handleDelete(item)}
                                  disabled={!canDeleteInventory}
                                  className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ────────────────────────────────── */}
      {showForm && (
        <AccessibleModal labelledBy="inventory-form-title" onClose={() => setShowForm(false)} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <Card className="app-card w-full max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle id="inventory-form-title">{editingItem ? 'Editar Repuesto' : 'Agregar Repuesto'}</CardTitle>
                <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar formulario">
                  <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inventory-sku" className="text-muted-foreground text-xs">SKU *</Label>
                  <Input id="inventory-sku" value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} placeholder="FRE-001" className="mt-1 bg-secondary border-border" />
                </div>
                <div>
                  <Label htmlFor="inventory-unit" className="text-muted-foreground text-xs">Unidad</Label>
                  <select id="inventory-unit" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} className="mt-1 w-full h-10 rounded-md border border-border bg-secondary text-foreground px-3 text-sm">
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="inventory-name" className="text-muted-foreground text-xs">Nombre del repuesto / servicio *</Label>
                <Input id="inventory-name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Pastillas de Freno Delanteras" className="mt-1 bg-secondary border-border" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inventory-category" className="text-muted-foreground text-xs">Categoría</Label>
                  <select id="inventory-category" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value as InventoryCategory}))} className="mt-1 w-full h-10 rounded-md border border-border bg-secondary text-foreground px-3 text-sm">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="inventory-supplier" className="text-muted-foreground text-xs">Proveedor</Label>
                  <Input id="inventory-supplier" value={form.supplier} onChange={e => setForm(f => ({...f, supplier: e.target.value}))} placeholder="Nombre del proveedor" className="mt-1 bg-secondary border-border" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="inventory-unit-price" className="text-muted-foreground text-xs">Precio Venta ({currencySymbol})</Label>
                  <Input id="inventory-unit-price" type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({...f, unitPrice: parseFloat(e.target.value) || 0}))} className="mt-1 bg-secondary border-border" />
                </div>
                <div>
                  <Label htmlFor="inventory-cost-price" className="text-muted-foreground text-xs">Costo ({currencySymbol})</Label>
                  <Input id="inventory-cost-price" type="number" min="0" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({...f, costPrice: parseFloat(e.target.value) || 0}))} className="mt-1 bg-secondary border-border" />
                </div>
                <div>
                  <Label htmlFor="inventory-min-stock" className="text-muted-foreground text-xs">Stock Mínimo (alerta)</Label>
                  <Input id="inventory-min-stock" type="number" min="0" value={form.minStock} onChange={e => setForm(f => ({...f, minStock: parseInt(e.target.value) || 0}))} className="mt-1 bg-secondary border-border" />
                </div>
              </div>

              {!editingItem && (
                <div>
                  <Label htmlFor="inventory-initial-stock" className="text-muted-foreground text-xs">Stock Inicial</Label>
                  <Input id="inventory-initial-stock" type="number" min="-1" value={form.stock} onChange={e => setForm(f => ({...f, stock: Number.parseInt(e.target.value, 10) || 0 }))} placeholder="-1 para ilimitado (servicios)" aria-describedby="inventory-stock-help" className="mt-1 bg-secondary border-border" />
                  <p id="inventory-stock-help" className="text-xs text-muted-foreground mt-1">Use -1 para repuestos ilimitados como mano de obra.</p>
                </div>
              )}

              <div>
                <Label htmlFor="inventory-description" className="text-muted-foreground text-xs">Descripción</Label>
                <Input id="inventory-description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Descripción opcional..." className="mt-1 bg-secondary border-border" />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <Button onClick={handleSave} disabled={saving} className="w-full bg-primary font-bold text-primary-foreground hover:brightness-95 sm:flex-1">
                  {saving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Agregar al Inventario'}
                </Button>
                <Button onClick={() => setShowForm(false)} variant="outline" className="w-full sm:w-auto border-border">Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </AccessibleModal>
      )}

      {/* ── Stock Movement Modal ─────────────────────────────── */}
      {movementItem && (
        <AccessibleModal labelledBy="inventory-movement-title" onClose={() => setMovementItem(null)} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <Card className="app-card w-full max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle id="inventory-movement-title" className="text-base">{movType === 'IN' ? '📦 Entrada de Stock' : movType === 'OUT' ? '📤 Salida de Stock' : '⚙️ Ajuste de Stock'}</CardTitle>
                  <CardDescription className="mt-1">{movementItem.name}</CardDescription>
                </div>
                <button type="button" onClick={() => setMovementItem(null)} aria-label="Cerrar movimiento">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['IN', 'OUT', 'ADJUSTMENT'] as StockMovementType[]).map(t => (
                  <Button
                    key={t}
                    size="sm"
                    variant={movType === t ? 'default' : 'outline'}
                    className={movType === t ? (t === 'IN' ? 'bg-emerald-600 text-white' : t === 'OUT' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white') : 'border-border text-muted-foreground'}
                    onClick={() => setMovType(t)}
                  >
                    {t === 'IN' ? 'Entrada' : t === 'OUT' ? 'Salida' : 'Ajuste'}
                  </Button>
                ))}
              </div>

              <div className="bg-secondary rounded-lg p-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Stock actual:</span>
                <span className="font-bold">{movementItem.stock === -1 ? '∞' : `${movementItem.stock} ${movementItem.unit}`}</span>
              </div>

              <div>
                <Label htmlFor="movement-quantity" className="text-muted-foreground text-xs">Cantidad</Label>
                <Input
                  id="movement-quantity"
                  type="number"
                  min={movType === 'ADJUSTMENT' ? -1 : 1}
                  step="1"
                  value={movQty}
                  onChange={e => setMovQty(Number.parseInt(e.target.value, 10) || 0)}
                  className="mt-1 bg-secondary border-border"
                />
                {movType !== 'ADJUSTMENT' && movementItem.stock >= 0 && (
                  <p className="text-xs text-muted-foreground mt-1" aria-live="polite">
                    Resultado: {movType === 'IN' ? movementItem.stock + movQty : Math.max(0, movementItem.stock - movQty)} {movementItem.unit}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="movement-notes" className="text-muted-foreground text-xs">Notas (opcional)</Label>
                <Input id="movement-notes" value={movNotes} onChange={e => setMovNotes(e.target.value)} placeholder="Motivo del movimiento..." className="mt-1 bg-secondary border-border" />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <Button
                  onClick={handleMovement}
                  disabled={movSaving}
                  className={`w-full sm:flex-1 text-white font-bold ${movType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-500' : movType === 'OUT' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'}`}
                >
                  {movSaving ? 'Registrando...' : 'Registrar Movimiento'}
                </Button>
                <Button onClick={() => setMovementItem(null)} variant="outline" className="w-full sm:w-auto border-border">Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </AccessibleModal>
      )}

      {/* ── History Drawer ───────────────────────────────────── */}
      {historyItem && (
        <AccessibleModal labelledBy="inventory-history-title" onClose={() => setHistoryItem(null)} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="app-card w-full max-w-lg max-h-[80vh] flex flex-col">
            <CardHeader className="pb-4 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle id="inventory-history-title" className="flex items-center gap-2 text-base text-primary"><History className="w-4 h-4" /> Historial de Movimientos</CardTitle>
                  <CardDescription className="mt-1">{historyItem.name}</CardDescription>
                </div>
                <button type="button" onClick={() => setHistoryItem(null)} aria-label="Cerrar historial">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="text-center text-muted-foreground py-8">Cargando historial...</div>
              ) : history.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">Sin movimientos registrados.</div>
              ) : (
                <div className="space-y-2">
                  {history.map(tx => (
                    <div key={tx.id} className="flex items-start gap-3 bg-secondary/40 rounded-lg p-3">
                      <div className={`mt-0.5 font-bold text-sm w-6 text-center ${movColor(tx.type)}`}>
                        {movSign(tx.type)}{tx.type !== 'ADJUSTMENT' ? tx.quantity : ''}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${movColor(tx.type)}`}>
                            {tx.type === 'IN' ? 'Entrada' : tx.type === 'OUT' ? 'Salida' : 'Ajuste'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatMovementDate(tx.createdAt)}
                          </span>
                        </div>
                        {tx.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{tx.notes}</p>}
                        {tx.jobId && <p className="mt-0.5 text-xs text-primary">Trabajo: {tx.jobId.substring(0, 12)}...</p>}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">{formatMoney(tx.unitPrice)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AccessibleModal>
      )}
    </ProtectedRoute>
  );
}
