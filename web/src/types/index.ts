// ─── RBAC Types ──────────────────────────────────────────
export type UserRole = 'ADMIN' | 'RECEPTION' | 'TECHNICIAN' | 'ADVISOR';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

/** Which roles can access each route */
export const ROLE_ROUTE_MAP: Record<string, UserRole[]> = {
  '/reception': ['ADMIN', 'RECEPTION'],
  '/technician': ['ADMIN', 'TECHNICIAN'],
  '/advisor': ['ADMIN', 'ADVISOR'],
  '/analytics': ['ADMIN'],
  '/admin/users': ['ADMIN'],
  '/inventory': ['ADMIN', 'ADVISOR'],
};

/** Display metadata for each role — labelKey is a translation key */
export const ROLE_META: Record<UserRole, { labelKey: string; emoji: string; color: string }> = {
  ADMIN: { labelKey: 'roleAdmin', emoji: '🛡️', color: 'text-purple-400 border-purple-500/50 bg-purple-950/30' },
  RECEPTION: { labelKey: 'roleReception', emoji: '📋', color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30' },
  TECHNICIAN: { labelKey: 'roleTechnician', emoji: '🔧', color: 'text-orange-400 border-orange-500/50 bg-orange-950/30' },
  ADVISOR: { labelKey: 'roleAdvisor', emoji: '💰', color: 'text-blue-400 border-blue-500/50 bg-blue-950/30' },
};

// ─── Domain Types ────────────────────────────────────────
export interface Vehicle {
  vin: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  ownerId: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string; // WhatsApp number
  email?: string;
  npsScore?: number;
}

export interface InspectionItem {
  id: string;
  name: string; // e.g. "Oil Level", "Brake Pads"
  status: 'Pass' | 'Fail' | 'Critical' | 'Recommended';
  mediaUrls?: string[]; // Evidence
  notes?: string;
  price?: number; // Added by Advisor
  approved?: boolean; // Client decision
}

export interface AuditLog {
  timestamp: Date;
  action: string; // "Check-in", "Diagnosis", "QC Pass"
  actorId: string; // User ID
  notes?: string;
}

export interface Job {
  id: string;
  vehicleId: string;
  clientId: string;         // Client name
  clientPhone?: string;     // WhatsApp number (e.g. "50760001122")
  clientEmail?: string;     // For email notifications
  advisorId: string;
  technicianId?: string;
  status: 'Reception' | 'Diagnosis' | 'Approval' | 'Repair' | 'QC' | 'Ready' | 'Delivered' | 'Approved';
  
  // Liability Shield Data
  receptionImages?: string[]; // Visual evidence of pre-existing damages
  fluidAudit: {
    oilLevel: 'OK' | 'Low' | 'Empty';
    coolantLevel: 'OK' | 'Low' | 'Empty';
    brakeFluid: 'OK' | 'Low' | 'Empty';
    notes?: string;
  };
  valuables: {
    lockNutKey: boolean;
    sunglasses: boolean;
    documents: boolean;
    other?: string;
  };
  startingFuel: number; // 0-100%
  odometer: number;
  
  // Inspections & Repairs
  inspectionItems: InspectionItem[];
  declinedItems: InspectionItem[]; // Critical for "Blindaje"
  
  // Financials
  totalEstimate: number;
  approvedAmount: number;
  payments?: {
    id: string;
    amount: number;
    method: 'Efectivo' | 'Tarjeta' | 'Transferencia';
    date: Date;
    actorId: string;
  }[];
  
  // Timeline
  createdAt: Date;
  auditLog: AuditLog[];
}

// ─── Inventory Types ─────────────────────────────────────
export type InventoryCategory = 'Frenos' | 'Motor' | 'Transmisión' | 'Suspensión' | 'Eléctrico' | 'Filtros' | 'Aceites' | 'Llantas' | 'Carrocería' | 'Mano de Obra' | 'Otro';

export interface InventoryItem {
  id: string;
  sku: string;                  // Internal code e.g. "FRE-001"
  name: string;                 // "Pastillas de Freno Delanteras"
  category: InventoryCategory;
  unitPrice: number;            // Suggested sale price (USD)
  costPrice?: number;           // Purchase cost (for margin tracking)
  stock: number;                // Current units in stock (-1 = unlimited/service)
  minStock: number;             // Alert threshold (e.g. 2)
  unit: string;                 // "pcs", "litros", "metros"
  description?: string;
  supplier?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;             // Always positive; direction set by type
  unitPrice: number;            // Price at time of movement
  jobId?: string;               // Linked job if OUT via repair
  notes?: string;
  actorId: string;
  createdAt: Date;
}
