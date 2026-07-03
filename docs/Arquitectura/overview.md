# Arquitectura del Proyecto SGA

## Stack Tecnológico
- **Frontend**: Next.js 16 + React 19 + TypeScript
- **UI**: Tailwind CSS 4 + shadcn/ui (Radix) + Lucide icons
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **IA**: Motor de diagnóstico local (reglas) — sin dependencia de API externa en producción
- **PDF**: jsPDF + jspdf-autotable (generación client-side)
- **Notificaciones**: WhatsApp links + EmailJS

## Estructura del Proyecto
```
mechanic-app/
├── web/                      # Aplicación Next.js
│   ├── src/
│   │   ├── app/              # Rutas (App Router)
│   │   │   ├── admin/        # Settings, user management
│   │   │   ├── advisor/      # Cotización y pagos
│   │   │   ├── analytics/    # Dashboard de métricas
│   │   │   ├── clients/      # Base de datos de clientes
│   │   │   ├── expired/      # Página de trial expirado
│   │   │   ├── inventory/    # Gestión de inventario
│   │   │   ├── login/        # Autenticación (solo login, sin registro público)
│   │   │   ├── qc/           # Control de calidad
│   │   │   ├── quote/[id]/   # Portal público de cotización
│   │   │   ├── reception/    # Recepción de vehículos
│   │   │   ├── super-admin/  # Panel del creador (SUPER_ADMIN only)
│   │   │   └── technician/   # Diagnóstico y reparación
│   │   ├── components/       # Componentes reutilizables
│   │   ├── contexts/         # AuthContext, ThemeContext, LanguageContext
│   │   ├── hooks/            # useRealtimeJobs, useSpeechRecognition
│   │   ├── lib/              # Firebase, DB, PDF, diagnóstico IA, WhatsApp
│   │   ├── locales/          # Traducciones i18n
│   │   └── types/            # TypeScript types + RBAC config
│   ├── firestore.rules       # Reglas de seguridad de Firestore
│   ├── storage.rules         # Reglas de Storage (deny all)
│   ├── firebase.json         # Config de despliegue
│   └── .env.local            # Variables de entorno (NO commitear)
├── docs/                     # Este vault de Obsidian
├── directives/               # SOPs para el sistema de 3 capas
└── execution/                # Scripts de automatización
```

## Modelo de Datos (Firestore)
- **users**: Perfiles con RBAC (uid, email, roles[], workshopId)
- **jobs**: Órdenes de trabajo con flujo completo de estados
- **inventory**: Productos/repuestos por taller
- **inventory_transactions**: Movimientos de stock (IN/OUT/ADJUSTMENT)
- **settings**: Configuración por taller (multi-tenant)

## Roles (RBAC)
| Rol | Acceso |
|---|---|
| SUPER_ADMIN | Todo — gestión de talleres, usuarios globales |
| ADMIN | Todo dentro de su taller |
| RECEPTION | Check-in de vehículos |
| TECHNICIAN | Diagnóstico y reparación |
| ADVISOR | Cotización, pagos, inventario |

## Flujo de Estados de un Job
```
Reception → Diagnosis → Approval → [Ready] → Approved → Repair → QC → Delivered
```

## Multi-Tenancy
- Cada taller tiene un `workshopId` único
- Todas las queries filtran por `workshopId`
- Las reglas de Firestore validan `workshopId` en cada operación
- El SuperAdmin tiene `workshopId: "master-control"` y acceso cross-tenant

## Hosting
- **Modelo**: Vercel (Next.js Nativo)
- **Build**: Compilación nativa en Vercel disparada automáticamente mediante push a la rama `main` en GitHub.
- **API routes**: No se requiere exportación estática.
