# Checklist de Despliegue — SGA

## Pre-Deploy

### Variables de Entorno
- [ ] `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` configurada con tu email real
- [ ] `GEMINI_API_KEY` — puede estar vacía en producción (motor local se usa como fallback)
- [ ] Firebase config keys correctas en `.env.local`

### Seguridad
- [ ] Registro público cerrado (solo login)
- [ ] Cuentas demo solo visibles en desarrollo (`NODE_ENV !== 'production'`)
- [ ] Firestore rules actualizadas y desplegadas
- [ ] Storage rules desplegadas (deny all)
- [ ] Firebase Auth: solo email/password habilitado
- [ ] Dominios autorizados configurados en Firebase Auth

### Build
- [ ] `npm run build` exitoso (genera `out/`)
- [ ] Sin errores de TypeScript
- [ ] Sin warnings críticos de lint

## Deploy

```bash
# 1. Build
cd web
npm run build

# 2. Deploy todo (hosting + rules + indexes)
firebase deploy --project mechanic-app-7d459

# O deploy selectivo:
firebase deploy --only hosting --project mechanic-app-7d459
firebase deploy --only firestore:rules --project mechanic-app-7d459
firebase deploy --only storage --project mechanic-app-7d459
```

## Post-Deploy

### Verificación Manual
- [ ] Login con SuperAdmin email → obtiene rol SUPER_ADMIN
- [ ] Acceder a `/super-admin` → funciona
- [ ] Crear taller de prueba → funciona
- [ ] Login con email de tester → se auto-onboarda como ADMIN
- [ ] Tester puede crear jobs, agregar inventario
- [ ] Trial expira → tester ve página de expiración
- [ ] URL `/quote/[id]` funciona sin login
- [ ] Intento de acceso no autorizado → rechazado

### Verificación de Seguridad
- [ ] Intentar registrar cuenta nueva → no hay opción (producción)
- [ ] Acceder a `/super-admin` con cuenta regular → denegado
- [ ] Modificar workshopId en request → reglas de Firestore lo bloquean
