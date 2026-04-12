"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Package, Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle,
  AlertTriangle, Search, X, ChevronDown, ChevronUp, History
} from "lucide-react";

const CATEGORIES: InventoryCategory[] = [
  'Frenos', 'Motor', 'Transmisión', 'Suspensión', 'Eléctrico',
  'Filtros', 'Aceites', 'Llantas', 'Carrocería', 'Mano de Obra', 'Otro'
];

const UNITS = ['pcs', 'litros', 'metros', 'pares', 'kits', 'unidad', 'galones'];

const CATEGORY_COLORS: Record<string, string> = {
  Frenos: 'bg-red-500/20 text-red-400 border-red-500/40',
  Motor: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  Transmisión: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  Suspensión: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  Eléctrico: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  Filtros: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  Aceites: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
  Llantas: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
  Carrocería: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  'Mano de Obra': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  Otro: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40',
};

const emptyForm = (): Partial<InventoryItem> => ({
  sku: '', name: '', category: 'Frenos', unitPrice: 0, costPrice: 0,
  stock: 0, minStock: 2, unit: 'pcs', description: '', supplier: ''
});

export default function InventoryPage() {
  const { user, hasRole } = useAuth();
  const { t } = useLanguage();
  const isAdmin = hasRole('ADMIN');

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
    setLoading(true);
    const data = await getInventoryItems();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

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
    setSaving(true);
    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, form, user?.uid || 'unknown');
        toast.success('Repuesto actualizado.');
      } else {
        await addInventoryItem(form as Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>, user?.uid || 'unknown');
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
    if (!movementItem || movQty <= 0) { toast.warning('Cantidad inválida.'); return; }
    setMovSaving(true);
    try {
      await recordStockMovement({
        itemId: movementItem.id,
        itemName: movementItem.name,
        type: movType,
        quantity: movQty,
        unitPrice: movType === 'IN' ? (movementItem.costPrice ?? movementItem.unitPrice) : movementItem.unitPrice,
        notes: movNotes || undefined,
        actorId: user?.uid || 'unknown',
      });
      toast.success(`Movimiento ${movType === 'IN' ? 'de entrada' : movType === 'OUT' ? 'de salida' : 'de ajuste'} registrado.`);
      setMovementItem(null);
      setMovQty(1);
      setMovNotes('');
      fetchItems();
    } catch {
      toast.error('Error registrando movimiento.');
    } finally {
      setMovSaving(false);
    }
  };

  // ── History ──────────────────────────────────────────────
  const openHistory = async (item: InventoryItem) => {
    setHistoryItem(item);
    setHistoryLoading(true);
    const txs = await getStockMovements(item.id);
    setHistory(txs);
    setHistoryLoading(false);
  };

  const movColor = (type: StockMovementType) =>
    type === 'IN' ? 'text-emerald-400' : type === 'OUT' ? 'text-red-400' : 'text-amber-400';
  const movSign = (type: StockMovementType) =>
    type === 'IN' ? '+' : type === 'OUT' ? '-' : '=';

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'ADVISOR']}>
      <div className="min-h-screen page-bg text-foreground px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                Inventario
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Control de stock de repuestos y servicios del taller.</p>
            </div>
            {isAdmin && (
              <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2">
                <Plus className="w-4 h-4" /> Agregar Repuesto
              </Button>
            )}
          </div>

          {/* KPI bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Items', value: items.length, color: 'text-emerald-400' },
              { label: 'Stock Bajo', value: lowStock, color: lowStock > 0 ? 'text-red-400' : 'text-emerald-400', icon: lowStock > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : null },
              { label: 'Categorías', value: new Set(items.map(i => i.category)).size, color: 'text-blue-400' },
              { label: 'Valor Inventario', value: `$${items.reduce((acc, i) => acc + (i.stock > 0 ? i.stock * (i.costPrice ?? i.unitPrice) : 0), 0).toFixed(0)}`, color: 'text-amber-400' },
            ].map(k => (
              <Card key={k.label} className="glass-panel">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="pl-9 bg-secondary border-border"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <select
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
            <div className="overflow-x-auto rounded-xl border border-border">
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
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Otro']}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium">${item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground text-xs">{item.costPrice ? `$${item.costPrice.toFixed(2)}` : '—'}</td>
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
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">{item.supplier || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="Entrada de stock"
                              onClick={() => { setMovementItem(item); setMovType('IN'); }}
                              className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors"
                            >
                              <ArrowDownCircle className="w-4 h-4" />
                            </button>
                            <button
                              title="Salida de stock"
                              onClick={() => { setMovementItem(item); setMovType('OUT'); }}
                              className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                              disabled={item.stock === 0}
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </button>
                            <button
                              title="Historial"
                              onClick={() => openHistory(item)}
                              className="p-1.5 rounded hover:bg-blue-500/10 text-blue-400 transition-colors"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  title="Editar"
                                  onClick={() => openEdit(item)}
                                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  title="Eliminar"
                                  onClick={() => handleDelete(item)}
                                  className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
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
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto border-emerald-500/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-emerald-400">{editingItem ? 'Editar Repuesto' : 'Agregar Repuesto'}</CardTitle>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">SKU *</Label>
                  <Input value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} placeholder="FRE-001" className="mt-1 bg-secondary border-border" />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Unidad</Label>
                  <select value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} className="mt-1 w-full h-10 rounded-md border border-border bg-secondary text-foreground px-3 text-sm">
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Nombre del repuesto / servicio *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Pastillas de Freno Delanteras" className="mt-1 bg-secondary border-border" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Categoría</Label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value as InventoryCategory}))} className="mt-1 w-full h-10 rounded-md border border-border bg-secondary text-foreground px-3 text-sm">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Proveedor</Label>
                  <Input value={form.supplier} onChange={e => setForm(f => ({...f, supplier: e.target.value}))} placeholder="Nombre del proveedor" className="mt-1 bg-secondary border-border" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Precio Venta (USD)</Label>
                  <Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({...f, unitPrice: parseFloat(e.target.value) || 0}))} className="mt-1 bg-secondary border-border" />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Costo (USD)</Label>
                  <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({...f, costPrice: parseFloat(e.target.value) || 0}))} className="mt-1 bg-secondary border-border" />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Stock Mínimo (alerta)</Label>
                  <Input type="number" min="0" value={form.minStock} onChange={e => setForm(f => ({...f, minStock: parseInt(e.target.value) || 0}))} className="mt-1 bg-secondary border-border" />
                </div>
              </div>

              {!editingItem && (
                <div>
                  <Label className="text-muted-foreground text-xs">Stock Inicial</Label>
                  <Input type="number" min="-1" value={form.stock} onChange={e => setForm(f => ({...f, stock: parseInt(e.target.value) }))} placeholder="-1 para ilimitado (servicios)" className="mt-1 bg-secondary border-border" />
                  <p className="text-xs text-muted-foreground mt-1">Use -1 para repuestos ilimitados como mano de obra.</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground text-xs">Descripción</Label>
                <Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Descripción opcional..." className="mt-1 bg-secondary border-border" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  {saving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Agregar al Inventario'}
                </Button>
                <Button onClick={() => setShowForm(false)} variant="outline" className="border-border">Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Stock Movement Modal ─────────────────────────────── */}
      {movementItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-md border-emerald-500/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{movType === 'IN' ? '📦 Entrada de Stock' : movType === 'OUT' ? '📤 Salida de Stock' : '⚙️ Ajuste de Stock'}</CardTitle>
                  <CardDescription className="mt-1">{movementItem.name}</CardDescription>
                </div>
                <button onClick={() => setMovementItem(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
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
                <Label className="text-muted-foreground text-xs">Cantidad</Label>
                <Input type="number" min="1" value={movQty} onChange={e => setMovQty(parseInt(e.target.value) || 1)} className="mt-1 bg-secondary border-border" />
                {movType !== 'ADJUSTMENT' && movementItem.stock >= 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Resultado: {movType === 'IN' ? movementItem.stock + movQty : Math.max(0, movementItem.stock - movQty)} {movementItem.unit}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Notas (opcional)</Label>
                <Input value={movNotes} onChange={e => setMovNotes(e.target.value)} placeholder="Motivo del movimiento..." className="mt-1 bg-secondary border-border" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleMovement}
                  disabled={movSaving}
                  className={`flex-1 text-white font-bold ${movType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-500' : movType === 'OUT' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'}`}
                >
                  {movSaving ? 'Registrando...' : 'Registrar Movimiento'}
                </Button>
                <Button onClick={() => setMovementItem(null)} variant="outline" className="border-border">Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── History Drawer ───────────────────────────────────── */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-lg max-h-[80vh] flex flex-col border-blue-500/30">
            <CardHeader className="pb-4 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-blue-400 text-base flex items-center gap-2"><History className="w-4 h-4" /> Historial de Movimientos</CardTitle>
                  <CardDescription className="mt-1">{historyItem.name}</CardDescription>
                </div>
                <button onClick={() => setHistoryItem(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
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
                            {tx.createdAt ? new Date((tx.createdAt as any).seconds * 1000).toLocaleString('es-PA') : '—'}
                          </span>
                        </div>
                        {tx.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{tx.notes}</p>}
                        {tx.jobId && <p className="text-xs text-blue-400 mt-0.5">Trabajo: {tx.jobId.substring(0, 12)}...</p>}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">${tx.unitPrice.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </ProtectedRoute>
  );
}
