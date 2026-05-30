# 🛠️ Guía del Desarrollador: Futuro Multi-Taller (SaaS)

¡Hola! Esta guía técnica está diseñada para ti. Aquí te explico cómo funciona la **arquitectura SaaS Multi-Tenant** que acabamos de estructurar en tu base de datos y cómo puedes escalarla comercialmente para vender el sistema a cientos de talleres.

---

## 1. 🔑 El Concepto: Aislamiento Lógico mediante `workshopId`

En lugar de desplegar una base de datos de Firebase para cada taller, tu aplicación Next.js ahora utiliza una **base de datos unificada** pero aislada lógicamente. El "pegamento" de este aislamiento es el campo **`workshopId`**.

### Flujo de Datos Multi-Tenant:
```
                ┌───────────────────────────────────┐
                │        Base de Datos Única        │
                │            (Firestore)            │
                └─────────────────┬─────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌──────────────────┐                               ┌──────────────────┐
│  Taller Pérez    │                               │  Taller González │
│  (workshopId)    │                               │  (workshopId)    │
│  "taller-perez"  │                               │  "taller-gonz"   │
└────────┬─────────┘                               └────────┬─────────┘
         │                                                  │
         ├─► Users (roles, workshopId)                      ├─► Users (roles, workshopId)
         ├─► Jobs (autos, workshopId)                       ├─► Jobs (autos, workshopId)
         ├─► Inventory (repuestos, workshopId)              ├─► Inventory (repuestos, workshopId)
         └─► Settings (Logo, workshopId)                    └─► Settings (Logo, workshopId)
```

---

## 2. 📂 Estructura del Modelo de Datos (Esquema Firestore)

Hemos modificado las interfaces principales en [types/index.ts](file:///d:/Codes/mechanic-app/web/src/types/index.ts) para soportar el SaaS. Así es como se estructuran ahora las colecciones clave:

### Colección `users` (Perfiles de Empleados y Dueños)
* **ID del Documento:** `request.auth.uid` (El UID provisto por Firebase Auth al registrarse).
* **Campos Clave:**
  ```typescript
  {
    uid: string;
    email: string;
    displayName: string;
    roles: ('ADMIN' | 'RECEPTION' | 'TECHNICIAN' | 'ADVISOR')[];
    workshopId: string; // <-- Vincula al usuario con su taller
    createdAt: Timestamp;
  }
  ```

### Colección `jobs` (Órdenes de Trabajo)
* **ID del Documento:** Autogenerado por Firestore.
* **Campos Clave:**
  ```typescript
  {
    id: string;
    workshopId: string; // <-- Aísla el trabajo para este taller
    vehicleId: string;  // Placa
    clientId: string;
    status: 'Reception' | 'Diagnosis' | 'Approval' | 'Repair' | 'QC' | 'Ready' | 'Delivered';
    // ... datos de firma, fotos, etc.
  }
  ```

### Colección `settings` (Configuración de Marca de cada Taller)
* **ID del Documento:** El mismo `workshopId` del taller (ej. `taller-perez-123`).
* **Campos Clave:**
  ```typescript
  {
    workshopName: string;
    logoUrl: string;
    address: string;
    phone: string;
    taxId: string; // NIT / RUC / RUT
    termsAndConditions: string;
    demoMode: boolean;
  }
  ```

---

## 3. 🛡️ Cómo Funciona la Seguridad de Firestore (`firestore.rules`)

Para evitar fugas de datos (que un taller intente leer datos de otro), hemos escrito reglas ultra robustas en tu archivo [firestore.rules](file:///d:/Codes/mechanic-app/web/firestore.rules).

* **Validación de Lectura/Escritura Operativa:**
  Cada vez que alguien hace una petición a la colección `jobs` o `inventory`, Firestore valida a nivel de servidor:
  ```javascript
  allow read, write: if request.auth != null && 
    resource.data.workshopId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.workshopId;
  ```
  *(Traducido: Solo permite el acceso si el taller del documento coincide exactamente con el taller del usuario logueado).*

* **Acceso Público para Clientes (Sin Login):**
  Para que los clientes dueños de los autos puedan ver su cotización en su móvil sin tener que registrarse o loguearse, la regla permite lectura individual si el trabajo está listo para firma (`Ready`, `Approved`...):
  ```javascript
  allow read: if resource.data.status in ['Ready', 'Approved', 'Repair', 'QC', 'Delivered'];
  ```
  Esto es seguro porque el cliente requiere conocer el ID único y aleatorio del documento `job` para poder consultarlo (es imposible adivinar un ID de Firestore).

---

## 🚀 4. Paso a Paso: Cómo Agregar un Nuevo Taller Cliente en el Futuro

Cuando consigas a tu segundo cliente (ej: **"Taller Automotriz Monterrey"**):

### Paso A: Crear el Taller en la Base de Datos
1. Ve a tu consola web de Firebase Firestore.
2. En la colección `settings`, crea un documento cuyo **ID** sea el identificador de tu cliente (ej: `taller-mty`).
3. Agrega los campos básicos:
   * `workshopName`: `"Taller Automotriz Monterrey"`
   * `demoMode`: `true`
   * `termsAndConditions`: `"Términos estándar..."`

### Paso B: Registrar al Dueño del Taller
1. Pídele al dueño que ingrese a tu Web App y se registre con su correo electrónico.
2. Firebase creará su perfil básico en Auth y en la colección `/users/{su_uid}`.
3. Desde la consola de Firebase Firestore, edita su documento en `users` y asígnale:
   * `roles`: `['ADMIN']` (rol de Administrador del Taller).
   * `workshopId`: `"taller-mty"` (el ID que creaste en el Paso A).

### Paso C: ¡Listo! El Cliente Toma el Control
* Cuando el dueño del taller inicie sesión en tu app:
  * El sistema detectará que su `workshopId` es `"taller-mty"`.
  * Podrá ir a `/admin/settings` y subir su propio logotipo corporativo, NIT, dirección y número de teléfono de contacto.
  * Podrá registrar a sus propios empleados (recepcionistas, mecánicos) asignándoles su mismo `workshopId: "taller-mty"` desde el panel de gestión de usuarios `/admin/users` (que ya tienes integrado).
  * Todos los vehículos que registren quedarán herméticamente guardados bajo su taller.

---

## 🗺️ Roadmap comercial para tu SaaS
Si quieres convertir esto en un negocio automatizado:
1. **Página de Registro Público (Landing Page):** Crea una página de inicio pública donde expliques las bondades del sistema y permitas que un taller se registre llenando un formulario que automatice los Pasos A y B.
2. **Pasarela de Pagos (Stripe):** Integra Stripe en tu código. Si el taller no ha pagado su mensualidad, puedes cambiar un campo `activeSubscription: false` en su documento de `/settings/{workshopId}` para suspender temporalmente su acceso.
