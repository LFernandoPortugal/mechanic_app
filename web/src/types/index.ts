// ─── RBAC Types ──────────────────────────────────────────
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTION' | 'TECHNICIAN' | 'ADVISOR';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  workshopId: string; // SaaS Workshop identifier
  createdAt: Date;
  updatedAt: Date;
}

/** Which roles can access each route */
export const ROLE_ROUTE_MAP: Record<string, UserRole[]> = {
  '/reception': ['ADMIN', 'RECEPTION'],
  '/technician': ['ADMIN', 'TECHNICIAN'],
  '/advisor': ['ADMIN', 'ADVISOR'],
  '/advisor/payments': ['ADMIN', 'ADVISOR'],
  '/analytics': ['ADMIN'],
  '/admin/users': ['ADMIN'],
  '/admin/settings': ['ADMIN'],
  '/inventory': ['ADMIN', 'ADVISOR'],
  '/clients': ['ADMIN', 'ADVISOR', 'RECEPTION'],
  '/qc': ['ADMIN', 'ADVISOR', 'TECHNICIAN'],
  '/super-admin': ['SUPER_ADMIN'],
};

/** Display metadata for each role — labelKey is a translation key */
export const ROLE_META: Record<UserRole, { labelKey: string; emoji: string; color: string }> = {
  SUPER_ADMIN: { labelKey: 'roleSuperAdmin', emoji: '👑', color: 'text-red-400 border-red-500/50 bg-red-950/30' },
  ADMIN: { labelKey: 'roleAdmin', emoji: '🛡️', color: 'text-purple-400 border-purple-500/50 bg-purple-950/30' },
  RECEPTION: { labelKey: 'roleReception', emoji: '📋', color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30' },
  TECHNICIAN: { labelKey: 'roleTechnician', emoji: '🔧', color: 'text-orange-400 border-orange-500/50 bg-orange-950/30' },
  ADVISOR: { labelKey: 'roleAdvisor', emoji: '💰', color: 'text-blue-400 border-blue-500/50 bg-blue-950/30' },
};

// ─── Domain Types ────────────────────────────────────────
export type VehicleType = 'auto' | 'suv' | 'pickup' | 'minivan' | 'truck' | 'moto' | 'ebike' | 'parts' | 'other';

export interface Vehicle {
  vin: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  ownerId: string;
  vehicleType?: VehicleType;
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
  workshopId: string; // SaaS Workshop identifier
  vehicleId: string; // License plate
  vin?: string;
  make?: string;
  model?: string;
  color?: string;
  clientId: string;         // Client name
  clientPhone?: string;     // WhatsApp number (e.g. "50760001122")
  clientEmail?: string;     // For email notifications
  advisorId: string;
  technicianId?: string;
  status: 'Reception' | 'Diagnosis' | 'Approval' | 'Repair' | 'QC' | 'Ready' | 'Delivered' | 'Approved';
  symptoms?: string; // Client reported symptoms / reason for entry
  vehicleType?: VehicleType;
  
  // Liability Shield Data
  receptionImages?: string[]; // Base64 data URLs of pre-existing damage photos
  signatureBase64?: string;   // Client signature as base64 data URL (PNG)
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
    method: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Yape/Plin';
    reference?: string;
    date: string;
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
  workshopId: string;           // SaaS Workshop identifier
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
  workshopId: string;           // SaaS Workshop identifier
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

// ─── Settings Types ──────────────────────────────────────
export interface WorkshopSettings {
  workshopName: string;
  logoUrl: string;
  address: string;
  phone: string;
  taxId: string; // NIT / RUC / RUT
  termsAndConditions: string;
  demoMode: boolean;
  currencySymbol: string; // e.g. "S/.", "$", "€"
  taxRate: number; // e.g. 18 for 18% IGV, 15 for 15% IVA
  taxName: string; // e.g. "IGV", "IVA", "Impuesto"
  expiresAt?: string; // Trial / subscription expiration ISO date
  allowResetData?: boolean; // Controls if workshop ADMIN can reset their data
  adminEmail?: string; // Tester email for invite-only onboarding
}

